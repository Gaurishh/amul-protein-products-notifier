#!/usr/bin/env python3
"""
Test script for debugging the Amul scraper locally
"""

import os
import sys
import logging
from amul_scraper import AmulScraper

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_scraper():
    """Test the scraper with detailed logging"""
    try:
        logger.info("Starting scraper test...")
        
        # Initialize scraper
        scraper = AmulScraper(test_mode=True)
        
        # Test driver setup
        logger.info("Testing driver setup...")
        scraper.setup_driver()
        
        if not scraper.driver:
            logger.error("Driver not initialized!")
            return False
            
        logger.info("Driver setup successful!")
        
        # Test page navigation
        logger.info("Testing page navigation...")
        scraper.driver.get("https://shop.amul.com/en/browse/protein")
        logger.info(f"Page title: {scraper.driver.title}")
        
        # Test PIN code entry
        logger.info("Testing PIN code entry...")
        if scraper.enter_pincode():
            logger.info("PIN code entry successful!")
        else:
            logger.error("PIN code entry failed!")
            return False
            
        # Test product scraping
        logger.info("Testing product scraping...")
        products = scraper.scrape_products()
        
        if products:
            logger.info(f"Successfully scraped {len(products)} products:")
            for product in products[:3]:  # Show first 3 products
                logger.info(f"  - {product['name']} (ID: {product['productId']}, Sold out: {product['sold_out']})")
        else:
            logger.error("No products scraped!")
            return False
            
        logger.info("All tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return False
    finally:
        if 'scraper' in locals() and scraper.driver:
            scraper.driver.quit()
            logger.info("Driver closed")

if __name__ == "__main__":
    success = test_scraper()
    sys.exit(0 if success else 1) 