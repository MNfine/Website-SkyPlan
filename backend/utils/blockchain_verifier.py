"""Blockchain transaction verification utilities"""
from web3 import Web3
from typing import Dict, Optional, Tuple
import os


BOOKING_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "bookingCode", "type": "string"}],
        "name": "getBooking",
        "outputs": [
            {"internalType": "bytes32", "name": "bookingHash", "type": "bytes32"},
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "uint64", "name": "timestamp", "type": "uint64"},
            {"internalType": "uint8", "name": "status", "type": "uint8"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

BOOKING_STATUS_MAP = {
    0: "NONE",
    1: "RECORDED",
    2: "CANCELLED"
}


def get_web3_connection() -> Web3:
    """Get Web3 connection to Sepolia testnet"""
    # Try to get RPC URL from environment
    rpc_url = os.getenv('SEPOLIA_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/demo')
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        raise ConnectionError("Failed to connect to Ethereum network")
    
    return w3


def _bytes32_to_hex(value) -> str:
    """Convert bytes32-like value returned by Web3 to hex string with 0x prefix."""
    if value is None:
        return "0x" + "0" * 64
    if hasattr(value, "hex"):
        return value.hex()
    if isinstance(value, bytes):
        return "0x" + value.hex()
    text = str(value)
    return text if text.startswith("0x") else "0x" + text


def read_onchain_booking(booking_code: str, contract_address: str) -> Tuple[bool, str, Optional[Dict]]:
    """
    Read booking data from BookingRegistry.getBooking(bookingCode).

    Returns:
        Tuple of (success: bool, message: str, data: dict or None)
    """
    try:
        if not booking_code:
            return False, "Missing booking_code", None
        if not contract_address:
            return False, "Missing BookingRegistry contract address", None

        w3 = get_web3_connection()
        if not Web3.is_address(contract_address):
            return False, "Invalid BookingRegistry contract address", None

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=BOOKING_REGISTRY_ABI
        )

        booking_hash, owner, timestamp, status_code = contract.functions.getBooking(booking_code).call()
        status_code = int(status_code)
        onchain_hash = _bytes32_to_hex(booking_hash)

        data = {
            "booking_code": booking_code,
            "booking_hash": onchain_hash,
            "owner": owner,
            "timestamp": int(timestamp),
            "status_code": status_code,
            "status": BOOKING_STATUS_MAP.get(status_code, "UNKNOWN")
        }
        return True, "On-chain booking loaded", data
    except ConnectionError as e:
        return False, f"Failed to connect to blockchain: {str(e)}", None
    except Exception as e:
        return False, f"Failed to read on-chain booking: {str(e)}", None


def compare_offchain_onchain_hash(
    offchain_hash: str,
    booking_code: str,
    contract_address: str
) -> Tuple[bool, str, Optional[Dict]]:
    """
    Compare booking hash in DB (off-chain) with hash stored in BookingRegistry (on-chain).

    Returns:
        Tuple of (is_match: bool, message: str, result: dict or None)
    """
    onchain_success, onchain_message, onchain_data = read_onchain_booking(
        booking_code=booking_code,
        contract_address=contract_address
    )
    if not onchain_success:
        return False, onchain_message, None

    normalized_offchain = (offchain_hash or "").lower()
    normalized_onchain = (onchain_data.get("booking_hash") or "").lower()
    is_match = normalized_offchain == normalized_onchain

    result = {
        "booking_code": booking_code,
        "off_chain_hash": offchain_hash,
        "on_chain_hash": onchain_data.get("booking_hash"),
        "on_chain_owner": onchain_data.get("owner"),
        "on_chain_status": onchain_data.get("status"),
        "on_chain_status_code": onchain_data.get("status_code"),
        "on_chain_timestamp": onchain_data.get("timestamp"),
        "is_match": is_match
    }

    if not is_match:
        return False, "Off-chain hash does not match on-chain hash", result
    if onchain_data.get("status") != "RECORDED":
        return False, f"Booking on-chain status is {onchain_data.get('status')}, expected RECORDED", result
    return True, "Off-chain hash matches on-chain hash", result


def verify_transaction_receipt(tx_hash: str, expected_from_address: Optional[str] = None) -> Tuple[bool, str, Optional[Dict]]:
    """
    Verify a blockchain transaction by checking its receipt
    
    Args:
        tx_hash: Transaction hash (0x...)
        expected_from_address: Optional wallet address that should have sent the transaction
        
    Returns:
        Tuple of (success: bool, message: str, receipt: dict or None)
    """
    try:
        w3 = get_web3_connection()
        
        # Validate transaction hash format
        if not tx_hash or not tx_hash.startswith('0x') or len(tx_hash) != 66:
            return False, "Invalid transaction hash format", None
        
        # Get transaction receipt
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
        except Exception as e:
            return False, f"Transaction not found or pending: {str(e)}", None
        
        if not receipt:
            return False, "Transaction receipt not found (may still be pending)", None
        
        # Check transaction status (1 = success, 0 = failed)
        if receipt.get('status') != 1:
            return False, "Transaction failed on blockchain", dict(receipt)
        
        # If expected_from_address is provided, verify sender
        if expected_from_address:
            # Get transaction details to check 'from' address
            try:
                tx = w3.eth.get_transaction(tx_hash)
                tx_from = tx.get('from', '').lower()
                expected_from = expected_from_address.lower()
                
                if tx_from != expected_from:
                    return False, f"Transaction sender mismatch. Expected: {expected_from}, Got: {tx_from}", dict(receipt)
            except Exception as e:
                return False, f"Failed to verify transaction sender: {str(e)}", dict(receipt)
        
        # Transaction is valid
        return True, "Transaction verified successfully", dict(receipt)
        
    except ConnectionError as e:
        return False, f"Failed to connect to blockchain: {str(e)}", None
    except Exception as e:
        return False, f"Verification error: {str(e)}", None


def check_booking_recorded(tx_hash: str, contract_address: str) -> Tuple[bool, str]:
    """
    Check if a booking was successfully recorded in BookingRegistry contract
    
    Args:
        tx_hash: Transaction hash
        contract_address: BookingRegistry contract address
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    try:
        w3 = get_web3_connection()
        
        # Get transaction receipt
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
        except Exception:
            return False, "Transaction not found"
        
        if not receipt or receipt.get('status') != 1:
            return False, "Transaction failed"
        
        # Check if transaction was sent to the correct contract
        tx_to = receipt.get('to', '').lower()
        expected_to = contract_address.lower()
        
        if tx_to != expected_to:
            return False, f"Transaction not sent to BookingRegistry contract. Expected: {expected_to}, Got: {tx_to}"
        
        # Check for BookingRecorded event
        # Event signature: BookingRecorded(bytes32 indexed bookingHash, string bookingCode, address indexed booker)
        booking_recorded_topic = w3.keccak(text="BookingRecorded(bytes32,string,address)").hex()
        
        logs = receipt.get('logs', [])
        event_found = False
        
        for log in logs:
            topics = log.get('topics', [])
            if topics and topics[0].hex() == booking_recorded_topic:
                event_found = True
                break
        
        if not event_found:
            return False, "BookingRecorded event not found in transaction logs"
        
        return True, "Booking successfully recorded on blockchain"
        
    except Exception as e:
        return False, f"Verification error: {str(e)}"
