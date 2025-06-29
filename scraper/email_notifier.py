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
        
        body = f"""
Hello!

Great news! The product you've been waiting for is now back in stock:

📦 {product_name}

You can now purchase it from the Amul website.

{f"🔗 Product Link: {product_url}" if product_url else ""}

Best regards,
Amul Protein Products Notifier
        """.strip()
        
        return self.send_email(subscriber_email, subject, body)

# Example usage
if __name__ == "__main__":
    notifier = EmailNotifier()
    # Test email (uncomment to test)
    # notifier.send_stock_notification("1gaurishsood@gmail.com", "Amul Milk") 