import { emailQueue } from '../services/emailQueue.js';
import { sendBulkStockNotification } from '../services/emailService.js';
import http from 'http';

// Dummy HTTP server for Render web service workaround
const PORT = process.env.PORT_DUMMY || 7000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Worker running');
}).listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
});

// Process email jobs
emailQueue.process('send_stock_notification', async (job) => {
  const { subscriber, products } = job.data;
  
  try {
    console.log(`Processing email job for ${subscriber} with ${products.length} products`);
    
    const result = await sendBulkStockNotification(subscriber, products);
    
    if (result) {
      console.log(`Successfully sent email to ${subscriber}`);
      return { success: true, subscriber, productsCount: products.length };
    } else {
      throw new Error(`Failed to send email to ${subscriber}`);
    }
    
  } catch (error) {
    console.error(`Error processing email job for ${subscriber}:`, error);
    throw error; // This will trigger a retry
  }
});

// Handle job completion
emailQueue.on('completed', (job, result) => {
  console.log(`Email job ${job.id} completed for ${result.subscriber}`);
});

// Handle job failure
emailQueue.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed for ${job.data.subscriber}:`, err);
});

// Handle job retry
emailQueue.on('retry', (job, err) => {
  console.log(`Email job ${job.id} will be retried for ${job.data.subscriber}:`, err.message);
});

console.log('Email worker started. Waiting for jobs...');

// Keep the process alive
process.on('SIGINT', async () => {
  console.log('Shutting down email worker...');
  await emailQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down email worker...');
  await emailQueue.close();
  process.exit(0);
}); 