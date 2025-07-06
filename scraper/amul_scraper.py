import time
import requests
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import logging
from config import *
from email_notifier import EmailNotifier
import os
from pymongo import MongoClient

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AmulScraper:
    def __init__(self, test_mode=False):
        self.test_mode = test_mode
        self.driver = None
        self.session = requests.Session()
        self.email_notifier = EmailNotifier()
        self.mongo_client = MongoClient(MONGO_URI)
        self.db = self.mongo_client.get_default_database()
        self.stock_status_collection = self.db['stock_status']
        self.previous_stock_status = self.load_stock_status()
        
    def setup_driver(self):
        """Set up Chrome WebDriver with appropriate options"""
        chrome_options = Options()
        if HEADLESS_MODE:
            chrome_options.add_argument("--headless=new")
        logger.info(f"Headless mode: {HEADLESS_MODE}")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        try:
            # Try to use webdriver-manager
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("Chrome WebDriver initialized with webdriver-manager")
            
        except Exception as e:
            logger.error(f"Error with webdriver-manager: {e}")
            logger.info("Trying alternative approach...")
            
            try:
                # Alternative: Try to use system ChromeDriver
                self.driver = webdriver.Chrome(options=chrome_options)
                logger.info("Chrome WebDriver initialized (system driver)")
            except Exception as e2:
                logger.error(f"Failed to initialize Chrome WebDriver: {e2}")
                raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome is installed.")

    def enter_pincode(self):
        """Enter PIN code on the Amul website and select from dropdown"""
        try:
            if not self.driver:
                logger.error("WebDriver is not initialized")
                return False
                
            # Find the PIN input field
            pin_input = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='PIN'], input[placeholder*='pin'], input[placeholder*='Pincode'], input[placeholder*='pincode']"))
            )
            pin_input.clear()
            pin_input.send_keys(PIN_CODE)
            time.sleep(1.5)  # Give time for dropdown to appear

            # Wait for the dropdown item to appear (try both li and div)
            dropdown_item = None
            try:
                dropdown_item = WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.XPATH, f"//*[text()='{PIN_CODE}']"))
                )
                logger.info("Dropdown item found, attempting to click...")
                # Try normal click
                try:
                    dropdown_item.click()
                except Exception as e:
                    logger.warning(f"Normal click failed: {e}, trying JS click...")
                    if self.driver:
                        self.driver.execute_script("arguments[0].click();", dropdown_item)
                logger.info(f"Selected PIN code from dropdown: {PIN_CODE}")
            except Exception as e:
                logger.error(f"Dropdown with PIN code not found: {e}")
                if self.driver:
                    logger.error(self.driver.page_source)  # Log page source for debugging
                return False

            # Wait for the modal to disappear (input to become stale or invisible)
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.invisibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='PIN'], input[placeholder*='pin'], input[placeholder*='Pincode'], input[placeholder*='pincode']"))
                )
                logger.info("PIN modal closed.")
            except Exception:
                logger.warning("PIN modal did not close after selection.")

            # Wait for products to load
            time.sleep(5)
            return True

        except Exception as e:
            logger.error(f"Error entering PIN code: {e}")
            if self.driver:
                logger.error(self.driver.page_source)  # Log page source for debugging
            return False
            
    def scrape_products(self):
        """Scrape all products and their stock status"""
        try:
            if not self.driver:
                logger.error("WebDriver is not initialized.")
                return []
                
            # Wait for product cards to load
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                )
                logger.info("Product grid items found")
            except Exception as e:
                logger.error(f"Product grid items not found: {e}")
                # Log page source for debugging
                if self.driver:
                    logger.error(f"Page source: {self.driver.page_source[:1000]}...")  # First 1000 chars
                return []
                
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            products = []
            product_elements = soup.select(".product-grid-item")
            if not product_elements:
                logger.warning("No products found with .product-grid-item selector")
                # Try alternative selectors
                alternative_selectors = [".product-item", ".product", "[data-product]", ".item"]
                for selector in alternative_selectors:
                    product_elements = soup.select(selector)
                    if product_elements:
                        logger.info(f"Found products using alternative selector: {selector}")
                        break
                        
            if not product_elements:
                logger.error("No products found with any selector")
                return []
                
            for element in product_elements:
                try:
                    # Product name
                    name_element = element.select_one(".product-grid-name a")
                    if not name_element:
                        # Try alternative name selectors
                        name_element = element.select_one(".product-name a, .name a, h3 a, h4 a")
                    if not name_element:
                        continue
                    name = name_element.get_text(strip=True)
                    # Product ID (from href or name)
                    href = name_element.get('href', '')
                    product_id = href.split('/')[-1] if isinstance(href, str) and href else name.lower().replace(" ", "-")
                    # Stock status
                    sold_out = bool(element.select_one(".stock-indicator-text"))
                    products.append({
                        "productId": product_id,
                        "name": name,
                        "sold_out": sold_out
                    })
                except Exception as e:
                    logger.error(f"Error parsing product element: {e}")
                    continue
            logger.info(f"Scraped {len(products)} products")
            return products
        except Exception as e:
            logger.error(f"Error scraping products: {e}")
            return []
            
    def seed_products_to_backend(self, products):
        """Send new products to backend API"""
        for product in products:
            try:
                # Check if product already exists
                response = self.session.get(f"{BACKEND_API_BASE}/products")
                if response.status_code == 200:
                    existing_products = response.json()
                    product_exists = any(p.get('productId') == product['productId'] for p in existing_products)
                    
                    if not product_exists:
                        # Add new product
                        add_response = self.session.post(
                            f"{BACKEND_API_BASE}/products",
                            json={
                                "productId": product['productId'],
                                "name": product['name']
                            },
                            headers={'Content-Type': 'application/json'}
                        )
                        
                        if add_response.status_code == 200:
                            logger.info(f"Added new product: {product['name']}")
                        else:
                            logger.error(f"Failed to add product {product['name']}: {add_response.status_code}")
                            
            except Exception as e:
                logger.error(f"Error seeding product {product['name']}: {e}")
                
    def load_stock_status(self):
        try:
            status_dict = {}
            for doc in self.stock_status_collection.find():
                status_dict[doc['productId']] = doc['sold_out']
            return status_dict
        except Exception as e:
            logger.error(f"Error loading stock status from DB: {e}")
            return {}

    def save_stock_status(self):
        try:
            for productId, sold_out in self.previous_stock_status.items():
                self.stock_status_collection.update_one(
                    {'productId': productId},
                    {'$set': {'sold_out': sold_out}},
                    upsert=True
                )
        except Exception as e:
            logger.error(f"Error saving stock status to DB: {e}")

    def check_stock_changes(self, current_products):
        """Check for stock status changes and notify users with a single email for all restocked products"""
        restocked_products = []
        for product in current_products:
            product_id = product['productId']
            current_status = product['sold_out']
            previous_status = self.previous_stock_status.get(product_id, None)

            # If status changed from sold out to in stock
            if previous_status is not None and previous_status and not current_status:
                logger.info(f"Product {product['name']} is back in stock!")
                restocked_products.append(product)

            # Update previous status
            self.previous_stock_status[product_id] = current_status
        self.save_stock_status()

        if restocked_products:
            self.notify_all_subscribers(restocked_products)
            
    def notify_all_subscribers(self, restocked_products):
        """Send a single email to each subscriber listing only the products they subscribed to that are now back in stock"""
        try:
            # Build a mapping: subscriber -> list of products
            subscriber_to_products = {}
            for product in restocked_products:
                product_id = product['productId']
                response = self.session.get(f"{BACKEND_API_BASE}/product/{product_id}/subscribers")
                if response.status_code == 200:
                    subscribers = response.json()
                    for subscriber in subscribers:
                        if subscriber not in subscriber_to_products:
                            subscriber_to_products[subscriber] = []
                        subscriber_to_products[subscriber].append(product)
            if not subscriber_to_products:
                logger.info("No subscribers to notify for restocked products.")
                return
            # Send one email to each subscriber with their relevant products
            for subscriber, products in subscriber_to_products.items():
                product_lines = [f"• {p['name']}" for p in products]
                body = (
                    "Hello!\n\nThe following products you subscribed to are now back in stock:\n\n" +
                    "\n".join(product_lines) +
                    "\n\nYou can now purchase them from the Amul website.\n\nBest regards,\nAmul Protein Products Notifier"
                )
                self.email_notifier.send_email(subscriber, "Products Back in Stock!", body)
            logger.info(f"Sent restock notification to {len(subscriber_to_products)} subscribers for {len(restocked_products)} products.")
        except Exception as e:
            logger.error(f"Error sending bulk restock notification: {e}")
            
    def run_scrape_cycle(self, first_time=False):
        """Run one complete scraping cycle"""
        try:
            if not self.driver:
                logger.error("WebDriver is not initialized.")
                return
            logger.info("Starting scraping cycle")
            
            # Navigate to the page
            self.driver.get(AMUL_URL)
            logger.info(f"Navigated to {AMUL_URL}")
            
            # Wait for page to load
            time.sleep(3)
            
            if first_time:
                # Only enter PIN code on the first cycle
                logger.info("Entering PIN code...")
                if not self.enter_pincode():
                    logger.error("Failed to enter PIN code")
                    return
            else:
                # Wait for products to load (adjust selector as needed)
                try:
                    logger.info("Waiting for products to load...")
                    WebDriverWait(self.driver, 15).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                    )
                    logger.info("Products loaded successfully")
                except Exception as e:
                    logger.warning(f"Products did not load after refresh: {e}")
                    # Try to refresh the page
                    logger.info("Refreshing page...")
                    self.driver.refresh()
                    time.sleep(5)
                    try:
                        WebDriverWait(self.driver, 15).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                        )
                        logger.info("Products loaded after refresh")
                    except Exception as e2:
                        logger.error(f"Products still not loading after refresh: {e2}")
                        return

            # Scrape products
            logger.info("Starting to scrape products...")
            products = self.scrape_products()
            if not products:
                logger.warning("No products found")
                return
                
            logger.info(f"Successfully scraped {len(products)} products")
                
            # --- TEST MODE: Simulate a product restock ---
            if self.test_mode and products:
                test_product_id = products[0]['productId']
                logger.info(f"[TEST MODE] Forcing {test_product_id} to trigger restock notification.")
                self.previous_stock_status[test_product_id] = True  # Simulate it was out of stock
            # --- END TEST MODE ---
            
            # Seed new products to backend
            logger.info("Seeding products to backend...")
            self.seed_products_to_backend(products)
            
            # Check for stock changes
            logger.info("Checking for stock changes...")
            self.check_stock_changes(products)
            
            logger.info("Scraping cycle completed successfully")
            
        except Exception as e:
            logger.error(f"Error in scraping cycle: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
    def run_continuous(self):
        """Run scraper continuously with specified interval"""
        try:
            self.setup_driver()
            logger.info(f"Starting continuous scraping with {SCRAPE_INTERVAL}s interval")
            first_time = True
            while True:
                self.run_scrape_cycle(first_time=first_time)
                first_time = False
                time.sleep(SCRAPE_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("Scraping stopped by user")
        except Exception as e:
            logger.error(f"Error in continuous scraping: {e}")
        finally:
            if self.driver:
                self.driver.quit()
                logger.info("WebDriver closed")
                
    def run_once(self):
        """Run scraper once for testing"""
        try:
            self.setup_driver()
            self.run_scrape_cycle(first_time=True)
        finally:
            if self.driver:
                self.driver.quit()
                logger.info("WebDriver closed")

if __name__ == "__main__":
    scraper = AmulScraper(test_mode=True)
    scraper.run_once()  # For testing
    # scraper.run_continuous()  # For production 