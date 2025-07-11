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
        
    def send_email(self, to_email, subject, body, is_html=False):
        """Send a single email"""
        try:
            if not self.email_user or not self.email_password:
                logger.warning("Email credentials not configured. Skipping email notification.")
                return False
                
            msg = MIMEMultipart()
            msg['From'] = self.email_user
            msg['To'] = to_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'html' if is_html else 'plain'))
            
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
        edit_subscription_link = f"{FRONTEND_BASE_URL}/edit-subscription?email={subscriber_email}"
        
        # Construct product URL using productId format
        if product_url:
            product_display = f"<a href=\"{product_url}\">{product_name}</a>"
        else:
            product_display = product_name
        
        body = f"""
Hello!<br><br>
Great news! The product you've been waiting for is now back in stock:<br><br>
📦 {product_display}<br><br>
You can now purchase it from the Amul website.<br><br>
🔗 Browse all protein products: <a href=\"https://shop.amul.com/en/browse/protein\">https://shop.amul.com/en/browse/protein</a><br><br>
If you wish to unsubscribe from these notifications, click the button below:<br>
<a href=\"{unsubscribe_link}\" style=\"display:inline-block;padding:10px 20px;background:#d9534f;color:#fff;text-decoration:none;border-radius:5px;\">Unsubscribe</a><br><br>
If you wish to edit your subscription, click the button below:<br>
<a href=\"{edit_subscription_link}\" style=\"display:inline-block;padding:10px 20px;background:#0275d8;color:#fff;text-decoration:none;border-radius:5px;\">Edit Subscription</a><br><br>
Best regards,<br>
Amul Protein Products Notifier
        """.strip()
        
        return self.send_email(subscriber_email, subject, body, is_html=True)

    def send_bulk_stock_notification(self, subscriber_email, products):
        """Send a bulk stock notification email to a subscriber for multiple products"""
        unsubscribe_link = f"{FRONTEND_BASE_URL}/unsubscribe?email={subscriber_email}"
        edit_subscription_link = f"{FRONTEND_BASE_URL}/edit-subscription?email={subscriber_email}"
        product_lines = []
        for p in products:
            product_url = f"https://shop.amul.com/en/product/{p['productId']}"
            product_lines.append(f"<li><a href=\"{product_url}\">{p['name']}</a></li>")
        
        body = (
            "Hello!<br><br>"
            "The following products you subscribed to are now back in stock:<br><ul>"
            + "".join(product_lines) + "</ul><br>"
            + "🔗 Browse all protein products: <a href=\"https://shop.amul.com/en/browse/protein\">https://shop.amul.com/en/browse/protein</a><br><br>"
            + "If you wish to unsubscribe from these notifications, click the button below:<br>"
            + f"<a href=\"{unsubscribe_link}\" style=\"display:inline-block;padding:10px 20px;background:#d9534f;color:#fff;text-decoration:none;border-radius:5px;\">Unsubscribe</a><br><br>"
            + "If you wish to edit your subscription, click the button below:<br>"
            + f"<a href=\"{edit_subscription_link}\" style=\"display:inline-block;padding:10px 20px;background:#0275d8;color:#fff;text-decoration:none;border-radius:5px;\">Edit Subscription</a><br><br>"
            + "You can now purchase them from the Amul website.<br><br>Best regards,<br>Amul Protein Products Notifier"
        )
        return self.send_email(subscriber_email, "Products Back in Stock!", body, is_html=True)

# Example usage
if __name__ == "__main__":
    notifier = EmailNotifier()
    # Test email (uncomment to test)
    # notifier.send_stock_notification("1gaurishsood@gmail.com", "Amul Milk") 