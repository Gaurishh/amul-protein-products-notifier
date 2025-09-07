# Amul Products Notifier - System Architecture

## Architecture Diagram

```mermaid
graph TB
    %% External Services
    subgraph "External Services"
        AMUL[Amul Website<br/>shop.amul.com]
        UPTIME[Uptime Robot<br/>Monitoring Service]
        SMTP[SMTP Server<br/>Email Service]
    end

    %% User Layer
    subgraph "User Layer"
        USER[Users<br/>Email Subscribers]
        BROWSER[Web Browser<br/>React Frontend]
    end

    %% Frontend Layer
    subgraph "Frontend (React.js)"
        REACT[React App<br/>Port 3000]
        COMPONENTS[Components<br/>- EmailForm<br/>- ProductSelector<br/>- SubscriptionManager]
    end

    %% Backend Layer
    subgraph "Backend (Node.js/Express)"
        API[Express API Server<br/>Port 8000]
        ROUTES[API Routes<br/>- /api/user<br/>- /api/products<br/>- /api/stock<br/>- /api/pincodes]
        CONTROLLERS[Controllers<br/>- userController<br/>- productController<br/>- stockController<br/>- pincodeController]
        EMAIL_SERVICE[Email Service<br/>- Nodemailer<br/>- Queue Processing]
    end

    %% Scraper Layer
    subgraph "Scraper (Python/FastAPI)"
        FASTAPI[FastAPI Server<br/>Port 8001]
        SCRAPER[AmulScraper<br/>- Selenium WebDriver<br/>- BeautifulSoup]
        WORKERS[Worker Threads<br/>- Scrape Worker<br/>- Backend Worker]
    end

    %% Data Layer
    subgraph "Data Storage"
        MONGODB[(MongoDB<br/>Primary Database)]
        REDIS[(Redis<br/>Queue & Cache)]
    end

    %% Database Collections
    subgraph "MongoDB Collections"
        USERS[users<br/>User subscriptions]
        PRODUCTS_DEL[products_110036<br/>Delhi products]
        PRODUCTS_HAR[products_122003<br/>Haryana products]
        PRODUCTS_KAR[products_560001<br/>Karnataka products]
        PRODUCTS_MAH[products_400001<br/>Maharashtra products]
        PINCODES[pincodes<br/>Supported areas]
    end

    %% Queue System
    subgraph "Queue System (Redis Bull)"
        QUEUE[Bull Queue<br/>Email Processing]
        JOBS[Job Types<br/>- send_stock_notification<br/>- process_subscription<br/>- process_unsubscribe]
    end

    %% Data Flow Connections
    USER --> BROWSER
    BROWSER --> REACT
    REACT --> COMPONENTS
    COMPONENTS --> API

    API --> ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> MONGODB
    CONTROLLERS --> REDIS

    EMAIL_SERVICE --> QUEUE
    QUEUE --> JOBS
    JOBS --> SMTP
    SMTP --> USER

    UPTIME --> FASTAPI
    FASTAPI --> SCRAPER
    SCRAPER --> AMUL
    SCRAPER --> WORKERS
    WORKERS --> API

    API --> MONGODB
    REDIS --> QUEUE

    MONGODB --> USERS
    MONGODB --> PRODUCTS_DEL
    MONGODB --> PRODUCTS_HAR
    MONGODB --> PRODUCTS_KAR
    MONGODB --> PRODUCTS_MAH
    MONGODB --> PINCODES

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef scraper fill:#e8f5e8
    classDef database fill:#fff3e0
    classDef external fill:#ffebee
    classDef queue fill:#f1f8e9

    class REACT,COMPONENTS frontend
    class API,ROUTES,CONTROLLERS,EMAIL_SERVICE backend
    class FASTAPI,SCRAPER,WORKERS scraper
    class MONGODB,REDIS,USERS,PRODUCTS_DEL,PRODUCTS_HAR,PRODUCTS_KAR,PRODUCTS_MAH,PINCODES database
    class AMUL,UPTIME,SMTP,USER,BROWSER external
    class QUEUE,JOBS queue
```

## System Flow Description

### 1. User Subscription Flow

1. **User** visits the React frontend
2. **Frontend** collects email, city, and product preferences
3. **Backend API** validates and stores subscription in MongoDB
4. **Email Service** sends confirmation email via SMTP
5. **Queue System** processes email jobs asynchronously

### 2. Product Monitoring Flow

1. **Uptime Robot** triggers scraper every 10 minutes via `/scrape` endpoint
2. **FastAPI Server** queues scraping jobs for multiple pincodes
3. **AmulScraper** uses Selenium to scrape Amul website
4. **Worker Threads** process scraped data and send to backend
5. **Backend** compares with previous data to detect stock changes
6. **Queue System** processes notification jobs for affected users

### 3. Notification Flow

1. **Stock changes** detected by backend
2. **Redis Queue** manages email notification jobs
3. **Email Service** sends notifications to subscribed users
4. **Users** receive email notifications about product availability

## Key Components

### Frontend (React.js)

- **Port**: 3000
- **Components**: EmailForm, ProductSelector, SubscriptionManager, UnsubscribeButton
- **Features**: City-based product selection, subscription management

### Backend (Node.js/Express)

- **Port**: 8000
- **Database**: MongoDB with Mongoose
- **Queue**: Redis with Bull Queue
- **Email**: Nodemailer for SMTP
- **APIs**: RESTful endpoints for user management and stock tracking

### Scraper (Python/FastAPI)

- **Port**: 8001
- **Web Scraping**: Selenium WebDriver + BeautifulSoup
- **Processing**: Multi-threaded workers for scraping and data transmission
- **Monitoring**: Uptime Robot integration for continuous operation

### Data Storage

- **MongoDB**: Primary database with collections for users, products by pincode, and pincode metadata
- **Redis**: Queue management and caching for email processing

## Supported Areas

- **Delhi** (110036)
- **Haryana** (122003)
- **Karnataka** (560001)
- **Maharashtra** (400001)

## Technology Stack

- **Frontend**: React.js, React Router DOM, CSS3
- **Backend**: Node.js, Express.js, MongoDB, Redis, Nodemailer
- **Scraper**: Python, FastAPI, Selenium, BeautifulSoup
- **Infrastructure**: Uptime Robot, SMTP Email Service
