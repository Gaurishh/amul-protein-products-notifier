import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendBulkStockNotification(subscriber, products, pincode, token) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping email notification.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
    const unsubscribeLink = `${FRONTEND_BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    const editSubscriptionLink = `${FRONTEND_BASE_URL}/edit-subscription?token=${encodeURIComponent(token)}`;

    // Create product list HTML
    const productLines = products.map(product => {
      const productUrl = product.productPageUrl || `https://shop.amul.com/en/product/${product.productId}`;
      const productImage = product.productImageUrl ? `<img src="${product.productImageUrl}" alt="${product.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px; margin-right: 10px; vertical-align: middle;">` : '';
      return `<li style="margin: 10px 0; padding: 10px; border: 1px solid #ecf0f1; border-radius: 5px;">
        ${productImage}
        <a href="${productUrl}" style="color: #3498db; text-decoration: none; font-weight: bold;">${product.name}</a>
      </li>`;
    }).join('');

    const subject = products.length === 1
      ? `🎉 ${products[0].name} is back in stock!`
      : `🎉 ${products.length} products are back in stock!`;

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Products Back in Stock!</h2>
        <p>Hello!</p>
        <p>The following products you subscribed to are now back in stock:</p>
        <ul style="list-style-type: none; padding: 0;">
          ${productLines}
        </ul>
        <p>🔗 <a href="https://shop.amul.com/en/browse/protein" style="color: #3498db;">Browse all protein products</a></p>
        <p>You can now purchase them from the Amul website.</p>
        <div style="margin: 30px 0;">
          <p>If you wish to unsubscribe from these notifications, click the button below:</p>
          <a href="${unsubscribeLink}" style="display: inline-block; padding: 10px 20px; background: #e74c3c; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Unsubscribe</a>
        </div>
        <div style="margin: 30px 0;">
          <p>If you wish to edit your subscription, click the button below:</p>
          <a href="${editSubscriptionLink}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Edit Subscription</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Best regards,<br>
          Amul Protein Products Notifier
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: subscriber,
      subject: subject,
      html: body
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${subscriber} for ${products.length} products`);
    return true;

  } catch (error) {
    console.error(`Failed to send email to ${subscriber}:`, error);
    return false;
  }
}

export async function sendSubscriptionConfirmation(email, productIds, pincode, token) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping confirmation email.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
    const unsubscribeLink = `${FRONTEND_BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
    const editSubscriptionLink = `${FRONTEND_BASE_URL}/edit-subscription?token=${encodeURIComponent(token)}`;

    const subject = 'Subscription Confirmed - Amul Protein Products Restock Notifier';

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Subscription Confirmed!</h2>
        <p>Thank you for subscribing! You will be notified when your selected products are restocked.</p>
        <p><strong>You subscribed for:</strong></p>
        <ul>
          ${productIds.map(id => `<li>Product ID: ${id}</li>`).join('')}
        </ul>
        <p>🔗 <a href="https://shop.amul.com/en/browse/protein" style="color: #3498db;">Browse all protein products</a></p>
        <div style="margin: 30px 0;">
          <p>If you wish to unsubscribe from these notifications, click the button below:</p>
          <a href="${unsubscribeLink}" style="display: inline-block; padding: 10px 20px; background: #e74c3c; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Unsubscribe</a>
        </div>
        <div style="margin: 30px 0;">
          <p>If you wish to edit your subscription, click the button below:</p>
          <a href="${editSubscriptionLink}" style="display: inline-block; padding: 10px 20px; background: #3498db; color: #fff; text-decoration: none; border-radius: 5px; margin: 10px 0;">Edit Subscription</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Best regards,<br>
          Amul Protein Products Notifier
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: body
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send confirmation email to ${email}:`, error);
    return false;
  }
}

export async function sendExpiryNotification(email, pincode) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured. Skipping expiry notification email.");
      return false;
    }

    const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;
    const resubscribeLink = `${FRONTEND_BASE_URL}`;

    const subject = 'Subscription Expired - Amul Protein Products Notifier';

    const body = `
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

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: body
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Expiry notification email sent to ${email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send expiry notification email to ${email}:`, error);
    return false;
  }
} 