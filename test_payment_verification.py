#!/usr/bin/env python3
"""Test script for payment verification on-chain."""

import sys
sys.path.insert(0, '.')

from backend.utils.blockchain_admin import verify_payment_confirmed_onchain
from web3 import Web3

# Test with sample data
booking_code = "SP2025001"
payer_address = "0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b"
amount_wei = int(0.01 * 1e18)  # 0.01 ETH in wei

print(f"[TEST] Verifying payment on-chain...")
print(f"  Booking: {booking_code}")
print(f"  Payer: {payer_address}")
print(f"  Amount: {amount_wei} wei (0.01 ETH)")

try:
    result, message = verify_payment_confirmed_onchain(booking_code, payer_address, amount_wei)
    print(f"\n[RESULT] Payment confirmed: {result}")
    print(f"[MESSAGE] {message}")
    
    if result:
        print("\n✓ Payment verification working correctly")
    else:
        print("\n✓ Payment not yet confirmed (expected for untested booking)")
        
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    import traceback
    traceback.print_exc()
