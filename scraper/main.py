#!/usr/bin/env python3
"""
Main entry point for the Amul Protein Products Scraper
This scraper only handles data collection and sends data to backend for processing
"""

import argparse
import logging
import sys
import threading
import os
from amul_scraper import AmulScraper
from config import *

def setup_logging(verbose=False):
    """Set up logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('scraper.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )

def exit_after_timeout():
    print("[TIMEOUT] Scraper exceeded 2 minutes. Exiting.")
    sys.stdout.flush()
    os._exit(1)

def main():
    parser = argparse.ArgumentParser(description='Amul Protein Products Scraper')
    parser.add_argument('--once', action='store_true', help='Run scraper once and exit')
    parser.add_argument('--continuous', action='store_true', help='Run scraper continuously')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    parser.add_argument('--interval', type=int, default=SCRAPE_INTERVAL, 
                       help=f'Scraping interval in seconds (default: {SCRAPE_INTERVAL})')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    interval = args.interval
    
    logger.info("Starting Amul Protein Products Scraper")
    logger.info(f"Backend API: {BACKEND_API_BASE}")
    logger.info(f"Amul URL: {AMUL_URL}")
    logger.info(f"PIN Code: {PIN_CODE}")
    logger.info(f"Scrape Interval: {interval}s")
    logger.info(f"Headless Mode: {HEADLESS_MODE}")
    logger.info("This scraper only collects data and sends to backend for processing")
    
    # Initialize scraper
    scraper = AmulScraper()
    
    try:
        if args.once:
            logger.info("Running scraper once...")
            scraper.run_once()
        elif args.continuous:
            logger.info("Running scraper continuously...")
            scraper.run_continuous()
        else:
            # Default: run once
            logger.info("Running scraper once (default)...")
            scraper.run_once()
            
    except KeyboardInterrupt:
        logger.info("Scraping stopped by user")
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Start a timer to exit after 120 seconds (2 minutes)
    timeout_timer = threading.Timer(120, exit_after_timeout)
    timeout_timer.start()
    try:
        main()
    finally:
        timeout_timer.cancel()