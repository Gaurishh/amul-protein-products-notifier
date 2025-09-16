import Brevo from '@getbrevo/brevo';
import dotenv from 'dotenv';

dotenv.config();

// Configure Brevo API
const defaultClient = Brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize API instances
const transactionalEmailsApi = new Brevo.TransactionalEmailsApi();

// Test Brevo connection on startup
const testBrevoConnection = async () => {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn('Brevo API key not configured');
      return;
    }
    
    // Test connection by getting account info
    const accountApi = new Brevo.AccountApi();
    const account = await accountApi.getAccount();
    console.log('Brevo API is ready to send emails');
  } catch (error) {
    console.error('Brevo API connection error:', error);
  }
};

// Initialize connection test
testBrevoConnection();

// Helper function to send email via Brevo
async function sendEmailViaBrevo(to, subject, htmlContent, fromEmail = null, fromName = null) {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('Brevo API key not configured');
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: fromName || process.env.FROM_NAME || 'Amul Products Notifier',
      email: fromEmail || process.env.FROM_EMAIL || process.env.EMAIL_USER
    };

    const result = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
    console.log(`Email sent successfully via Brevo. Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
    throw error;
  }
}

export async function sendBulkStockNotification(subscriber, products, pincode, token, mongoose) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn("Brevo API key not configured. Skipping stock notification email.");
      return false;
    }

    // Get city name from pincode
    const pincodeDoc = await mongoose.connection.collection('pincodes').findOne({ pincode });
    const cityName = pincodeDoc ? pincodeDoc.state : `Pincode ${pincode}`;
    
    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const unsubscribeLink = `${FRONTEND_BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    const editLink = `${FRONTEND_BASE_URL}/edit-subscription?token=${encodeURIComponent(token)}`;

    const subject = '🚀 Amul Protein Products Back in Stock';

    const productList = products.map(product => {
      const productName = product.productPageUrl 
        ? `<a href="${product.productPageUrl}" style="color: #2c3e50; text-decoration: none; font-weight: bold;">${product.name}</a>`
        : `<strong>${product.name}</strong>`;
      
      return `<li style="margin: 10px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #28a745; border-radius: 5px;">
        ${productName}<br>
        <span style="color: #28a745; font-weight: bold;">✓ Available</span>
        ${product.productPageUrl ? `<br><a href="${product.productPageUrl}" style="color: #007bff; text-decoration: none; font-size: 14px; margin-top: 5px; display: inline-block;">🔗 View Product →</a>` : ''}
      </li>`;
    }).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🎉 Great News!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Amul Protein Products are back in stock!</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Available Products in ${cityName}:</h2>
          
          <ul style="list-style: none; padding: 0; margin: 20px 0;">
            ${productList}
          </ul>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #28a745; font-weight: bold;">
              ⚡ These products are now available! Check your nearest store or online platforms.
            </p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${FRONTEND_BASE_URL}" 
               style="display: inline-block; padding: 12px 25px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">
              Visit Our Website
            </a>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${editLink}" 
               style="display: inline-block; padding: 10px 20px; background: #6c757d; color: #fff; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
              Edit Subscription
            </a>
            <a href="${unsubscribeLink}" 
               style="display: inline-block; padding: 10px 20px; background: #dc3545; color: #fff; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
              Unsubscribe
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          
          <p style="color: #7f8c8d; font-size: 12px; text-align: center;">
            You can manage your subscription anytime using the buttons above or the links in future emails.
          </p>
          
          <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 10px;">
            Best regards,<br>
            Amul Protein Products Notifier
          </p>
        </div>
      </div>
    `;

    await sendEmailViaBrevo(subscriber, subject, htmlContent);
    console.log(`Stock notification email sent to ${subscriber}`);
    return true;

  } catch (error) {
    console.error(`Failed to send stock notification email to ${subscriber}:`, error);
    return false;
  }
}

export async function sendEmailVerification(email, token) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn("Brevo API key not configured. Skipping verification email.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const verifyLink = `${FRONTEND_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;

    const subject = 'Verify your email to activate notifications';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Verify your email</h2>
        <p>Click the button below to verify your email and activate your notifications.</p>
        <p style="color: #e74c3c; font-weight: bold; margin: 15px 0;">⚠️ Important: This verification link is valid for 5 minutes only.</p>
        <div style="margin: 30px 0;">
          <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Verify Email</a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">If you did not request this, you can ignore this email.</p>
      </div>
    `;

    await sendEmailViaBrevo(email, subject, htmlContent);
    console.log(`Verification email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send verification email to ${email}:`, error);
    return false;
  }
}

export async function sendSubscriptionConfirmation(email, productIds, pincode, token, mongoose) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn("Brevo API key not configured. Skipping subscription confirmation email.");
      return false;
    }

    // Get product details from pincode-specific collection
    const collectionName = `products_${pincode}`;
    const collection = mongoose.connection.collection(collectionName);
    const products = await collection.find({ productId: { $in: productIds } }, { 
      projection: { _id: 0, productId: 1, name: 1 } 
    }).toArray();
    
    // Get city name from pincode
    const pincodeDoc = await mongoose.connection.collection('pincodes').findOne({ pincode });
    const cityName = pincodeDoc ? pincodeDoc.state : `Pincode ${pincode}`;
    
    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const unsubscribeLink = `${FRONTEND_BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    const editLink = `${FRONTEND_BASE_URL}/edit-subscription?token=${encodeURIComponent(token)}`;

    const subject = '✅ Subscription Confirmed - Amul Protein Products Notifications';

    const productList = products.map(product => 
      `<li style="margin: 8px 0; color: #2c3e50;">
        <strong>${product.name}</strong>
      </li>`
    ).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #28a745; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">✅ Subscription Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">You'll now receive notifications for Amul Protein Products</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #2c3e50; margin-bottom: 20px;">Your Subscription Details:</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #495057;"><strong>📍 Location:</strong> ${cityName}</p>
            <p style="margin: 0 0 15px 0; color: #495057;"><strong>📦 Products you're tracking:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${productList}
            </ul>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #28a745; font-weight: bold;">
              🚀 You'll be notified as soon as any of these products become available in your area!
            </p>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${editLink}" 
               style="display: inline-block; padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
              Edit Subscription
            </a>
            <a href="${unsubscribeLink}" 
               style="display: inline-block; padding: 10px 20px; background: #dc3545; color: #fff; text-decoration: none; border-radius: 5px; margin: 5px; font-weight: bold;">
              Unsubscribe
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          
          <p style="color: #7f8c8d; font-size: 12px; text-align: center;">
            You can manage your subscription anytime using the buttons above or the links in future emails.
          </p>
          
          <p style="color: #7f8c8d; font-size: 12px; text-align: center; margin-top: 10px;">
            Best regards,<br>
            Amul Protein Products Notifier
          </p>
        </div>
      </div>
    `;

    await sendEmailViaBrevo(email, subject, htmlContent);
    console.log(`Subscription confirmation email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send subscription confirmation email to ${email}:`, error);
    return false;
  }
}

export async function sendUnsubscribeConfirmation(email, productNames) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn("Brevo API key not configured. Skipping unsubscribe confirmation email.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resubscribeLink = `${FRONTEND_BASE_URL}`;

    const subject = 'Unsubscribed - Amul Protein Products Notifications';

    const productList = productNames.map(name => 
      `<li style="margin: 5px 0; color: #6c757d;">${name}</li>`
    ).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Successfully Unsubscribed</h2>
        <p>Hello,</p>
        <p>You have been successfully unsubscribed from Amul Protein Products notifications for the following products:</p>
        <ul style="margin: 15px 0; padding-left: 20px;">
          ${productList}
        </ul>
        <p>You will no longer receive notifications for these products.</p>
        <div style="margin: 30px 0;">
          <a href="${resubscribeLink}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Resubscribe</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Best regards,<br>
          Amul Protein Products Notifier
        </p>
      </div>
    `;

    await sendEmailViaBrevo(email, subject, htmlContent);
    console.log(`Unsubscribe confirmation email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send unsubscribe confirmation email to ${email}:`, error);
    return false;
  }
}

export async function sendExpiryNotification(email, pincode) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.warn("Brevo API key not configured. Skipping expiry notification email.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
    const resubscribeLink = `${FRONTEND_BASE_URL}`;

    const subject = 'Subscription Expired';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Subscription Expired</h2>
        <p>Hello,</p>
        <p>Your subscription for Amul Protein Products notifications has expired due to inactivity.</p>
        <p>If you wish to continue receiving notifications, please resubscribe using the link below:</p>
        <div style="margin: 30px 0;">
          <a href="${resubscribeLink}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Resubscribe</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Best regards,<br>
          Amul Protein Products Notifier
        </p>
      </div>
    `;

    await sendEmailViaBrevo(email, subject, htmlContent);
    console.log(`Expiry notification email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send expiry notification email to ${email}:`, error);
    return false;
  }
}