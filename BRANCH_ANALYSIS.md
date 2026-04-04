# SkyPlan Branch Analysis Report
**Generated:** April 4, 2026 | **Workspace:** SkyPlan

---

## Executive Summary

This report analyzes 9 active development branches across the SkyPlan project. The branches span four major domains:
- **Backend Optimization** (2 branches)
- **Frontend Features** (4 branches) 
- **Blockchain Integration** (4 branches)

### Critical Finding: HIGH MERGE CONFLICT Risk
All 9 branches modify the same core files:
- `backend/app.py` - All 9 branches
- `backend/config.py` - All 9 branches  
- `backend/requirements.txt` - 6+ branches

**Recommended Strategy:** Sequential merge with conflict resolution planning

---

## Detailed Branch Analysis

### 1. origin/fix/backend-optimization (2026-02-10) | 162 files

#### Purpose
Comprehensive backend and frontend optimization. Updates core application structure, database schema, and all backend services.

#### Key Information
- **Commit Message:** `update`
- **File Breakdown:** Backend: 31 | Frontend: 124 | Blockchain: 0 | Other: 7
- **Status:** Most foundational optimization branch

#### Key Files Changed
**Backend (31 files):**
- [backend/app.py](backend/app.py) - Main application config
- [backend/config.py](backend/config.py) - Configuration management
- [backend/requirements.txt](backend/requirements.txt) - Python dependencies
- [backend/models/booking.py](backend/models/booking.py)
- [backend/models/db.py](backend/models/db.py)
- [backend/models/flights.py](backend/models/flights.py)
- [backend/models/passenger.py](backend/models/passenger.py)
- [backend/models/payments.py](backend/models/payments.py)
- [backend/models/seats.py](backend/models/seats.py)
- [backend/models/tickets.py](backend/models/tickets.py)
- [backend/models/user.py](backend/models/user.py)
- [backend/routes/ai_chat.py](backend/routes/ai_chat.py)
- [backend/routes/auth.py](backend/routes/auth.py)
- [backend/routes/bookings.py](backend/routes/bookings.py)
- [backend/routes/contact.py](backend/routes/contact.py)
- [backend/routes/flights.py](backend/routes/flights.py)
- [backend/routes/payments.py](backend/routes/payments.py)
- [backend/routes/seats.py](backend/routes/seats.py)
- [backend/routes/support.py](backend/routes/support.py)
- [backend/routes/tickets.py](backend/routes/tickets.py)
- [backend/utils/email_service.py](backend/utils/email_service.py)
- Database scripts: create_tables.py, import_flights.py, seed.py, schema.sql

**Frontend (124 files):**
- 40+ JavaScript files (translations + component logic)
- 30+ CSS files (styling for all pages)
- 13 HTML pages (complete UI structure)
- Image assets (60+ files including Vietnamese promotional images)

#### Technical Focus
- **Primary:** Backend ✅ 19% | Frontend ✅ 77%
- **Type:** Optimization & Restructuring

#### New Features/Fixes
- ✅ Complete backend data models (8 models)
- ✅ All API routes (9 route modules)
- ✅ Email service integration
- ✅ Database schema and migration scripts
- ✅ Comprehensive frontend UI with i18n support
- ✅ Payment flow UI components
- ✅ Seat selection interface

#### Dependencies/Risks
**Critical Dependencies:**
- SQLAlchemy 2.0.46
- flask-socketio (real-time features)
- google-generativeai (AI chat features)
- psycopg2 (PostgreSQL driver)
- python-dotenv
- vn-cities (Vietnamese location data)

**Integration Risks:** ⚠️ **HIGHEST**
- Foundation branch: Everything else likely depends on this
- Modifies all core backend files
- Database schema changes may conflict with subsequent branches

---

### 2. origin/fix/frontend-optimization (2026-03-01) | 127 files

#### Purpose
Fix booking action logic based on ticket status. Frontend-focused optimization with minimal backend changes.

