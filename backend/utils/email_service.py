"""
Email service for sending emails via SMTP
"""
import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

# Load environment variables
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(root_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Email configuration
MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or MAIL_USERNAME
PROJECT_EMAIL = os.environ.get('PROJECT_EMAIL') or MAIL_USERNAME  # Email nhận thông báo từ support/contact

# Initialize Flask-Mail
mail = None

def init_mail(app: Flask):
    """Initialize Flask-Mail with app configuration"""
    global mail
    
    app.config['MAIL_SERVER'] = MAIL_SERVER
    app.config['MAIL_PORT'] = MAIL_PORT
    app.config['MAIL_USE_TLS'] = MAIL_USE_TLS
    app.config['MAIL_USERNAME'] = MAIL_USERNAME
    app.config['MAIL_PASSWORD'] = MAIL_PASSWORD
    app.config['MAIL_DEFAULT_SENDER'] = MAIL_DEFAULT_SENDER
    app.config['MAIL_DEBUG'] = False  # Disable SMTP debug logs
    
    mail = Mail(app)
    return mail

def send_support_ticket_email(user_email: str, subject: str, message: str):
    """
    Send email notification when a support ticket is created
    
    Args:
        user_email: Email của người dùng tạo ticket
        subject: Tiêu đề ticket
        message: Nội dung ticket
    """
    if not mail or not PROJECT_EMAIL:
        return False
    
    try:
        # Email gửi đến dự án (thông báo có ticket mới)
        msg_to_project = Message(
            subject=f'[Support Ticket] {subject}',
            recipients=[PROJECT_EMAIL],
            body=f"""
Bạn có một ticket hỗ trợ mới từ SkyPlan:

Email người dùng: {user_email}
Tiêu đề: {subject}

Nội dung:
{message}

---
SkyPlan Support System
            """,
            html=f"""
            <html>
            <body>
                <h2>Bạn có một ticket hỗ trợ mới từ SkyPlan</h2>
                <p><strong>Email người dùng:</strong> {user_email}</p>
                <p><strong>Tiêu đề:</strong> {subject}</p>
                <hr>
                <p><strong>Nội dung:</strong></p>
                <p>{message.replace(chr(10), '<br>')}</p>
                <hr>
                <p><em>SkyPlan Support System</em></p>
            </body>
            </html>
            """
        )
        
        # Email xác nhận gửi đến người dùng
        msg_to_user = Message(
            subject=f'[SkyPlan] Xác nhận nhận ticket hỗ trợ: {subject}',
            recipients=[user_email],
            body=f"""
Xin chào,

Cảm ơn bạn đã liên hệ với SkyPlan. Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn:

Tiêu đề: {subject}

Nội dung:
{message}

Chúng tôi sẽ phản hồi trong thời gian sớm nhất.

Trân trọng,
Đội ngũ SkyPlan
            """,
            html=f"""
            <html>
            <body>
                <h2>Xin chào,</h2>
                <p>Cảm ơn bạn đã liên hệ với SkyPlan. Chúng tôi đã nhận được yêu cầu hỗ trợ của bạn:</p>
                <p><strong>Tiêu đề:</strong> {subject}</p>
                <hr>
                <p><strong>Nội dung:</strong></p>
                <p>{message.replace(chr(10), '<br>')}</p>
                <hr>
                <p>Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
                <p>Trân trọng,<br><strong>Đội ngũ SkyPlan</strong></p>
            </body>
            </html>
            """
        )
        
        mail.send(msg_to_project)
        mail.send(msg_to_user)
        
        return True
        
    except Exception as e:
        return False

def send_contact_email(user_name: str, user_email: str, subject: str, message: str):
    """
    Send email notification when a contact form is submitted
    
    Args:
        user_name: Tên người dùng
        user_email: Email người dùng
        subject: Chủ đề liên hệ
        message: Nội dung tin nhắn
    """
    if not mail or not PROJECT_EMAIL:
        return False
    
    try:
        # Email gửi đến dự án (thông báo có liên hệ mới)
        msg_to_project = Message(
            subject=f'[Contact Form] {subject}',
            recipients=[PROJECT_EMAIL],
            body=f"""
Bạn có một tin nhắn liên hệ mới từ SkyPlan:

Tên người dùng: {user_name}
Email: {user_email}
Chủ đề: {subject}

Nội dung:
{message}

---
SkyPlan Contact System
            """,
            html=f"""
            <html>
            <body>
                <h2>Bạn có một tin nhắn liên hệ mới từ SkyPlan</h2>
                <p><strong>Tên người dùng:</strong> {user_name}</p>
                <p><strong>Email:</strong> {user_email}</p>
                <p><strong>Chủ đề:</strong> {subject}</p>
                <hr>
                <p><strong>Nội dung:</strong></p>
                <p>{message.replace(chr(10), '<br>')}</p>
                <hr>
                <p><em>SkyPlan Contact System</em></p>
            </body>
            </html>
            """
        )
        
        # Email xác nhận gửi đến người dùng
        msg_to_user = Message(
            subject=f'[SkyPlan] Xác nhận nhận tin nhắn: {subject}',
            recipients=[user_email],
            body=f"""
Xin chào {user_name},

Cảm ơn bạn đã liên hệ với SkyPlan. Chúng tôi đã nhận được tin nhắn của bạn:

Chủ đề: {subject}

Nội dung:
{message}

Chúng tôi sẽ phản hồi trong thời gian sớm nhất.

Trân trọng,
Đội ngũ SkyPlan
            """,
            html=f"""
            <html>
            <body>
                <h2>Xin chào {user_name},</h2>
                <p>Cảm ơn bạn đã liên hệ với SkyPlan. Chúng tôi đã nhận được tin nhắn của bạn:</p>
                <p><strong>Chủ đề:</strong> {subject}</p>
                <hr>
                <p><strong>Nội dung:</strong></p>
                <p>{message.replace(chr(10), '<br>')}</p>
                <hr>
                <p>Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
                <p>Trân trọng,<br><strong>Đội ngũ SkyPlan</strong></p>
            </body>
            </html>
            """
        )
        
        mail.send(msg_to_project)
        mail.send(msg_to_user)
        
        return True
        
    except Exception as e:
        return False

