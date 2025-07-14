import Queue from 'bull';
import Redis from 'ioredis';

// Create Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create email queue
const emailQueue = new Queue('email_notifications', process.env.REDIS_URL);

// Queue configuration
emailQueue.on('error', (error) => {
  console.error('Email queue error:', error);
});

emailQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

emailQueue.on('active', (job) => {
  console.log(`Processing job ${job.id} for ${job.data.subscriber}`);
});

emailQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed for ${job.data.subscriber}`);
});

emailQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed for ${job.data.subscriber}:`, err);
});

export async function enqueueEmailJobs(restockedProducts) {
  try {
    // Group by subscriber
    const subscriberToProducts = {};
    
    for (const product of restockedProducts) {
      for (const subscriber of product.subscribers) {
        if (!subscriberToProducts[subscriber]) {
          subscriberToProducts[subscriber] = [];
        }
        subscriberToProducts[subscriber].push(product);
      }
    }
    
    // Enqueue jobs
    const jobs = [];
    for (const [subscriber, products] of Object.entries(subscriberToProducts)) {
      const job = await emailQueue.add('send_stock_notification', {
        subscriber,
        products: products.map(p => ({ 
          productId: p.productId, 
          name: p.name 
        }))
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      });
      jobs.push(job);
    }
    
    console.log(`Enqueued ${jobs.length} email jobs for ${Object.keys(subscriberToProducts).length} subscribers`);
    return jobs;
    
  } catch (error) {
    console.error('Error enqueueing email jobs:', error);
    throw error;
  }
}

export async function getQueueStatus() {
  try {
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  } catch (error) {
    console.error('Error getting queue status:', error);
    return null;
  }
}

export async function clearQueue() {
  try {
    await emailQueue.empty();
    console.log('Email queue cleared');
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

export { emailQueue }; 