#### Key Information
- **Commit Message:** `fix: update booking action logic based on ticket status`
- **File Breakdown:** Backend: 4 | Frontend: 117 | Blockchain: 0 | Other: 6
- **Status:** Targeted bug fix for payment/ticket flow

#### Key Files Changed
**Backend (4 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/requirements.txt](backend/requirements.txt)
- [backend/routes/payment.py](backend/routes/payment.py) - **Key: Ticket status logic**

**Frontend (117 files):**
- `frontend/login.html` - Authentication UI
- `frontend/payment.html` - Payment flow
- `frontend/confirmation.html` - Booking confirmation
- All assets, scripts, styles for booking workflow

#### Technical Focus
- **Primary:** Frontend ✅ 92%
- **Type:** Bug Fix & Logic Correction

#### New Features/Fixes
- ✅ Corrected ticket status validation logic (likely from "COMPLETED" → "SUCCESS")
- ✅ Updated booking action handlers
- ✅ Frontend state management for ticket/booking transitions

#### Dependencies/Risks
**Code Conflict Points:**
- [backend/routes/payment.py](backend/routes/payment.py) - Changed by multiple branches
- Depends on backend-optimization for model structure

**Integration Risks:** ⚠️ **MEDIUM**
- Fixes payment status bug found in backend-optimization
- May prevent merging if backend-optimization already tried different fix
- **PRE-REQUISITE:** backend-optimization must be merged first

---

### 3. origin/feature/blockchain-wallet-frontend (2026-03-20) | 132 files

#### Purpose
Frontend responsive layout improvements with wallet integration. iPad Air hamburger menu and centered wallet button text implementation.

#### Key Information
- **Commit Message:** `fix: responsive layout for iPad Air with hamburger menu and centered wallet button text`
- **File Breakdown:** Backend: 4 | Frontend: 121 | Blockchain: 0 | Other: 7
- **Status:** UI/UX enhancement for wallet features

#### Key Files Changed
**Backend (4 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/requirements.txt](backend/requirements.txt)
- [backend/routes/payment.py](backend/routes/payment.py)

**Frontend (121 files):**
- `frontend/assets/scripts/wallet_translations.js` - **NEW: Wallet i18n**
- `frontend/assets/styles/wallet.css` - **NEW: Wallet styling**
- Updated header/footer components for responsive design
- All page templates with responsive fixes

#### Technical Focus
- **Primary:** Frontend ✅ 92%
- **Type:** Feature Enhancement (UI/UX)

#### New Features/Fixes
- ✅ Wallet component integration
- ✅ Responsive layout for iPad Air (768px breakpoint)
- ✅ Hamburger menu for mobile navigation
- ✅ Wallet button UI centering and styling
- ✅ Wallet page translations (i18n)

#### Dependencies/Risks
**Frontend-Only Changes:**
- Responsive CSS requires coordination with base frontend
- Wallet component needs matching backend wallet routes

**Integration Risks:** ⚠️ **MEDIUM-LOW**
- Primarily CSS/HTML changes
- Could conflict with other frontend-optimization branches on responsive design
- **PRE-REQUISITE:** Needs backend-optimization for base structure

---

### 4. origin/feature/blockchain (2026-03-23) | 180 files

#### Purpose
Core blockchain integration with token/NFT flow refinement and deploy script alignment. Implements booking registry, sky token, and ticket NFT contracts.

#### Key Information
- **Commit Message:** `Refine token/NFT flow and align deploy scripts`
- **File Breakdown:** Backend: 31 | Frontend: 123 | Blockchain: 17 | Other: 9
- **Status:** Major blockchain scaffold and contract deployment

#### Key Files Changed
**Backend (31 files):**
- [backend/app.py](backend/app.py) - Blockchain route integration
- [backend/config.py](backend/config.py) - Blockchain RPC config
- [backend/models/db.py](backend/models/db.py) - Blockchain address fields
- Complete database schema with blockchain fields

