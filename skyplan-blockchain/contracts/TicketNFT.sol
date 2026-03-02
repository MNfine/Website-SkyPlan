// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IBookingRegistry {
    enum Status { NONE, RECORDED, CANCELLED }

    function getBooking(string calldata bookingCode)
        external
        view
        returns (bytes32 bookingHash, address owner, uint64 timestamp, Status status);
}

contract TicketNFT is ERC721URIStorage, Ownable {
    IBookingRegistry public registry;

    uint256 private nextTokenId = 1;

    // tokenId -> bookingCode
    mapping(uint256 => string) private bookingCodeOfToken;

    // bookingCodeHash -> tokenId (đảm bảo 1 bookingCode chỉ mint 1 lần)
    mapping(bytes32 => uint256) private tokenIdOfBookingHash;

    event TicketMinted(address indexed to, uint256 indexed tokenId, string bookingCode, string tokenURI);

    constructor(address bookingRegistryAddress)
        ERC721("SkyPlan Ticket", "SPT")
        Ownable(msg.sender)
    {
        registry = IBookingRegistry(bookingRegistryAddress);
    }

    function setRegistry(address bookingRegistryAddress) external onlyOwner {
        registry = IBookingRegistry(bookingRegistryAddress);
    }

    /**
     * Mint NFT sau khi booking đã record.
     * - Chỉ owner (backend/admin) gọi (bạn có thể đổi policy sau).
     * - require booking RECORDED
     * - gắn bookingCode <-> tokenId
     */
    function mintTicket(
        address to,
        string calldata bookingCode,
        string calldata tokenURI_
    ) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "Invalid to");
        require(bytes(bookingCode).length > 0, "Empty bookingCode");

        // Check booking đã RECORDED trong registry
        (, address bookingOwner, , IBookingRegistry.Status status) = registry.getBooking(bookingCode);
        require(status == IBookingRegistry.Status.RECORDED, "Booking not recorded");
        require(bookingOwner == to, "to must be booking owner");

        bytes32 bHash = keccak256(bytes(bookingCode));
        require(tokenIdOfBookingHash[bHash] == 0, "Already minted for bookingCode");

        tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        bookingCodeOfToken[tokenId] = bookingCode;
        tokenIdOfBookingHash[bHash] = tokenId;

        emit TicketMinted(to, tokenId, bookingCode, tokenURI_);
    }

    // ===== Getters =====

    function getBookingCode(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        return bookingCodeOfToken[tokenId];
    }

    function getTokenIdByBookingCode(string calldata bookingCode) external view returns (uint256) {
        return tokenIdOfBookingHash[keccak256(bytes(bookingCode))]; // 0 = chưa mint
    }

    // transferFrom()/safeTransferFrom() có sẵn trong ERC721
}