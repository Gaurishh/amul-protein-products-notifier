import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import logging
from config import *
from selenium.common.exceptions import ElementNotInteractableException, TimeoutException
import psutil
import shutil
import tempfile
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AmulScraper:
    def __init__(self, test_mode=False, pincode=None, id=0):
        from config import PIN_CODE
        self.test_mode = test_mode
        self.driver = None
        self.session = requests.Session()
        self.pincode = pincode if pincode else PIN_CODE
        self.id = id
        timestamp = int(time.time() * 1000)
        unique_id = str(uuid.uuid4())[:8]  # Short unique ID
        self.temp_dir = tempfile.mkdtemp(prefix=f"chrome_worker_{self.id}_{unique_id}_")
        
    def setup_driver(self):
        """Set up Chrome WebDriver with appropriate options"""
        chrome_options = Options()
        if HEADLESS_MODE:
            chrome_options.add_argument("--headless=new")
        logger.info(f"Worker {self.id}: Headless mode: {HEADLESS_MODE}")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-plugins")
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        # Use unique user data directory for each worker to prevent conflicts
        chrome_options.add_argument(f"--user-data-dir={self.temp_dir}")
        
        # Additional options for better stability on cloud platforms
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")
        chrome_options.add_argument("--disable-renderer-backgrounding")
        chrome_options.add_argument("--disable-features=TranslateUI")
        chrome_options.add_argument("--disable-ipc-flooding-protection")
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            logger.info(f"Worker {self.id}: Chrome WebDriver initialized (system driver) with temp dir: {self.temp_dir}")
            # Log RAM usage of Chrome WebDriver
            try:
                chrome_pid = self.driver.service.process.pid
                p = psutil.Process(chrome_pid)
                mem_mb = p.memory_info().rss / (1024 * 1024)
                logger.info(f"Worker {self.id}: Chrome WebDriver RAM usage: {mem_mb:.2f} MB (PID: {chrome_pid})")
            except Exception as e:
                logger.warning(f"Worker {self.id}: Could not log Chrome WebDriver RAM usage: {e}")
        except Exception as e:
            logger.error(f"Worker {self.id}: Error initializing Chrome WebDriver: {e}")
            raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome is installed.")

    def enter_pincode(self):
        """Enter PIN code on the Amul website and select from dropdown"""
        try:
            if not self.driver:
                logger.error(f"Worker {self.id}: WebDriver is not initialized")
                return False
            
            # Find the PIN input field robustly
            try:
                pin_input = WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Pincode']"))
                )
                if not (pin_input.is_displayed() and pin_input.is_enabled()):
                    raise ElementNotInteractableException("PIN input not interactable")
            except (TimeoutException, ElementNotInteractableException):
                print("hi1b: input not interactable, checking modal and location button")
                # Check if modal is already open
                modal_open = False
                try:
                    modal = self.driver.find_element(By.CSS_SELECTOR, "#locationWidgetModal.show")
                    logger.info(f"Worker {self.id}: Location modal is already open.")
                    modal_open = True
                except Exception:
                    modal_open = False
                if not modal_open:
                    try:
                        location_button = WebDriverWait(self.driver, 5).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='button'].pincode_wrap"))
                        )
                        location_button.click()
                        logger.info(f"Worker {self.id}: Clicked location button to open PIN code modal.")
                        time.sleep(1)
                    except Exception as e:
                        logger.error(f"Worker {self.id}: Could not find or click location button: {e}")
                        return False
                # Now wait for the input to become visible
                try:
                    pin_input = WebDriverWait(self.driver, 10).until(
                        EC.visibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Pincode']"))
                    )
                except Exception as e:
                    logger.error(f"Worker {self.id}: Could not find PIN input after opening modal: {e}")
                    return False
            pin_input.clear()
            pin_input.send_keys(self.pincode)
            time.sleep(1.5)  # Give time for dropdown to appear

            # Wait for the dropdown item to appear (try both li and div)
            dropdown_item = None
            try:
                dropdown_item = WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.XPATH, f"//*[text()='{self.pincode}']"))
                )
                logger.info(f"Worker {self.id}: Dropdown item found, attempting to click...")
                # Try normal click
                try:
                    dropdown_item.click()
                except Exception as e:
                    logger.warning(f"Worker {self.id}: Normal click failed: {e}, trying JS click...")
                    if self.driver:
                        self.driver.execute_script("arguments[0].click();", dropdown_item)
                logger.info(f"Worker {self.id}: Selected PIN code from dropdown: {self.pincode}")
            except Exception as e:
                logger.error(f"Worker {self.id}: Dropdown with PIN code not found: {e}")
                if self.driver:
                    logger.error(f"Worker {self.id}: {self.driver.page_source}")  # Log page source for debugging
                return False

            # Wait for the modal to disappear (input to become stale or invisible)
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.invisibility_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Pincode']"))
                )
                logger.info(f"Worker {self.id}: PIN modal closed.")
            except Exception:
                logger.warning(f"Worker {self.id}: PIN modal did not close after selection.")

            # Wait for products to load
            time.sleep(5)
            return True

        except Exception as e:
            logger.error(f"Worker {self.id}: Error entering PIN code: {e}")
            if self.driver:
                logger.error(f"Worker {self.id}: {self.driver.page_source}")  # Log page source for debugging
            return False
            
    def scrape_products(self):
        """Scrape all products and their stock status"""
        try:
            if not self.driver:
                logger.error(f"Worker {self.id}: WebDriver is not initialized.")
                return []
                
            # Wait for product cards to load
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                )
                logger.info(f"Worker {self.id}: Product grid items found")
            except Exception as e:
                logger.error(f"Worker {self.id}: Product grid items not found: {e}")
                return []
                
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            products = []
            product_elements = soup.select(".product-grid-item")
            
            if not product_elements:
                logger.warning(f"Worker {self.id}: No products found with .product-grid-item selector")
                return []
                
            for element in product_elements:
                try:
                    # Extract product information
                    product_name_elem = element.select_one(".product-grid-name a")
                    product_name = product_name_elem.get_text(strip=True) if product_name_elem else "Unknown Product"
                    
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
                    logger.error(f"Worker {self.id}: Error processing product element: {e}")
                    continue
            
            logger.info(f"Worker {self.id}: Successfully scraped {len(products)} products")
            return products
            
        except Exception as e:
            logger.error(f"Worker {self.id}: Error scraping products: {e}")
            return []
            
    def send_stock_changes_to_backend(self, products):
        """Send scraped data to backend for processing, with retry logic."""
        max_retries = 3
        delay = 1  # seconds
        for attempt in range(max_retries):
            try:
                response = self.session.post(
                    f"{BACKEND_API_BASE}/stock-changes",
                    json={
                        'products': products,
                        'timestamp': time.time(),
                        'scraper_id': 'amul-scraper-1',
                        'pincode': self.pincode
                    },
                    headers={'Content-Type': 'application/json'}
                )

                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Worker {self.id}: Successfully sent {len(products)} products to backend")
                    if result.get('success'):
                        logger.info(f"Worker {self.id}: Backend processed successfully.")
                    else:
                        logger.warning(f"Worker {self.id}: Backend did not report success.")
                    return True
                else:
                    logger.error(f"Worker {self.id}: Failed to send data to backend: {response.status_code}")
            except Exception as e:
                logger.error(f"Worker {self.id}: Error sending data to backend (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
        return False
            
    def run_scrape_cycle(self):
        """Run one complete scraping cycle"""
        try:
            if not self.driver:
                logger.error(f"Worker {self.id}: WebDriver is not initialized.")
                return
            logger.info(f"Worker {self.id}: Starting scraping cycle")
            
            # Navigate to the page only if not already there
            if self.driver.current_url != AMUL_URL:
                self.driver.get(AMUL_URL)
                logger.info(f"Worker {self.id}: Navigated to {AMUL_URL}")
            
            # Wait for page to load
            time.sleep(3)

            # Only enter PIN code on the first cycle
            logger.info(f"Worker {self.id}: Entering PIN code...")
            if not self.enter_pincode():
                logger.error(f"Worker {self.id}: Failed to enter PIN code")
                return
            
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".product-grid-item"))
                )
                logger.info(f"Worker {self.id}: Products loaded successfully")
            except Exception as e:
                logger.warning(f"Worker {self.id}: Products did not load after refresh: {e}")
                self.driver.refresh()
                time.sleep(5)

            # Scrape products
            logger.info(f"Worker {self.id}: Starting to scrape products...")
            products = self.scrape_products()
            if not products:
                logger.warning(f"Worker {self.id}: No products found")
                return

            # === RESTOCK SIMULATION FOR TESTING ===
            # Force the first product to be in stock (simulate restock)
            # Comment out the next two lines after testing
            # if products:
            #     products[0]['sold_out'] = False
            #     logger.info(f"[TEST] Forced restock for product: {products[1]['name']} ({products[1]['productId']})")
            # === END RESTOCK SIMULATION ===

            logger.info(f"Worker {self.id}: Successfully scraped {len(products)} products")
                
            # Send data to backend for processing
            logger.info(f"Worker {self.id}: Sending data to backend...")
            self.send_stock_changes_to_backend(products)
            
            logger.info(f"Worker {self.id}: Scraping cycle completed successfully")
            # Log RAM usage of Chrome WebDriver after scraping cycle
            try:
                chrome_pid = self.driver.service.process.pid
                p = psutil.Process(chrome_pid)
                mem_mb = p.memory_info().rss / (1024 * 1024)
                logger.info(f"Worker {self.id}: Chrome WebDriver RAM usage after cycle: {mem_mb:.2f} MB (PID: {chrome_pid})")
            except Exception as e:
                logger.warning(f"Worker {self.id}: Could not log Chrome WebDriver RAM usage after cycle: {e}")

        except Exception as e:
            logger.error(f"Worker {self.id}: Error in scraping cycle: {e}")
            import traceback
            logger.error(f"Worker {self.id}: Full traceback: {traceback.format_exc()}")

    # def run_scrape_cycle_and_cleanup(self):
    #     try:
    #         self.run_scrape_cycle()
    #     finally:
    #         if self.driver:
    #             self.driver.quit()
    #             logger.info(f"Worker {self.id}: WebDriver closed")
    #         # Clean up temporary directory
    #         if self.temp_dir and os.path.exists(self.temp_dir):
    #             try:
    #                 shutil.rmtree(self.temp_dir)
    #                 logger.info(f"Worker {self.id}: Temporary directory cleaned up: {self.temp_dir}")
    #             except Exception as e:
    #                 logger.warning(f"Worker {self.id}: Error cleaning up temporary directory: {e}")
    
    def run_once(self):
        """Run scraper once for testing"""
        try:
            self.setup_driver()
            self.run_scrape_cycle()
        finally:
            if self.driver:
                self.driver.quit()
                logger.info(f"Worker {self.id}: WebDriver closed")  # Add this line back
            # Clean up temp directory only for testing
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)

if __name__ == "__main__":
    scraper = AmulScraper(test_mode=False)
    scraper.run_once()