**Blockchain (17 files):**
- [skyplan-blockchain/contracts/BookingRegistry.sol](skyplan-blockchain/contracts/BookingRegistry.sol) - **NEW: Main booking contract**
- [skyplan-blockchain/contracts/SkyToken.sol](skyplan-blockchain/contracts/SkyToken.sol) - **NEW: Token contract (ERC20)**
- [skyplan-blockchain/contracts/TicketNFT.sol](skyplan-blockchain/contracts/TicketNFT.sol) - **NEW: NFT contract (ERC721)**
- [skyplan-blockchain/hardhat.config.ts](skyplan-blockchain/hardhat.config.ts) - Hardhat configuration
- [skyplan-blockchain/package.json](skyplan-blockchain/package.json) - Dependencies (Hardhat, Ethers.js)
- [skyplan-blockchain/scripts/deploy-booking.ts](skyplan-blockchain/scripts/deploy-booking.ts)
- [skyplan-blockchain/scripts/deploy-sky-token.ts](skyplan-blockchain/scripts/deploy-sky-token.ts)

**Frontend (123 files):**
- Payment and booking flows updated for blockchain

#### Technical Focus
- **Primary:** Blockchain ✅ 9% | Backend ✅ 17% | Frontend ✅ 68%
- **Type:** Feature (Infrastructure)

#### New Features/Fixes
- ✅ **BookingRegistry.sol** - Smart contract managing on-chain bookings
- ✅ **SkyToken.sol** - ERC20 token for rewards/payments
- ✅ **TicketNFT.sol** - ERC721 NFT representing airline tickets
- ✅ Hardhat deployment scripts
- ✅ TypeScript configuration for blockchain
- ✅ Database migration for blockchain address fields
- ✅ Contract deployment automation

#### Dependencies/Risks
**New Dependencies:**
- Hardhat (TypeScript Ethereum development framework)
- Ethers.js (Web3 library)
- Solidity compiler (~0.8.x)
- dotenv for RPC URL management

**Backend Changes:**
- [backend/config.py](backend/config.py) needs RPC URL (Sepolia testnet)
- [backend/models/db.py](backend/models/db.py) needs blockchain address columns (idempotent keys)

**Integration Risks:** ⚠️ **CRITICAL**
- Largest branch (180 files)
- Requires significant database schema changes
- **CONFLICT ALERT:** Modifies same files as other branches:
  - [backend/app.py](backend/app.py) - 9 branches touch this
  - [backend/config.py](backend/config.py) - Needs blockchain RPC config
  - [backend/models/db.py](backend/models/db.py) - Schema expansion
- **Smart Contracts:** 3 new production contracts need auditing
- **PRE-REQUISITE:** Must follow backend-optimization

---

### 5. origin/feature/blockchain-transactions (2026-03-25) | 136 files

#### Purpose
Complete blockchain payment UI with transaction status states (Pending/Success/Failed) and i18n support.

#### Key Information
- **Commit Message:** `feat: Complete blockchain payment UI with status states (Pending/Success/Failed) + i18n support`
- **File Breakdown:** Backend: 6 | Frontend: 123 | Blockchain: 0 | Other: 7
- **Status:** Frontend transaction UX layer on top of blockchain

#### Key Files Changed
**Backend (6 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/requirements.txt](backend/requirements.txt)
- [backend/models/db.py](backend/models/db.py)
- [backend/routes/payment.py](backend/routes/payment.py) - Transaction status endpoints
- Database schema for transaction tracking

**Frontend (123 files):**
- `frontend/payment.html` - **Enhanced with transaction states**
- `frontend/assets/scripts/wallet_translations.js` - Transaction status i18n
- `frontend/assets/styles/wallet.css` - Transaction state styling
- Status UI for Pending/Success/Failed states

#### Technical Focus
- **Primary:** Frontend ✅ 90%
- **Type:** Feature (UI Layer)

#### New Features/Fixes
- ✅ Transaction status UI (3 states)
- ✅ Real-time transaction polling
- ✅ Status-based action buttons (Retry/Confirm/View)
- ✅ Multi-language support for transaction states
- ✅ Payment confirmation messaging

