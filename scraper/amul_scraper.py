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

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AmulScraper:
    def __init__(self, test_mode=False):
        self.test_mode = test_mode
        self.driver = None
        self.session = requests.Session()
        
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
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info("Chrome WebDriver initialized (system driver)")
        except Exception as e:
            logger.error(f"Error initializing Chrome WebDriver: {e}")
            raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome is installed.")

        # try:
        #     # Try to use webdriver-manager
        #     service = Service(ChromeDriverManager().install())
        #     self.driver = webdriver.Chrome(service=service, options=chrome_options)
        #     logger.info("Chrome WebDriver initialized with webdriver-manager")
            
        # except Exception as e:
        #     logger.error(f"Error with webdriver-manager: {e}")
        #     logger.info("Trying alternative approach...")
            
        #     try:
        #         self.driver = webdriver.Chrome(options=chrome_options)
        #         logger.info("Chrome WebDriver initialized (system driver)")
        #         # Alternative: Try to use system ChromeDriver
        #     except Exception as e2:
        #         logger.error(f"Failed to initialize Chrome WebDriver: {e2}")
        #         raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome is installed.")

    def enter_pincode(self):
        """Enter PIN code on the Amul website and select from dropdown"""
        try:
            if not self.driver:
                logger.error("WebDriver is not initialized")
                return False
                
            # Find the PIN input field
            pin_input = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Pincode']"))
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
                    EC.invisibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Pincode']"))
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
                return []
                
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            products = []
            product_elements = soup.select(".product-grid-item")
            
            if not product_elements:
                logger.warning("No products found with .product-grid-item selector")
                return []
                
            for element in product_elements:
                try:
                    # Extract product information
                    product_name = element.select_one(".product-name, .name, h3, h4")
                    product_name = product_name.get_text(strip=True) if product_name else "Unknown Product"
                    
                    # Extract product ID from URL or data attribute
                    product_link = element.select_one("a")
                    product_id = None
                    if product_link:
                        href = product_link.get('href', '')
                        if '/product/' in href:
                            product_id = href.split('/product/')[-1].split('/')[0]
                        elif '/en/product/' in href:
                            product_id = href.split('/en/product/')[-1].split('/')[0]
                    
                    if not product_id:
                        # Generate a product ID from name if not found
                        product_id = product_name.lower().replace(' ', '-').replace('&', 'and')
                    
                    # Check if product is sold out
                    sold_out = False
                    sold_out_indicators = [
                        "sold out", "out of stock", "unavailable", "not available"
                    ]
                    
                    # Check text content for sold out indicators
                    element_text = element.get_text().lower()
                    for indicator in sold_out_indicators:
                        if indicator in element_text:
                            sold_out = True
                            break
                    
                    # Check for specific CSS classes that indicate sold out
                    sold_out_classes = [
                        ".sold-out", ".out-of-stock", ".unavailable", 
                        ".stock-status", ".availability"
                    ]
                    for class_name in sold_out_classes:
                        sold_out_elem = element.select_one(class_name)
                        if sold_out_elem:
                            sold_out_text = sold_out_elem.get_text().lower()
                            for indicator in sold_out_indicators:
                                if indicator in sold_out_text:
                                    sold_out = True
                                    break
                    
                    product = {
                        'productId': product_id,
                        'name': product_name,
                        'sold_out': sold_out
                    }
                    products.append(product)
                    
                except Exception as e:
                    logger.error(f"Error processing product element: {e}")
                    continue
            
            logger.info(f"Successfully scraped {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Error scraping products: {e}")
            return []
            
    def send_stock_changes_to_backend(self, products):
        """Send scraped data to backend for processing"""
        try:
            response = self.session.post(
                f"{BACKEND_API_BASE}/stock-changes",
                json={
                    'products': products,
                    'timestamp': time.time(),
                    'scraper_id': 'amul-scraper-1',
                    'pincode': PIN_CODE
                },
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code == 200:
                result = response.json()
                logger.info(f"Successfully sent {len(products)} products to backend")
                if result.get('success'):
                    logger.info("Backend processed successfully.")
                else:
                    logger.warning("Backend did not report success.")
                return True
            else:
                logger.error(f"Failed to send data to backend: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending data to backend: {e}")
            return False
            
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
                # Wait for products to load
                try:
                    WebDriverWait(self.driver, 15).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                    )
                    logger.info("Products loaded successfully")
                except Exception as e:
                    logger.warning(f"Products did not load after refresh: {e}")
                    self.driver.refresh()
                    time.sleep(5)

            # Scrape products
            logger.info("Starting to scrape products...")
            products = self.scrape_products()
            if not products:
                logger.warning("No products found")
                return

            # === RESTOCK SIMULATION FOR TESTING ===
            # Force the first product to be in stock (simulate restock)
            # Comment out the next two lines after testing
            # if products:
            #     products[0]['sold_out'] = False
            #     logger.info(f"[TEST] Forced restock for product: {products[1]['name']} ({products[1]['productId']})")
            # === END RESTOCK SIMULATION ===

            logger.info(f"Successfully scraped {len(products)} products")
                
            # Send data to backend for processing
            logger.info("Sending data to backend...")
            self.send_stock_changes_to_backend(products)
            
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
    scraper = AmulScraper(test_mode=False)
    scraper.run_once()