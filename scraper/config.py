import os
from dotenv import load_dotenv

load_dotenv()

# Backend API configuration
BACKEND_API_BASE = os.getenv('BACKEND_API_BASE', 'http://localhost:8000/api')

# Amul website configuration
AMUL_URL = "https://shop.amul.com/en/browse/protein"
PIN_CODE = "122003"

# Scraping configuration
SCRAPE_INTERVAL = int(os.getenv('SCRAPE_INTERVAL', 60))  # seconds
HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'false').lower() == 'true'

# Email configuration (for notifications)
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
EMAIL_USER = os.getenv('EMAIL_USER', '')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', '')

# Database configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/amul_products_notifier') 