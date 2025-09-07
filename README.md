# Amul Protein Products Notifier

A comprehensive web application that helps users get notified when Amul protein products are restocked in their area. Users can subscribe to specific products and receive email notifications when they become available.

## 🌐 Live Website

**Access the project website:** [https://amul-protein-products-notifier.onrender.com](https://amul-protein-products-notifier.onrender.com)

## 🎬 Demo Video

https://github.com/user-attachments/assets/8371be8f-8010-4a7f-a5b4-2fee9b3f627f

- _Watch the demo to see how the Amul Products Notifier works in action!_
- _PS: You can edit your selected products or unsubscribe through the emails you receive from us!_

## 📋 Project Overview

This application consists of three main components:

- **Frontend**: React.js web application for user interface
- **Backend**: Node.js/Express API server with email queue processing
- **Scraper**: Python-based web scraper for monitoring Amul product availability

## 🏗️ System Architecture

The complete system architecture is documented in [architecture_diagram.md](architecture_diagram.md) with a detailed Mermaid diagram showing the interaction between Frontend, Backend, Scraper, and external services.

![Architecture Diagram](architecture_diagram.md)

_System Architecture showing the interaction between Frontend, Backend, Scraper, and external services_

## 🔄 How It Works

### From User's Perspective

#### 1. **Initial Subscription Process**

1. **Visit the Website**: User navigates to the Amul Products Notifier website
2. **Enter Email**: User provides their email address for notifications
3. **Select City**: User chooses their city from the supported locations (Delhi, Haryana, Karnataka, Maharashtra)
4. **Browse Products**: System displays all available Amul protein products organized by categories:
   - Milkshakes (e.g., Amul Protein Plus Milkshake)
   - Paneer (e.g., Amul Paneer)
   - Whey Protein (e.g., Amul Whey Protein)
   - Lassi (e.g., Amul Mango Lassi)
   - Buttermilk (e.g., Amul Buttermilk)
   - Milk (e.g., Amul Gold Milk)
   - Other products
5. **Select Products**: User clicks on product cards to select which products they want to be notified about
6. **Subscribe**: User clicks "Subscribe" to complete the process
7. **Confirmation**: User receives an immediate confirmation and a confirmation email with:
   - List of subscribed products
   - Unsubscribe link for easy management
   - Edit subscription link to modify preferences

#### 2. **Receiving Notifications**

1. **Background Monitoring**: The system continuously monitors Amul's website every 10 minutes
2. **Stock Detection**: When a subscribed product changes from "Sold Out" to "In Stock"
3. **Email Notification**: User receives an email notification containing:
   - Product name and image
   - Direct link to the product page on Amul's website
   - Link to browse all protein products
   - Unsubscribe and edit subscription options

#### 3. **Managing Subscription**

1. **Via Email Links**: Users can click links in any email to:
   - Unsubscribe completely
   - Edit their subscription (change products or city)
2. **Via Website**: Users can return to the website and enter their email to:
   - View current subscription

### From Backend Perspective

#### 1. **Scraper System (Python/FastAPI)**

**Automated Monitoring Process:**

1. **Trigger**: Uptime Robot pings the scraper endpoint every 10 minutes
2. **Pincode Fetching**: Scraper requests supported pincodes from the backend API
3. **Multi-threaded Processing**:
   - **Scrape Worker Thread**: Handles web scraping for each pincode
   - **Backend Worker Thread**: Manages data transmission to backend
4. **Web Scraping Process**:
   - Selenium WebDriver navigates to Amul's protein products page
   - Automatically enters the pincode using multiple fallback methods
   - Waits for products to load and scrapes all available products
   - Extracts product information: ID, name, image URL, page URL, stock status
   - Detects "Sold Out" status using text analysis and CSS class detection
5. **Data Processing**: Scraped data is sent to backend for stock change analysis

**Advanced Scraper Features:**

- **Robust PIN Code Entry**: Multiple fallback methods for reliable pincode selection
- **Dynamic Product Detection**: Uses multiple CSS selectors to handle page structure changes
- **Comprehensive Stock Detection**: Analyzes both text content and CSS classes for sold-out status
- **Error Recovery**: Graceful handling of element interaction failures with retry mechanisms
- **Resource Monitoring**: Tracks CPU usage and system resources

#### 2. **Backend Queue System (Node.js/Redis)**

**Stock Change Detection:**

1. **Data Reception**: Backend receives scraped product data from scraper
2. **Comparison Process**:
   - Compares new data with existing records in pincode-specific collections
   - Identifies products that changed from "sold_out: true" to "sold_out: false"
3. **Subscriber Lookup**: For each restocked product, finds all subscribed users
4. **Queue Job Creation**: Creates email notification jobs for affected subscribers

**Queue Processing Architecture:**

1. **Redis Bull Queue**: Manages all asynchronous operations
2. **Job Types**:
   - `send_stock_notification` - Notify users of restocked products
   - `process_subscription` - Handle new user subscriptions
   - `process_unsubscribe` - Process user unsubscriptions
   - `process_unsubscribe_by_token` - Handle token-based unsubscriptions
   - `send_expiry_notification` - Notify users when pincodes are deleted

**Email Processing Workflow:**

1. **Job Queuing**: Email jobs are added to Redis queue with retry configuration
2. **Worker Processing**: Background workers process jobs asynchronously
3. **Retry Logic**: Failed jobs are automatically retried (3 attempts with exponential backoff)
4. **Email Delivery**: Nodemailer sends HTML emails via Gmail SMTP
5. **Job Cleanup**: Completed jobs are automatically removed (100 completed, 50 failed)

**Database Operations:**

1. **Multi-pincode Collections**: Separate MongoDB collections for each pincode (`products_110036`, `products_122003`, etc.)
2. **User Management**: Users stored with unique tokens for secure subscription management
3. **Subscriber Tracking**: Each product maintains a list of subscribed email addresses
4. **Interaction Logging**: Tracks last interaction timestamps for each pincode

**Admin Interface:**

1. **Password Protection**: Secure access with bcrypt-hashed passwords
2. **Pincode Management**: Add/delete pincodes with 6-digit validation
3. **State Association**: Link pincodes with states/regions
4. **Expiry Notifications**: Automatic notifications when pincodes are deleted

**Error Handling & Monitoring:**

1. **Comprehensive Logging**: All operations logged with timestamps and error details
2. **Health Checks**: Multiple endpoints for monitoring system status
3. **Queue Monitoring**: Real-time queue status and job processing metrics
4. **Graceful Degradation**: System continues operating even if individual components fail

## 🚀 Features

### User Features

- **Email Subscription**: Subscribe to specific Amul protein products
- **City-based Selection**: Choose from supported cities (Delhi, Haryana, Karnataka, Maharashtra)
- **Product Categorization**: Products organized by type (Milkshakes, Paneer, Whey Protein, Lassi, Buttermilk, Milk)
- **Email Notifications**: Receive notifications when subscribed products are back in stock
- **Subscription Management**: Edit or unsubscribe via email links
- **Product Images**: Visual product selection with images and direct links to Amul store
- **Admin Interface**: Password-protected pincode management system

### Technical Features

- **Real-time Monitoring**: Automated scraping every 10 minutes via Uptime Robot
- **Queue-based Email Processing**: Asynchronous email sending with retry logic
- **Multi-pincode Support**: Separate product collections for different regions
- **Token-based Management**: Secure subscription editing and unsubscribing
- **Responsive Design**: Mobile-friendly interface
- **Error Handling**: Comprehensive error handling and logging

## 🛠️ Technology Stack

### Frontend

- **React.js 18.0.0** - User interface framework
- **React Router DOM 7.6.3** - Client-side routing
- **CSS3** - Styling and responsive design
- **Responsive Grid Layout** - Product selection with visual cards
- **Modal Components** - Admin interface with password protection

### Backend

- **Node.js** - Runtime environment
- **Express.js 4.18.2** - Web framework
- **MongoDB 7.0.0** - Primary database with Mongoose ODM
- **Redis 5.0.0** - Queue management and caching
- **Bull 4.0.0** - Job queue processing
- **Nodemailer 7.0.5** - Email service
- **JWT 9.0.0** - Token-based authentication
- **bcrypt 6.0.0** - Password hashing
- **UUID** - Unique token generation
- **CORS 2.8.5** - Cross-origin resource sharing

### Scraper

- **Python 3.x** - Core language
- **FastAPI** - Web framework for API endpoints
- **Selenium 4.15.2** - Web automation and scraping
- **BeautifulSoup4 4.12.2** - HTML parsing
- **Requests 2.31.0** - HTTP client
- **WebDriver Manager 4.0.1** - Chrome driver management
- **Threading** - Multi-threaded worker architecture
- **psutil** - System resource monitoring

### Infrastructure

- **MongoDB Atlas** - Cloud database
- **Redis Cloud** - Cloud queue service
- **Render** - Hosting platform
- **Uptime Robot** - Monitoring and cron jobs
- **Gmail SMTP** - Email delivery

## 📁 Project Structure

```
amul_products_notifier/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── EmailForm.js
│   │   │   ├── ProductSelector.js
│   │   │   ├── SubscriptionManager.js
│   │   │   └── UnsubscribeButton.js
│   │   ├── pages/           # Page components
│   │   │   └── HomePage.js
│   │   ├── api.js           # API client functions
│   │   └── App.js           # Main application component
│   ├── public/              # Static assets
│   └── build/               # Production build
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   │   ├── userController.js
│   │   │   ├── productController.js
│   │   │   ├── stockController.js
│   │   │   └── pincodeController.js
│   │   ├── models/          # Database models
│   │   │   ├── User.js
│   │   │   ├── Product.js
│   │   │   ├── Pincode.js
│   │   │   └── Password.js
│   │   ├── routes/          # API routes
│   │   │   ├── user.js
│   │   │   ├── product.js
│   │   │   ├── stock.js
│   │   │   └── pincodes.js
│   │   ├── services/        # Business logic
│   │   │   ├── emailService.js
│   │   │   └── emailQueue.js
│   │   ├── app.js           # Express application
│   │   └── db.js            # Database connection
│   └── scripts/             # Utility scripts
├── scraper/                 # Python web scraper
│   ├── amul_scraper.py      # Core scraping logic
│   ├── fastapi_server.py    # FastAPI server for scraping
│   ├── main.py              # Entry point
│   ├── config.py            # Configuration
│   └── requirements.txt     # Python dependencies
├── scripts/                 # Setup and utility scripts
│   ├── setup_databases.js   # Database setup
│   ├── start_databases.sh   # Linux database starter
│   └── start_databases.bat  # Windows database starter
└── architecture_diagram.md  # System architecture documentation
```

## 🚀 Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- MongoDB (local or Atlas)
- Redis (local or Cloud)
- Chrome/Chromium browser

### 1. Clone the Repository

```bash
git clone <repository-url>
cd amul_products_notifier
```

### 2. Backend Setup

```bash
cd backend
npm install
cp env_example.txt .env
# Edit .env with your configuration
npm start
```

**Backend Environment Variables:**

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
MONGO_URI=mongodb://localhost:27017/amul_products_notifier
FRONTEND_BASE_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379/0
PORT=8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp env_example.txt .env
# Edit .env with your configuration
npm start
```

**Frontend Environment Variables:**

```env
REACT_APP_BACKEND_API_BASE=http://localhost:8000/api
```

### 4. Scraper Setup

```bash
cd scraper
pip install -r requirements.txt
cp env_example.txt .env
# Edit .env with your configuration
python main.py --once  # Test run
```

**Scraper Environment Variables:**

```env
BACKEND_API_BASE=http://localhost:8000/api
PIN_CODE=122003
MONGO_URI=mongodb://localhost:27017/amul_products_notifier
HEADLESS_MODE=true
PORT=8001
```

### 5. Database Setup

```bash
# Start local databases
./scripts/start_databases.sh  # Linux/Mac
# or
scripts\start_databases.bat   # Windows

# Test database connections
node scripts/setup_databases.js
```

## 🔧 Configuration

### Supported Cities/Pincodes

- **Delhi**: 110036
- **Haryana**: 122003
- **Karnataka**: 560001
- **Maharashtra**: 400001

### Email Configuration

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for the application
3. Use the App Password in `EMAIL_PASSWORD` environment variable

### Monitoring Setup

1. Deploy the scraper to a cloud service
2. Set up Uptime Robot to ping `/scrape` endpoint every 10 minutes
3. Configure monitoring alerts for service availability

### Admin Interface Access

1. Navigate to `/pincodes` route in the frontend
2. Enter the admin password (default: `pass123`)
3. Manage pincodes: add new ones or delete existing ones
4. Monitor last interaction timestamps for each pincode

## 📊 API Endpoints

### User Management

- `POST /api/subscribe` - Subscribe to products
- `GET /api/user/:email` - Get user details
- `PUT /api/user/:email` - Update user subscription
- `DELETE /api/user/:email` - Unsubscribe user
- `GET /api/user-by-token?token=:token` - Get user by token
- `DELETE /api/unsubscribe?token=:token` - Unsubscribe by token
- `PUT /api/edit-subscription?token=:token` - Edit subscription by token

### Product Management

- `GET /api/products?pincode=:pincode` - Get products for pincode
- `POST /api/verify-pincode` - Verify pincode availability
- `POST /api/track-pincode` - Track pincode interaction

### Stock Management

- `POST /api/stock-changes` - Process stock changes (scraper endpoint)

### Pincode Management

- `GET /api/pincodes` - Get all supported pincodes
- `POST /api/pincodes` - Add new pincode
- `DELETE /api/pincodes/:pincode` - Delete pincode
- `POST /api/verifyPincodePassword` - Verify admin password

### System

- `GET /health` - Health check
- `GET /ping` - Ping endpoint
- `GET /api/queue-status` - Queue status

## 🔄 System Workflow

### 1. User Subscription Flow

1. User visits frontend and enters email
2. User selects city and products
3. Backend creates user record with unique token
4. User added to product subscriber lists
5. Confirmation email sent via queue

### 2. Product Monitoring Flow

1. Uptime Robot triggers scraper every 10 minutes
2. Scraper fetches supported pincodes from backend
3. Multiple scraping jobs queued for different pincodes
4. **Scrape Worker Thread** processes jobs concurrently
5. Selenium navigates to Amul website and enters pincode
6. Products scraped and stock status detected
7. **Backend Worker Thread** sends data to backend for processing

### 3. Stock Change Detection

1. Backend compares new data with existing records
2. Identifies products that changed from sold-out to in-stock
3. Queues email notification jobs for affected subscribers
4. Email service processes queue and sends notifications

### 4. Email Processing

1. Bull queue manages email jobs
2. Retry logic handles failed emails
3. Rate limiting prevents spam
4. Users receive notifications with unsubscribe/edit links

## 🎯 Key Features Explained

### Product Categorization

Products are automatically categorized based on keywords:

- **Milkshakes**: Products containing "milkshake"
- **Paneer**: Products containing "paneer"
- **Whey Protein**: Products containing "whey"
- **Lassi**: Products containing "lassi"
- **Buttermilk**: Products containing "buttermilk"
- **Milk**: Products containing "milk" (whole word)
- **Other**: All other products

### Token-based Management

- Each user receives a unique token upon subscription
- Tokens enable secure subscription editing and unsubscribing
- Tokens are included in email links for easy access

### Queue-based Architecture

- **Redis Bull Queue** manages email processing
- **Job Types**:
  - `send_stock_notification` - Notify users of restocked products
  - `process_subscription` - Process new user subscriptions
  - `process_unsubscribe` - Handle user unsubscriptions
  - `process_unsubscribe_by_token` - Token-based unsubscriptions
  - `send_expiry_notification` - Notify users of subscription expiry
- **Retry Logic**: Failed jobs are automatically retried (3 attempts with exponential backoff)
- **Rate Limiting**: Prevents email service overload
- **Job Cleanup**: Automatic removal of completed/failed jobs (100 completed, 50 failed)

### Multi-pincode Support

- Separate MongoDB collections for each pincode (`products_110036`, `products_122003`, etc.)
- Pincode-specific product data and subscriber lists
- Dynamic pincode management via admin interface

### Database Models

- **User Model**: Email, products, pincode, and unique token for secure management
- **Product Model**: Product ID, name, subscribers list, and last updated timestamp
- **Pincode Model**: Pincode, state, and last interaction tracking
- **Password Model**: Bcrypt-hashed admin password for pincode management

### Admin Interface

- **Password Protection**: Secure admin access with bcrypt-hashed passwords
- **Pincode Management**: Add/delete pincodes with validation (6-digit format)
- **State Management**: Associate pincodes with states/regions
- **Interaction Tracking**: Monitor last interaction timestamps
- **Expiry Notifications**: Automatic notifications when pincodes are deleted

### Multithreaded Architecture

- **Scraper Workers**: Separate threads for scraping and backend communication
- **Scrape Worker Thread**: Handles web scraping operations for different pincodes
- **Backend Worker Thread**: Manages data transmission to backend API
- **Queue-based Processing**: Thread-safe job queues for concurrent operations
- **Daemon Threads**: Background workers that don't block main application

### Advanced Scraper Features

- **Robust PIN Code Entry**: Multiple fallback methods for PIN code selection
- **Dynamic Product Detection**: Multiple CSS selectors for different page structures
- **Stock Status Detection**: Comprehensive sold-out detection using text and CSS classes
- **Image URL Extraction**: Automatic product image URL extraction and validation
- **Error Recovery**: Graceful handling of element interaction failures
- **Resource Monitoring**: CPU usage tracking and system resource monitoring
- **Retry Mechanisms**: Automatic retry logic for failed operations

## 🚀 Deployment

### Production Deployment

1. **Backend**: Deploy to Render/Railway/Heroku
2. **Frontend**: Build and deploy to Netlify/Vercel
3. **Scraper**: Deploy to Railway/Heroku with Uptime Robot monitoring
4. **Databases**: Use MongoDB Atlas and Redis Cloud

### Environment Variables for Production

```env
# Backend
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://...
EMAIL_USER=production-email@gmail.com
EMAIL_PASSWORD=app-password
FRONTEND_BASE_URL=https://your-frontend-domain.com

# Frontend
REACT_APP_BACKEND_API_BASE=https://your-backend-domain.com/api

# Scraper
BACKEND_API_BASE=https://your-backend-domain.com/api
HEADLESS_MODE=true
```

## 🔍 Monitoring & Logging

### Health Checks

- Backend: `GET /health` and `GET /ping`
- Scraper: `GET /ping`
- Queue Status: `GET /api/queue-status`

### Logging

- **Backend**: Console logging with job status tracking
- **Scraper**: File logging (`scraper.log`) with detailed scraping information
- **Email Service**: Success/failure logging for all email operations

### Monitoring

- **Uptime Robot**: Monitors scraper endpoint every 10 minutes
- **Queue Monitoring**: Track email job processing status
- **Error Tracking**: Comprehensive error logging across all components

## 🛠️ Development

### Running in Development

```bash
# Terminal 1: Start databases
./scripts/start_databases.sh

# Terminal 2: Start backend
cd backend && npm run dev

# Terminal 3: Start frontend
cd frontend && npm start

# Terminal 4: Start scraper (optional for testing)
cd scraper && python main.py --once
```

### Testing

```bash
# Test database connections
node scripts/setup_databases.js

# Test scraper
cd scraper && python main.py --once --verbose

# Test backend API
curl http://localhost:8000/health
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines

- Follow existing code structure and patterns
- Add comprehensive error handling
- Update documentation for new features
- Test with multiple pincodes
- Ensure email functionality works correctly

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

For issues and questions:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure all services are running
4. Check database connections
5. Review the architecture diagram for system flow

## 🔮 Future Enhancements

- **SMS Notifications**: Add SMS support for critical restocks
- **Price Tracking**: Monitor price changes in addition to stock
- **Product Recommendations**: Suggest similar products
- **Analytics Dashboard**: User subscription analytics
- **Mobile App**: Native mobile application
- **Multi-language Support**: Support for regional languages
- **Advanced Filtering**: Filter by price range, brand, etc.
