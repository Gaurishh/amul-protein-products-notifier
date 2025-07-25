from fastapi import FastAPI, BackgroundTasks
from amul_scraper import AmulScraper
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel
from threading import Thread, Lock
from queue import Queue
import uuid
from pymongo import MongoClient
from config import MONGO_URI
import psutil
import time
import os
import shutil
import signal
import glob

scraper = None
scrape_queue = Queue()
queue_lock = Lock()
job_status = {}
NUM_WORKERS = 2

# MongoDB setup
client = MongoClient(MONGO_URI)

def log_cpu_usage():
    p = psutil.Process()
    while True:
        # Only log if there is work in progress or in the queue
        active_jobs = any(status == 'in_progress' for status in job_status.values())
        # queue_not_empty = scrape_queue.qsize() > 0
        # if active_jobs or queue_not_empty:
        if active_jobs:
            cpu = p.cpu_percent(interval=1)
            logging.info(f"[CPU] Overall process CPU usage: {cpu:.2f}%")
        else:
            time.sleep(1)

def cleanup_leftover_temp_dirs():
    """Clean up any leftover Chrome temp directories from previous runs"""
    try:
        # Find and remove any leftover chrome_worker_* directories
        temp_pattern = "/tmp/chrome_worker_*"
        leftover_dirs = glob.glob(temp_pattern)
        for temp_dir in leftover_dirs:
            try:
                shutil.rmtree(temp_dir)
                logging.info(f"Cleaned up leftover temp directory: {temp_dir}")
            except Exception as e:
                logging.warning(f"Could not clean up {temp_dir}: {e}")
    except Exception as e:
        logging.warning(f"Error during temp directory cleanup: {e}")

def process_queue_worker(worker_id):
    scraper = AmulScraper(id=worker_id)
    scraper.setup_driver()  # Set up driver ONCE at start
    try:
        while True:
            job = scrape_queue.get()
            if job is None:
                break
            job_id, pincode = job
            job_status[job_id] = "in_progress"
            try:
                scraper.pincode = pincode
                scraper.run_scrape_cycle()  # Use run_scrape_cycle (NOT run_scrape_cycle_and_cleanup)
                job_status[job_id] = "completed"
            except Exception as e:
                job_status[job_id] = f"failed: {str(e)}"
                logging.error(f"Worker {worker_id}: Job {job_id} failed: {e}")
    except KeyboardInterrupt:
        logging.info(f"Worker {worker_id}: Shutting down...")
    finally:
        # Cleanup only at the very end when worker shuts down
        logging.info(f"Worker {worker_id}: Cleaning up Chrome WebDriver...")
        if scraper.driver:
            try:
                scraper.driver.quit()
                logging.info(f"Worker {worker_id}: Chrome WebDriver quit successfully")
            except Exception as e:
                logging.error(f"Worker {worker_id}: Error quitting Chrome WebDriver: {e}")
        if scraper.temp_dir and os.path.exists(scraper.temp_dir):
            try:
                shutil.rmtree(scraper.temp_dir)
                logging.info(f"Worker {worker_id}: Temp directory cleaned up: {scraper.temp_dir}")
            except Exception as e:
                logging.error(f"Worker {worker_id}: Error cleaning temp directory: {e}")

@asynccontextmanager
async def lifespan(app):
    logging.basicConfig(level=logging.INFO)
    
    # Clean up any leftover temp directories from previous runs
    cleanup_leftover_temp_dirs()
    
    # Start the background worker threads (NON-DAEMON for proper cleanup)
    workers = []
    for i in range(NUM_WORKERS):
        t = Thread(target=process_queue_worker, args=(i+1,), daemon=False)  # Changed to non-daemon
        t.start()
        workers.append(t)
    # Start CPU logging thread
    # cpu_thread = Thread(target=log_cpu_usage, daemon=True)
    # cpu_thread.start()
    try:
        yield
    finally:
        logging.info("Shutting down workers...")
        # Stop workers gracefully
        for _ in range(NUM_WORKERS):
            scrape_queue.put(None)
        # Wait for all workers to finish cleanup
        for i, t in enumerate(workers):
            logging.info(f"Waiting for worker {i+1} to finish...")
            t.join(timeout=15)  # Give each worker 5 seconds to cleanup
            if t.is_alive():
                logging.warning(f"Worker {i+1} did not finish cleanup in time")
        logging.info("All Chrome drivers shut down.")

app = FastAPI(lifespan=lifespan)

@app.api_route("/scrape", methods=["GET", "HEAD"])
def trigger_scrape():
    """
    Queue a scraping cycle for hardcoded pincodes.
    Returns a list of job IDs for status tracking.
    """
    pincodes_to_scrape = [110036, 122001, 122002, 122003, 122011, 122018, 122022]
    job_ids = []
    
    for pincode in pincodes_to_scrape:
        job_id = str(uuid.uuid4())
        job_status[job_id] = "queued"
        scrape_queue.put((job_id, pincode))
        job_ids.append({"pincode": pincode, "job_id": job_id})

    logging.info(f"Queued {len(job_ids)} scraping jobs")
    logging.info(f"Current jobs in queue: {scrape_queue.qsize()}")
    
    return {
        "success": True,
        "message": f"Scraping jobs queued for {len(job_ids)} pincodes.",
        "jobs": job_ids
    }

@app.get("/scrape_status/{job_id}")
def get_scrape_status(job_id: str):
    status = job_status.get(job_id, "not_found")
    return {"job_id": job_id, "status": status}

@app.api_route("/ping", methods=["GET", "HEAD"])
def ping():
    logging.info("pong")
    return {"message": "pong"} 