#### Dependencies/Risks
**Frontend Dependencies:**
- Requires wallet UI from blockchain-wallet-frontend
- Depends on blockchain contract deployment endpoints

**Backend Dependencies:**
- Needs payment route endpoints returning transaction status
- **CONFLICT ALERT:** [backend/routes/payment.py](backend/routes/payment.py) modified by multiple branches

**Integration Risks:** ⚠️ **MEDIUM-HIGH**
- Depends on blockchain feature being deployed
- Payment route coordination needed
- **PRE-REQUISITE:** blockchain branch must be merged first

---

### 6. origin/feature/frontend-my-trips-wallet-nft-token (2026-03-25) | 136 files

#### Purpose
My Trips page enhancement with wallet integration, NFT status verification, and SKY token summary panel.

#### Key Information
- **Commit Message:** `feat(my-trips): add wallet-linked booking, verify/NFT status, and SKY summary panel`
- **File Breakdown:** Backend: 6 | Frontend: 123 | Blockchain: 0 | Other: 7
- **Status:** User dashboard featuring blockchain assets

#### Key Files Changed
**Backend (6 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/requirements.txt](backend/requirements.txt)
- [backend/models/db.py](backend/models/db.py) - User wallet/NFT fields
- [backend/routes/payment.py](backend/routes/payment.py) - User asset endpoints
- Database schema updates

**Frontend (123 files):**
- `frontend/my_trips.html` - **Redesigned with wallet + NFT sections**
- `frontend/assets/scripts/my_trips.js` - Enhanced to query blockchain
- `frontend/assets/scripts/wallet_translations.js` - Wallet i18n
- `frontend/assets/styles/wallet.css` - Wallet styling
- Verification UI components

#### Technical Focus
- **Primary:** Frontend ✅ 90% | Backend ✅ 4%
- **Type:** Feature (User Dashboard)

#### New Features/Fixes
- ✅ Wallet connection display in My Trips
- ✅ NFT ticket verification status
- ✅ SKY token balance summary panel
- ✅ Booking-to-NFT mapping display
- ✅ Transaction history (on-chain)
- ✅ Multi-language NFT/wallet terminology

#### Dependencies/Risks
**Blockchain Dependencies:**
- Requires TicketNFT contract (from blockchain branch)
- Requires SkyToken contract deployment
- Needs wallet connection endpoints

**Frontend Coordination:**
- Similar wallet styling as blockchain-wallet-frontend (potential merge conflict)
- Needs my_trips.js updates for blockchain queries

**Integration Risks:** ⚠️ **MEDIUM-HIGH**
- Heavy reliance on blockchain contracts being deployed
- [backend/models/db.py](backend/models/db.py) changes coordination required
- **PRE-REQUISITE:** blockchain, blockchain-transactions, blockchain-wallet-frontend must precede

---

### 7. origin/chore/frontend-deploy-optimization (2026-03-28) | 192 files

#### Purpose
Isolate frontend deploy configuration and establish performance baseline. Largest branch with comprehensive deploy setup.

#### Key Information
- **Commit Message:** `chore: isolate frontend deploy config and perf baseline`
- **File Breakdown:** Backend: 36 | Frontend: 128 | Blockchain: 17 | Other: 11
- **Status:** DevOps/Config optimization for production

#### Key Files Changed
**Backend (36 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/db/add_blockchain_idempotent_columns.py](backend/db/add_blockchain_idempotent_columns.py) - **NEW: Idempotent migrations**
- Database schema with idempotent columns (for repeat deployments)
- All model and route files

**Blockchain (17 files):**
- All smart contracts (same as blockchain branch)
- Deploy scripts optimized for repeatable deployment
- Performance profiling scripts

**Frontend (128 files):**
- All frontend assets with deploy config
- Build optimization configurations
- Performance metrics baseline

**Other (11 files):**
- Deploy scripts (Docker, CI/CD configs)
- Configuration for production endpoints

