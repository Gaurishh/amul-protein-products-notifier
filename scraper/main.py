#!/usr/bin/env python3
"""
Main entry point for the Amul Protein Products Scraper
This scraper only handles data collection and sends data to backend for processing
"""

import argparse
import logging
import sys
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

def main():
    parser = argparse.ArgumentParser(description='Amul Protein Products Scraper')
    parser.add_argument('--once', action='store_true', help='Run scraper once and exit')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    parser.add_argument('--pincode', type=str, default=None, help='PIN code to use for scraping (overrides .env)')
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    pincode = args.pincode if args.pincode else PIN_CODE
    
    logger.info("Starting Amul Protein Products Scraper")
    logger.info(f"Backend API: {BACKEND_API_BASE}")
    logger.info(f"Amul URL: {AMUL_URL}")
    logger.info(f"PIN Code: {pincode}")
    logger.info(f"Headless Mode: {HEADLESS_MODE}")
    logger.info("This scraper only collects data and sends to backend for processing")
    
    # Initialize scraper
    scraper = AmulScraper(pincode=pincode)
    
    try:
        logger.info("Running scraper once...")
        scraper.run_once()
        
    except KeyboardInterrupt:
        logger.info("Scraping stopped by user")
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
