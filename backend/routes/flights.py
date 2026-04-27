from flask import Blueprint, request, jsonify
from backend.models.db import session_scope
from backend.models.flights import Flight
from sqlalchemy import and_, func
from datetime import datetime, timedelta
import os
import time

flights_bp = Blueprint('flights', __name__)


def _wait_for_bootstrap_ready(timeout_seconds: int = 180) -> tuple[bool, str | None]:
    if os.getenv('RENDER', '').lower() != 'true' and not os.getenv('RENDER_SERVICE_ID'):
        return True, None

    try:
        from backend.app import bootstrap_status
    except Exception:
        return True, None

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        status = bootstrap_status()
        if status.get('state') == 'done':
            return True, None
        if status.get('state') == 'failed':
            return False, status.get('message')
        time.sleep(2)

    return False, 'Database bootstrap is still running'

@flights_bp.route('/api/flights', methods=['GET'])
def get_flights():
    """API trả về danh sách chuyến bay theo điều kiện from, to, date"""
    ready, error_message = _wait_for_bootstrap_ready()
    if not ready:
        return jsonify({
            'error': 'Bootstrap in progress',
            'message': error_message or 'Database is not ready yet'
        }), 503

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


@flights_bp.route('/api/flights/price-trend', methods=['GET'])
def get_price_trend():
    """Return daily minimum fare around a selected center date for a route."""
    ready, error_message = _wait_for_bootstrap_ready()
    if not ready:
        return jsonify({
            'error': 'Bootstrap in progress',
            'message': error_message or 'Database is not ready yet'
        }), 503

    from_value = request.args.get('from')
    to_value = request.args.get('to')
    center_date_raw = request.args.get('center_date')
    window_days_raw = request.args.get('window_days', '15')

    if not from_value or not to_value or not center_date_raw:
        return jsonify({
            'error': 'Missing required params: from, to, center_date'
        }), 400

    center_date = None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            center_date = datetime.strptime(center_date_raw, fmt).date()
            break
        except ValueError:
            continue

    if center_date is None:
        return jsonify({'error': 'center_date must be in YYYY-MM-DD (or dd/MM/YYYY) format'}), 400

    try:
        window_days = max(1, min(int(window_days_raw), 31))
    except ValueError:
        window_days = 15

    start_date = center_date - timedelta(days=window_days)
    end_date = center_date + timedelta(days=window_days)

    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())

    with session_scope() as session:
        rows = (
            session.query(
                func.date(Flight.departure_time).label('flight_date'),
                func.min(Flight.price).label('min_price'),
                func.count(Flight.id).label('flight_count')
            )
            .filter(
                and_(
                    Flight.departure_airport == from_value,
                    Flight.arrival_airport == to_value,
                    Flight.departure_time >= start_dt,
                    Flight.departure_time <= end_dt,
                )
            )
            .group_by(func.date(Flight.departure_time))
            .order_by(func.date(Flight.departure_time))
            .all()
        )

    by_date = {}
    for row in rows:
        row_date = str(row.flight_date)
        by_date[row_date] = {
            'date': row_date,
            'min_price': float(row.min_price) if row.min_price is not None else None,
            'flight_count': int(row.flight_count or 0),
            'is_selected': row_date == center_date.isoformat(),
        }

    points = []
    cursor = start_date
    while cursor <= end_date:
        date_key = cursor.isoformat()
        if date_key in by_date:
            points.append(by_date[date_key])
        else:
            points.append({
                'date': date_key,
                'min_price': None,
                'flight_count': 0,
                'is_selected': date_key == center_date.isoformat(),
            })
        cursor += timedelta(days=1)

    return jsonify({
        'from': from_value,
        'to': to_value,
        'center_date': center_date.isoformat(),
        'window_days': window_days,
        'points': points,
        'currency': 'VND',
    })
