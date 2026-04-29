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
 * - Mint when booking is RECORDED (successful)
 * - Auto-allow user when receiving token (no manual whitelist needed)
 * - Used only in SkyPlan system: restrict transfers via allowlist
 */
contract SkyToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE  = keccak256("MINTER_ROLE");
    bytes32 public constant REDEEMER_ROLE = keccak256("REDEEMER_ROLE");

    IBookingRegistry public registry;

    // bookingCodeHash -> minted?
    mapping(bytes32 => bool) public mintedForBooking;

    // allowlist to ensure token only runs in SkyPlan system
    mapping(address => bool) public allowed;

    bool public transfersRestricted = true;

    event AllowedSet(address indexed account, bool allowed);
    event TransfersRestrictedSet(bool restricted);
    event MintedForBooking(address indexed to, string bookingCode, uint256 amount);
    event Redeemed(address indexed user, uint256 amount, string rewardRef);

    constructor(address bookingRegistryAddress, address admin)
        ERC20("SkyPlan Reward", "SKY")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(REDEEMER_ROLE, admin);

        registry = IBookingRegistry(bookingRegistryAddress);
        
        // ✓ Admin is allowed from the start
        allowed[admin] = true;
    }

    function setRegistry(address bookingRegistryAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        registry = IBookingRegistry(bookingRegistryAddress);
    }

    function setAllowed(address account, bool isAllowed) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        allowed[account] = isAllowed;
        emit AllowedSet(account, isAllowed);
    }

    function setAllowedBatch(address[] calldata accounts, bool isAllowed) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            allowed[accounts[i]] = isAllowed;
            emit AllowedSet(accounts[i], isAllowed);
        }
    }

    function setTransfersRestricted(bool restricted) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        transfersRestricted = restricted;
        emit TransfersRestrictedSet(restricted);
    }

    /**
     * ✓ Mint token for user when booking RECORDED
     * ✓ Automatically add user to allowlist
     */
    function mintForBooking(
        address to,
        string calldata bookingCode,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        // ...existing validation...
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        // Verify booking exists và có status = RECORDED
        (bytes32 bookingHash, address owner, , ) = registry.getBooking(bookingCode);
        require(owner == to, "Booking owner mismatch");
        require(bookingHash != bytes32(0), "Booking not found");

        bytes32 bookingCodeHash = keccak256(abi.encodePacked(bookingCode));
        require(!mintedForBooking[bookingCodeHash], "Already minted for this booking");

        // ✓ Mark as minted
        mintedForBooking[bookingCodeHash] = true;

        // ✓ AUTO-ALLOW user - no manual admin approval needed
        if (!allowed[to]) {
            allowed[to] = true;
            emit AllowedSet(to, true);
        }

        // ✓ Mint token
        _mint(to, amount);
        emit MintedForBooking(to, bookingCode, amount);
    }

    /**
     * Redeem token từ user
     */
    function redeemFrom(
        address user,
        uint256 amount,
        string calldata rewardRef
    ) external onlyRole(REDEEMER_ROLE) {
        require(user != address(0), "Invalid user");
        require(balanceOf(user) >= amount, "Insufficient balance");

        _burn(user, amount);
        emit Redeemed(user, amount, rewardRef);
    }

    /**
     * Burn token
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // ===== Transfer restriction hook (OZ v5: _update) =====
    function _update(address from, address to, uint256 value) 
        internal 
        override 
    {
        // Mint (from == zero address) - allow
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        // Burn (to == zero address) - allow
        if (to == address(0)) {
            super._update(from, to, value);
            return;
        }

        // ✓ Transfer - check allowlist
        if (transfersRestricted) {
            require(allowed[from], "Sender not allowed");
            require(allowed[to], "Receiver not allowed");
        }

        super._update(from, to, value);
    }
}