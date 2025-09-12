import Queue from 'bull';

// Single unified queue for all operations
const processQueue = new Queue('process_operations', process.env.REDIS_URL);

// Queue configuration
processQueue.on('error', (error) => {
  console.error('Process queue error:', error);
});

processQueue.on('waiting', (jobId) => {
  console.log(`Job ${jobId} is waiting`);
});

processQueue.on('active', (job) => {
  console.log(`Processing job ${job.id} for type ${job.data.type}`);
});

processQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed for type ${job.data.type}`);
});

processQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed for type ${job.data.type}:`, err);
});

// Stock notification jobs
export async function enqueueEmailJobs(restockedProducts, pincode, app) {
  try {
    const collectionName = `products_${pincode}`;
    // Group by subscriber
    const subscriberToProducts = {};
    for (const product of restockedProducts) {
      // Fetch the latest subscribers for this product from the correct collection
      const doc = await app.get('mongoose').connection.collection(collectionName).findOne({ productId: product.productId });
      const subscribers = doc && doc.subscribers ? doc.subscribers : [];
      for (const subscriber of subscribers) {
        if (!subscriberToProducts[subscriber]) {
          subscriberToProducts[subscriber] = [];
        }
        subscriberToProducts[subscriber].push(product);
      }
    }
    // Enqueue jobs
    const jobs = [];
    for (const [subscriber, products] of Object.entries(subscriberToProducts)) {
      const job = await processQueue.add('send_stock_notification', {
        type: 'send_stock_notification',
        subscriber,
        products: products.map(p => ({ 
          productId: p.productId, 
          name: p.name 
        })),
        pincode
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
    console.log(`Enqueued ${jobs.length} stock notification jobs for ${Object.keys(subscriberToProducts).length} subscribers`);
    return jobs;
  } catch (error) {
    console.error('Error enqueueing stock notification jobs:', error);
    throw error;
  }
}

// Expiry notification jobs
export async function enqueueExpiryNotifications(emails, pincode) {
  try {
    const jobs = [];
    for (const email of emails) {
      const job = await processQueue.add('send_expiry_notification', {
        type: 'send_expiry_notification',
        email,
        pincode
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
    console.log(`Enqueued ${jobs.length} expiry notification jobs for pincode ${pincode}`);
    return jobs;
  } catch (error) {
    console.error('Error enqueueing expiry notification jobs:', error);
    throw error;
  }
}

// Subscription management jobs
export async function enqueueSubscriptionJob(email, products, pincode, token) {
  try {
    const job = await processQueue.add('process_subscription', {
      type: 'process_subscription',
      email,
      products,
      pincode,
      token
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });
    console.log(`Enqueued subscription job for ${email}`);
    return job;
  } catch (error) {
    console.error('Error enqueueing subscription job:', error);
    throw error;
  }
}

export async function enqueueUnsubscribeJob(email, pincode, userData) {
  try {
    const job = await processQueue.add('process_unsubscribe', {
      type: 'process_unsubscribe',
      email,
      pincode,
      userData
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });
    console.log(`Enqueued unsubscribe job for ${email}`);
    return job;
  } catch (error) {
    console.error('Error enqueueing unsubscribe job:', error);
    throw error;
  }
}

export async function enqueueUnsubscribeByTokenJob(token, userData) {
  try {
    const job = await processQueue.add('process_unsubscribe_by_token', {
      type: 'process_unsubscribe_by_token',
      token,
      userData
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });
    console.log(`Enqueued unsubscribe by token job`);
    return job;
  } catch (error) {
    console.error('Error enqueueing unsubscribe by token job:', error);
    throw error;
  }
}

// Queue management
export async function getQueueStatus() {
  try {
    const waiting = await processQueue.getWaiting();
    const active = await processQueue.getActive();
    const completed = await processQueue.getCompleted();
    const failed = await processQueue.getFailed();
    
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
    await processQueue.empty();
    console.log('Process queue cleared');
  } catch (error) {
    console.error('Error clearing queue:', error);
  }
}

export { processQueue };

// Email verification job - just sends the verification email
export async function enqueueEmailVerificationJob(token) {
  try {
    const job = await processQueue.add('send_email_verification', {
      type: 'send_email_verification',
      token,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });
    console.log('Enqueued email verification job');
    return job;
  } catch (error) {
    console.error('Error enqueueing email verification job:', error);
    throw error;
  }
}

// Process email verification completion - when user clicks verification link
export async function enqueueEmailVerificationCompletionJob(token) {
  try {
    const job = await processQueue.add('process_email_verification', {
      type: 'process_email_verification',
      token,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });
    console.log('Enqueued email verification completion job');
    return job;
  } catch (error) {
    console.error('Error enqueueing email verification completion job:', error);
    throw error;
  }
}