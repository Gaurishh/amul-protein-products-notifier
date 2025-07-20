from fastapi import FastAPI, BackgroundTasks
from amul_scraper import AmulScraper
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel
from threading import Thread, Lock
from queue import Queue
import uuid
import time
from pymongo import MongoClient
from config import MONGO_URI
from datetime import datetime, timedelta
import requests
from config import BACKEND_API_BASE

scraper = None
scrape_queue = Queue()
queue_lock = Lock()
job_status = {}

# MongoDB setup
client = MongoClient(MONGO_URI)
db = client.get_database()
pincodes_collection = db["pincodes"]

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

@app.post("/scrape")
def trigger_scrape():
    """
    Queue a scraping cycle for all pincodes in the MongoDB collection.
    If a pincode's lastInteracted is more than 7 days old, delete it instead of scraping.
    Returns a list of job IDs for status tracking.
    """
    global scraper
    if not scraper or not scraper.driver:
        return {"success": False, "message": "Scraper or driver not initialized."}
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    job_ids = []
    pincodes_cursor = pincodes_collection.find({}, {"pincode": 1, "lastInteracted": 1})
    for doc in pincodes_cursor:
        pincode = doc["pincode"]
        last_interacted = doc.get("lastInteracted")
        if last_interacted:
            # Convert to datetime if it's not already
            if isinstance(last_interacted, str):
                last_interacted = datetime.fromisoformat(last_interacted)
            elif hasattr(last_interacted, 'to_pydatetime'):
                last_interacted = last_interacted.to_pydatetime()
        if not last_interacted or last_interacted >= week_ago:
            job_id = str(uuid.uuid4())
            job_status[job_id] = "queued"
            scrape_queue.put((job_id, pincode))
            job_ids.append({"pincode": pincode, "job_id": job_id})
        else:
            # lastInteracted is older than a week, delete this pincode via backend API
            try:
                resp = requests.delete(f"{BACKEND_API_BASE}/pincode/{pincode}")
                if resp.status_code != 200:
                    logging.error(f"Failed to delete pincode {pincode} via backend API: {resp.status_code} {resp.text}")
            except Exception as e:
                logging.error(f"Exception while deleting pincode {pincode} via backend API: {e}")
    return {
        "success": True,
        "message": f"Scraping jobs queued for {len(job_ids)} pincodes. Old pincodes deleted.",
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