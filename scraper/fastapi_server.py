from fastapi import FastAPI
from amul_scraper import AmulScraper
import logging
from contextlib import asynccontextmanager
from threading import Thread, Lock
from queue import Queue
import uuid
import time
import requests
from config import BACKEND_API_BASE
import psutil

# Queues for staging jobs
scrape_queue = Queue()
backend_queue = Queue()
queue_lock = Lock()
job_status = {}  # job_id -> status

scraper = None

# CPU logging function (optional)
def log_cpu_usage():
    p = psutil.Process()
    while True:
        cpu = p.cpu_percent(interval=1)
        logging.info(f"[CPU] Overall process CPU usage: {cpu:.2f}%")

# Lifespan to initialize scraper and worker threads
@asynccontextmanager
async def lifespan(app):
    global scraper
    logging.basicConfig(level=logging.INFO)
    scraper = AmulScraper()
    scraper.setup_driver()
    logging.info("AmulScraper and Chrome driver initialized.")

    # Start worker threads
    Thread(target=scrape_worker, daemon=True).start()
    Thread(target=backend_worker, daemon=True).start()
    # Thread(target=log_cpu_usage, daemon=True).start()

    try:
        yield
    finally:
        # Signal shutdown
        scrape_queue.put(None)
        backend_queue.put(None)
        if scraper and scraper.driver:
            scraper.driver.quit()
        logging.info("Shutdown complete.")

app = FastAPI(lifespan=lifespan)

# Worker to process scraping jobs
def scrape_worker():
    while True:
        job = scrape_queue.get()
        if job is None:
            break
        job_id, pincode = job
        job_status[job_id] = "in_progress_scrape"
        try:
            scraper.pincode = pincode
            products = scraper.run_scrape_cycle()
            job_status[job_id] = "scraped"
            # Queue for backend sending
            backend_queue.put((job_id, pincode, products))
        except Exception as e:
            job_status[job_id] = f"failed_scrape: {e}"
        scrape_queue.task_done()

# Worker to send scraped data to backend
def backend_worker():
    while True:
        job = backend_queue.get()
        if job is None:
            break
        job_id, pincode, products = job
        job_status[job_id] = "in_progress_send"
        success = _send_to_backend(pincode, products)
        job_status[job_id] = "completed" if success else "failed_send"
        backend_queue.task_done()

# Extraction of send logic into function

def _send_to_backend(pincode, products):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{BACKEND_API_BASE}/stock-changes",
                json={
                    'products': products,
                    'timestamp': time.time(),
                    'scraper_id': 'amul-scraper-1',
                    'pincode': pincode
                },
                headers={'Content-Type': 'application/json'}
            )
            if response.status_code == 200:
                logging.info(f"Backend processed successfully for pincode {pincode}")
                return True
            else:
                logging.error(f"Failed send, status {response.status_code}")
        except Exception as e:
            logging.error(f"Error sending to backend: {e}")
        time.sleep(1)
    return False

# API endpoint to queue scrape jobs
@app.api_route("/scrape", methods=["GET", "HEAD"])
def trigger_scrape():
    pincodes = [110036, 122003]
    jobs = []
    for pin in pincodes:
        job_id = str(uuid.uuid4())
        job_status[job_id] = "queued"
        scrape_queue.put((job_id, pin))
        jobs.append({"job_id": job_id, "pincode": pin})
    logging.info(f"Queued {len(jobs)} scrape jobs.")
    return {"jobs": jobs}

# Endpoint to check job status
@app.get("/scrape_status/{job_id}")
def get_status(job_id: str):
    status = job_status.get(job_id, "not_found")
    return {"job_id": job_id, "status": status}

# Simple ping
@app.get("/ping")
def ping():
    return {"message": "pong"}