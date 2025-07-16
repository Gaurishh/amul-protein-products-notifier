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
