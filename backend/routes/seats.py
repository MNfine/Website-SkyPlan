"""Seat management routes for flight seat selection and reservation."""
from __future__ import annotations

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
try:
    from backend.models.db import session_scope
    from backend.models.seats import Seat, SeatStatus, SeatClass
    from backend.models.flights import Flight
    from backend.models.user import User
except ImportError:
    from models.db import session_scope
    from models.seats import Seat, SeatStatus, SeatClass
    from models.flights import Flight
    from models.user import User

seats_bp = Blueprint('seats', __name__)


@seats_bp.route('/test', methods=['GET'])
def test_seats():
    """Simple test endpoint to check if seats routes are working."""
    return jsonify({'success': True, 'message': 'Seats API is working!'})


def _get_user_id_from_bearer() -> int | None:
    """Extract user ID from Bearer token."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    return User.verify_auth_token(token)


@seats_bp.route('/flight/<int:flight_id>/seats', methods=['GET'])
def get_flight_seats(flight_id):
    """Get all seats for a flight with their availability status."""
    user_id = _get_user_id_from_bearer()
    
    with session_scope() as session:
        flight = session.query(Flight).get(flight_id)
        if not flight:
            return jsonify({'success': False, 'message': 'Flight not found'}), 404
        
        # Auto-release expired reservations before returning seats
        expired_seats = session.query(Seat).filter(
            Seat.flight_id == flight_id,
            Seat.status == SeatStatus.TEMPORARILY_RESERVED.value,
            Seat.reserved_until < datetime.utcnow()
        ).all()
        
        for seat in expired_seats:
            seat.release_reservation()
        
        if expired_seats:
            session.flush()
        
        # Get all seats for flight  
        seats = session.query(Seat).filter_by(flight_id=flight_id).order_by(
            Seat.seat_number
        ).all()
        
        # If no seats exist, initialize them
        if not seats:
            seats = initialize_flight_seats(session, flight)
        
        # Add user-specific availability info
        seats_data = []
        for seat in seats:
            seat_dict = seat.as_dict()
            seat_dict['available_for_user'] = seat.is_available_for_user(user_id) if user_id else False
            seat_dict['reserved_by_current_user'] = (seat.reserved_by == user_id) if user_id else False
            seats_data.append(seat_dict)
        
        return jsonify({
            'success': True,
            'flight_id': flight_id,
            'seats': seats_data,
            'total_seats': len(seats_data),
            'available_count': len([s for s in seats_data if s['status'] == 'AVAILABLE']),
            'layout_info': get_seat_layout_info(seats_data)
        }), 200


@seats_bp.route('/reserve', methods=['POST'])
def reserve_seats():
    """Temporarily reserve seats for user."""
    user_id = _get_user_id_from_bearer()
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    
    data = request.get_json(silent=True) or {}
    seat_ids = data.get('seat_ids', [])
    hold_minutes = min(data.get('hold_minutes', 5), 15)  # Max 15 minutes
    
    if not seat_ids:
        return jsonify({'success': False, 'message': 'seat_ids required'}), 400
    
    with session_scope() as session:
        # Get seats and check availability
        seats = session.query(Seat).filter(Seat.id.in_(seat_ids)).all()
        
        if len(seats) != len(seat_ids):
            return jsonify({'success': False, 'message': 'Some seats not found'}), 404
        
        # Check if all seats are available for this user
        unavailable_seats = []
        for seat in seats:
            if not seat.is_available_for_user(user_id):
                unavailable_seats.append(seat.seat_number)
        
        if unavailable_seats:
            return jsonify({
                'success': False,
                'message': f'Seats not available: {", ".join(unavailable_seats)}',
                'unavailable_seats': unavailable_seats
            }), 409
        
        # Release any existing reservations by this user on this flight
        flight_id = seats[0].flight_id if seats else None
        if flight_id:
            existing_reservations = session.query(Seat).filter(
                Seat.flight_id == flight_id,
                Seat.reserved_by == user_id,
                Seat.status == SeatStatus.TEMPORARILY_RESERVED.value
            ).all()
            
            for existing_seat in existing_reservations:
                if existing_seat.id not in seat_ids:  # Don't release seats being re-selected
                    existing_seat.release_reservation()
        
        # Reserve the new seats
        for seat in seats:
            seat.reserve_temporarily(user_id, hold_minutes)
        
        session.flush()
        
        return jsonify({
            'success': True,
            'reserved_seats': [seat.as_dict() for seat in seats],
            'reserved_until': seats[0].reserved_until.isoformat() if seats else None,
            'hold_duration_minutes': hold_minutes,
            'message': f'Seats reserved for {hold_minutes} minutes'
        }), 200


@seats_bp.route('/release', methods=['POST'])  
def release_seats():
    """Release temporarily reserved seats."""
    user_id = _get_user_id_from_bearer()
    if not user_id:
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
    
    data = request.get_json(silent=True) or {}
    seat_ids = data.get('seat_ids', [])
    flight_id = data.get('flight_id')
    
    with session_scope() as session:
        if seat_ids:
            # Release specific seats
            seats = session.query(Seat).filter(
                Seat.id.in_(seat_ids),
                Seat.reserved_by == user_id,
                Seat.status == SeatStatus.TEMPORARILY_RESERVED.value
            ).all()
        elif flight_id:
            # Release all user's temporary reservations for this flight
            seats = session.query(Seat).filter(
                Seat.flight_id == flight_id,
                Seat.reserved_by == user_id,
                Seat.status == SeatStatus.TEMPORARILY_RESERVED.value
            ).all()
        else:
            # Release all user's temporary reservations
            seats = session.query(Seat).filter(
                Seat.reserved_by == user_id,
                Seat.status == SeatStatus.TEMPORARILY_RESERVED.value
            ).all()
        
        for seat in seats:
            seat.release_reservation()
        
        session.flush()
        
        return jsonify({
            'success': True,
            'released_seats': len(seats),
            'seat_numbers': [seat.seat_number for seat in seats],
            'message': 'Seats released successfully'
        }), 200


@seats_bp.route('/cleanup-expired', methods=['POST'])
def cleanup_expired_reservations():
    """Admin endpoint to cleanup expired seat reservations."""
    # This could be called by a background job
    
    with session_scope() as session:
        expired_seats = session.query(Seat).filter(
            Seat.status == SeatStatus.TEMPORARILY_RESERVED.value,
            Seat.reserved_until < datetime.utcnow()
        ).all()
        
        released_count = 0
        for seat in expired_seats:
            seat.release_reservation()
            released_count += 1
        
        session.flush()
        
        return jsonify({
            'success': True,
            'released_count': released_count,
            'message': f'Released {released_count} expired seat reservations'
        }), 200


def initialize_flight_seats(session, flight):
    """Initialize seats for a flight if they don't exist."""
    seat_data_list = flight.initialize_seats_for_aircraft("A320")
    
    seats = []
    for seat_data in seat_data_list:
        seat = Seat(
            flight_id=seat_data['flight_id'],
            seat_number=seat_data['seat_number'],
            seat_class=seat_data['seat_class'],
            price_modifier=seat_data['price_modifier'],
            status=seat_data['status']
        )
        session.add(seat)
        seats.append(seat)
    
    session.flush()
    return seats


