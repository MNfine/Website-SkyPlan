// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IBookingRegistry {
    enum Status { NONE, RECORDED, CANCELLED }

    function getBooking(string calldata bookingCode)
        external
        view
        returns (bytes32 bookingHash, address owner, uint64 timestamp, Status status);
}

/**
 * SKY Token - Reward Points (ERC-20)
 * - Mint khi booking đã RECORDED (thành công)
 * - Chỉ dùng trong hệ SkyPlan: hạn chế transfer bằng allowlist
 * - Có burn/redeem mô phỏng
 */
contract SkyToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

    IBookingRegistry public registry;

    // bookingCodeHash -> minted?
    mapping(bytes32 => bool) public mintedForBooking;

    // allowlist để token chỉ chạy trong hệ SkyPlan
    mapping(address => bool) public allowed;

    bool public transfersRestricted = true;

    event AllowedSet(address indexed account, bool allowed);
    event TransfersRestrictedSet(bool restricted);
    event MintedForBooking(address indexed to, string bookingCode, uint256 amount);
    event Redeemed(address indexed user, uint256 amount, string rewardRef);

    constructor(address bookingRegistryAddress, address admin)
        ERC20("SkyPlan Reward", "SKY")
    {
        registry = IBookingRegistry(bookingRegistryAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(REDEEMER_ROLE, admin);

        // admin mặc định được phép nhận/gửi
        allowed[admin] = true;
        emit AllowedSet(admin, true);
    }

    function setRegistry(address bookingRegistryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        registry = IBookingRegistry(bookingRegistryAddress);
    }

    function setAllowed(address account, bool isAllowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        allowed[account] = isAllowed;
        emit AllowedSet(account, isAllowed);
    }

    function setAllowedBatch(address[] calldata accounts, bool isAllowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            allowed[accounts[i]] = isAllowed;
            emit AllowedSet(accounts[i], isAllowed);
        }
    }

    function setTransfersRestricted(bool restricted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transfersRestricted = restricted;
        emit TransfersRestrictedSet(restricted);
    }

    /**
     * Mint reward sau khi booking đã record
     * - require status == RECORDED
     * - require bookingOwner == to
     * - 1 bookingCode chỉ mint 1 lần
     */
    function mintForBooking(
        address to,
        string calldata bookingCode,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Invalid to");
        require(amount > 0, "Amount = 0");

        (, address bookingOwner, , IBookingRegistry.Status status) = registry.getBooking(bookingCode);
        require(status == IBookingRegistry.Status.RECORDED, "Booking not recorded");
        require(bookingOwner == to, "to must be booking owner");

        bytes32 codeHash = keccak256(bytes(bookingCode));
        require(!mintedForBooking[codeHash], "Already minted for booking");
        mintedForBooking[codeHash] = true;

        // đảm bảo user được phép nhận trong hệ
        if (transfersRestricted) {
            require(allowed[to], "Receiver not allowed");
        }

        _mint(to, amount);
        emit MintedForBooking(to, bookingCode, amount);
    }

    /**
     * Redeem mô phỏng: REDEEMER burn điểm của user
     * - user phải approve trước (allowance)
     */
    function redeemFrom(
        address user,
        uint256 amount,
        string calldata rewardRef
    ) external onlyRole(REDEEMER_ROLE) {
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount = 0");

        uint256 currentAllowance = allowance(user, msg.sender);
        require(currentAllowance >= amount, "Insufficient allowance");

        _approve(user, msg.sender, currentAllowance - amount);
        _burn(user, amount);

        emit Redeemed(user, amount, rewardRef);
    }

    /**
     * Burn tự nguyện (user tự burn)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // ===== Transfer restriction hook (OZ v5: _update) =====
    function _update(address from, address to, uint256 value) internal override {
        if (transfersRestricted) {
            // mint: from == 0, burn: to == 0
            if (from != address(0) && to != address(0)) {
                require(allowed[from], "Sender not allowed");
                require(allowed[to], "Receiver not allowed");
            }
        }
        super._update(from, to, value);
    }
}