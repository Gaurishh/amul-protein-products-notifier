import Product from '../models/Product.js';

// GET /products
export async function getProducts(req, res) {
  try {
    const products = await Product.find({}, '-_id productId name');
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
