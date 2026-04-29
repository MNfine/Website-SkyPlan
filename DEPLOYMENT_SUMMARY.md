# Smart Contract Deployment Summary

**Date:** April 11, 2026  
**Network:** Ethereum Sepolia Testnet  
**Status:** ✅ All Contracts Successfully Deployed

---

## Deployed Contracts

### 1. BookingRegistry
- **Contract Address:** `0xEF41e83F277849557CAb65724ea3776Af8e70Bb4`
- **Purpose:** Records flight bookings on-chain for verification and NFT minting
- **Deploy Tx Hash:** `0x80aee0e13c588614c73a88ff69e7b5e321d20cdb2720c52b6f8b57e798f5654b`
- **Explorer Link:** [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xEF41e83F277849557CAb65724ea3776Af8e70Bb4)

### 2. SkyToken (ERC-20)
- **Contract Address:** `0xEb3EDbE29c842aa8Af8aD3E9cd3B6b9dFAd87a9d`
- **Purpose:** Reward token for flight bookings (100 SKY per booking)
- **Deploy Tx Hash:** `0x78a7a94991418553911b04a997f3412466667dacf6520ff99f93b8f0332a93a0`
- **Explorer Link:** [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xEb3EDbE29c842aa8Af8aD3E9cd3B6b9dFAd87a9d)
- **Dependencies:** BookingRegistry

### 3. TicketNFT (ERC-721)
- **Contract Address:** `0x6922379bd214d58C71DcDdB281dCC68d1A3b7513`
- **Purpose:** Soulbound flight ticket NFTs (non-transferable)
- **Deploy Tx Hash:** `0x4711bed28ebec35ae2043b0323b7bb94d4d9cff4c7807cf6570e61b2df685cb9`
- **Explorer Link:** [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x6922379bd214d58C71DcDdB281dCC68d1A3b7513)
- **Dependencies:** BookingRegistry, SkyToken

---

## Deployer Account
- **Wallet Address:** `0x78c9C1bE87afBdA2D7c1185568EE89DC26A8e72b`
- **Role:** Contract Owner / Admin

---

## Configuration Updates

### Root .env
Updated with all deployed contract addresses:
```env
# Blockchain Configuration (Sepolia Testnet)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/39ea33a435004ec799a8b5616000c3d4
PRIVATE_KEY=f16322781ae9ccfe65df4a084503213523c84c2afd6ce3af2ca2e4031c07550c

# Smart Contract Addresses
BOOKING_REGISTRY_ADDRESS=0xEF41e83F277849557CAb65724ea3776Af8e70Bb4
TICKET_NFT_ADDRESS=0x6922379bd214d58C71DcDdB281dCC68d1A3b7513
SKY_TOKEN_ADDRESS=0xEb3EDbE29c842aa8Af8aD3E9cd3B6b9dFAd87a9d
```

### skyplan-blockchain/.env
Also updated with same contract addresses for consistency.

---

## Backend Integration

The Flask backend (`backend/config.py`) automatically loads these addresses via:
1. **Primary Source:** Root `.env` file
2. **Fallback:** `skyplan-blockchain/.env` file

The `BlockchainConfig` class reads:
- `SEPOLIA_RPC_URL` → connects to Sepolia testnet
- `BOOKING_REGISTRY_ADDRESS` → initializes BookingRegistry contract
- `TICKET_NFT_ADDRESS` → initializes TicketNFT contract  
- `SKY_TOKEN_ADDRESS` → initializes SkyToken contract
- `PRIVATE_KEY` → signs transactions from backend (custodial minting)

---

## Frontend Integration

The frontend dynamically loads contract addresses from:
- **Endpoint:** `GET /api/metadata/blockchain/config`
- **Returns:** JSON with all three contract addresses
- **Used by:** `config.js` → `wallet-login.js` → `nft-dashboard.js` → `sky-tokens.js`

---

## Next Steps

### 1. **Verify Contracts on Etherscan**
```
Frontend → API /api/metadata/blockchain/config → Get addresses
Frontend → ethers.js → Read contracts at deployed addresses
```

### 2. **Test Blockchain Flows**
- [ ] Mint test NFT using `scripts/mint-ticket.ts`
- [ ] Mint SKY tokens using `scripts/mint-sky.ts`
- [ ] Test wallet login with MetaMask
- [ ] Verify NFT appears in nft-dashboard.html
- [ ] Verify SKY token balance shows in sky-tokens.html

### 3. **Setup MetaMask for Testing**
1. Install MetaMask browser extension
2. Add Sepolia network (chainId: 11155111)
3. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
4. Connect wallet to login.html
5. Complete booking → receive NFT + SKY tokens

---

## Contract Functions

### BookingRegistry
```solidity
recordBooking(bookingCode, passengerCount, flightDate)
getBookingHash(bookingCode) → bytes32
```

### SkyToken (ERC-20)
```solidity
mint(to, amount)
transfer(to, amount)
balanceOf(account) → uint256
```

### TicketNFT (ERC-721)
```solidity
mint(to, bookingCode, metadata)
tokenURI(tokenId) → string
ownerOf(tokenId) → address
```

---

## Testing Commands

```bash
# Mint test token
cd skyplan-blockchain
npx tsx scripts/mint-sky.ts

# Mint test NFT
npx tsx scripts/mint-ticket.ts

# Verify on Etherscan
# Visit: https://sepolia.etherscan.io/address/{CONTRACT_ADDRESS}
```

---

## Environment Variables Reference

| Variable | Value | Used By |
|----------|-------|---------|
| `SEPOLIA_RPC_URL` | Infura Sepolia endpoint | Backend Web3, Hardhat |
| `PRIVATE_KEY` | Deployer private key | Backend tx signing, Hardhat |
| `BOOKING_REGISTRY_ADDRESS` | 0xEF41... | Backend + Frontend |
| `TICKET_NFT_ADDRESS` | 0x6922... | Backend + Frontend |
| `SKY_TOKEN_ADDRESS` | 0xEb3E... | Backend + Frontend |
| `SKY_REWARD_AMOUNT` | 100 | Backend (100 SKY per booking) |

---

## Status

✅ **Deployment Complete**
- All three contracts deployed to Sepolia
- Configuration updated in both .env files
- Backend ready to mint NFTs and SKY tokens
- Frontend pages created and integrated
- Ready for end-to-end testing

🚀 **Next Session:** Integration testing and MetaMask testing
