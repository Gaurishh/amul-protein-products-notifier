import os
from dotenv import load_dotenv

load_dotenv()

# Backend API configuration
# BACKEND_API_BASE = os.getenv('BACKEND_API_BASE', 'http://localhost:8000/api')
BACKEND_API_BASE = os.getenv('BACKEND_API_BASE', 'https://amul-protein-products-notifier-backend.onrender.com/api')

# Amul website configuration
AMUL_URL = "https://shop.amul.com/en/browse/protein"
PIN_CODE = os.getenv('PIN_CODE', "122003")  # Default, can be overridden at runtime

# Scraping configuration
SCRAPE_INTERVAL = int(os.getenv('SCRAPE_INTERVAL', 60))  # seconds
HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'false').lower() == 'true'