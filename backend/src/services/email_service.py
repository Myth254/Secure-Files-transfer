"""
Email Service for Sending OTP Codes
"""
import os
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from jinja2 import Environment

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails with OTP codes"""
    
    # Email configuration from environment variables
    SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    FROM_EMAIL = os.environ.get('FROM_EMAIL', '')
    APP_NAME = os.environ.get('APP_NAME', 'Secure File Transfer')
    
    @classmethod
    def send_otp_email(cls, email: str, otp_code: str, purpose: str, username: Optional[str] = None) -> bool:
        """
        Send OTP code via email.

        The otp_code parameter is the plaintext value needed to put in the
        email body.  It must NEVER be written to any log line in this method.

        Args:
            email: Recipient email address
            otp_code: 6-digit OTP code (used only in email body, never logged)
            purpose: Purpose of OTP (login, download, etc.)
            username: Recipient username (optional)

        Returns:
            bool: True if email sent successfully
        """
        # Guard: refuse to attempt an anonymous relay if credentials are missing
        if not cls.SMTP_USERNAME or not cls.SMTP_PASSWORD:
            logger.warning(
                "SMTP_USERNAME or SMTP_PASSWORD is not configured. "
                "Cannot send OTP email — aborting to avoid open relay."
            )
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f'{cls.APP_NAME} - Your OTP Verification Code'
            msg['From'] = cls.FROM_EMAIL
            msg['To'] = email
            
            # Get email template
            html_content = cls._get_email_template(otp_code, purpose, username)
            text_content = cls._get_text_template(otp_code, purpose, username)
            
            # Attach parts
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            # Send email with verified TLS — do not skip certificate validation
            context = ssl.create_default_context()
            with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(cls.SMTP_USERNAME, cls.SMTP_PASSWORD)
                server.send_message(msg)
            
            # Log success without revealing the OTP value
            logger.info(f"OTP email sent to {email} for purpose: {purpose}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            return False
    
    @classmethod
    def _get_email_template(cls, otp_code: str, purpose: str, username: Optional[str] = None) -> str:
        """Get HTML email template with auto-escaping enabled to prevent XSS"""
        purpose_display = {
            'login': 'Login Verification',
            'file_download': 'File Download Verification',
            'file_share': 'File Share Verification',
            'delete_file': 'File Deletion Verification',
            'change_password': 'Password Change Verification',
            'verify_email': 'Email Verification'
        }.get(purpose, 'Verification')
        
        # Use Environment with autoescape=True so all {{ variables }} are HTML-escaped
        env = Environment(autoescape=True)
        template = env.from_string("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .content {
                    padding: 40px;
                }
                .otp-box {
                    background-color: #f8f9fa;
                    border: 2px dashed #667eea;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                    margin: 20px 0;
                }
                .otp-code {
                    font-size: 42px;
                    font-weight: 700;
                    letter-spacing: 8px;
                    color: #667eea;
                    font-family: 'Courier New', monospace;
                }
                .purpose {
                    background-color: #e3f2fd;
                    padding: 12px;
                    border-radius: 6px;
                    margin: 20px 0;
                    text-align: center;
                    color: #1976d2;
                    font-weight: 600;
                }
                .warning {
                    background-color: #fff3e0;
                    border-left: 4px solid #ff9800;
                    padding: 15px;
                    margin: 20px 0;
                    font-size: 14px;
                    color: #e65100;
                }
                .footer {
                    background-color: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #6c757d;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 {{ app_name }}</h1>
                    <p style="margin:10px 0 0; opacity:0.9;">Secure File Transfer</p>
                </div>
                <div class="content">
                    <h2 style="margin-top:0; color:#333;">{{ purpose_display }}</h2>
                    
                    {% if username %}
                    <p>Hello <strong>{{ username }}</strong>,</p>
                    {% else %}
                    <p>Hello,</p>
                    {% endif %}
                    
                    <p>We received a request for {{ purpose_display.lower() }}. Use the following One-Time Password (OTP) to complete your action:</p>
                    
                    <div class="otp-box">
                        <div style="font-size:14px; color:#666; margin-bottom:10px;">Your OTP Code</div>
                        <div class="otp-code">{{ otp_code }}</div>
                        <div style="font-size:12px; color:#999; margin-top:10px;">Valid for 10 minutes</div>
                    </div>
                    
                    <div class="purpose">
                        <strong>Purpose:</strong> {{ purpose_display }}
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Alert:</strong> Never share this OTP with anyone. Our team will never ask for your OTP.
                    </div>
                    
                    <p style="font-size:14px; color:#666;">
                        If you didn't request this code, please ignore this email or contact support.
                    </p>
                    
                    <div style="text-align:center; margin:30px 0;">
                        <a href="#" class="button">Go to Secure File Transfer</a>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; 2026 {{ app_name }}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """)
        
        return template.render(
            app_name=cls.APP_NAME,
            purpose_display=purpose_display,
            otp_code=otp_code,
            username=username
        )
    
    @classmethod
    def _get_text_template(cls, otp_code: str, purpose: str, username: Optional[str] = None) -> str:
        """Get plain text email template"""
        purpose_display = {
            'login': 'Login Verification',
            'file_download': 'File Download Verification',
            'file_share': 'File Share Verification',
            'delete_file': 'File Deletion Verification',
            'change_password': 'Password Change Verification',
            'verify_email': 'Email Verification'
        }.get(purpose, 'Verification')
        
        text = f"""
{cls.APP_NAME} - Secure File Transfer
{'=' * 50}

{purpose_display.upper()}

Hello{f' {username}' if username else ''},

We received a request for {purpose_display.lower()}.
Your OTP code is:

🔐 {otp_code}

This code will expire in 10 minutes.

⚠️ SECURITY: Never share this OTP with anyone.

If you didn't request this code, please ignore this email.

---
This is an automated message, please do not reply.
© 2026 {cls.APP_NAME}. All rights reserved.
        """
        return text.strip()