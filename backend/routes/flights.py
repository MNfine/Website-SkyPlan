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

    # Map tên thành phố sang danh sách mã sân bay
    city_to_airports = {
        'Hà Nội': ['HAN'],
        'HaNoi': ['HAN'],
        'HàNội': ['HAN'],
        'Hanoi': ['HAN'],
        'Hồ Chí Minh': ['SGN'],
        'HoChiMinh': ['SGN'],
        'TP.Hồ Chí Minh': ['SGN'],
        'TP Ho Chi Minh': ['SGN'],
        'Sài Gòn': ['SGN'],
        'Sai Gon': ['SGN'],
        'SGN': ['SGN'],
        'Đà Nẵng': ['DAD'],
        'Da Nang': ['DAD'],
        'DAD': ['DAD'],
        'Phú Quốc': ['PQC'],
        'Phu Quoc': ['PQC'],
        'PQC': ['PQC'],
        'Cần Thơ': ['VCA'],
        'Can Tho': ['VCA'],
        'VCA': ['VCA'],
        'Lâm Đồng': ['DLI'],
        'Lam Dong': ['DLI'],
        'DLI': ['DLI'],
        'Huế': ['HUI'],
        'Hue': ['HUI'],
        'HUI': ['HUI'],
        'Điện Biên': ['DIN'],
        'Dien Bien': ['DIN'],
        'DIN': ['DIN'],
        'Gia Lai': ['PXU'],
        'PXU': ['PXU'],
        'An Giang': ['VKG'],
        'VKG': ['VKG'],
        'Thanh Hóa': ['THD'],
        'Thanh Hoa': ['THD'],
        'THD': ['THD'],
        'Nghệ An': ['VII'],
        'Nghe An': ['VII'],
        'VII': ['VII'],
        'Quảng Ninh': ['VDO'],
        'Quang Ninh': ['VDO'],
        'VDO': ['VDO'],
        'Sơn La': ['SQH'],
        'Son La': ['SQH'],
        'SQH': ['SQH'],
        'Khánh Hòa': ['CXR'],
        'Khanh Hoa': ['CXR'],
        'CXR': ['CXR'],
        'Đắk Lắk': ['BMV'],
        'Dak Lak': ['BMV'],
        'BMV': ['BMV'],
        'Quảng Trị': ['VDH'],
        'Quang Tri': ['VDH'],
        'VDH': ['VDH'],
        'Chu Lai': ['VCL'],
        'VCL': ['VCL'],
        'Hải Phòng': ['HPH'],
        'Hai Phong': ['HPH'],
        'HPH': ['HPH'],
    }
    from_codes = city_to_airports.get(from_value, [from_value]) if from_value else []
    to_codes = city_to_airports.get(to_value, [to_value]) if to_value else []

    with session_scope() as session:
        query = session.query(Flight)
        if from_codes:
            query = query.filter(Flight.departure_airport.in_(from_codes))
        if to_codes:
            query = query.filter(Flight.arrival_airport.in_(to_codes))
        if date:
            query = query.filter(Flight.departure_time.between(f'{date} 00:00:00', f'{date} 23:59:59'))
        flights = query.order_by(Flight.departure_time).all()
        return jsonify({
            'flights': [f.as_dict() for f in flights],
            'count': len(flights)
        })