def get_seat_layout_info(seats_data):
    """Get layout information for frontend rendering."""
    if not seats_data:
        return {}
    
    rows = set()
    columns = set()
    
    for seat in seats_data:
        seat_number = seat['seat_number']
        row = ''.join(filter(str.isdigit, seat_number))
        col = ''.join(filter(str.isalpha, seat_number))
        
        if row:
            rows.add(int(row))
        if col:
            columns.add(col)
    
    return {
        'total_rows': max(rows) if rows else 0,
        'columns': sorted(list(columns)),
        'seats_per_row': len(columns) if columns else 0,
        'business_rows': list(range(1, 4)),      # Rows 1-3
        'premium_rows': list(range(4, 9)),       # Rows 4-8  
        'economy_rows': list(range(9, max(rows) + 1)) if rows else []
    }


@seats_bp.route('/book', methods=['POST'])
def book_seats():
    """Book selected seats after successful payment."""
    try:
        data = request.get_json()
        flight_id = data.get('flight_id')
        seats = data.get('seats', [])  # List of seat objects with seat_code, seat_class
        booking_code = data.get('booking_code')
        
        if not flight_id or not seats:
            return jsonify({
                'success': False, 
                'message': 'Missing flight_id or seats data'
            }), 400
        
        with session_scope() as session:
            # Verify flight exists
            flight = session.query(Flight).get(flight_id)
            if not flight:
                return jsonify({
                    'success': False, 
                    'message': 'Flight not found'
                }), 404
            
            updated_seats = []
            
            # Update each seat status to BOOKED
            for seat_data in seats:
                seat_code = seat_data.get('seat_code')
                if not seat_code:
                    continue
                    
                seat = session.query(Seat).filter(
                    Seat.flight_id == flight_id,
                    Seat.seat_code == seat_code
                ).first()
                
                if seat:
                    # Update seat status to booked
                    seat.status = SeatStatus.BOOKED.value
                    seat.booked_by = booking_code
                    seat.booked_at = datetime.utcnow()
                    seat.reserved_until = None  # Clear reservation expiry
                    
                    updated_seats.append({
                        'seat_code': seat.seat_code,
                        'status': seat.status,
                        'booking_code': booking_code
                    })
            
            session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully booked {len(updated_seats)} seats',
                'booked_seats': updated_seats,
                'flight_id': flight_id
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error booking seats: {str(e)}'
        }), 500