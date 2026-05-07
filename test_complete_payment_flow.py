#!/usr/bin/env python3
"""Test script for complete payment flow: record and verify."""

import sys
sys.path.insert(0, '.')

from backend.utils.blockchain_admin import verify_payment_confirmed_onchain, _send_tx_with_receipt
from web3 import Web3
from backend.config import BlockchainConfig
import os

print("[TEST] Complete Payment Flow - Record & Verify")
print("=" * 60)

# Initialize Web3 and contracts
RPC_URL = BlockchainConfig.SEPOLIA_RPC_URL
PRIVATE_KEY = BlockchainConfig.PRIVATE_KEY
PAYMENT_REGISTRY_ADDRESS = os.getenv('PAYMENT_REGISTRY_ADDRESS')

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = w3.eth.account.from_key(PRIVATE_KEY)

print(f"Account: {account.address}")
print(f"Network connected: {w3.is_connected()}")
print(f"PaymentRegistry: {PAYMENT_REGISTRY_ADDRESS}")

if not w3.is_connected():
    print("\n✗ Cannot connect to blockchain")
    sys.exit(1)

# Define PaymentRegistry ABI (recordPayment function)
PAYMENT_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "bookingCode", "type": "string"}],
        "name": "recordPayment",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
]

contract = w3.eth.contract(address=Web3.to_checksum_address(PAYMENT_REGISTRY_ADDRESS), abi=PAYMENT_REGISTRY_ABI)

# Test booking and amount
booking_code = "SP2025TEST"
amount_wei = int(0.001 * 1e18)  # 0.001 ETH in wei

print(f"\nTesting booking: {booking_code}")
print(f"Amount to record: {amount_wei} wei (0.001 ETH)")

# Step 1: Record payment on-chain
print("\n[STEP 1] Recording payment on-chain...")
try:
    # Build transaction
    tx = contract.functions.recordPayment(booking_code).build_transaction({
        'from': account.address,
        'value': amount_wei,
        'gas': 200000,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.get_transaction_count(account.address),
    })
    
    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(f"  TX Hash: {tx_hash.hex()}")
    
    # Wait for receipt
    print("  Waiting for confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    
    if receipt['status'] == 1:
        print(f"  ✓ Payment recorded successfully")
        print(f"    Gas used: {receipt['gasUsed']}")
    else:
        print(f"  ✗ Transaction failed")
        sys.exit(1)
        
except Exception as e:
    print(f"  ✗ Error recording payment: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 2: Verify payment was recorded
print("\n[STEP 2] Verifying payment on-chain...")
result, message = verify_payment_confirmed_onchain(booking_code, account.address, amount_wei)

print(f"  Verified: {result}")
print(f"  Message: {message}")

if result:
    print("\n✓ PAYMENT FLOW COMPLETE - Record and Verify working!")
else:
    print("\n⚠ Payment recorded but verification failed (may need time for block confirmation)")

print("=" * 60)
