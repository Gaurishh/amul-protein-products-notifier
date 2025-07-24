import User from '../models/User.js';
import { sendSubscriptionConfirmation } from '../services/emailService.js';
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
    user = new User({ email, products, pincode, token: uuidv4() });
    await user.save();
    // Add user to product subscribers in the correct pincode collection
    const collectionName = `products_${pincode}`;
    for (const productId of products) {
      await req.app.get('mongoose').connection.collection(collectionName).updateOne(
        { productId },
        { $addToSet: { subscribers: email } },
        { upsert: true }
      );
    }
    // Track pincode interaction (update lastInteracted)
    const now = new Date();
    await req.app.get('mongoose').connection.collection('pincodes').updateOne(
      { pincode },
      { $set: { lastInteracted: now } },
      { upsert: true }
    );
    // Send confirmation email (do not block response on error)
    sendSubscriptionConfirmation(email, products, pincode, user.token).catch((err) => {
      console.error('Failed to send confirmation email:', err);
    });
    res.json({ message: 'Subscription saved', pincode });
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
    const user = await User.findOneAndDelete({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Remove user from all product subscribers in the correct pincode collection
    const collectionName = `products_${user.pincode}`;
    for (const productId of user.products) {
      await req.app.get('mongoose').connection.collection(collectionName).updateOne(
        { productId },
        { $pull: { subscribers: email } }
      );
    }
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Unsubscribe by token
export async function unsubscribeByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  try {
    const user = await User.findOneAndDelete({ token });
    if (!user) return res.status(404).json({ error: 'Invalid or expired token' });
    // Remove user from all product subscribers in the correct pincode collection
    const collectionName = `products_${user.pincode}`;
    for (const productId of user.products) {
      await req.app.get('mongoose').connection.collection(collectionName).updateOne(
        { productId },
        { $pull: { subscribers: user.email } }
      );
    }
    res.json({ message: 'Unsubscribed' });
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