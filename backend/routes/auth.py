"""Authentication routes for user registration and login."""
from flask import Blueprint, request, jsonify, current_app, g
import re
import jwt
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.models.user import User
from backend.models.db import get_session

# Create blueprint for auth routes
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    # Get JSON data from request
    data = request.json
    
    # Validate required fields
    if not all(key in data for key in ['email', 'password', 'fullname', 'phone']):
        return jsonify({
            'success': False,
            'message': 'Missing required fields'
        }), 400
        
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, data['email']):
        return jsonify({
            'success': False,
            'message': 'Invalid email format'
        }), 400
        
    # Validate phone number format (simple validation)
    phone_pattern = r'^\+?[0-9]{10,15}$'
    if not re.match(phone_pattern, data['phone']):
        return jsonify({
            'success': False,
            'message': 'Invalid phone number format'
        }), 400
    
    # Validate password strength (min 8 chars, at least one letter and one number)
    if len(data['password']) < 8 or not (re.search(r'[A-Za-z]', data['password']) and 
                                        re.search(r'[0-9]', data['password'])):
        return jsonify({
            'success': False,
            'message': 'Password must be at least 8 characters and contain both letters and numbers'
        }), 400
    
    try:
        # Create a new user
        session = get_session()
        new_user = User(
            email=data['email'],
            fullname=data['fullname'],
            phone=data['phone']
        )
        new_user.set_password(data['password'])
        
        # Add user to database
        session.add(new_user)
        session.commit()
        
        # Generate authentication token
        token = new_user.generate_auth_token()
        
        # Return success with user info and token
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'user': new_user.as_dict(),
            'token': token
        }), 201
        
    except IntegrityError as e:
        session.rollback()
        # Check if error is due to duplicate email or phone
        error_info = str(e).lower()
        if 'unique constraint' in error_info:
            if 'email' in error_info:
                message = 'Email already registered'
            elif 'phone' in error_info:
                message = 'Phone number already registered'
            else:
                message = 'User already exists'
        else:
            message = 'Registration failed'
            
        return jsonify({
            'success': False,
            'message': message
        }), 409
        
    except Exception as e:
        session.rollback()
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration'
        }), 500
    finally:
        session.close()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user and return an authentication token."""
    # Get JSON data from request
    data = request.json
    
    # Validate required fields
    if not all(key in data for key in ['email', 'password']):
        return jsonify({
            'success': False,
            'message': 'Email and password required'
        }), 400
    
    try:
        # Get user from database
        session = get_session()
        user = session.query(User).filter_by(email=data['email']).first()
        
        # Check if user exists and password matches
        if user is None or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user account is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 403
            
        # Generate authentication token
        token = user.generate_auth_token()
        
        # Return success with user info and token
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.as_dict(),
            'token': token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500
    finally:
        session.close()

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    """Get user profile information (requires authentication)."""
    # Get token from headers
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'Missing or invalid token'
        }), 401
        
    # Extract token
    token = auth_header.split(' ')[1]
    
    # Verify token and get user ID
    user_id = User.verify_auth_token(token)
    if user_id is None:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    try:
        # Get user from database
        session = get_session()
        user = session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
            
        # Return user profile data
        return jsonify({
            'success': True,
            'user': user.as_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Profile retrieval error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving profile'
        }), 500
    finally:
        session.close()

@auth_bp.route('/update', methods=['PUT'])
def update_profile():
    """Update user profile information (requires authentication)."""
    # Get token from headers
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'Missing or invalid token'
        }), 401
        
    # Extract token
    token = auth_header.split(' ')[1]
    
    # Verify token and get user ID
    user_id = User.verify_auth_token(token)
    if user_id is None:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    # Get JSON data from request
    data = request.json
    if not data:
        return jsonify({
            'success': False,
            'message': 'No update data provided'
        }), 400
    
    try:
        # Get user from database
        session = get_session()
        user = session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Update allowed fields
        updateable_fields = ['fullname', 'phone']
        updated = False
        
        for field in updateable_fields:
            if field in data and data[field] != getattr(user, field):
                # Validate phone if updated
                if field == 'phone':
                    phone_pattern = r'^\+?[0-9]{10,15}$'
                    if not re.match(phone_pattern, data['phone']):
                        return jsonify({
                            'success': False,
                            'message': 'Invalid phone number format'
                        }), 400
                
                setattr(user, field, data[field])
                updated = True
        
        # Update password if provided
        if 'password' in data and data['password']:
            # Validate current password if provided
            if 'current_password' not in data or not user.check_password(data['current_password']):
                return jsonify({
                    'success': False,
                    'message': 'Current password is incorrect'
                }), 400
            
            # Validate new password strength
            if len(data['password']) < 8 or not (re.search(r'[A-Za-z]', data['password']) and 
                                               re.search(r'[0-9]', data['password'])):
                return jsonify({
                    'success': False,
                    'message': 'New password must be at least 8 characters and contain both letters and numbers'
                }), 400
            
            user.set_password(data['password'])
            updated = True
        
        # Save changes if any updates were made
        if updated:
            user.updated_at = datetime.utcnow()
            session.commit()
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'user': user.as_dict()
            }), 200
        else:
            return jsonify({
                'success': True,
                'message': 'No changes made',
                'user': user.as_dict()
            }), 200
            
    except IntegrityError as e:
        session.rollback()
        # Check for duplicate email or phone
        error_info = str(e).lower()
        if 'unique constraint' in error_info and 'phone' in error_info:
            message = 'Phone number already registered to another account'
        else:
            message = 'Update failed due to data conflict'
            
        return jsonify({
            'success': False,
            'message': message
        }), 409
        
    except Exception as e:
        session.rollback()
        current_app.logger.error(f"Profile update error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during profile update'
        }), 500
    finally:
        session.close()
