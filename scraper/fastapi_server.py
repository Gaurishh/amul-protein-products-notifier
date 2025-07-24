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

scraper = None
scrape_queue = Queue()
queue_lock = Lock()
job_status = {}

# MongoDB setup
client = MongoClient(MONGO_URI)

def log_cpu_usage():
    p = psutil.Process()
    while True:
        cpu = p.cpu_percent(interval=1)
        logging.info(f"[CPU] Overall process CPU usage: {cpu:.2f}%")

@asynccontextmanager
async def lifespan(app):
    global scraper
    logging.basicConfig(level=logging.INFO)
    scraper = AmulScraper()
    scraper.setup_driver()
    logging.info("AmulScraper and Chrome driver initialized.")
    # Start the background worker thread
    worker_thread = Thread(target=process_queue, daemon=True)
    worker_thread.start()
    # Start CPU logging thread
    cpu_thread = Thread(target=log_cpu_usage, daemon=True)
    cpu_thread.start()
    try:
        yield
    finally:
        if scraper and scraper.driver:
            scraper.driver.quit()
        logging.info("AmulScraper and Chrome driver shut down.")

def process_queue():
    global scraper
    while True:
        job = scrape_queue.get()
        if job is None:
            break
        job_id, pincode = job
        job_status[job_id] = "in_progress"
        try:
            if scraper and scraper.driver:
                scraper.pincode = pincode
                scraper.run_scrape_cycle()
                job_status[job_id] = "completed"
            else:
                job_status[job_id] = "failed: scraper or driver not initialized"
        except Exception as e:
            job_status[job_id] = f"failed: {str(e)}"
        scrape_queue.task_done()

app = FastAPI(lifespan=lifespan)

@app.api_route("/scrape", methods=["GET", "HEAD"])
def trigger_scrape():
    """
    Queue a scraping cycle for hardcoded pincodes.
    Returns a list of job IDs for status tracking.
    """
    global scraper
    if not scraper or not scraper.driver:
        logging.error("Scraper or driver not initialized")
        # return {"success": False, "message": "Scraper or driver not initialized."}
    
    pincodes_to_scrape = [110036, 122001, 122002, 122003, 122011, 122018, 122022]
    job_ids = []
    
    for pincode in pincodes_to_scrape:
        job_id = str(uuid.uuid4())
        job_status[job_id] = "queued"
        scrape_queue.put((job_id, pincode))
        job_ids.append({"pincode": pincode, "job_id": job_id})

    logging.info(f"Queued {len(job_ids)} scraping jobs")
    logging.info(f"Current jobs in queue: {scrape_queue.qsize()}")
    
    # return {
    #     "success": True,
    #     "message": f"Scraping jobs queued for {len(job_ids)} pincodes.",
    #     "jobs": job_ids
    # }

@app.get("/scrape_status/{job_id}")
def get_scrape_status(job_id: str):
    status = job_status.get(job_id, "not_found")
    return {"job_id": job_id, "status": status}

@app.api_route("/ping", methods=["GET", "HEAD"])
def ping():
    logging.info("pong")
    return {"message": "pong"} 