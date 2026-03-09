"""Wallet authentication utilities for Ethereum signature verification"""
import secrets
import hashlib
from eth_account.messages import encode_defunct
from eth_account import Account
from typing import Optional


def generate_nonce() -> str:
    """Generate a random nonce for signature verification.
    
    Returns:
        64-character hexadecimal string
    """
    return secrets.token_hex(32)


def create_signin_message(wallet_address: str, nonce: str) -> str:
    """Create a message for user to sign with their wallet.
    
    Args:
        wallet_address: Ethereum address (0x...)
        nonce: Random nonce string
        
    Returns:
        Message string to be signed
    """
    return f"""Welcome to SkyPlan!

Please sign this message to authenticate.

Wallet: {wallet_address}
Nonce: {nonce}

This request will not trigger a blockchain transaction or cost any gas fees."""


def verify_signature(message: str, signature: str, expected_address: str) -> bool:
    """Verify that a signature was created by the expected Ethereum address.
    
    Args:
        message: Original message that was signed
        signature: Hex signature string (0x...)
        expected_address: Expected Ethereum address (0x...)
        
    Returns:
        True if signature is valid, False otherwise
    """
    try:
        # Normalize addresses to checksum format
        expected_address = Account.to_checksum_address(expected_address)
        
        # Encode message according to EIP-191
        encoded_message = encode_defunct(text=message)
        
        # Recover the address from signature
        recovered_address = Account.recover_message(encoded_message, signature=signature)
        
        # Compare addresses (case-insensitive)
        return recovered_address.lower() == expected_address.lower()
        
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False


def is_valid_ethereum_address(address: str) -> bool:
    """Check if a string is a valid Ethereum address.
    
    Args:
        address: String to validate
        
    Returns:
        True if valid Ethereum address, False otherwise
    """
    if not address:
        return False
    
    # Must start with 0x
    if not address.startswith('0x'):
        return False
    
    # Must be exactly 42 characters (0x + 40 hex digits)
    if len(address) != 42:
        return False
    
    # Must be valid hexadecimal
    try:
        int(address[2:], 16)
        return True
    except ValueError:
        return False


def normalize_address(address: str) -> Optional[str]:
    """Normalize an Ethereum address to checksum format.
    
    Args:
        address: Ethereum address
        
    Returns:
        Checksum address or None if invalid
    """
    try:
        if is_valid_ethereum_address(address):
            return Account.to_checksum_address(address)
        return None
    except Exception:
        return None