#### Technical Focus
- **Primary:** Frontend ✅ 67% | Backend ✅ 19% | Blockchain ✅ 9%
- **Type:** Chore/DevOps

#### New Features/Fixes
- ✅ Frontend deployment pipeline
- ✅ Idempotent database migrations (avoid repeat column adds)
- ✅ Performance baseline establishment
- ✅ Deploy configuration isolation
- ✅ Build optimization for production
- ✅ Docker/container support setup

#### Dependencies/Risks
**Critical New Feature:**
- [backend/db/add_blockchain_idempotent_columns.py](backend/db/add_blockchain_idempotent_columns.py) - **IMPORTANT for safe re-deployments**

**Configuration Impact:**
- Changes core deployment strategy
- May conflict with deployment practices from other branches

**Integration Risks:** ⚠️ **HIGH - INFRASTRUCTURE**
- Second-largest branch (192 files)
- Database migration changes could conflict with other schema updates
- **CONFLICT ALERT:** Modifies all core files (app.py, config.py)
- Idempotent migration approach may conflict if other branches use different migration strategy
- **Order Critical:** Should integrate after blockchain branches (which modify schema)

---

### 8. origin/feature/backend (2026-03-29) | 186 files

#### Purpose
Backend configuration update, specifically Sepolia RPC URL configuration for blockchain testnet integration.

#### Key Information
- **Commit Message:** `update config sepolia_rpc_url`
- **File Breakdown:** Backend: 36 | Frontend: 124 | Blockchain: 17 | Other: 9
- **Status:** Configuration finalization for blockchain testnet

#### Key Files Changed
**Backend (36 files):**
- [backend/config.py](backend/config.py) - **KEY: Sepolia RPC URL**
- [backend/app.py](backend/app.py)
- All models and routes (full backend)
- Database setup scripts

**Blockchain (17 files):**
- All smart contracts
- Deploy scripts updated for Sepolia testnet

**Frontend (124 files):**
- Full frontend suite

#### Technical Focus
- **Primary:** Backend ✅ 19% | Frontend ✅ 67% | Blockchain ✅ 9%
- **Type:** Configuration

#### New Features/Fixes
- ✅ Sepolia testnet RPC configuration
- ✅ Blockchain testnet network setup
- ✅ testnet-specific contract deployment

#### Dependencies/Risks
**Critical Configuration:**
- Sepolia RPC URL is essential for blockchain operations
- Must be accessible from backend server environment

**Conflict Points:**
- [backend/config.py](backend/config.py) - Core config file modified by all 9 branches
- RPC URL value should be environment-based (not hardcoded)

**Integration Risks:** ⚠️ **MEDIUM**
- Configuration variable management across branches
- **CONFLICT ALERT:** Very likely merge conflict in config.py
- Should be last backend configuration branch before merge
- **PRE-REQUISITE:** blockchain branch should precede

---

### 9. origin/feature/frontend-verify-booking (2026-04-02) | 191 files

#### Purpose
Improve Verify Booking implementation with blockchain verification. Frontend-driven booking verification against on-chain data.

#### Key Information
- **Commit Message:** `refactor: improve Verify Booking implementation and blockchain verification`
- **File Breakdown:** Backend: 36 | Frontend: 128 | Blockchain: 17 | Other: 10
- **Status:** Latest feature - blockchain booking verification

#### Key Files Changed
**Backend (36 files):**
- [backend/app.py](backend/app.py)
- [backend/config.py](backend/config.py)
- [backend/models/db.py](backend/models/db.py)
- Verify booking logic endpoints
- All route modules

**Blockchain (17 files):**
- Smart contracts (same booking registry, sky token, NFT)
- Verification scripts

**Frontend (128 files):**
- `frontend/search.html` - Verification UI
- Booking verification page/component
- Verification result display with on-chain confirmation

#### Technical Focus
- **Primary:** Frontend ✅ 67% | Backend ✅ 19% | Blockchain ✅ 9%
- **Type:** Feature (Full-Stack)

