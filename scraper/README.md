# Amul Protein Products Scraper

A Python-based web scraper that monitors Amul protein products for stock availability and sends data to the backend for processing.

## Features

- **Automated PIN Code Entry**: Automatically enters PIN code (122003) on the Amul website
- **Product Scraping**: Scrapes all products from the protein category
- **Stock Status Detection**: Identifies products marked as "SOLD OUT"
- **Backend Integration**: Sends scraped data to your Node.js backend for processing
- **Data Collection Only**: Focuses solely on data collection, email processing handled by backend
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

# Amul Website configuration
AMUL_URL=https://shop.amul.com/en/browse/protein
PIN_CODE=122003
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
├── config.py            # Configuration management
├── requirements.txt     # Python dependencies
├── env_example.txt      # Environment variables example
└── README.md           # This file
```

## How It Works

1. **PIN Code Entry**: Uses Selenium to navigate to the Amul protein page and enter PIN code 122003
2. **Product Scraping**: Scrapes all products using multiple CSS selectors to handle different page structures
3. **Stock Detection**: Identifies "SOLD OUT" products by checking text content and specific CSS classes
4. **Data Processing**: Sends scraped data to backend API for stock change detection and email processing
5. **Backend Integration**: Communicates with backend through REST API endpoints

## Backend Integration

The scraper integrates with your Node.js backend through these endpoints:

- `POST /api/stock-changes` - Send scraped product data for processing
- `GET /api/products` - Fetch existing products (if needed)

## Architecture

This scraper is part of a separated architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Scraper       │    │   Backend       │    │   Email Workers │
│   (Data Only)   │───▶│   (API + Queue) │───▶│   (Processing)  │
│                 │    │                 │    │                 │
│ • Web scraping  │    │ • Stock changes │    │ • Send emails   │
│ • Stock detect  │    │ • Queue jobs    │    │ • Handle retry  │
│ • API calls     │    │ • User mgmt     │    │ • Rate limiting │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Troubleshooting

### Common Issues

1. **Chrome Driver Issues**: The scraper uses `webdriver-manager` to automatically download the correct Chrome driver
2. **No Products Found**: The scraper tries multiple CSS selectors. Check the logs to see which selector works
3. **PIN Code Entry Fails**: The website structure might have changed. Check the CSS selector in `enter_pincode()`
4. **Backend Connection Failed**: Check if the backend API is running and accessible

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
4. Ensure backend API is running for full testing

## Setup with Backend

### 1. Start Backend API

```bash
cd backend
npm install
npm run dev
```

### 2. Start Email Worker

```bash
cd backend
npm run worker
```

### 3. Start Scraper

```bash
cd scraper
python main.py --continuous
```

## Benefits of This Architecture

- **Separation of Concerns**: Scraper focuses only on data collection
- **Better Resource Usage**: Lighter scraper, heavy processing in backend
- **Improved Scalability**: Multiple scrapers can feed one backend
- **Easier Maintenance**: Clear separation between scraping and business logic
- **Better Error Handling**: Failed emails are retried by backend queue system
