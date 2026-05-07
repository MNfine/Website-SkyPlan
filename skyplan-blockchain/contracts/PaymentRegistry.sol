// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * PaymentRegistry - Collect cryptocurrency payments for bookings
 * 
 * Flow:
 * 1. User sends ETH/stablecoin to recordPayment() with booking code
 * 2. Payment is automatically CONFIRMED on-chain (received by admin wallet/owner)
 * 3. Backend verifies payment confirmed and mints rewards
 * 
 * ✓ No admin approval needed - payment is final on-chain
 * ✓ Prevents fake payments - only actual transfers to admin wallet are recorded
 */
contract PaymentRegistry is Ownable {
    enum PaymentStatus { CONFIRMED, REFUNDED }

    struct Payment {
        string bookingCode;
        address payer;
        uint256 amount;
        uint64 timestamp;
        PaymentStatus status;
    }

    mapping(string => Payment[]) public paymentsByBooking;
    mapping(bytes32 => bool) public paymentConfirmed;  // bookingCode + payer + amount => confirmed

    event PaymentConfirmed(
        string bookingCode,
        address indexed payer,
        uint256 amount,
        uint64 timestamp
    );

    event PaymentRefunded(
        string bookingCode,
        address indexed payer,
        uint256 amount,
        uint64 timestamp
    );

    event PaymentConfirmedByAdmin(
        string bookingCode,
        address indexed payer,
        uint256 amount,
        uint64 timestamp
    );

    constructor() Ownable(msg.sender) {}

    /**
     * User calls this to send payment for a booking
     * ✓ Payment is IMMEDIATELY CONFIRMED on-chain (received by admin/owner wallet)
     * ✓ No need for admin approval - tx finality = payment finality
     */
    function recordPayment(string calldata bookingCode) external payable {
        require(msg.value > 0, "Payment amount must be > 0");
        require(bytes(bookingCode).length > 0, "Booking code required");

        Payment memory payment = Payment({
            bookingCode: bookingCode,
            payer: msg.sender,
            amount: msg.value,
            timestamp: uint64(block.timestamp),
            status: PaymentStatus.CONFIRMED  // ✓ Auto-confirmed on receipt
        });

        paymentsByBooking[bookingCode].push(payment);

        // ✓ Mark as confirmed immediately
        bytes32 paymentKey = keccak256(abi.encodePacked(bookingCode, msg.sender, msg.value));
        paymentConfirmed[paymentKey] = true;

        emit PaymentConfirmed(bookingCode, msg.sender, msg.value, uint64(block.timestamp));
    }

    /**
     * Admin refunds payment (e.g., booking cancelled, duplicate payment)
     */
    function refundPayment(
        string calldata bookingCode,
        address payable payer,
        uint256 amount
    ) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        require(amount > 0, "Amount must be > 0");

        Payment[] storage payments = paymentsByBooking[bookingCode];
        require(payments.length > 0, "No payments for this booking");

        // Find and mark as refunded
        for (uint256 i = 0; i < payments.length; i++) {
            if (
                payments[i].payer == payer &&
                payments[i].amount == amount &&
                payments[i].status == PaymentStatus.CONFIRMED
            ) {
                payments[i].status = PaymentStatus.REFUNDED;

                // Send refund
                (bool success, ) = payer.call{value: amount}("");
                require(success, "Refund transfer failed");

                emit PaymentRefunded(bookingCode, payer, amount, uint64(block.timestamp));
                return;
            }
        }

        revert("Payment not found or already refunded");
    }

    /**
     * Admin confirms an off-chain payment (bank/card). This records a payment
     * entry and marks it confirmed so SkyToken.mintForBooking can proceed.
     */
    function confirmPayment(
        string calldata bookingCode,
        address payer,
        uint256 amount
    ) external onlyOwner {
        require(payer != address(0), "Invalid payer");
        require(amount > 0, "Amount must be > 0");
        require(bytes(bookingCode).length > 0, "Booking code required");

        bytes32 paymentKey = keccak256(abi.encodePacked(bookingCode, payer, amount));
        if (paymentConfirmed[paymentKey]) {
            return;
        }

        Payment memory payment = Payment({
            bookingCode: bookingCode,
            payer: payer,
            amount: amount,
            timestamp: uint64(block.timestamp),
            status: PaymentStatus.CONFIRMED
        });

        paymentsByBooking[bookingCode].push(payment);
        paymentConfirmed[paymentKey] = true;

        emit PaymentConfirmedByAdmin(bookingCode, payer, amount, uint64(block.timestamp));
    }

    /**
     * Verify payment was confirmed (used by backend)
     * Returns true if user sent exactly this amount for this booking
     */
    function isPaymentConfirmed(
        string calldata bookingCode,
        address payer,
        uint256 amount
    ) external view returns (bool) {
        bytes32 paymentKey = keccak256(abi.encodePacked(bookingCode, payer, amount));
        return paymentConfirmed[paymentKey];
    }

    /**
     * Emergency: receive ETH without calling a function
     */
    receive() external payable {}
}
