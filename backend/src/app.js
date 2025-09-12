import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import userRoutes from './routes/user.js';
import productRoutes from './routes/product.js';
import stockRoutes from './routes/stock.js';
import pincodeRoutes from './routes/pincodes.js';
import { processQueue, getQueueStatus } from './services/emailQueue.js';
import { sendBulkStockNotification, sendExpiryNotification, sendSubscriptionConfirmation, sendUnsubscribeConfirmation, sendEmailVerification } from './services/emailService.js';
import User from './models/User.js';
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
app.use('/api', pincodeRoutes);

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

// Process Queue Processing Logic
// Process stock notification jobs
processQueue.process('send_stock_notification', async (job) => {
  const { subscriber, products, pincode } = job.data;
  
  try {
    console.log(`Processing stock notification job for ${subscriber} with ${products.length} products`);
    
    // Fetch user token from MongoDB
    const user = await User.findOne({ email: subscriber });
    
    if (!user) {
      console.error(`User not found for email: ${subscriber}`);
      throw new Error(`User not found for email: ${subscriber}`);
    }
    
    if (!user.emailVerified) {
      console.log(`Skipping stock email for unverified user: ${subscriber}`);
      return { success: true, subscriber, skipped: true, reason: 'unverified' };
    }
    
    const result = await sendBulkStockNotification(subscriber, products, pincode, user.token);
    
    if (result) {
      console.log(`Successfully sent stock notification to ${subscriber}`);
      return { success: true, subscriber, productsCount: products.length };
    } else {
      throw new Error(`Failed to send stock notification to ${subscriber}`);
    }
    
  } catch (error) {
    console.error(`Error processing stock notification job for ${subscriber}:`, error);
    throw error; // This will trigger a retry
  }
});

