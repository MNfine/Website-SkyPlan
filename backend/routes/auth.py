"""Authentication routes for user registration and login."""
from flask import Blueprint, request, jsonify, current_app
import re
import jwt
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash

from backend.models.booking import Booking, BookingStatus
from backend.models.user import User
from backend.models.db import session_scope, get_session
from backend.utils.wallet_auth import (
    generate_nonce,
    create_signin_message,
    verify_signature,
    is_valid_ethereum_address,
    normalize_address
)

# Create blueprint for auth routes
auth_bp = Blueprint('auth', __name__)


def _calculate_member_tier(total_earned):
    try:
        earned = Decimal(str(total_earned or 0))
    except Exception:
        earned = Decimal('0')

    if earned >= Decimal('3000'):
        return 'Platinum'
    if earned >= Decimal('1000'):
        return 'Gold'
    if earned >= Decimal('500'):
        return 'Silver'
    return 'Registered'


def _calculate_member_tier_from_bookings(bookings):
    total_earned_value = Decimal('0')
    total_redeemed_value = Decimal('0')

    for booking in bookings:
        total_earned_value += Decimal(str(booking.sky_reward_amount or 0))
        total_redeemed_value += Decimal(str(booking.sky_redeemed_amount or 0))

    return _calculate_member_tier(total_earned_value), total_earned_value, total_redeemed_value


