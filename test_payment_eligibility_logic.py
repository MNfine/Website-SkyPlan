"""
Simple test for payment eligibility logic without full app initialization.
Tests the _is_reward_eligible function logic directly.
"""

import sys

# Mock the Web3 import
class MockWeb3:
    @staticmethod
    def is_address(addr):
        if not addr:
            return False
        return isinstance(addr, str) and addr.startswith('0x') and len(addr) == 42

# Create a mock booking class
class MockBooking:
    def __init__(self, status=None, wallet=None, booking_hash=None, nft_minted=False, sky_minted=False):
        self.status = status
        self.wallet_address = wallet
        self.booking_hash = booking_hash
        self.nft_minted = nft_minted
        self.sky_minted = sky_minted

# Mock BookingStatus
class BookingStatus:
    CONFIRMED = 'CONFIRMED'
    PENDING = 'PENDING'

# Define the eligibility check function (mirrored from payments.py)
def _is_reward_eligible(booking, verified_by: str | None, check_blockchain_specific: bool = False) -> tuple[bool, str]:
    """
    Check if booking is eligible for on-chain rewards (NFT + SKY).
    
    Business policy:
    - Payment must be verified by ANY channel (blockchain, vnpay, manual)
    - Booking status must be CONFIRMED
    - Booking must have a wallet address to receive rewards
    - NFT/SKY not already minted
    
    For blockchain payments specifically:
    - Booking must have booking_hash (required for on-chain recording)
    
    Returns: (eligible, reason)
    """
    # 1. Payment verification
    if not verified_by:
        return False, "Payment not verified by any channel"
    
    # 2. Booking must be CONFIRMED
    if booking.status != BookingStatus.CONFIRMED:
        return False, f"Booking not confirmed (status={booking.status})"
    
    # 3. Check minting flags
    if booking.nft_minted and booking.sky_minted:
        return False, "Rewards already minted for this booking"
    
    # 4. Must have wallet for reward distribution
    wallet = getattr(booking, 'wallet_address', None)
    if not wallet:
        return False, "Booking has no wallet address for reward distribution"
    
    # 5. Wallet must be valid Ethereum address
    if not MockWeb3.is_address(wallet):
        return False, f"Invalid wallet address: {wallet}"
    
    # 6. BLOCKCHAIN-SPECIFIC: Booking must have booking_hash for on-chain recording
    # (Only check for actual blockchain payments, not for demo bank/card)
    if check_blockchain_specific or verified_by == 'blockchain':
        booking_hash = getattr(booking, 'booking_hash', None)
        if not booking_hash:
            return False, "Booking missing booking_hash (required for on-chain recording)"
    
    return True, "Eligible for rewards"

def test_eligibility(test_name, booking, verified_by, check_blockchain_specific=False, expect_eligible=True):
    """Test eligibility for a specific scenario."""
    is_eligible, reason = _is_reward_eligible(booking, verified_by, check_blockchain_specific)
    
    if is_eligible == expect_eligible:
        status = "✓" if expect_eligible else "⚠️"
        print(f"  {status} {test_name}: {reason}")
        return True
    else:
        print(f"  ❌ {test_name}: Expected eligible={expect_eligible}, got {is_eligible}. Reason: {reason}")
        return False

