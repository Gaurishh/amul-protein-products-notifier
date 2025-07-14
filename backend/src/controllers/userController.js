import User from '../models/User.js';
import Product from '../models/Product.js';
import { sendSubscriptionConfirmation } from '../services/emailService.js';

// POST /subscribe
export async function subscribeUser(req, res) {
  const { email, products } = req.body;
  if (!email || !products || !products.length) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }
    user = new User({ email, products, subscribed: true });
    await user.save();
    // Add user to product subscribers
    for (const productId of products) {
      await Product.updateOne(
        { productId },
        { $addToSet: { subscribers: email } },
        { upsert: true }
      );
    }
    // Send confirmation email (do not block response on error)
    sendSubscriptionConfirmation(email, products).catch((err) => {
      console.error('Failed to send confirmation email:', err);
    });
    // console.log('Subscription confirmation email sent to:', email);
    res.json({ message: 'Subscription saved' });
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
  const { products } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Remove user from old product subscribers
    for (const oldProductId of user.products) {
      await Product.updateOne(
        { productId: oldProductId },
        { $pull: { subscribers: email } }
      );
    }
    // Update user
    user.products = products;
    await user.save();
    // Add user to new product subscribers
    for (const productId of products) {
      await Product.updateOne(
        { productId },
        { $addToSet: { subscribers: email } },
        { upsert: true }
      );
    }
    res.json({ message: 'Subscription updated' });
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
    // Remove user from all product subscribers
    for (const productId of user.products) {
      await Product.updateOne(
        { productId },
        { $pull: { subscribers: email } }
      );
    }
    res.json({ message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}