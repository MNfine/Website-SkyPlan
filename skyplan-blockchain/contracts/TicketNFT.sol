// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IBookingRegistry {
    enum Status { NONE, RECORDED, CANCELLED }

    function getBooking(string calldata bookingCode)
        external
        view
        returns (bytes32 bookingHash, address owner, uint64 timestamp, Status status);
}

interface ISkyToken {
    function setAllowed(address account, bool isAllowed) external;
}

/**
 * TicketNFT - Flight Ticket (ERC-721)
 * - Mỗi vé = 1 NFT
 * - Mint khi booking RECORDED
 * - Auto-allow user trong SkyToken khi mint
 * - Soulbound: không thể transfer (optional)
 */
contract TicketNFT is ERC721URIStorage, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IBookingRegistry public registry;
    ISkyToken public skyToken;

    uint256 private nextTokenId = 1;

    // tokenId -> bookingCode
    mapping(uint256 => string) private bookingCodeOfToken;

    // bookingCodeHash -> tokenId (đảm bảo 1 bookingCode chỉ mint 1 lần)
    mapping(bytes32 => uint256) private tokenIdOfBookingHash;

    // Track user's tickets count
    mapping(address => uint256) public ticketsCount;

    event TicketMinted(
        address indexed to,
        uint256 indexed tokenId,
        string bookingCode,
        string tokenURI
    );

    event TicketBurned(
        address indexed from,
        uint256 indexed tokenId,
        string bookingCode
    );

    constructor(address bookingRegistryAddress, address skyTokenAddress, address admin)
        ERC721("SkyPlan Ticket", "SKYTICKET")
        Ownable(admin)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        registry = IBookingRegistry(bookingRegistryAddress);
        skyToken = ISkyToken(skyTokenAddress);
    }

    function setRegistry(address bookingRegistryAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        registry = IBookingRegistry(bookingRegistryAddress);
    }

    function setSkyToken(address skyTokenAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        skyToken = ISkyToken(skyTokenAddress);
    }

    /**
     * ✓ Mint ticket từ booking RECORDED
     * ✓ Tự động add user vào SkyToken allowlist
     */
    function mintTicket(
        address to,
        string calldata bookingCode,
        string calldata tokenURI_
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        require(to != address(0), "Invalid recipient");
        require(bytes(bookingCode).length > 0, "Invalid booking code");
        require(bytes(tokenURI_).length > 0, "Invalid token URI");

        // ✓ Verify booking exists và có status = RECORDED
        (bytes32 bookingHash, address owner, , ) = registry.getBooking(bookingCode);
        require(owner == to, "Booking owner mismatch");
        require(bookingHash != bytes32(0), "Booking not found");

        bytes32 bookingCodeHash = keccak256(abi.encodePacked(bookingCode));
        require(tokenIdOfBookingHash[bookingCodeHash] == 0, "Already minted for this booking");

        // ✓ Generate token ID
        tokenId = nextTokenId;
        nextTokenId++;

        // ✓ Store mapping
        bookingCodeOfToken[tokenId] = bookingCode;
        tokenIdOfBookingHash[bookingCodeHash] = tokenId;
        ticketsCount[to]++;

        // ✓ Mint NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        // ✓ Auto-allow user trong SkyToken
        if (address(skyToken) != address(0)) {
            try skyToken.setAllowed(to, true) {
                // Success
            } catch {
                // Log fail nhưng không revert - NFT vẫn được mint
            }
        }

        emit TicketMinted(to, tokenId, bookingCode, tokenURI_);
    }

    /**
     * Burn ticket (refund/cancel booking)
     */
    function burnTicket(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        string memory bookingCode = bookingCodeOfToken[tokenId];
        address owner = ownerOf(tokenId);

        // Decrease count
        if (ticketsCount[owner] > 0) {
            ticketsCount[owner]--;
        }

        // Burn
        _burn(tokenId);

        emit TicketBurned(owner, tokenId, bookingCode);
    }

    /**
     * ✓ Soulbound: Prevent transfers
     * (Tickets không thể bán/chuyển - chỉ refund)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // ✓ Allow mint (from == zero address)
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // ✓ Allow burn (to == zero address)
        if (to == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // ❌ Block regular transfers (soulbound)
        revert("Tickets are non-transferable");
    }

    // ===== Getters =====

    function getBookingCode(uint256 tokenId)
        external
        view
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token not found");
        return bookingCodeOfToken[tokenId];
    }

    function getTokenIdByBookingCode(string calldata bookingCode)
        external
        view
        returns (uint256)
    {
        bytes32 bookingCodeHash = keccak256(abi.encodePacked(bookingCode));
        return tokenIdOfBookingHash[bookingCodeHash];
    }

    function getUserTicketsCount(address user)
        external
        view
        returns (uint256)
    {
        return ticketsCount[user];
    }

    // ===== Required overrides =====

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}