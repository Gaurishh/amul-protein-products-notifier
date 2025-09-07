import { enqueueEmailJobs } from '../services/emailQueue.js';

// POST /stock-changes
export async function processStockChanges(req, res) {
  // console.log('processStockChanges called. req.body:', req.body);
  const { products, timestamp, scraper_id, pincode } = req.body;

  if (!products || !Array.isArray(products)) {
    return res.status(400).json({ error: 'Products array is required' });
  }
  if (!pincode) {
    return res.status(400).json({ error: 'Pincode is required' });
  }
  try {
    const collectionName = `products_${pincode}`;
    const restockedProducts = [];
    for (const product of products) {
      const { productId, name, sold_out, productPageUrl, productImageUrl } = product;
      // Fetch the existing document for this product
      const existing = await req.app.get('mongoose').connection.collection(collectionName).findOne({ productId });
      let wasSoldOut = null;
      if (existing) {
        wasSoldOut = existing.sold_out;
      }
      // If previously sold out and now in stock, mark for notification
      if (wasSoldOut === true && sold_out === false) {
        // Fetch all unique subscribers for this product and pincode
        const subscribers = existing && existing.subscribers ? existing.subscribers : [];
        restockedProducts.push({
          productId,
          name,
          productPageUrl: productPageUrl || existing?.productPageUrl || null,
          productImageUrl: productImageUrl || existing?.productImageUrl || null,
          subscribers: [...new Set(subscribers)]
        });
      }
      // Upsert the latest product data
      const updateData = {
        name,
        sold_out,
        timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
        scraper_id: scraper_id || null
      };
      
      // Always set URLs if they are provided (not null/undefined/empty string)
      if (productPageUrl && productPageUrl.trim() !== '') {
        updateData.productPageUrl = productPageUrl;
      }
      if (productImageUrl && productImageUrl.trim() !== '') {
        updateData.productImageUrl = productImageUrl;
      }
      
      await req.app.get('mongoose').connection.collection(collectionName).updateOne(
        { productId },
        {
          $set: updateData,
          $setOnInsert: { subscribers: existing && existing.subscribers ? existing.subscribers : [] }
        },
        { upsert: true }
      );
    }
    if (restockedProducts.length > 0) {
      await enqueueEmailJobs(restockedProducts, pincode, req.app);
      console.log(`Enqueued email notifications for ${restockedProducts.length} restocked products`);
    }
    res.json({ success: true, restockedProducts });
  } catch (err) {
    console.error('Error processing stock changes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
