from flask import Blueprint, request, jsonify
from backend.models.db import session_scope
from backend.models.flights import Flight
import unicodedata
import csv
import os

flights_bp = Blueprint('flights', __name__)

# Module-level caches to avoid function-attribute side effects
CITY_MAP_CACHE = None  # canonical_city -> [IATA, ...]
CODE_TO_CITY_VI = None  # IATA -> VI display name (province/city)

DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), 'db', 'demo_flights_vn_airport_names.csv'
)


def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s or '') if unicodedata.category(c) != 'Mn')


def canon(s):
    s = strip_accents(s).lower()
    return ''.join(ch for ch in s if ch.isalnum())


def ensure_city_maps_loaded():
    global CITY_MAP_CACHE, CODE_TO_CITY_VI
    if CITY_MAP_CACHE is not None and CODE_TO_CITY_VI is not None:
        return CITY_MAP_CACHE, CODE_TO_CITY_VI

    city_map = {}
    code_to_city_vi = {}
    if os.path.exists(DATASET_PATH):
        try:
            with open(DATASET_PATH, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # from side
                    city_vi_from = (row.get('from_province') or '').strip()
                    code_from = (row.get('from') or '').strip().upper()
                    if city_vi_from and len(code_from) == 3:
                        key_from = canon(city_vi_from)
                        if key_from in ('tphochiminh', 'tphcm'):
                            key_from = 'tphcm'
                        city_map.setdefault(key_from, set()).add(code_from)
                        code_to_city_vi.setdefault(code_from, city_vi_from)
                    # to side
                    city_vi_to = (row.get('to_province') or '').strip()
                    code_to = (row.get('to') or '').strip().upper()
                    if city_vi_to and len(code_to) == 3:
                        key_to = canon(city_vi_to)
                        if key_to in ('tphochiminh', 'tphcm'):
                            key_to = 'tphcm'
                        city_map.setdefault(key_to, set()).add(code_to)
                        code_to_city_vi.setdefault(code_to, city_vi_to)
        except Exception:
            city_map = {}

    # Convert sets to sorted lists
    city_map = {k: sorted(list(v)) for k, v in city_map.items()}

    # Fallback seeds if CSV missing or empty
    if not city_map:
        city_map = {
            'hanoi': ['HAN'],
            'tphcm': ['SGN'],
            'danang': ['DAD'],
        }
        code_to_city_vi = {
            'HAN': 'Hà Nội',
            'SGN': 'TP. Hồ Chí Minh',
            'DAD': 'Đà Nẵng',
        }

    CITY_MAP_CACHE = city_map
    CODE_TO_CITY_VI = code_to_city_vi
    return CITY_MAP_CACHE, CODE_TO_CITY_VI


def build_alias_map(city_keys):
    keys_set = set(city_keys)
    # Target canonical for HCM
    hcm_target = 'tphcm' if 'tphcm' in keys_set else 'tphochiminh'
    base = {
        'hochiminh': hcm_target, 'saigon': hcm_target, 'tphochiminh': hcm_target, 'tphcm': hcm_target,
        'dalat': 'lamdong',
        'nhatrang': 'khanhhoa', 'camranh': 'khanhhoa',
        'quynhon': 'binhdinh',
        'tuyhoa': 'phuyen',
        'halong': 'quangninh', 'vandon': 'quangninh',
        'haiphong': 'haiphong',
        'hue': 'hue',
        'vinh': 'nghean',
        'pleiku': 'gialai',
        'buonmathuot': 'daklak', 'buonmethuot': 'daklak', 'buonme': 'daklak',
        'phuquoc': 'phuquoc', 'kiengiang': 'phuquoc',
        'condao': hcm_target, 'vungtau': hcm_target, 'baria': hcm_target,
        'rachgia': 'angiang',
        'angiang': 'angiang',
        'cantho': 'cantho',
    }
    return base


def parse_airport_values(val, city_map, alias_map):
    if not val:
        return []
    val = val.strip()
    # Support comma separated airport codes
    if ',' in val:
        parts = [p.strip().upper() for p in val.split(',') if p.strip()]
        return [p for p in parts if len(p) == 3 and p.isalpha()]
    # If looks like IATA code, return directly
    if len(val) == 3 and val.isalpha():
        return [val.upper()]
    # Otherwise treat as city/province slug/name
    key = canon(val)
    # Direct canonical
    direct = city_map.get(key)
    if direct:
        return list(direct)
    # Alias canonical
    alt_key = alias_map.get(key, key)
    if alt_key != key:
        alt = city_map.get(alt_key)
        if alt:
            return list(alt)
        # Targeted bridge between tphcm and tphochiminh
        if alt_key in ('tphcm', 'tphochiminh'):
            bridge = 'tphochiminh' if alt_key == 'tphcm' else 'tphcm'
            alt2 = city_map.get(bridge)
            if alt2:
                return list(alt2)
    return []


@flights_bp.route('/api/flights', methods=['GET'])
def get_flights():
    """API trả về danh sách chuyến bay theo điều kiện from, to, date"""
    from_value = request.args.get('from')
    to_value = request.args.get('to')
    date = request.args.get('date')

    city_map, code_to_city_vi_ds = ensure_city_maps_loaded()
    alias_to_canonical = build_alias_map(city_map.keys())

    from_codes = parse_airport_values(from_value, city_map, alias_to_canonical)
    to_codes = parse_airport_values(to_value, city_map, alias_to_canonical)

    # If user provided from/to but we couldn't resolve to any airports, avoid broad queries
    if (from_value and not from_codes) or (to_value and not to_codes):
        return jsonify({
            'flights': [],
            'count': 0,
            'resolved_from_airports': from_codes,
            'resolved_to_airports': to_codes,
            'error': 'origin_or_destination_not_recognized'
        })

    # Default display names, enriched by dataset mapping
    code_to_city_name_vi = {
        'HAN': 'Hà Nội', 'SGN': 'TP. Hồ Chí Minh', 'DAD': 'Đà Nẵng', 'PQC': 'Phú Quốc', 'VCA': 'Cần Thơ',
        'DLI': 'Đà Lạt', 'HUI': 'Huế', 'DIN': 'Điện Biên', 'PXU': 'Gia Lai', 'VKG': 'An Giang', 'THD': 'Thanh Hóa',
        'VII': 'Nghệ An', 'VDO': 'Quảng Ninh', 'SQH': 'Sơn La', 'CXR': 'Khánh Hòa', 'BMV': 'Đắk Lắk', 'VDH': 'Quảng Trị',
        'VCL': 'Chu Lai', 'HPH': 'Hải Phòng', 'UIH': 'Bình Định', 'TBB': 'Phú Yên', 'VCS': 'Côn Đảo'
    }
    try:
        code_to_city_name_vi.update(code_to_city_vi_ds or {})
    except Exception:
        pass

    with session_scope() as session:
        query = session.query(Flight)
        if from_codes:
            query = query.filter(Flight.departure_airport.in_(from_codes))
        if to_codes:
            query = query.filter(Flight.arrival_airport.in_(to_codes))
        if date:
            query = query.filter(Flight.departure_time.between(f'{date} 00:00:00', f'{date} 23:59:59'))
        flights = query.order_by(Flight.departure_time).all()

        result = []
        for f in flights:
            d = f.as_dict()
            dep_code = d.get('departure_airport')
            arr_code = d.get('arrival_airport')
            d['departure_city'] = code_to_city_name_vi.get(dep_code, dep_code)
            d['arrival_city'] = code_to_city_name_vi.get(arr_code, arr_code)
            result.append(d)

        return jsonify({
            'flights': result,
            'count': len(result),
            'resolved_from_airports': from_codes,
            'resolved_to_airports': to_codes
        })


@flights_bp.route('/api/flights/cities', methods=['GET'])
def get_city_airport_map():
    """Diagnostic endpoint: expose the cached city->airports mapping and known aliases."""
    city_map, code_to_city_vi = ensure_city_maps_loaded()
    alias_to_canonical = build_alias_map(city_map.keys())
    return jsonify({
        'city_to_airports': city_map,
        'code_to_city_vi': code_to_city_vi,
        'aliases': alias_to_canonical
    })


@flights_bp.route('/api/flights/roundtrip', methods=['GET'])
def get_roundtrip_flights():
    """API trả về danh sách chuyến bay khứ hồi theo điều kiện from, to, date, return_date"""
    from_value = request.args.get('from')
    to_value = request.args.get('to')
    date = request.args.get('date')
    return_date = request.args.get('return_date')

    city_map, code_to_city_vi_ds = ensure_city_maps_loaded()
    alias_to_canonical = build_alias_map(city_map.keys())

    from_codes = parse_airport_values(from_value, city_map, alias_to_canonical)
    to_codes = parse_airport_values(to_value, city_map, alias_to_canonical)

    # Nếu không thể xác định sân bay đi hoặc đến, trả về lỗi
    if (from_value and not from_codes) or (to_value and not to_codes):
        return jsonify({
            'flights': [],
            'count': 0,
            'resolved_from_airports': from_codes,
            'resolved_to_airports': to_codes,
            'error': 'origin_or_destination_not_recognized'
        })

    # Default display names, enriched by dataset mapping
    code_to_city_name_vi = {
        'HAN': 'Hà Nội', 'SGN': 'TP. Hồ Chí Minh', 'DAD': 'Đà Nẵng', 'PQC': 'Phú Quốc', 'VCA': 'Cần Thơ',
        'DLI': 'Đà Lạt', 'HUI': 'Huế', 'DIN': 'Điện Biên', 'PXU': 'Gia Lai', 'VKG': 'An Giang', 'THD': 'Thanh Hóa',
        'VII': 'Nghệ An', 'VDO': 'Quảng Ninh', 'SQH': 'Sơn La', 'CXR': 'Khánh Hòa', 'BMV': 'Đắk Lắk', 'VDH': 'Quảng Trị',
        'VCL': 'Chu Lai', 'HPH': 'Hải Phòng', 'UIH': 'Bình Định', 'TBB': 'Phú Yên', 'VCS': 'Côn Đảo'
    }
    try:
        code_to_city_name_vi.update(code_to_city_vi_ds or {})
    except Exception:
        pass

    with session_scope() as session:
        # Query chuyến đi
        query_outbound = session.query(Flight)
        if from_codes:
            query_outbound = query_outbound.filter(Flight.departure_airport.in_(from_codes))
        if to_codes:
            query_outbound = query_outbound.filter(Flight.arrival_airport.in_(to_codes))
        if date:
            query_outbound = query_outbound.filter(Flight.departure_time.between(f'{date} 00:00:00', f'{date} 23:59:59'))
        outbound_flights = query_outbound.order_by(Flight.departure_time).all()

        # Query chuyến về
        query_return = session.query(Flight)
        if to_codes:
            query_return = query_return.filter(Flight.departure_airport.in_(to_codes))
        if from_codes:
            query_return = query_return.filter(Flight.arrival_airport.in_(from_codes))
        if return_date:
            query_return = query_return.filter(Flight.departure_time.between(f'{return_date} 00:00:00', f'{return_date} 23:59:59'))
        return_flights = query_return.order_by(Flight.departure_time).all()

        # Kết hợp chuyến đi và chuyến về
        result = []
        for outbound in outbound_flights:
            for ret in return_flights:
                if ret.departure_time > outbound.arrival_time:  # Chuyến về phải sau khi chuyến đi hạ cánh
                    outbound_dict = outbound.as_dict()
                    return_dict = ret.as_dict()
                    outbound_dict['departure_city'] = code_to_city_name_vi.get(outbound_dict.get('departure_airport'), outbound_dict.get('departure_airport'))
                    outbound_dict['arrival_city'] = code_to_city_name_vi.get(outbound_dict.get('arrival_airport'), outbound_dict.get('arrival_airport'))
                    return_dict['departure_city'] = code_to_city_name_vi.get(return_dict.get('departure_airport'), return_dict.get('departure_airport'))
                    return_dict['arrival_city'] = code_to_city_name_vi.get(return_dict.get('arrival_airport'), return_dict.get('arrival_airport'))
                    result.append({
                        'outbound': outbound_dict,
                        'return': return_dict
                    })

        return jsonify({
            'flights': result,
            'count': len(result),
            'resolved_from_airports': from_codes,
            'resolved_to_airports': to_codes
        })
