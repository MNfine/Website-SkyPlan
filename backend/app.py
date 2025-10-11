"""
SkyPlan - Python Flask Application
Integrated application serving both frontend and backend
"""

from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
import os
from datetime import datetime
import sys

# Add parent directory to path to allow imports from different directories
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routes
from backend.routes.payments import payment_bp
from backend.routes.flights import flights_bp
from backend.routes.auth import auth_bp
from backend.routes.bookings import bookings_bp
from backend.models.db import init_db

from os import getenv
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the DATABASE_URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if DATABASE_URL is loaded correctly
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Please check your .env file.")

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL)

def create_app():
    """Create and configure Flask application"""
    
    # Set up static folder for frontend files
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
    frontend_abs_path = os.path.abspath(frontend_dir)
    
    app = Flask(__name__, 
                static_folder=os.path.join(frontend_abs_path, 'assets'),
                static_url_path='/assets',
                template_folder=frontend_abs_path)
    
    # Enable CORS for API requests
    CORS(app)
    
    # App configuration
    app.config['SECRET_KEY'] = 'skyplan-secret-key-2025'
    app.config['DEBUG'] = True
    
    # Initialize database tables
    with app.app_context():
        try:
            init_db()
            print("[DB] Tables ensured.")
        except Exception as e:
            print(f"[DB] Initialization failed: {e}")

    # Register API Blueprints (after DB ready)
    app.register_blueprint(payment_bp, url_prefix='/api/payment')
    app.register_blueprint(flights_bp)  # Đăng ký API chuyến bay
    app.register_blueprint(auth_bp, url_prefix='/api/auth')  # Đăng ký API xác thực
    app.register_blueprint(bookings_bp)  # API bookings (đã có prefix trong blueprint)
    
    # Frontend routes
    @app.route('/')
    def index():
        """Serve homepage"""
        return send_from_directory(app.template_folder, 'index.html')
    
    # Định nghĩa rõ từng trang để dễ theo dõi
    @app.route('/search')
    def search_page():
        """Search flights page"""
        return send_from_directory(app.template_folder, 'search.html')
        
    @app.route('/fare')
    def fare_page():
        """Fare selection page"""
        return send_from_directory(app.template_folder, 'fare.html')
    
    @app.route('/seat')
    def seat_page():
        """Seat selection page"""
        return send_from_directory(app.template_folder, 'seat.html')
        
    @app.route('/extras')
    def extras_page():
        """Extras selection page"""
        return send_from_directory(app.template_folder, 'extras.html')
        
    @app.route('/passenger')
    def passenger_page():
        """Passenger information page"""
        return send_from_directory(app.template_folder, 'passenger.html')
        
    @app.route('/payment')
    def payment_page():
        """Payment page"""
        return send_from_directory(app.template_folder, 'payment.html')
        
    @app.route('/confirmation')
    def confirmation_page():
        """Booking confirmation page"""
        return send_from_directory(app.template_folder, 'confirmation.html')
    
    @app.route('/overview')
    def overview_page():
        """Flight overview page"""
        return send_from_directory(app.template_folder, 'overview.html')
        
    @app.route('/login')
    def login_page():
        """Login page"""
        return send_from_directory(app.template_folder, 'login.html')
        
    @app.route('/register')
    def register_page():
        """Registration page"""
        return send_from_directory(app.template_folder, 'register.html')
        
    @app.route('/contact')
    def contact_page():
        """Contact page"""
        return send_from_directory(app.template_folder, 'contact.html')
        
    @app.route('/support')
    def support_page():
        """Support page"""
        return send_from_directory(app.template_folder, 'support.html')
        
    @app.route('/cancel')
    def cancel_page():
        """Booking cancellation page"""
        return send_from_directory(app.template_folder, 'cancel.html')
    
    # Route chung cho các trang có đuôi .html
    @app.route('/<path:page>.html')
    def serve_page(page):
        """Serve HTML pages with .html extension"""
        return send_from_directory(app.template_folder, f'{page}.html')
    
    # Route cho components
    @app.route('/components/<path:component>.html')
    def serve_component(component):
        """Serve HTML components"""
        return send_from_directory(os.path.join(app.template_folder, 'components'), f'{component}.html')
    
    # API routes
    @app.route('/api')
    def api_index():
        """API health check"""
        return jsonify({
            'message': 'SkyPlan Backend API',
            'version': '1.0.0',
            'status': 'running',
            'timestamp': datetime.now().isoformat(),
            'endpoints': {
                'payment': '/api/payment/',
                'vnpay_create': '/api/payment/vnpay/create',
                'vnpay_return': '/api/payment/vnpay/return',
                'vnpay_ipn': '/api/payment/vnpay/ipn',
                'auth_register': '/api/auth/register',
                'auth_login': '/api/auth/login',
                'auth_profile': '/api/auth/profile'
            }
        })
    
    @app.route('/api/health')
    def health_check():
        """Health check endpoint"""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat()
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith('/api'):
            # API 404 response
            return jsonify({
                'error': 'Not Found',
                'message': 'The requested API endpoint was not found'
            }), 404
        else:
            # Frontend 404 - try to serve 404.html if exists, otherwise generic error
            try:
                return send_from_directory(app.template_folder, '404.html'), 404
            except:
                # Hiển thị danh sách các trang có sẵn
                available_pages = [
                    "/", "/search", "/fare", "/extras", "/passenger", 
                    "/payment", "/confirmation", "/overview",
                    "/login", "/register", "/contact", "/support", "/cancel"
                ]
                error_msg = f"<h1>Page not found: {request.path}</h1>"
                error_msg += "<h2>Available pages:</h2><ul>"
                for page in available_pages:
                    error_msg += f'<li><a href="{page}">{page}</a></li>'
                error_msg += "</ul>"
                return error_msg, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        if request.path.startswith('/api'):
            # API 500 response
            return jsonify({
                'error': 'Internal Server Error',
                'message': 'An unexpected error occurred'
            }), 500
        else:
            # Frontend 500
            return f'<h1>Server Error</h1><p>{str(error)}</p>', 500
    
    return app

# Create app instance
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting SkyPlan Integrated Server...")
    print("📍 Frontend URL: http://localhost:5000")
    print("📍 API Base URL: http://localhost:5000/api")
    print("-" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )