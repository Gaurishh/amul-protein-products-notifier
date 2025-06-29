#!/usr/bin/env python3
"""
Main entry point for the Amul Protein Products Scraper
"""

import argparse
import logging
import sys
from amul_scraper import AmulScraper
from email_notifier import EmailNotifier
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

def main():
    # Declare globals at the top of the function
    global HEADLESS_MODE, SCRAPE_INTERVAL
    
    parser = argparse.ArgumentParser(description='Amul Protein Products Scraper and Notifier')
    parser.add_argument('--once', action='store_true', help='Run scraper once and exit')
    parser.add_argument('--continuous', action='store_true', help='Run scraper continuously')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--interval', type=int, default=SCRAPE_INTERVAL, 
                       help=f'Scraping interval in seconds (default: {SCRAPE_INTERVAL})')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    # Override config if headless mode is specified
    if args.headless:
        HEADLESS_MODE = True
    
    # Override interval if specified
    if args.interval != SCRAPE_INTERVAL:
        SCRAPE_INTERVAL = args.interval
    
    logger.info("Starting Amul Protein Products Scraper")
    logger.info(f"Backend API: {BACKEND_API_BASE}")
    logger.info(f"Amul URL: {AMUL_URL}")
    logger.info(f"PIN Code: {PIN_CODE}")
    logger.info(f"Scrape Interval: {SCRAPE_INTERVAL}s")
    logger.info(f"Headless Mode: {HEADLESS_MODE}")
    
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
    main()