def main():
    print("\n" + "="*70)
    print("TEST: Payment Architecture - Verify by Channel, Reward by Policy")
    print("="*70 + "\n")
    
    results = []
    
    # TEST 1: VNPay Demo (no booking_hash, no blockchain)
    print("TEST 1: VNPay Demo Payment")
    print("-" * 70)
    booking1 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='0x1234567890123456789012345678901234567890',
        booking_hash=None  # No blockchain hash for demo
    )
    results.append(test_eligibility(
        "VNPay with check_blockchain_specific=False",
        booking1, 
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=True
    ))
    results.append(test_eligibility(
        "VNPay works without booking_hash (demo method)",
        booking1,
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=True
    ))
    print()
    
    # TEST 2: Blockchain Production (requires booking_hash)
    print("TEST 2: Blockchain Production Payment")
    print("-" * 70)
    booking2 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='0x9876543210987654321098765432109876543210',
        booking_hash='0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    )
    results.append(test_eligibility(
        "Blockchain with check_blockchain_specific=True",
        booking2,
        'blockchain',
        check_blockchain_specific=True,
        expect_eligible=True
    ))
    results.append(test_eligibility(
        "Blockchain auto-requires booking_hash via verified_by",
        booking2,
        'blockchain',
        check_blockchain_specific=False,  # Default False, but verified_by='blockchain' auto-checks hash
        expect_eligible=True
    ))
    print()
    
    # TEST 3: Blockchain without hash (should fail)
    print("TEST 3: Blockchain Without Hash (Should Fail)")
    print("-" * 70)
    booking3 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        booking_hash=None  # Missing hash!
    )
    results.append(test_eligibility(
        "Blockchain without booking_hash should fail",
        booking3,
        'blockchain',
        check_blockchain_specific=False,
        expect_eligible=False
    ))
    print()
    
    # TEST 4: Manual /mark-paid for Bank (demo, no hash required)
    print("TEST 4: Manual /mark-paid for Bank (Demo)")
    print("-" * 70)
    booking4 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='0x1111111111111111111111111111111111111111',
        booking_hash=None  # Demo bank, no hash needed
    )
    results.append(test_eligibility(
        "Manual bank payment (demo, no hash required)",
        booking4,
        'bank',
        check_blockchain_specific=False,
        expect_eligible=True
    ))
    print()
    
    # TEST 5: No wallet (should fail for all)
    print("TEST 5: Missing Wallet Address (Should Fail)")
    print("-" * 70)
    booking5 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet=None,  # No wallet!
        booking_hash='0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    )
    results.append(test_eligibility(
        "VNPay without wallet should fail",
        booking5,
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=False
    ))
    results.append(test_eligibility(
        "Blockchain without wallet should fail",
        booking5,
        'blockchain',
        check_blockchain_specific=True,
        expect_eligible=False
    ))
    print()
    
    # TEST 6: Not confirmed (should fail)
    print("TEST 6: Booking Not Confirmed (Should Fail)")
    print("-" * 70)
    booking6 = MockBooking(
        status=BookingStatus.PENDING,
        wallet='0x1111111111111111111111111111111111111111',
        booking_hash='0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    )
    results.append(test_eligibility(
        "Payment on PENDING booking should fail",
        booking6,
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=False
    ))
    print()
    
    # TEST 7: Rewards already minted (should fail)
    print("TEST 7: Rewards Already Minted (Should Fail)")
    print("-" * 70)
    booking7 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='0x1111111111111111111111111111111111111111',
        booking_hash='0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        nft_minted=True,
        sky_minted=True
    )
    results.append(test_eligibility(
        "Already minted rewards should fail",
        booking7,
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=False
    ))
    print()
    
    # TEST 8: Invalid wallet (should fail)
    print("TEST 8: Invalid Wallet Address (Should Fail)")
    print("-" * 70)
    booking8 = MockBooking(
        status=BookingStatus.CONFIRMED,
        wallet='invalid_address',  # Not an Ethereum address
        booking_hash=None
    )
    results.append(test_eligibility(
        "Invalid wallet should fail",
        booking8,
        'vnpay',
        check_blockchain_specific=False,
        expect_eligible=False
    ))
    print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print("="*70)
    print(f"TEST SUMMARY: {passed}/{total} tests passed")
    print("="*70)
    
    if passed == total:
        print("\n✅ All tests passed! Architecture is working correctly.\n")
        print("Key validations:")
        print("  ✓ Demo methods (VNPay/Bank/Card) work without booking_hash")
        print("  ✓ Blockchain production requires booking_hash")
        print("  ✓ All methods require wallet address for rewards")
        print("  ✓ Eligibility check auto-determines blockchain_hash requirement")
        print("  ✓ Status must be CONFIRMED for rewards")
        print("  ✓ No double-minting of rewards")
        print("  ✓ Wallet must be valid Ethereum address\n")
        return True
    else:
        print(f"\n❌ {total - passed} test(s) failed!\n")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
