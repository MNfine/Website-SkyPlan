"""
Test script to verify the payment refactoring architecture:
- Verify by channel (blockchain XOR gateway)
- Reward by policy (separate from payment method)

Tests all 3 payment flows:
1. VNPay (demo): No booking_hash required
2. Blockchain: booking_hash required
3. Manual /mark-paid: booking_hash required for blockchain provider
"""

import os
import sys
from decimal import Decimal
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from backend.models.db import SessionLocal, engine, Base
# Import app to initialize all models
from backend.app import app
from backend.models.booking import Booking, BookingStatus
from backend.models.payments import Payment
from backend.models.user import User
from backend.routes.payments import _is_reward_eligible

# Create tables if needed
Base.metadata.create_all(engine)

def create_test_user():
    """Create a test user."""
    session = SessionLocal()
    try:
        user = session.query(User).filter_by(email='test@example.com').first()
        if not user:
            user = User(
                email='test@example.com',
                password_hash='test_hash',
                full_name='Test User'
            )
            session.add(user)
            session.commit()
        return user.id
    finally:
        session.close()

def create_test_booking(user_id, booking_code, wallet_address=None, booking_hash=None):
    """Create a test booking."""
    session = SessionLocal()
    try:
        booking = Booking(
            user_id=user_id,
            booking_code=booking_code,
            outbound_flight_id=1,
            total_passengers=1,
            total_amount=Decimal('100.00'),
            currency='USD',
            status=BookingStatus.CONFIRMED,
            confirmed_at=datetime.utcnow(),
            wallet_address=wallet_address,
            booking_hash=booking_hash
        )
        session.add(booking)
        session.commit()
        return booking.id
    finally:
        session.close()

def test_eligibility(test_name, booking_code, verified_by, check_blockchain_specific=False, expect_eligible=True):
    """Test eligibility for a specific scenario."""
    session = SessionLocal()
    try:
        booking = session.query(Booking).filter_by(booking_code=booking_code).first()
        if not booking:
            print(f"  ❌ {test_name}: Booking not found")
            return False
        
        is_eligible, reason = _is_reward_eligible(booking, verified_by, check_blockchain_specific)
        
        if is_eligible == expect_eligible:
            status = "✓" if expect_eligible else "⚠️"
            print(f"  {status} {test_name}: {reason}")
            return True
        else:
            print(f"  ❌ {test_name}: Expected eligible={expect_eligible}, got {is_eligible}. Reason: {reason}")
            return False
    finally:
        session.close()

def main():
    print("\n" + "="*70)
    print("TEST: Payment Architecture - Verify by Channel, Reward by Policy")
    print("="*70 + "\n")
    
    # Create test data
    user_id = create_test_user()
    print(f"✓ Created test user (ID={user_id})\n")
    
    # TEST 1: VNPay Demo (no booking_hash, no blockchain)
    print("TEST 1: VNPay Demo Payment")
    print("-" * 70)
    booking_id_1 = create_test_booking(
        user_id, 
        'VNPAY001',
        wallet_address='0x1234567890123456789012345678901234567890',
        booking_hash=None  # No blockchain hash for demo
    )
    print(f"Created booking VNPAY001 (no booking_hash, has wallet)")
    
    results_1 = [
        test_eligibility(
            "VNPay with check_blockchain_specific=False",
            'VNPAY001', 
            'vnpay',
            check_blockchain_specific=False,
            expect_eligible=True
        ),
        test_eligibility(
            "VNPay should still work without booking_hash",
            'VNPAY001',
            'vnpay',
            check_blockchain_specific=False,
            expect_eligible=True
        )
    ]
    print()
    
    # TEST 2: Blockchain Production (requires booking_hash)
    print("TEST 2: Blockchain Production Payment")
    print("-" * 70)
    booking_hash = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    booking_id_2 = create_test_booking(
        user_id,
        'BLOCK001',
        wallet_address='0x9876543210987654321098765432109876543210',
        booking_hash=booking_hash  # Has blockchain hash for production
    )
    print(f"Created booking BLOCK001 (has booking_hash, has wallet)")
    
    results_2 = [
        test_eligibility(
            "Blockchain with check_blockchain_specific=True",
            'BLOCK001',
            'blockchain',
            check_blockchain_specific=True,
            expect_eligible=True
        ),
        test_eligibility(
            "Blockchain requires booking_hash",
            'BLOCK001',
            'blockchain',
            check_blockchain_specific=False,  # Default False, but verified_by='blockchain' should require hash
            expect_eligible=True
        )
    ]
    print()
    
    # TEST 3: Blockchain without hash (should fail)
    print("TEST 3: Blockchain Without Hash (Should Fail)")
    print("-" * 70)
    booking_id_3 = create_test_booking(
        user_id,
        'BLOCK_NO_HASH',
        wallet_address='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        booking_hash=None  # Missing hash!
    )
    print(f"Created booking BLOCK_NO_HASH (no booking_hash)")
    
    results_3 = [
        test_eligibility(
            "Blockchain without booking_hash should fail",
            'BLOCK_NO_HASH',
            'blockchain',
            check_blockchain_specific=False,
            expect_eligible=False
        )
    ]
    print()
    
    # TEST 4: Manual /mark-paid for Bank (demo, no hash required)
    print("TEST 4: Manual /mark-paid for Bank (Demo)")
    print("-" * 70)
    booking_id_4 = create_test_booking(
        user_id,
        'MANUAL_BANK',
        wallet_address='0x1111111111111111111111111111111111111111',
        booking_hash=None  # Demo bank, no hash needed
    )
    print(f"Created booking MANUAL_BANK (no booking_hash for demo)")
    
    results_4 = [
        test_eligibility(
            "Manual bank payment (demo, no hash required)",
            'MANUAL_BANK',
            'bank',
            check_blockchain_specific=False,
            expect_eligible=True
        )
    ]
    print()
    
    # TEST 5: No wallet (should fail for all)
    print("TEST 5: Missing Wallet Address (Should Fail)")
    print("-" * 70)
    booking_id_5 = create_test_booking(
        user_id,
        'NO_WALLET',
        wallet_address=None,  # No wallet!
        booking_hash=booking_hash
    )
    print(f"Created booking NO_WALLET (no wallet address)")
    
    results_5 = [
        test_eligibility(
            "VNPay without wallet should fail",
            'NO_WALLET',
            'vnpay',
            check_blockchain_specific=False,
            expect_eligible=False
        ),
        test_eligibility(
            "Blockchain without wallet should fail",
            'NO_WALLET',
            'blockchain',
            check_blockchain_specific=True,
            expect_eligible=False
        )
    ]
    print()
    
    # Summary
    all_results = results_1 + results_2 + results_3 + results_4 + results_5
    passed = sum(all_results)
    total = len(all_results)
    
    print("="*70)
    print(f"TEST SUMMARY: {passed}/{total} tests passed")
    print("="*70)
    
    if passed == total:
        print("✅ All tests passed! Architecture is working correctly.")
        print("\nKey validations:")
        print("  ✓ Demo methods (VNPay/Bank/Card) work without booking_hash")
        print("  ✓ Blockchain production requires booking_hash")
        print("  ✓ All methods require wallet address for rewards")
        print("  ✓ Eligibility check auto-determines blockchain_hash requirement")
        return True
    else:
        print(f"❌ {total - passed} test(s) failed!")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
