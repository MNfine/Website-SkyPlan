"""Blockchain utility functions for booking hash generation"""
from __future__ import annotations

from collections.abc import Mapping
from decimal import Decimal, InvalidOperation

from Crypto.Hash import keccak


def _get_value(source, key, default=None):
    if source is None:
        return default
    if isinstance(source, Mapping):
        return source.get(key, default)
    return getattr(source, key, default)


def _normalize_text(value) -> str:
    if value is None:
        return ''
    enum_value = getattr(value, 'value', None)
    if enum_value is not None:
        value = enum_value
    return str(value).strip().lower()


def _normalize_amount(value) -> str:
    if value is None or value == '':
        return '0.00'
    try:
        return f"{Decimal(str(value)).quantize(Decimal('0.01')):.2f}"
    except (InvalidOperation, ValueError, TypeError):
        return str(value).strip()


def _normalize_wallet(value) -> str:
    wallet = _normalize_text(value)
    return wallet


def _normalize_passenger_token(passenger) -> str:
    passenger_id = _get_value(passenger, 'passenger_id', _get_value(passenger, 'id', ''))
    seat_number = _get_value(passenger, 'seat_number', _get_value(passenger, 'seatNumber', ''))
    seat_token = _normalize_text(seat_number)
    return f"{passenger_id}:{seat_token}"


def generate_booking_hash(booking_code: str, flight_ids: list, passenger_count: int, timestamp: str) -> str:
    """
    Generate keccak256 hash for booking (compatible with Solidity)
    
    Args:
        booking_code: Unique booking code
        flight_ids: List of flight IDs [outbound_id, inbound_id or None]
        passenger_count: Number of passengers
        timestamp: ISO format timestamp
        
    Returns:
        Hex string with 0x prefix (66 characters total)
    """
    # Concatenate booking data
    data_string = f"{booking_code}|{','.join(map(str, flight_ids))}|{passenger_count}|{timestamp}"
    
    # Use keccak256 (Ethereum standard)
    k = keccak.new(digest_bits=256)
    k.update(data_string.encode('utf-8'))
    
    # Return hex with 0x prefix
    return '0x' + k.hexdigest()


def generate_booking_hash_simple(booking_code: str) -> str:
    """
    Generate simple keccak256 hash from booking code only
    (matches TypeScript: ethers.keccak256(ethers.toUtf8Bytes(bookingCode)))
    
    Args:
        booking_code: Unique booking code
        
    Returns:
        Hex string with 0x prefix (66 characters total)
    """
    k = keccak.new(digest_bits=256)
    k.update(booking_code.encode('utf-8'))
    return '0x' + k.hexdigest()


def generate_booking_state_hash(booking) -> str:
    """Generate a canonical hash for booking integrity checks.

    This hash includes the booking snapshot that should remain stable after
    creation: code, trip type, fare class, flight ids, amount, wallet address,
    and the booked passenger/seat mapping.
    """
    booking_code = _get_value(booking, 'booking_code', '')
    trip_type = _normalize_text(_get_value(booking, 'trip_type', ''))
    fare_class = _normalize_text(_get_value(booking, 'fare_class', ''))
    outbound_flight_id = _get_value(booking, 'outbound_flight_id', '')
    inbound_flight_id = _get_value(booking, 'inbound_flight_id', '') or ''
    total_amount = _normalize_amount(_get_value(booking, 'total_amount', '0'))
    wallet_address = _normalize_wallet(_get_value(booking, 'wallet_address', ''))

    passengers = _get_value(booking, 'passengers', []) or []
    passenger_tokens = sorted(_normalize_passenger_token(passenger) for passenger in passengers)

    data_string = '|'.join([
        str(booking_code).strip(),
        trip_type,
        fare_class,
        str(outbound_flight_id),
        str(inbound_flight_id),
        total_amount,
        wallet_address,
        ','.join(passenger_tokens),
    ])

    k = keccak.new(digest_bits=256)
    k.update(data_string.encode('utf-8'))
    return '0x' + k.hexdigest()
