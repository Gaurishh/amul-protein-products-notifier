import Product from '../models/Product.js';
import Pincode from '../models/Pincode.js';
import { emailQueue } from '../services/emailQueue.js';
import { enqueueExpiryNotifications } from '../services/emailQueue.js';

// GET /products
export async function getProducts(req, res) {
  try {
    const { pincode } = req.query;
    
    if (!pincode) {
      return res.status(400).json({ error: 'Pincode is required' });
    }
    
    // Use pincode-specific collection
    const collectionName = `products_${pincode}`;
    const collection = req.app.get('mongoose').connection.collection(collectionName);
    
    // Check if collection exists
    const collections = await req.app.get('mongoose').connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ error: 'No products found for this pincode' });
    }
    
    // Fetch products from pincode-specific collection
    const products = await collection.find({}, { projection: { _id: 0, productId: 1, name: 1, productPageUrl: 1, productImageUrl: 1 } }).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /products
export async function addProduct(req, res) {
  const { productId, name } = req.body;
  if (!productId || !name) {
    return res.status(400).json({ error: 'Missing required fields: productId and name' });
  }
  
  try {
    // Check if product already exists
    let product = await Product.findOne({ productId });
    if (product) {
      return res.status(200).json(product); // Product already exists
    }
    
    // Create new product
    product = new Product({ productId, name, subscribers: [] });
    await product.save();
    
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /verify-pincode
export async function verifyPincode(req, res) {
  const { pincode } = req.body;
  if (!pincode) {
    return res.status(400).json({ success: false, reason: 'missing_pincode' });
  }
  try {
    const collectionName = `products_${pincode}`;
    const collections = await req.app.get('mongoose').connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      return res.status(404).json({ success: false, reason: 'not_found' });
    }
    const firstProduct = await req.app.get('mongoose').connection.collection(collectionName).findOne({}, { sort: { timestamp: 1 } });
    if (!firstProduct || !firstProduct.timestamp) {
      return res.status(404).json({ success: false, reason: 'no_timestamp' });
    }
    const now = new Date();
    const productTime = new Date(firstProduct.timestamp);

    const diffHours = (now - productTime) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return res.status(200).json({ success: false, reason: 'stale' });
    }
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, reason: 'error', error: err.message });
  }
}

// POST /track-pincode
export async function trackPincodeInteraction(req, res) {
  const { pincode } = req.body;
  if (!pincode) {
    return res.status(400).json({ success: false, error: 'Missing pincode' });
  }
  try {
    const now = new Date();
    const updated = await Pincode.findOneAndUpdate(
      { pincode },
      { $set: { lastInteracted: now } },
      { upsert: true, new: true }
    );
    res.json({ success: true, pincode: updated.pincode, lastInteracted: updated.lastInteracted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// DELETE /pincode/:pincode
export async function deletePincode(req, res) {
  const { pincode } = req.params;
  if (!pincode) {
    return res.status(400).json({ success: false, error: 'Missing pincode' });
  }
  try {
    // Gather all unique emails from products_PINCODE collection
    const collectionName = `products_${pincode}`;
    const productDocs = await req.app.get('mongoose').connection.collection(collectionName).find({}, { projection: { subscribers: 1 } }).toArray();
    const uniqueEmails = new Set();
    for (const doc of productDocs) {
      (doc.subscribers || []).forEach(email => uniqueEmails.add(email));
    }
    let notificationResult = null;
    if (uniqueEmails.size > 0) {
      await enqueueExpiryNotifications(Array.from(uniqueEmails), pincode);
      notificationResult = `Expiry notifications enqueued for ${uniqueEmails.size} emails.`;
    }
    // Delete the pincode from the Pincode collection
    const result = await Pincode.deleteOne({ pincode });
    let collectionDropResult = null;
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Pincode not found', notificationResult });
    }
    // Drop the products_PINCODE collection
    try {
      await req.app.get('mongoose').connection.dropCollection(collectionName);
      collectionDropResult = `Collection ${collectionName} dropped.`;
    } catch (dropErr) {
      // If collection does not exist, ignore error
      if (dropErr.codeName !== 'NamespaceNotFound') {
        return res.status(500).json({ success: false, error: dropErr.message, notificationResult });
      }
      collectionDropResult = `Collection ${collectionName} did not exist.`;
    }
    res.json({ success: true, message: `Pincode ${pincode} deleted`, notificationResult, collectionDropResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