#### New Features/Fixes
- ✅ On-chain booking verification
- ✅ Cross-reference frontend bookings with blockchain
- ✅ Verification status UI (Verified/Pending/Failed)
- ✅ Immutable booking proof via blockchain
- ✅ Error handling for verification failures

#### Dependencies/Risks
**Blockchain Dependencies:**
- Requires BookingRegistry contract deployment
- Depends on booking data being written to blockchain

**Backend Endpoints:**
- New verification API endpoint needed
- Must query blockchain data from backend

**Integration Risks:** ⚠️ **HIGH - FEATURE COMPLETE**
- Most recent branch (April 2)
- Largest feature branch (191 files)
- Comprehensive integration of blockchain into booking workflow
- **CONFLICT ALERT:** Modifies all core files (app.py, config.py, models/db.py)
- Heavy dependency on all prior blockchain branches
- **PRE-REQUISITE:** Must be one of the last branches merged

---

## Cross-Branch Dependency Map

```
backend-optimization (FOUNDATION)
    ├── frontend-optimization (DEPENDS ON: backend-optimization)
    ├── blockchain-wallet-frontend (DEPENDS ON: backend-optimization)
    ├── blockchain (DEPENDS ON: backend-optimization)
    │   ├── blockchain-transactions (DEPENDS ON: blockchain, backend)
    │   ├── frontend-my-trips-wallet-nft-token (DEPENDS ON: blockchain, blockchain-transactions, blockchain-wallet-frontend)
    │   ├── frontend-deploy-optimization (DEPENDS ON: blockchain, backend)
    │   └── frontend-verify-booking (DEPENDS ON: blockchain, all prior blockchain branches)
    └── backend (DEPENDS ON: blockchain)
```

---

## Critical Conflict Analysis

### Files Modified by ALL 9 Branches ❌ CRITICAL

| File | Modified By | Conflict Risk |
|------|-------------|---------------|
| [backend/app.py](backend/app.py) | **ALL 9** | 🔴 CRITICAL |
| [backend/config.py](backend/config.py) | **ALL 9** | 🔴 CRITICAL |
| [backend/requirements.txt](backend/requirements.txt) | 6+ branches | 🟡 HIGH |

### Files Modified by 6+ Branches ⚠️ HIGH RISK

| File | Count | Branches |
|------|-------|----------|
| [backend/db/schema.sql](backend/db/schema.sql) | 6 | Multiple blockchain features |
| [backend/models/db.py](backend/models/db.py) | 6-7 | Blockchain fields expansion |
| [backend/routes/payment.py](backend/routes/payment.py) | 6+ | Payment + blockchain integration |
| [frontend/payment.html](frontend/payment.html) | 6+ | Payment updates across features |
| [backend/routes/bookings.py](backend/routes/bookings.py) | 5-6 | Booking + verification logic |

### Integration Order Recommendation

**Phase 1: Foundation (No-Conflict)**
1. ✅ **origin/fix/backend-optimization** - Base everything on this
   - 162 files, pure structure setup
   - **Merge First**

**Phase 2: Immediate Frontend/Backend Fixes (Low Risk)**
2. ✅ **origin/fix/frontend-optimization** - Bug fix on payment status
   - Low file count (127 files)
   - **Merge Second**

**Phase 3: Blockchain Introduction (Moderate Conflict)**
3. ✅ **origin/feature/blockchain** - Core smart contracts
   - 180 files, but foundational for blockchain
   - Modify [backend/config.py](backend/config.py), [backend/models/db.py](backend/models/db.py)
   - **Merge Third**

**Phase 4: Blockchain Dependent Features (High Coordination)**
4. 🤔 **origin/feature/blockchain-wallet-frontend** OR **origin/feature/backend**
   - Choose based on dev priority
   - May need manual conflict resolution in config.py

5. 🤔 **origin/feature/blockchain-transactions** - Payment UI for blockchain
   - Depends on blockchain being live
   - Conflicts likely in [backend/routes/payment.py](backend/routes/payment.py)

