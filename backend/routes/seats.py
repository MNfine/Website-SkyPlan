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


@seats_bp.route('/debug-auth', methods=['POST'])
def debug_auth():
    """Debug endpoint to check auth extraction."""
    print("[DEBUG] POST /api/seats/debug-auth called")
    auth_header = request.headers.get('Authorization')
    print(f"[DEBUG] Authorization header: {auth_header}")
    
    user_id = _get_user_id_from_bearer()
    print(f"[DEBUG] user_id extracted: {user_id}")
    
    return jsonify({
        'success': True,
        'auth_header': auth_header,
        'user_id': user_id
    })


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
        
        # Get all confirmed bookings for this flight to mark seats as CONFIRMED
        from backend.models.booking import Booking, BookingPassenger, BookingStatus
        confirmed_bookings = session.query(Booking).filter(
            Booking.outbound_flight_id == flight_id,
            Booking.status == BookingStatus.CONFIRMED
        ).all()
        
        # Build a set of confirmed seat numbers from BookingPassenger
        confirmed_seat_numbers = set()
        confirmed_seat_ids = set()
        for booking in confirmed_bookings:
            for bp in booking.passengers:
                if bp.seat_number:
                    confirmed_seat_numbers.add(bp.seat_number)
                if bp.seat_id:
                    confirmed_seat_ids.add(bp.seat_id)
        
        # Also check inbound flights for round trips
        inbound_confirmed_bookings = session.query(Booking).filter(
            Booking.inbound_flight_id == flight_id,
            Booking.status == BookingStatus.CONFIRMED
        ).all()
        for booking in inbound_confirmed_bookings:
            for bp in booking.passengers:
                if bp.seat_number:
                    confirmed_seat_numbers.add(bp.seat_number)
                if bp.seat_id:
                    confirmed_seat_ids.add(bp.seat_id)
        
        # Add user-specific availability info and update status based on confirmed bookings
        seats_data = []
        for seat in seats:
            seat_dict = seat.as_dict()
            
            # If seat is in confirmed bookings, mark it as CONFIRMED
            if seat.seat_number in confirmed_seat_numbers or seat.id in confirmed_seat_ids:
                if seat.status != SeatStatus.CONFIRMED.value:
                    seat.status = SeatStatus.CONFIRMED.value
                    session.add(seat)
            
            seat_dict['status'] = seat.status  # Update status in response
            seat_dict['available_for_user'] = seat.is_available_for_user(user_id) if user_id else False
            seat_dict['reserved_by_current_user'] = (seat.reserved_by == user_id) if user_id else False
            seats_data.append(seat_dict)
        
        session.flush()  # Commit seat status updates
        
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
    """Temporarily reserve seats for user (guest or authenticated)."""
    user_id = _get_user_id_from_bearer()
    
    data = request.get_json(silent=True) or {}
    seat_ids = data.get('seat_ids', [])
    flight_id = data.get('flight_id')
    hold_minutes = min(data.get('hold_minutes', 5), 15)  # Max 15 minutes
    
    if not seat_ids or not flight_id:
        return jsonify({'success': False, 'message': 'seat_ids and flight_id required'}), 400
    
    with session_scope() as session:
        # Get seats and check availability
        seats = session.query(Seat).filter(Seat.id.in_(seat_ids)).all()
        
        if len(seats) != len(seat_ids):
            return jsonify({'success': False, 'message': 'Some seats not found'}), 404

        # Debug info: log request context to help trace 409 conflicts
        try:
            print(f"[DEBUG] /api/seats/reserve called by user_id={user_id} for seat_ids={seat_ids} flight_id={flight_id}")
        except Exception:
            pass

        # Release expired temporary reservations for the requested seats
        expired_temp = session.query(Seat).filter(
            Seat.id.in_(seat_ids),
            Seat.status == SeatStatus.TEMPORARILY_RESERVED.value,
            Seat.reserved_until < datetime.utcnow()
        ).all()

        if expired_temp:
            for s in expired_temp:
                try:
                    print(f"[DEBUG] Releasing expired hold on seat id={s.id} number={s.seat_number} reserved_until={s.reserved_until}")
                except Exception:
                    pass
                s.release_reservation()
            session.flush()
        
        # For authenticated users: check if seats are available for them
        if user_id:
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
            existing_reservations = session.query(Seat).filter(
                Seat.flight_id == flight_id,
                Seat.reserved_by == user_id,
                Seat.status == SeatStatus.TEMPORARILY_RESERVED.value
            ).all()
            
            for existing_seat in existing_reservations:
                if existing_seat.id not in seat_ids:  # Don't release seats being re-selected
                    existing_seat.release_reservation()
        else:
            # For guest users: just check if seats are available (not reserved/occupied)
            unavailable_seats = []
            for seat in seats:
                if seat.status == SeatStatus.CONFIRMED.value or seat.status == SeatStatus.TEMPORARILY_RESERVED.value:
                    unavailable_seats.append(seat.seat_number)
            
            if unavailable_seats:
                return jsonify({
                    'success': False,
                    'message': f'Seats not available: {", ".join(unavailable_seats)}',
                    'unavailable_seats': unavailable_seats
                }), 409
        
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
        seats = data.get('seats', [])  # List of seat objects with seat_code/seat_number, seat_class
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

            # Try to resolve booking_id from booking_code if provided
            booking_id = None
            if booking_code:
                from backend.models.booking import Booking as _Booking
                booking = session.query(_Booking).filter_by(booking_code=booking_code).first()
                if booking:
                    booking_id = booking.id

            updated_seats = []

            # Update each seat status to CONFIRMED (model uses seat_number)
            for seat_data in seats:
                # Accept either 'seat_code' or 'seat_number'
                seat_code = seat_data.get('seat_code') or seat_data.get('seat_number') or seat_data.get('seat')
                if not seat_code:
                    continue

                seat = session.query(Seat).filter(
                    Seat.flight_id == flight_id,
                    Seat.seat_number == seat_code
                ).first()

                if seat:
                    # Confirm reservation using model helper when possible
                    try:
                        if booking_id:
                            seat.confirm_reservation(booking_id)
                        else:
                            # Mark as CONFIRMED and clear reservation info
                            seat.status = SeatStatus.CONFIRMED.value
                            seat.confirmed_booking_id = None
                            seat.reserved_until = None
                            seat.reserved_by = None

                        updated_seats.append({
                            'seat_number': seat.seat_number,
                            'status': seat.status,
                            'booking_code': booking_code
                        })
                    except Exception:
                        # Fall back to direct assignment if helper fails
                        seat.status = SeatStatus.CONFIRMED.value
                        seat.reserved_until = None
                        seat.reserved_by = None
                        seat.confirmed_booking_id = booking_id
                        updated_seats.append({
                            'seat_number': seat.seat_number,
                            'status': seat.status,
                            'booking_code': booking_code
                        })

            session.flush()

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