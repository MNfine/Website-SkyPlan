"""
Contact form API endpoint
"""
from flask import Blueprint, request, jsonify
from backend.utils.email_service import send_contact_email
import re

contact_bp = Blueprint('contact', __name__)


@contact_bp.route('/submit', methods=['POST'])
def submit_contact():
    """Handle contact form submission and send email notifications"""
    try:
        data = request.get_json() or {}
        full_name = data.get('fullName', '').strip()
        email = data.get('email', '').strip()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()
        
        # Validate required fields
        if not full_name:
            return jsonify({
                'success': False,
                'message': 'Full name is required'
            }), 400
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        if not subject:
            return jsonify({
                'success': False,
                'message': 'Subject is required'
            }), 400
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Message is required'
            }), 400
        
        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Send email notifications
        email_sent = send_contact_email(full_name, email, subject, message)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Thank you for contacting us. We will respond soon.'
            }), 201
        else:
            # Still return success but log warning
            return jsonify({
                'success': True,
                'message': 'Message received, but email notification failed. Please contact us directly.'
            }), 201
            
    except Exception as e:
        print(f"[Contact] Error submitting contact form: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error submitting contact form: {str(e)}'
        }), 500