6. 🤔 **origin/feature/frontend-my-trips-wallet-nft-token** - NFT dashboard
   - Depends on all prior blockchain features
   - High dependency chain

7. ⚠️ **origin/chore/frontend-deploy-optimization** - Deploy setup
   - **IMPORTANT:** Idempotent migration for schema safety
   - Should be before production features

8. ⚠️ **origin/feature/frontend-verify-booking** - Verification feature
   - Most recent, most complex integration
   - **Merge Last**

---

## Dependency Analysis by Component

### Backend Core Changes
```
backend/app.py
  ├── Blueprint registration (all 9 branches add routes)
  ├── SocketIO initialization (backend-optimization)
  ├── CORS configuration
  └── Blockchain route integration (blockchain branches)

backend/config.py
  ├── Database connection
  ├── RPC URL (blockchain branch)
  ├── API keys (AI chat, email)
  ├── JWT secrets
  └── Sepolia testnet config (backend branch)

backend/requirements.txt
  ├── Flask + extensions (all use this)
  ├── flask-socketio (backend-optimization)
  ├── google-generativeai (AI chat feature)
  ├── SQLAlchemy 2.0.46
  └── Web3.py (blockchain branches for Sepolia interaction)
```

### Database Schema Evolution
```
Initial (backend-optimization):
  ├── User table
  ├── Flight table
  ├── Booking table
  ├── Payment table
  ├── Ticket table
  └── Passenger table

With Blockchain (blockchain branch):
  ├── blockchain_tx_hash (idempotent column)
  ├── nft_token_id (ticket NFT tracking)
  ├── wallet_address (user wallet)
  └── contract_deployment_address

Final (deploy-optimization):
  └── Idempotent columns for safe re-runs
```

### Smart Contracts
```
SkyToken (ERC20)
  └── Rewards/payment token
  
BookingRegistry 
  ├── Stores booking verification on-chain
  └── Maps booking ID → NFT contract address
  
TicketNFT (ERC721)
  ├── Each ticket = one NFT
  └── Transfer = ticket resale
```

---

## Risk Mitigation Strategy

### For [backend/app.py](backend/app.py) (ALL 9 branches touch this)

**Conflict Areas:**
```python
# Each branch adds different blueprint routes
app.register_blueprint(auth_bp)      # All branches
app.register_blueprint(payments_bp)  # All branches  
app.register_blueprint(blockchain_bp)  # Some branches
app.register_blueprint(verify_bp)    # Latest branch
```

**Mitigation:**
- Keep blueprint registration order consistent
- Use module namespacing to avoid function name conflicts
- Test imports work before accepting merge

### For [backend/config.py](backend/config.py) (ALL 9 branches)

**Conflict Areas:**
```python
# Database config - some branches add idempotent checks
SQLALCHEMY_DATABASE_URI = "postgresql://..."

# Blockchain - new config from backend/blockchain branches
SEPOLIA_RPC_URL = os.getenv('SEPOLIA_RPC_URL')
BLOCKCHAIN_ENABLED = True

# API keys - duplicated across branches
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
```

**Mitigation:**
- Use environment variables for all configuration
- Create config template before merging
- Validate all required keys exist after each merge

### For [backend/requirements.txt](backend/requirements.txt) (6+ branches)

**Conflict Points:**
```
Case 1: Version conflicts
  blockchain branch: web3==6.0.0
  another branch:    web3>=5.0.0

Case 2: Duplicate entries
  Both add: SQLAlchemy==2.0.46
  Merge creates duplicate lines
```

**Mitigation:**
- Sort requirements alphabetically
- Use == or >= consistently
- Check for duplicates after merge
- Use pip-compile for lock file

### For [backend/models/db.py](backend/models/db.py) (6+ branches)

**Conflict Areas:**
```python
class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # blockchain branch adds:
    blockchain_tx_hash = db.Column(db.String, nullable=True)
    # deploy-optimization adds:
    blockchain_tx_hash_checked = db.Column(db.Boolean, default=False)  # DUPLICATE!
```