def _parse_birth_date(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()

    text_value = str(value).strip()
    if text_value == '':
        return None

    for fmt in ('%Y-%m-%d', '%d/%m/%Y'):
        try:
            return datetime.strptime(text_value, fmt).date()
        except ValueError:
            continue

    raise ValueError('Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY')

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
        # Create a new user using session_scope for proper transaction handling
        with session_scope() as session:
            new_user = User(
                email=data['email'].strip().lower(),
                fullname=data['fullname'],
                phone=data['phone']
            )
            new_user.set_password(data['password'])
            
            # Add user to database
            session.add(new_user)
            session.flush()  # Get the user ID
            user_id = new_user.id
        
        # Retrieve user after session closes to ensure it's attached to a new session
        with session_scope() as session:
            new_user = session.query(User).filter_by(id=user_id).first()
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
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration'
        }), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login a user and return an authentication token."""
    # Get JSON data from request
    data = request.json or {}
    
    # Validate required fields
    if not all(key in data for key in ['email', 'password']):
        return jsonify({
            'success': False,
            'message': 'Email and password required'
        }), 400
    
    try:
        # Normalize email input to match stored format
        email = str(data.get('email', '')).strip().lower()
        password = str(data.get('password', ''))

        # Get user from database using session_scope
        with session_scope() as session:
            user = session.query(User).filter_by(email=email).first()
            
            # Check if user exists and has a password-based account.
            # Some users may be wallet-only and have no password hash.
            if user is None or not user.password_hash or not user.check_password(password):
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
        # Get user from database using session_scope
        with session_scope() as session:
            user = session.query(User).filter_by(id=user_id).first()
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'User not found'
                }), 404

            booking_filters = [Booking.user_id == user_id]
            if user.wallet_address:
                booking_filters.append(Booking.wallet_address == user.wallet_address)

            bookings = session.query(Booking).filter(
                or_(*booking_filters)
            ).all()

            bookings_count = len(bookings)
            computed_tier, total_earned_value, total_redeemed_value = _calculate_member_tier_from_bookings(bookings)

            total_available_value = max(Decimal('0'), total_earned_value - total_redeemed_value)
            member_tier = user.member_tier or computed_tier

            if user.member_tier != computed_tier:
                user.member_tier = computed_tier
                member_tier = computed_tier

            user_data = user.as_dict()
            user_data.update({
                'member_tier': member_tier,
                'tier': member_tier,
                'total_earned_sky': float(total_earned_value),
                'total_redeemed_sky': float(total_redeemed_value),
                'total_available_sky': float(total_available_value),
                'sky_bookings_count': bookings_count,
            })
            
        # Return user profile data
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Profile retrieval error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving profile'
        }), 500

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
    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({
            'success': False,
            'message': 'No update data provided'
        }), 400

    if isinstance(data.get('data'), dict):
        payload = dict(data['data'])
        payload.update({k: v for k, v in data.items() if k != 'data'})
        data = payload

    session = None
    
    try:
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

        if 'gender' in data:
            incoming_gender = str(data.get('gender') or '').strip().lower()
            if incoming_gender and incoming_gender not in {'male', 'female', 'other'}:
                return jsonify({
                    'success': False,
                    'message': 'Gender must be one of: male, female, other'
                }), 400

            normalized_gender = incoming_gender or None
            current_gender = (user.gender or '').strip().lower() or None
            if normalized_gender != current_gender:
                user.gender = normalized_gender
                updated = True

        if 'birth_date' in data or 'dateOfBirth' in data or 'dob' in data:
            raw_birth_date = data.get('birth_date', data.get('dateOfBirth', data.get('dob')))
            try:
                parsed_birth_date = _parse_birth_date(raw_birth_date)
            except ValueError as exc:
                return jsonify({
                    'success': False,
                    'message': str(exc)
                }), 400

            if parsed_birth_date != user.birth_date:
                user.birth_date = parsed_birth_date
                updated = True
        
        # Update password if provided
        if 'password' in data and data['password']:
            # Validate current password if provided
            if 'current_password' not in data or not user.password_hash or not user.check_password(data['current_password']):
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
        if session is not None:
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
        if session is not None:
            session.rollback()
        current_app.logger.error(f"Profile update error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during profile update'
        }), 500
    finally:
        if session is not None:
            session.close()


# ============================================================================
# WALLET-BASED AUTHENTICATION
# ============================================================================

@auth_bp.route('/wallet/nonce', methods=['POST'])
def get_wallet_nonce():
    """Get or create a nonce for wallet signature verification.
    
    Request JSON:
        {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }
    
    Response:
        {
            "success": true,
            "nonce": "abc123...",
            "message": "Sign this message...",
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }
    """
    data = request.get_json(silent=True) or {}
    if isinstance(data.get('data'), dict):
        payload = dict(data['data'])
        payload.update({k: v for k, v in data.items() if k != 'data'})
        data = payload
    
    wallet_address = data.get('wallet_address') or data.get('walletAddress')

    if not wallet_address:
        return jsonify({
            'success': False,
            'message': 'wallet_address is required'
        }), 400
    
    # Validate Ethereum address format
    if not is_valid_ethereum_address(wallet_address):
        return jsonify({
            'success': False,
            'message': 'Invalid Ethereum address format'
        }), 400
    
    # Normalize address to checksum format
    wallet_address = normalize_address(wallet_address)
    
    session = None
    try:
        session = get_session()
        is_new_user = False
        
        # Find or create user with this wallet address
        user = session.query(User).filter_by(wallet_address=wallet_address).first()
        
        if user:
            # Existing user - generate new nonce
            user.wallet_nonce = generate_nonce()
            user.updated_at = datetime.utcnow()
        else:
            # New wallet - create placeholder user
            # User will complete profile after wallet verification
            nonce = generate_nonce()
            user = User(
                fullname=f"User {wallet_address[:6]}",  # Temporary name
                email=f"{wallet_address.lower()}@wallet.skyplan.local",  # Temporary email
                phone="0000000000",  # Temporary phone
                wallet_address=wallet_address,
                wallet_nonce=nonce,
                # Keep a placeholder hash for compatibility with legacy DB schemas
                # where password_hash may still be NOT NULL.
                password_hash=generate_password_hash(generate_nonce())
            )
            session.add(user)
            is_new_user = True
        
        session.commit()
        
        # Create sign-in message
        message = create_signin_message(wallet_address, user.wallet_nonce)
        
        return jsonify({
            'success': True,
            'nonce': user.wallet_nonce,
            'message': message,
            'wallet_address': wallet_address,
            'is_new_user': is_new_user,
            'data': {
                'nonce': user.wallet_nonce,
                'message': message,
                'wallet_address': wallet_address,
                'is_new_user': is_new_user,
            },
        }), 200
        
    except Exception as e:
        if session is not None:
            session.rollback()
        current_app.logger.error(f"Wallet nonce error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to generate nonce'
        }), 500
    finally:
        if session is not None:
            session.close()


@auth_bp.route('/wallet/verify', methods=['POST'])
def verify_wallet_signature():
    """Verify wallet signature and login user.
    
    Request JSON:
        {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "signature": "0x...",
            "message": "Sign this message..."
        }
    
    Response:
        {
            "success": true,
            "token": "jwt_token...",
            "user": {...},
            "message": "Login successful"
        }
    """
    data = request.get_json(silent=True) or {}
    if isinstance(data.get('data'), dict):
        payload = dict(data['data'])
        payload.update({k: v for k, v in data.items() if k != 'data'})
        data = payload

    wallet_address = data.get('wallet_address') or data.get('walletAddress')
    signature = data.get('signature')
    message = data.get('message')
    nonce = data.get('nonce')
    
    # Validate required fields
    missing_fields = []
    if not wallet_address:
        missing_fields.append('wallet_address')
    if not signature:
        missing_fields.append('signature')
    if not message:
        missing_fields.append('message')

    if missing_fields:
        return jsonify({
            'success': False,
            'message': f'Missing required fields: {", ".join(missing_fields)}'
        }), 400
    
    # Validate Ethereum address
    if not is_valid_ethereum_address(wallet_address):
        return jsonify({
            'success': False,
            'message': 'Invalid Ethereum address'
        }), 400
    
    wallet_address = normalize_address(wallet_address)
    
    session = None
    try:
        session = get_session()
        
        # Find user by wallet address
        user = session.query(User).filter_by(wallet_address=wallet_address).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Wallet address not registered. Please request a nonce first.'
            }), 404
        
        if not user.wallet_nonce:
            if nonce and nonce in message:
                # Fallback for compatibility with clients that include nonce in verify payload.
                user.wallet_nonce = nonce
            else:
                return jsonify({
                    'success': False,
                    'message': 'No nonce found. Please request a new nonce.'
                }), 400

        if user.wallet_nonce and user.wallet_nonce not in message:
            return jsonify({
                'success': False,
                'message': 'Message nonce mismatch. Please request a new nonce.'
            }), 401
        
        # Verify the signature
        is_valid = verify_signature(message, signature, wallet_address)
        
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Invalid signature. Authentication failed.'
            }), 401
        
        # Check if user account is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated'
            }), 403
        
        # Clear nonce after successful verification (prevent replay attacks)
        user.wallet_nonce = None
        user.updated_at = datetime.utcnow()
        session.commit()
        
        # Generate JWT token
        token = user.generate_auth_token()
        
        return jsonify({
            'success': True,
            'message': 'Wallet authentication successful',
            'token': token,
            'user': user.as_dict(),
            'needs_profile_update': user.email.endswith('@wallet.skyplan.local'),
            'data': {
                'token': token,
                'user': user.as_dict(),
                'needs_profile_update': user.email.endswith('@wallet.skyplan.local'),
            },
        }), 200
        
    except Exception as e:
        if session is not None:
            session.rollback()
        current_app.logger.error(f"Wallet verification error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Authentication failed'
        }), 500
    finally:
        if session is not None:
            session.close()


@auth_bp.route('/wallet/connect', methods=['POST'])
def connect_wallet_to_existing_user():
    """Connect a wallet address to an existing user account (requires login).
    
    Request JSON:
        {
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        }
    
    Headers:
        Authorization: Bearer <token>
    
    Response:
        {
            "success": true,
            "message": "Wallet connected successfully",
            "user": {...}
        }
    """
    # Get authenticated user
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': 'Authentication required'
        }), 401
    
    token = auth_header.split(' ')[1]
    user_id = User.verify_auth_token(token)
    
    if not user_id:
        return jsonify({
            'success': False,
            'message': 'Invalid or expired token'
        }), 401
    
    data = request.get_json(silent=True) or {}
    if isinstance(data.get('data'), dict):
        payload = dict(data['data'])
        payload.update({k: v for k, v in data.items() if k != 'data'})
        data = payload
    
    wallet_address = data.get('wallet_address') or data.get('walletAddress')

    if not wallet_address:
        return jsonify({
            'success': False,
            'message': 'wallet_address is required'
        }), 400
    
    # Validate address
    if not is_valid_ethereum_address(wallet_address):
        return jsonify({
            'success': False,
            'message': 'Invalid Ethereum address'
        }), 400
    
    wallet_address = normalize_address(wallet_address)
    
    session = None
    try:
        session = get_session()
        
        # Get current user
        user = session.query(User).filter_by(id=user_id).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if wallet is already connected to another user
        existing = session.query(User).filter_by(wallet_address=wallet_address).first()
        
        if existing and existing.id != user.id:
            return jsonify({
                'success': False,
                'message': 'Wallet address already connected to another account'
            }), 409
        
        # Connect wallet to user
        user.wallet_address = wallet_address
        user.updated_at = datetime.utcnow()
        session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Wallet connected successfully',
            'user': user.as_dict()
        }), 200
        
    except IntegrityError:
        if session is not None:
            session.rollback()
        return jsonify({
            'success': False,
            'message': 'Wallet address already in use'
        }), 409
    except Exception as e:
        if session is not None:
            session.rollback()
        current_app.logger.error(f"Wallet connect error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to connect wallet'
        }), 500
    finally:
        if session is not None:
            session.close()
