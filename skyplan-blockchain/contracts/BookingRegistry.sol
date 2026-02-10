// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BookingRegistry {
    enum Status { NONE, RECORDED, CANCELLED }

    struct Booking {
        bytes32 bookingHash;
        address owner;
        uint64  timestamp;
        Status  status;
    }

    mapping(string => Booking) private bookings;

    event BookingRecorded(
        string bookingCode,
        bytes32 bookingHash,
        address indexed owner,
        uint64 timestamp
    );

    event BookingCancelled(
        string bookingCode,
        address indexed owner,
        uint64 timestamp
    );

    function recordBooking(string calldata bookingCode, bytes32 bookingHash) external {
        Booking storage b = bookings[bookingCode];
        require(b.status == Status.NONE, "Booking exists");
        require(bookingHash != bytes32(0), "Invalid hash");

        uint64 ts = uint64(block.timestamp);
        bookings[bookingCode] = Booking({
            bookingHash: bookingHash,
            owner: msg.sender,
            timestamp: ts,
            status: Status.RECORDED
        });

        emit BookingRecorded(bookingCode, bookingHash, msg.sender, ts);
    }

    function cancelBooking(string calldata bookingCode) external {
        Booking storage b = bookings[bookingCode];
        require(b.status == Status.RECORDED, "Not cancellable");
        require(b.owner == msg.sender, "Not owner");

        b.status = Status.CANCELLED;
        emit BookingCancelled(bookingCode, msg.sender, uint64(block.timestamp));
    }

    function getBooking(string calldata bookingCode)
        external
        view
        returns (bytes32 bookingHash, address owner, uint64 timestamp, Status status)
    {
        Booking storage b = bookings[bookingCode];
        return (b.bookingHash, b.owner, b.timestamp, b.status);
    }
}