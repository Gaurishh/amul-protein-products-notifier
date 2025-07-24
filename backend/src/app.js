import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import stockRoutes from './routes/stock.js';
import { emailQueue, getQueueStatus } from './services/emailQueue.js';
import { sendBulkStockNotification, sendExpiryNotification } from './services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', stockRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Amul Products Notifier Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Queue status endpoint
app.get('/api/queue-status', async (req, res) => {
  try {
    const status = await getQueueStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check route for uptime monitoring
app.get("/ping", (req, res) => {
  console.log("pong");
  res.status(200).send("pong");
});

// Email Queue Processing Logic
// Process stock notification jobs
emailQueue.process('send_stock_notification', async (job) => {
  const { subscriber, products, pincode } = job.data;
  
  try {
    console.log(`Processing email job for ${subscriber} with ${products.length} products`);
    
    const result = await sendBulkStockNotification(subscriber, products, pincode);
    
    if (result) {
      console.log(`Successfully sent email to ${subscriber}`);
      return { success: true, subscriber, productsCount: products.length };
    } else {
      throw new Error(`Failed to send email to ${subscriber}`);
    }
    
  } catch (error) {
    console.error(`Error processing email job for ${subscriber}:`, error);
    throw error; // This will trigger a retry
  }
});

// Process expiry notification jobs
emailQueue.process('send_expiry_notification', async (job) => {
  const { email, pincode } = job.data;
  try {
    console.log(`Processing expiry notification job for ${email} (pincode: ${pincode})`);
    const result = await sendExpiryNotification(email, pincode);
    if (result) {
      console.log(`Successfully sent expiry notification to ${email}`);
      return { success: true, email };
    } else {
      throw new Error(`Failed to send expiry notification to ${email}`);
    }
  } catch (error) {
    console.error(`Error processing expiry notification job for ${email}:`, error);
    throw error;
  }
});

// Handle job completion
emailQueue.on('completed', (job, result) => {
  console.log(`Email job ${job.id} completed for ${result.subscriber || result.email}`);
});

// Handle job failure
emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed for ${job.data.subscriber || job.data.email}:`, err);
});

// Handle job retry
emailQueue.on('retry', (job, err) => {
  console.log(`Email job ${job.id} will be retried for ${job.data.subscriber || job.data.email}:`, err.message);
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Shutting down server and email worker...');
  await emailQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server and email worker...');
  await emailQueue.close();
  process.exit(0);
});

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((mongooseInstance) => {
    app.set('mongoose', mongooseInstance);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Email queue system ready');
      console.log('Email worker started. Waiting for jobs...');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  }); 
