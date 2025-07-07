import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from config import *

logger = logging.getLogger(__name__)

class EmailNotifier:
    def __init__(self):
        self.smtp_server = SMTP_SERVER
        self.smtp_port = SMTP_PORT
        self.email_user = EMAIL_USER
        self.email_password = EMAIL_PASSWORD
        
    def send_email(self, to_email, subject, body):
        """Send a single email"""
        try:
            if not self.email_user or not self.email_password:
                logger.warning("Email credentials not configured. Skipping email notification.")
                return False
                
            msg = MIMEMultipart()
            msg['From'] = self.email_user
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            
            text = msg.as_string()
            server.sendmail(self.email_user, to_email, text)
            server.quit()
            
            logger.info(f"Email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            return False
            
    def send_stock_notification(self, subscriber_email, product_name, product_url=None):
        """Send stock notification email to a subscriber"""
        subject = f"🎉 {product_name} is back in stock!"
        unsubscribe_link = f"{FRONTEND_BASE_URL}/unsubscribe?email={subscriber_email}"
        
        # Construct product URL using productId format
        if product_url:
            product_display = f"<a href=\"{product_url}\">{product_name}</a>"
        else:
            product_display = product_name
        
        body = f"""
Hello!

Great news! The product you've been waiting for is now back in stock:

📦 {product_display}

You can now purchase it from the Amul website.

🔗 Browse all protein products: https://shop.amul.com/en/browse/protein

If you wish to unsubscribe from these notifications, click here: {unsubscribe_link}

Best regards,
Amul Protein Products Notifier
        """.strip()
        
        return self.send_email(subscriber_email, subject, body)

    def send_bulk_stock_notification(self, subscriber_email, products):
        """Send a bulk stock notification email to a subscriber for multiple products"""
        unsubscribe_link = f"{FRONTEND_BASE_URL}/unsubscribe?email={subscriber_email}"
        product_lines = []
        for p in products:
            product_url = f"https://shop.amul.com/en/product/{p['productId']}"
            product_lines.append(f"• <a href=\"{product_url}\">{p['name']}</a>")
        
        body = (
            "Hello!\n\nThe following products you subscribed to are now back in stock:\n\n" +
            "\n".join(product_lines) +
            f"\n\n🔗 Browse all protein products: https://shop.amul.com/en/browse/protein" +
            f"\n\nIf you wish to unsubscribe from these notifications, click here: {unsubscribe_link}" +
            "\n\nYou can now purchase them from the Amul website.\n\nBest regards,\nAmul Protein Products Notifier"
        )
        return self.send_email(subscriber_email, "Products Back in Stock!", body)

# Example usage
if __name__ == "__main__":
    notifier = EmailNotifier()
    # Test email (uncomment to test)
    # notifier.send_stock_notification("1gaurishsood@gmail.com", "Amul Milk") 