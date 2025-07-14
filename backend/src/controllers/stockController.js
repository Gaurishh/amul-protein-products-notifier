import Product from '../models/Product.js';
import { enqueueEmailJobs } from '../services/emailQueue.js';

// POST /stock-changes
export async function processStockChanges(req, res) {
  const { products, timestamp, scraper_id } = req.body;
  
  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'Products array is required' });
  }
  
  try {
    const restockedProducts = [];
    let processedCount = 0;
    
    for (const scrapedProduct of products) {
      const { productId, name, sold_out } = scrapedProduct;
      
      if (!productId || !name) {
        console.log('Skipping product with missing productId or name');
        continue;
      }
      
      // Find existing product
      let product = await Product.findOne({ productId });
      
      if (!product) {
        // Create new product
        product = new Product({ 
          productId, 
          name, 
          subscribers: [],
          stock_status: sold_out,
          last_updated: new Date()
        });
        await product.save();
        processedCount++;
        continue;
      }
      
      // Check for stock status change
      const previousStatus = product.stock_status;
      if (previousStatus === true && sold_out === false) {
        // Product came back in stock!
        restockedProducts.push({
          productId,
          name: product.name,
          subscribers: product.subscribers
        });
      }
      
      // Update stock status and timestamp
      product.stock_status = sold_out;
      product.last_updated = new Date();
      await product.save();
      processedCount++;
    }
    
    // Enqueue email notifications for restocked products
    if (restockedProducts.length > 0) {
      await enqueueEmailJobs(restockedProducts);
      console.log(`Enqueued email notifications for ${restockedProducts.length} restocked products`);
    }
    
    res.json({ 
      success: true, 
      processed: processedCount,
      restocked: restockedProducts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error processing stock changes:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /stock-status
export async function getStockStatus(req, res) {
  try {
    const products = await Product.find({}, 'productId name stock_status last_updated');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 