// Process expiry notification jobs
processQueue.process('send_expiry_notification', async (job) => {
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

// Process subscription jobs
processQueue.process('process_subscription', async (job) => {
  const { email, products, pincode, token } = job.data;
  
  try {
    console.log(`Processing subscription job for ${email}`);
    
    // Add user to product subscribers in the correct pincode collection
    const collectionName = `products_${pincode}`;
    for (const productId of products) {
      await mongoose.connection.collection(collectionName).updateOne(
        { productId },
        { $addToSet: { subscribers: email } },
        { upsert: true }
      );
    }
    
    // Track pincode interaction (update lastInteracted)
    const now = new Date();
    await mongoose.connection.collection('pincodes').updateOne(
      { pincode },
      { $set: { lastInteracted: now } },
      { upsert: true }
    );
    
    // Send confirmation email
    const result = await sendSubscriptionConfirmation(email, products, pincode, token, mongoose);
    
    if (result) {
      console.log(`Successfully processed subscription for ${email}`);
      return { success: true, email, productsCount: products.length };
    } else {
      throw new Error(`Failed to send confirmation email to ${email}`);
    }
    
  } catch (error) {
    console.error(`Error processing subscription job for ${email}:`, error);
    throw error;
  }
});

// Process unsubscribe jobs
processQueue.process('process_unsubscribe', async (job) => {
  const { email, pincode, userData } = job.data;
  
  try {
    console.log(`Processing unsubscribe job for ${email}`);
    
    // Use the provided userData instead of trying to find the user
    if (!userData) {
      console.log(`No user data provided for ${email}, skipping unsubscribe processing`);
      return { success: true, email, message: 'No user data provided' };
    }
    
    // Get product names before removing user from subscribers
    let productNames = userData.products;
    try {
      const collectionName = `products_${pincode}`;
      const products = await mongoose.connection.collection(collectionName).find(
        { productId: { $in: userData.products } },
        { projection: { productId: 1, name: 1 } }
      ).toArray();
      
      // Create a map of productId to name
      const productMap = {};
      products.forEach(product => {
        productMap[product.productId] = product.name || product.productId;
      });
      
      // Replace productIds with names, fallback to productId if name not found
      productNames = userData.products.map(id => productMap[id] || id);
    } catch (error) {
      console.error('Error fetching product names for unsubscribe email:', error);
      // Fallback to productIds if database fetch fails
      productNames = userData.products;
    }
    
    // Remove user from all product subscribers in the correct pincode collection
    const collectionName = `products_${pincode}`;
    for (const productId of userData.products) {
      await mongoose.connection.collection(collectionName).updateOne(
        { productId },
        { $pull: { subscribers: email } }
      );
    }
    
    // Send unsubscribe confirmation email
    const result = await sendUnsubscribeConfirmation(email, productNames);
    
    if (result) {
      console.log(`Successfully processed unsubscribe for ${email}`);
      return { success: true, email, productsCount: productNames.length };
    } else {
      throw new Error(`Failed to send unsubscribe confirmation email to ${email}`);
    }
    
  } catch (error) {
    console.error(`Error processing unsubscribe job for ${email}:`, error);
    throw error;
  }
});

// Process unsubscribe by token jobs
processQueue.process('process_unsubscribe_by_token', async (job) => {
  const { token, userData } = job.data;
  
  try {
    console.log(`Processing unsubscribe by token job for ${userData.email}`);
    
    // Get product names before removing user from subscribers
    let productNames = userData.products;
    try {
      const collectionName = `products_${userData.pincode}`;
      const products = await mongoose.connection.collection(collectionName).find(
        { productId: { $in: userData.products } },
        { projection: { productId: 1, name: 1 } }
      ).toArray();
      
      // Create a map of productId to name
      const productMap = {};
      products.forEach(product => {
        productMap[product.productId] = product.name || product.productId;
      });
      
      // Replace productIds with names, fallback to productId if name not found
      productNames = userData.products.map(id => productMap[id] || id);
    } catch (error) {
      console.error('Error fetching product names for unsubscribe email:', error);
      // Fallback to productIds if database fetch fails
      productNames = userData.products;
    }
    
    // Remove user from all product subscribers in the correct pincode collection
    const collectionName = `products_${userData.pincode}`;
    for (const productId of userData.products) {
      await mongoose.connection.collection(collectionName).updateOne(
        { productId },
        { $pull: { subscribers: userData.email } }
      );
    }
    
    // Send unsubscribe confirmation email
    const result = await sendUnsubscribeConfirmation(userData.email, productNames);
    
    if (result) {
      console.log(`Successfully processed unsubscribe by token for ${userData.email}`);
      return { success: true, email: userData.email, productsCount: productNames.length };
    } else {
      throw new Error(`Failed to send unsubscribe confirmation email to ${userData.email}`);
    }
    
  } catch (error) {
    console.error(`Error processing unsubscribe by token job:`, error);
    throw error;
  }
});

// Process email verification jobs - just sends the verification email
processQueue.process('send_email_verification', async (job) => {
  const { token } = job.data;
  try {
    console.log(`Sending email verification for token ${token}`);
    const user = await User.findOne({ token });
    if (!user) {
      throw new Error('Invalid or expired token');
    }
    
    // Send verification email
    const result = await sendEmailVerification(user.email, token);
    if (result) {
      console.log(`Successfully sent verification email to ${user.email}`);
      return { success: true, email: user.email };
    } else {
      throw new Error(`Failed to send verification email to ${user.email}`);
    }
  } catch (error) {
    console.error('Error processing email verification job:', error);
    throw error;
  }
});

// Process email verification completion - when user clicks verification link
processQueue.process('process_email_verification', async (job) => {
  const { token } = job.data;
  try {
    console.log(`Processing email verification for token ${token}`);
    const user = await User.findOne({ token });
    if (!user) {
      throw new Error('Invalid or expired token');
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      // Clear TTL so verified users are not deleted
      user.expiresAt = null;
      await user.save();

      // Add user to product subscribers in the correct pincode collection
      const collectionName = `products_${user.pincode}`;
      for (const productId of user.products) {
        await mongoose.connection.collection(collectionName).updateOne(
          { productId },
          { $addToSet: { subscribers: user.email } },
          { upsert: true }
        );
      }

      // Track pincode interaction (update lastInteracted)
      const now = new Date();
      await mongoose.connection.collection('pincodes').updateOne(
        { pincode: user.pincode },
        { $set: { lastInteracted: now } },
        { upsert: true }
      );

      // Send confirmation email
      await sendSubscriptionConfirmation(user.email, user.products, user.pincode, user.token, mongoose);
    }
    return { success: true, email: user.email };
  } catch (error) {
    console.error('Error processing email verification job:', error);
    throw error;
  }
});

// Handle job completion
processQueue.on('completed', (job, result) => {
  console.log(`Process job ${job.id} completed for ${result.email || result.subscriber || 'user'}`);
});

// Handle job failure
processQueue.on('failed', (job, err) => {
  console.error(`Process job ${job.id} failed for type ${job.data.type}:`, err);
});

// Handle job retry
processQueue.on('retry', (job, err) => {
  console.log(`Process job ${job.id} will be retried for type ${job.data.type}:`, err.message);
});

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('Shutting down server and process queue...');
  await processQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down server and process queue...');
  await processQueue.close();
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
      console.log('Process queue system ready');
      console.log('Queue workers started. Waiting for jobs...');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });