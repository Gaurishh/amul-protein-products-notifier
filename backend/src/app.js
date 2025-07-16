import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import stockRoutes from './routes/stock.js';
import { getQueueStatus } from './services/emailQueue.js';
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

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((mongooseInstance) => {
    app.set('mongoose', mongooseInstance);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Email queue system ready');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  }); 