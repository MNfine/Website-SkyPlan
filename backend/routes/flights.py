from flask import Blueprint, request, jsonify
from backend.models.db import session_scope
from backend.models.flights import Flight
from sqlalchemy import and_

flights_bp = Blueprint('flights', __name__)

@flights_bp.route('/api/flights', methods=['GET'])
def get_flights():
    """API trả về danh sách chuyến bay theo điều kiện from, to, date"""
    from_value = request.args.get('from')
    to_value = request.args.get('to')
    date = request.args.get('date')  # dạng yyyy-mm-dd

    with session_scope() as session:
        query = session.query(Flight)
        
        # Frontend gửi mã IATA trực tiếp từ dropdown, không cần map
        if from_value:
            query = query.filter(Flight.departure_airport == from_value)
        if to_value:
            query = query.filter(Flight.arrival_airport == to_value)
        if date:
            query = query.filter(Flight.departure_time.between(f'{date} 00:00:00', f'{date} 23:59:59'))
        
        flights = query.order_by(Flight.departure_time).all()
        return jsonify({
            'flights': [f.as_dict() for f in flights],
            'count': len(flights)
        })
