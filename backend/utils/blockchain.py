"""Blockchain utility functions for booking hash generation"""
import hashlib
from Crypto.Hash import keccak


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
