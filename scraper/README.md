# Amul Protein Products Scraper

A Python-based web scraper that monitors Amul protein products for stock availability and sends notifications to subscribers when products come back in stock.

## Features

- **Automated PIN Code Entry**: Automatically enters PIN code (122003) on the Amul website
- **Product Scraping**: Scrapes all products from the protein category
- **Stock Status Detection**: Identifies products marked as "SOLD OUT"
- **Backend Integration**: Seeds new products to your Node.js backend
- **Email Notifications**: Sends email alerts when products come back in stock
- **Continuous Monitoring**: Runs continuously with configurable intervals

## Installation

1. **Install Python dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Install Chrome/Chromium browser** (required for Selenium)

3. **Set up environment variables:**
   ```bash
   cp env_example.txt .env
   # Edit .env with your configuration
   ```

## Configuration

Create a `.env` file with the following variables:

```env
# Backend API configuration
BACKEND_API_BASE=http://localhost:8000/api

# Scraping configuration
SCRAPE_INTERVAL=60
HEADLESS_MODE=false

# Email configuration (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## Usage

### Run Once (Testing)

```bash
python main.py --once
```

### Run Continuously (Production)

```bash
python main.py --continuous
```

### Run with Custom Options

```bash
# Run in headless mode with 30-second intervals
python main.py --continuous --headless --interval 30

# Run once with verbose logging
python main.py --once --verbose
```

## File Structure

```
scraper/
├── main.py              # Main entry point
├── amul_scraper.py      # Core scraping logic
├── email_notifier.py    # Email notification system
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
├── env_example.txt      # Environment variables example
└── README.md           # This file
```

## How It Works

1. **PIN Code Entry**: Uses Selenium to navigate to the Amul protein page and enter PIN code 122003
2. **Product Scraping**: Scrapes all products using multiple CSS selectors to handle different page structures
3. **Stock Detection**: Identifies "SOLD OUT" products by checking text content and specific CSS classes
4. **Backend Seeding**: Sends new products to your backend API to populate the product catalog
5. **Stock Change Detection**: Tracks stock status changes and triggers notifications
6. **Email Notifications**: Sends emails to subscribers when products come back in stock

## Backend Integration

The scraper integrates with your Node.js backend through these endpoints:

- `GET /api/products` - Fetch existing products
- `POST /api/products` - Add new products (you'll need to add this endpoint)
- `GET /api/product/:id/subscribers` - Get subscribers for notifications

## Email Setup

For Gmail:

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in your `.env` file

## Troubleshooting

### Common Issues

1. **Chrome Driver Issues**: The scraper uses `webdriver-manager` to automatically download the correct Chrome driver
2. **No Products Found**: The scraper tries multiple CSS selectors. Check the logs to see which selector works
3. **PIN Code Entry Fails**: The website structure might have changed. Check the CSS selector in `enter_pincode()`

### Debug Mode

Run with verbose logging to see detailed information:

```bash
python main.py --once --verbose
```

## Logs

Logs are saved to `scraper.log` and also displayed in the console.

## Contributing

When modifying the scraper:

1. Test with `--once` flag first
2. Check the logs for any errors
3. Update CSS selectors if the website structure changes