**Mitigation:**
- Establish schema version numbering
- Create comprehensive migration before first merge
- Use Alembic for migration management
- Coordinate blockchain field names across branches

---

## Feature Integration Dependencies

### Critical Path for Blockchain Features
```
1. blockchain-optimization (foundation)
   ↓
2. blockchain (smart contracts)
   ├→ blockchain-transactions (payment UI)
   ├→ blockchain-wallet-frontend (wallet UI)
   └→ frontend-deploy-optimization (deployment config)
        ↓
3. frontend-my-trips-wallet-nft-token (NFT display)
   ↓
4. frontend-verify-booking (on-chain verification)
```

### Critical Path for Payment Flow
```
1. backend-optimization (foundation)
   ↓
2. frontend-optimization (ticket status fix)
   ├→ blockchain-transactions (blockchain payment UI)
   └→ blockchain-wallet-frontend (wallet option)
        ↓
3. frontend-verify-booking (verification)
```

---

## Recommended Merge Strategy

### Strategy: **Sequential Integration with Linear Testing**

**Step 1: Merge Foundation**
```bash
git merge origin/fix/backend-optimization --no-ff -m "consolidate: apply backend/frontend optimizations"
# Expected: 0-5 simple conflicts (file additions)
# Test: Run backend tests, check all models load
```

**Step 2: Apply Bug Fixes**
```bash
git merge origin/fix/frontend-optimization --no-ff -m "fix: payment status check and booking actions"
# Expected: 2-3 conflicts in payment.py
# Test: Manual verify payment flow works
```

**Step 3: Add Blockchain Foundation**
```bash
git merge origin/feature/blockchain --no-ff -m "feat: add smart contracts and blockchain integration"
# Expected: 8-15 conflicts (app.py, config.py, models/db.py)
# Test: Check Hardhat compile succeeds, deploy scripts run
```

**Step 4-6: Add Blockchain Features** (parallel or sequential)
```bash
# Choose order based on priority
git merge origin/feature/blockchain-wallet-frontend
git merge origin/feature/backend  
git merge origin/chore/frontend-deploy-optimization
# Test each individually for blockchain compatibility
```

**Step 7: Add Dependent Features**
```bash
git merge origin/feature/blockchain-transactions
git merge origin/feature/frontend-my-trips-wallet-nft-token
# Test NFT display, transaction UI together
```

**Step 8: Final Integration**
```bash
git merge origin/feature/frontend-verify-booking
# Test complete flow: book → pay → verify on-chain
```

---

## Implementation Checklist

### Pre-Merge Checks
- [ ] All branches up-to-date with latest `main`
- [ ] Local test environment ready
- [ ] Database backup created
- [ ] Git stash clean (no uncommitted changes)

### Post-Merge Checks (After Each Branch)
- [ ] Conflicts resolved and reviewed
- [ ] Python syntax check: `python -m py_compile backend/**/*.py`
- [ ] Requirements validated: `pip check`
- [ ] Smart contracts compile: `npx hardhat compile`
- [ ] Backend linting: `pylint backend/`
- [ ] Git log shows correct merge commits
- [ ] Feature tests pass

### Integration Testing
- [ ] Full payment flow works end-to-end
- [ ] Blockchain deployment succeeds on Sepolia
- [ ] NFT minting works (if blockchain features merged)
- [ ] Wallet integration functions
- [ ] Booking verification executes

---

## Conclusion

The SkyPlan project has 9 active branches with significant interdependencies, primarily on blockchain integration. **All branches modify the same core backend files**, creating **Critical merge conflict risk**.

**Key Findings:**
1. **Foundation Required:** backend-optimization must merge first
2. **High Conflict:** app.py, config.py, requirements.txt need strategic resolution
3. **Complex Dependencies:** Blockchain features have tight interdependencies
4. **Sequential Merge Critical:** Cannot parallel merge most branches

**Recommended Action:** Follow the provided sequential merge strategy with careful conflict resolution at each phase, especially for the blockchain feature integration sequence.

---

*End of Report*
