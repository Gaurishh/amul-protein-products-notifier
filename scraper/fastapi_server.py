from fastapi import FastAPI, BackgroundTasks
from amul_scraper import AmulScraper
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel
from threading import Thread, Lock
from queue import Queue
import uuid
import time

scraper = None
scrape_queue = Queue()
queue_lock = Lock()
job_status = {}

class ScrapeRequest(BaseModel):
    pincode: str

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
def trigger_scrape(scrape_req: ScrapeRequest):
    """
    Queue a scraping cycle for a specific pincode. Returns a job ID for status tracking.
    """
    global scraper
    if not scraper or not scraper.driver:
        return {"success": False, "message": "Scraper or driver not initialized."}
    job_id = str(uuid.uuid4())
    job_status[job_id] = "queued"
    scrape_queue.put((job_id, scrape_req.pincode))
    return {"success": True, "message": f"Scraping job queued for pincode {scrape_req.pincode}.", "job_id": job_id}

@app.get("/scrape_status/{job_id}")
def get_scrape_status(job_id: str):
    status = job_status.get(job_id, "not_found")
    return {"job_id": job_id, "status": status}

@app.get("/ping")
def ping():
    logging.info("pong")
    return {"message": "pong"} 