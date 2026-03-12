"""Blockchain transaction verification utilities"""
from web3 import Web3
from typing import Dict, Optional, Tuple
import os


def get_web3_connection() -> Web3:
    """Get Web3 connection to Sepolia testnet"""
    # Try to get RPC URL from environment
    rpc_url = os.getenv('SEPOLIA_RPC_URL', 'https://eth-sepolia.g.alchemy.com/v2/demo')
    
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        raise ConnectionError("Failed to connect to Ethereum network")
    
    return w3


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
