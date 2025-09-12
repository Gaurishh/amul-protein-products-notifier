import User from '../models/User.js';
import { sendSubscriptionConfirmation, sendUnsubscribeConfirmation, sendEmailVerification } from '../services/emailService.js';
import { enqueueSubscriptionJob, enqueueUnsubscribeJob, enqueueUnsubscribeByTokenJob, enqueueEmailVerificationJob } from '../services/emailQueue.js';
import { v4 as uuidv4 } from 'uuid';

// POST /subscribe
export async function subscribeUser(req, res) {
  const { email, products, pincode } = req.body;
  if (!email || !products || !products.length || !pincode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create user with token and unverified email; auto-expire in 5 minutes
    user = new User({
      email,
      products,
      pincode,
      token: uuidv4(),
      emailVerified: false,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });
    await user.save();
    
    // Send verification email instead of immediate processing
    await sendEmailVerification(email, user.token);
    
    // Return immediate response
    res.json({ 
      message: 'Verification email sent. Please verify to activate notifications.', 
      pincode,
      status: 'verification_pending'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /user/:email
export async function getUser(req, res) {
  const { email } = req.params;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// PUT /user/:email
export async function updateUser(req, res) {
  const { email } = req.params;
  const { products, pincode } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Remove user from old product subscribers in the old pincode collection
    const oldCollectionName = `products_${user.pincode}`;
    for (const oldProductId of user.products) {
      await req.app.get('mongoose').connection.collection(oldCollectionName).updateOne(
        { productId: oldProductId },
        { $pull: { subscribers: email } }
      );
    }
    // Update user
    user.products = products;
    if (pincode) user.pincode = pincode;
    await user.save();
    // Add user to new product subscribers in the new pincode collection
    const newCollectionName = `products_${user.pincode}`;
    for (const productId of products) {
      await req.app.get('mongoose').connection.collection(newCollectionName).updateOne(
        { productId },
        { $addToSet: { subscribers: email } },
        { upsert: true }
      );
    }
    // Track pincode interaction (update lastInteracted)
    const now = new Date();
    await req.app.get('mongoose').connection.collection('pincodes').updateOne(
      { pincode: user.pincode },
      { $set: { lastInteracted: now } },
      { upsert: true }
    );
    res.json({ message: 'Subscription updated', pincode: user.pincode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// DELETE /user/:email
export async function deleteUser(req, res) {
  const { email } = req.params;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Store user data before deletion
    const userData = {
      email: user.email,
      products: user.products,
      pincode: user.pincode
    };
    
    // Delete user immediately
    await User.findOneAndDelete({ email });
    
    // Enqueue unsubscribe processing job with user data for immediate response
    enqueueUnsubscribeJob(email, user.pincode, userData).catch((err) => {
      console.error('Failed to enqueue unsubscribe job:', err);
    });
    
    // Return immediate response
    res.json({ 
      message: 'Unsubscription queued for processing',
      status: 'processing'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Unsubscribe by token
export async function unsubscribeByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ error: 'Invalid or expired token' });
    
    // Store user data before deletion
    const userData = {
      email: user.email,
      products: user.products,
      pincode: user.pincode
    };
    
    // Delete user immediately
    await User.findOneAndDelete({ token });
    
    // Enqueue unsubscribe processing job with user data for immediate response
    enqueueUnsubscribeByTokenJob(token, userData).catch((err) => {
      console.error('Failed to enqueue unsubscribe by token job:', err);
    });
    
    // Return immediate response
    res.json({ 
      message: 'Unsubscription queued for processing',
      status: 'processing'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Edit subscription by token
export async function editSubscriptionByToken(req, res) {
  const { token } = req.query;
  const { products, pincode } = req.body;
  if (!token || !products || !products.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ error: 'Invalid or expired token' });
    // Remove user from old product subscribers in the old pincode collection
    const oldCollectionName = `products_${user.pincode}`;
    for (const oldProductId of user.products) {
      await req.app.get('mongoose').connection.collection(oldCollectionName).updateOne(
        { productId: oldProductId },
        { $pull: { subscribers: user.email } }
      );
    }
    // Update user
    user.products = products;
    if (pincode) user.pincode = pincode;
    await user.save();
    // Add user to new product subscribers in the new pincode collection
    const newCollectionName = `products_${user.pincode}`;
    for (const productId of products) {
      await req.app.get('mongoose').connection.collection(newCollectionName).updateOne(
        { productId },
        { $addToSet: { subscribers: user.email } },
        { upsert: true }
      );
    }
    res.json({ message: 'Subscription updated', pincode: user.pincode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get user by token
export async function getUserByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /verify-email?token=...
export async function verifyEmail(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ error: 'Invalid or expired token' });

    // Enqueue verification to process asynchronously
    await enqueueEmailVerificationJob(token);

    return res.json({ success: true, status: 'queued', message: 'Email verification queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /users/count - Get total number of users and user limit status
export async function getUserCount(req, res) {
  try {
    const userCount = await User.countDocuments();
    const userLimitExceeded = userCount > 80;
    
    res.json({
      success: true,
      totalUsers: userCount,
      userLimitExceeded: userLimitExceeded,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}