"""Ticket management routes for issuing and managing flight tickets."""
from __future__ import annotations

from datetime import datetime
from flask import Blueprint, request, jsonify
try:
    from backend.models.db import session_scope
    from backend.models.tickets import Ticket
    from backend.models.booking import Booking, BookingPassenger
    from backend.models.flights import Flight
    from backend.models.seats import Seat
    from backend.models.payments import Payment
except ImportError:
    from models.db import session_scope
    from models.tickets import Ticket
    from models.booking import Booking, BookingPassenger
    from models.flights import Flight
    from models.seats import Seat
    from models.payments import Payment

tickets_bp = Blueprint('tickets', __name__)


@tickets_bp.route('/generate', methods=['POST'])
def generate_tickets():
    """Generate tickets after successful payment confirmation."""
    data = request.get_json()
    
    # Required fields
    required_fields = ['booking_id', 'payment_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
    
    booking_id = data['booking_id']
    payment_id = data['payment_id']
    
    try:
        with session_scope() as session:
            # Verify booking exists and payment is confirmed
            booking = session.query(Booking).filter_by(id=booking_id).first()
            if not booking:
                return jsonify({'success': False, 'message': 'Booking not found'}), 404
            
            payment = session.query(Payment).filter_by(id=payment_id, booking_id=booking_id).first()
            if not payment:
                return jsonify({'success': False, 'message': 'Payment not found'}), 404
            
            if payment.status != 'COMPLETED':
                return jsonify({'success': False, 'message': 'Payment not completed'}), 400
            
            # Check if tickets already generated
            existing_tickets = session.query(Ticket).filter_by(booking_id=booking_id).all()
            if existing_tickets:
                return jsonify({
                    'success': True, 
                    'message': 'Tickets already generated',
                    'tickets': [ticket.get_ticket_info() for ticket in existing_tickets]
                })
            
            # Generate tickets for each passenger
            generated_tickets = []
            
            for booking_passenger in booking.passengers:
                passenger = booking_passenger.passenger
                flight = booking.outbound_flight  # Primary flight
                seat = booking_passenger.seat
                
                # Calculate pricing
                base_price = float(flight.price)
                seat_fee = float(seat.price_modifier) if seat else 0
                
                # Create ticket
                ticket = Ticket.create_ticket(
                    booking_id=booking.id,
                    passenger_id=booking_passenger.id,
                    flight_id=flight.id,
                    seat_id=seat.id if seat else None,
                    passenger_name=passenger.full_name,
                    base_price=base_price,
                    seat_fee=seat_fee,
                    phone=passenger.phone,
                    email=passenger.email,
                    id_number=passenger.passport_number or passenger.id_number
                )
                
                session.add(ticket)
                generated_tickets.append(ticket)
                
                # Confirm seat reservation
                if seat:
                    seat.status = 'CONFIRMED'
                    seat.confirmed_booking_id = booking.id
            
            # Update booking status to confirmed
            booking.status = 'CONFIRMED'
            booking.confirmed_at = datetime.utcnow()
            
            session.flush()  # Ensure all IDs are assigned
            
            # Return ticket information
            ticket_info = []
            for ticket in generated_tickets:
                ticket_info.append(ticket.get_ticket_info())
            
            return jsonify({
                'success': True,
                'message': f'Generated {len(generated_tickets)} tickets successfully',
                'booking_code': booking.booking_code,
                'tickets': ticket_info
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error generating tickets: {str(e)}'}), 500


@tickets_bp.route('/booking/<int:booking_id>', methods=['GET'])
def get_booking_tickets(booking_id):
    """Get all tickets for a specific booking."""
    try:
        with session_scope() as session:
            booking = session.query(Booking).filter_by(id=booking_id).first()
            if not booking:
                return jsonify({'success': False, 'message': 'Booking not found'}), 404
            
            tickets = session.query(Ticket).filter_by(booking_id=booking_id).all()
            
            ticket_info = []
            for ticket in tickets:
                info = ticket.get_ticket_info()
                # Add flight information
                flight = session.query(Flight).filter_by(id=ticket.flight_id).first()
                if flight:
                    info['flight'] = {
                        'flight_number': flight.flight_number,
                        'airline': flight.airline,
                        'departure_airport': flight.departure_airport,
                        'arrival_airport': flight.arrival_airport,
                        'departure_time': flight.departure_time.isoformat() if flight.departure_time else None,
                        'arrival_time': flight.arrival_time.isoformat() if flight.arrival_time else None
                    }
                ticket_info.append(info)
            
            return jsonify({
                'success': True,
                'booking_code': booking.booking_code,
                'booking_status': booking.status.value if booking.status else None,
                'tickets': ticket_info
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving tickets: {str(e)}'}), 500


@tickets_bp.route('/<string:ticket_code>', methods=['GET'])
def get_ticket_by_code(ticket_code):
    """Get ticket information by ticket code."""
    try:
        with session_scope() as session:
            ticket = session.query(Ticket).filter_by(ticket_code=ticket_code.upper()).first()
            if not ticket:
                return jsonify({'success': False, 'message': 'Ticket not found'}), 404
            
            ticket_info = ticket.get_ticket_info()
            
            # Add detailed information
            flight = session.query(Flight).filter_by(id=ticket.flight_id).first()
            booking = session.query(Booking).filter_by(id=ticket.booking_id).first()
            
            if flight:
                ticket_info['flight'] = {
                    'flight_number': flight.flight_number,
                    'airline': flight.airline,
                    'departure_airport': flight.departure_airport,
                    'arrival_airport': flight.arrival_airport,
                    'departure_time': flight.departure_time.isoformat() if flight.departure_time else None,
                    'arrival_time': flight.arrival_time.isoformat() if flight.arrival_time else None
                }
            
            if booking:
                ticket_info['booking_code'] = booking.booking_code
            
            return jsonify({
                'success': True,
                'ticket': ticket_info
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving ticket: {str(e)}'}), 500


@tickets_bp.route('/<string:ticket_code>/checkin', methods=['POST'])
def checkin_passenger(ticket_code):
    """Check in passenger and issue boarding pass."""
    try:
        with session_scope() as session:
            ticket = session.query(Ticket).filter_by(ticket_code=ticket_code.upper()).first()
            if not ticket:
                return jsonify({'success': False, 'message': 'Ticket not found'}), 404
            
            if ticket.status != 'ISSUED':
                return jsonify({'success': False, 'message': 'Ticket is not valid for check-in'}), 400
            
            if ticket.checked_in == 'Y':
                return jsonify({'success': False, 'message': 'Passenger already checked in'}), 400
            
            # Perform check-in
            ticket.check_in_passenger()
            
            return jsonify({
                'success': True,
                'message': 'Passenger checked in successfully',
                'ticket_code': ticket.ticket_code,
                'boarding_pass_issued': True,
                'check_in_time': ticket.check_in_at.isoformat()
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error during check-in: {str(e)}'}), 500


@tickets_bp.route('/<string:ticket_code>/cancel', methods=['POST'])
def cancel_ticket(ticket_code):
    """Cancel a ticket (before flight departure)."""
    try:
        with session_scope() as session:
            ticket = session.query(Ticket).filter_by(ticket_code=ticket_code.upper()).first()
            if not ticket:
                return jsonify({'success': False, 'message': 'Ticket not found'}), 404
            
            if ticket.status != 'ISSUED':
                return jsonify({'success': False, 'message': 'Ticket cannot be cancelled'}), 400
            
            # Cancel ticket and release seat
            ticket.cancel_ticket()
            
            if ticket.seat:
                ticket.seat.status = 'AVAILABLE'
                ticket.seat.confirmed_booking_id = None
            
            return jsonify({
                'success': True,
                'message': 'Ticket cancelled successfully',
                'ticket_code': ticket.ticket_code,
                'cancelled_at': ticket.cancelled_at.isoformat()
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error cancelling ticket: {str(e)}'}), 500


@tickets_bp.route('/validate/<string:ticket_code>', methods=['GET'])
def validate_ticket(ticket_code):
    """Validate ticket for boarding (used by gate staff)."""
    try:
        with session_scope() as session:
            ticket = session.query(Ticket).filter_by(ticket_code=ticket_code.upper()).first()
            if not ticket:
                return jsonify({'success': False, 'message': 'Invalid ticket code'}), 404
            
            # Check ticket validity
            is_valid = (
                ticket.status == 'ISSUED' and 
                ticket.checked_in == 'Y' and 
                ticket.boarding_pass_issued == 'Y'
            )
            
            flight = session.query(Flight).filter_by(id=ticket.flight_id).first()
            
            validation_info = {
                'valid': is_valid,
                'ticket_code': ticket.ticket_code,
                'passenger_name': ticket.passenger_name,
                'seat_number': ticket.seat.seat_number if ticket.seat else None,
                'status': ticket.status,
                'checked_in': ticket.checked_in == 'Y',
                'boarding_pass_issued': ticket.boarding_pass_issued == 'Y'
            }
            
            if flight:
                validation_info['flight'] = {
                    'flight_number': flight.flight_number,
                    'departure_time': flight.departure_time.isoformat() if flight.departure_time else None
                }
            
            # If valid and not yet used, mark as used
            if is_valid and ticket.status == 'ISSUED':
                ticket.use_ticket()
                validation_info['boarded'] = True
                validation_info['boarding_time'] = ticket.used_at.isoformat()
            
            return jsonify({
                'success': True,
                'validation': validation_info
            })
            
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error validating ticket: {str(e)}'}), 500
