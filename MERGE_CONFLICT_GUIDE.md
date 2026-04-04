# SkyPlan Branch Merge: Conflict Resolution Guide

**Date**: April 4, 2026  
**Purpose**: Strategic guide for resolving merge conflicts across 9 branches

---

## Critical Conflict Hotspots (ALL 9 Branches)

### 1. ⚠️ CRITICAL: backend/app.py

**Problem**: All 9 branches add different blueprints and modify Flask app initialization

**Typical Conflict Pattern**:
```python
# Conflict markers like this:
<<<<<<< HEAD (develop/consolidated-optimizations)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
=======
app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
app.register_blueprint(verify_bp, url_prefix='/api/verify')
>>>>>>> origin/feature/blockchain
```

**Resolution Strategy**:
```python
# Solution: Merge all blueprints, maintain alphabetical order
def create_app():
    app = Flask(__name__)
    
    # ===== CORE ROUTES =====
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(bookings_bp, url_prefix='/api/bookings')
    app.register_blueprint(flights_bp, url_prefix='/api/flights')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    
    # ===== BLOCKCHAIN ROUTES =====
    app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
    app.register_blueprint(verify_bp, url_prefix='/api/verify')
    
    # ===== SUPPORT/UTILITY ROUTES =====
    app.register_blueprint(support_bp, url_prefix='/api/support')
    app.register_blueprint(ai_chat_bp, url_prefix='/api/ai')
    app.register_blueprint(contact_bp, url_prefix='/api/contact')
    
    return app
```

**Merge Decision Tree**:
1. Check for duplicate blueprint registrations → keep first instance
2. Maintain alphabetical order for readability
3. Group by domain (Auth → Core → Blockchain → Support)
4. Verify no `url_prefix` conflicts

---

### 2. 🔴 CRITICAL: backend/config.py

**Problem**: All 9 branches add different configuration variables (API keys, RPC URLs, secrets)

**Typical Conflict Pattern**:
```python
# Feature branch adds:
SEPOLIA_RPC_URL = os.getenv('SEPOLIA_RPC_URL', 'https://sepolia.infura.io/v3/...')
CONTRACT_ADDRESSES = {'token': '0x...', 'booking': '0x...'}

# Meanwhile, another branch adds:
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
EMAIL_CONFIG = {'host': os.getenv('EMAIL_HOST')}
```

**Resolution Strategy**:
```python
"""
SkyPlan Application Configuration
All config from environment variables (.env file)
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ===== DATABASE =====
SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///skyplan.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# ===== JWT & AUTH =====
SECRET_KEY = os.getenv('SECRET_KEY', 'skyplan-secret-key-2025')
JWT_SECRET = os.getenv('JWT_SECRET', SECRET_KEY)
JWT_ALGORITHM = 'HS256'

# ===== PAYMENT: VNPAY =====
VNPAY_TMN_CODE = os.getenv('VNPAY_TMN_CODE')
VNPAY_HASH_SECRET = os.getenv('VNPAY_HASH_SECRET')
VNPAY_RETURN_URL = os.getenv('VNPAY_RETURN_URL')

# ===== BLOCKCHAIN: SEPOLIA TESTNET =====
SEPOLIA_RPC_URL = os.getenv('SEPOLIA_RPC_URL')
BLOCKCHAIN_ENABLED = os.getenv('BLOCKCHAIN_ENABLED', 'false').lower() == 'true'
CONTRACT_ADDRESSES = {
    'sky_token': os.getenv('SKY_TOKEN_ADDRESS'),
    'booking_registry': os.getenv('BOOKING_REGISTRY_ADDRESS'),
    'ticket_nft': os.getenv('TICKET_NFT_ADDRESS'),
}

# ===== AI & EXTERNAL SERVICES =====
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
AI_CHAT_ENABLED = os.getenv('AI_CHAT_ENABLED', 'true').lower() == 'true'

# ===== EMAIL SERVICE =====
MAIL_SERVER = os.getenv('MAIL_SERVER')
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'false').lower() == 'true'
MAIL_USERNAME = os.getenv('MAIL_USERNAME')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')

# ===== DEPLOYMENT =====
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
```

**Merge Decision Tree**:
1. All config from `os.getenv()` calls ✅
2. Group by domain (DATABASE, PAYMENT, BLOCKCHAIN, etc.)
3. Never hardcode sensitive values
4. Provide sensible defaults with `os.getenv('KEY', 'default')`
5. Add comments explaining each section

**Post-Merge Validation**:
```bash
# Verify all keys exist in .env template
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
required = ['SEPOLIA_RPC_URL', 'VNPAY_TMN_CODE', 'GOOGLE_API_KEY']
for key in required:
    if not os.getenv(key):
        print(f'WARNING: {key} not set')
"
```

---

### 3. 🟠 HIGH: backend/requirements.txt

**Problem**: Multiple branches add dependencies, causing duplicates and version conflicts

**Typical Conflict Pattern**:
```
# Branch 1 adds:
SQLAlchemy==2.0.46
web3==6.0.0

# Branch 2 adds:
SQLAlchemy==2.0.46  # DUPLICATE!
web3>=5.0.0          # DIFFERENT VERSION!
```

**Resolution Strategy**:
```txt
# SkyPlan Backend Requirements
# Python 3.10+

# ===== WEB FRAMEWORK =====
Flask==2.3.3
flask-cors==4.0.0
flask-mail==0.10.0
flask-socketio==5.6.0

# ===== DATABASE & ORM =====
SQLAlchemy==2.0.46
psycopg2-binary==2.9.11
alembic==1.12.0

# ===== BLOCKCHAIN & WEB3 =====
web3==6.0.0
eth-account==0.10.0
eth-keys==0.4.0

# ===== EXTERNAL SERVICES =====
google-generativeai==0.3.2
requests==2.31.0

# ===== AUTHENTICATION =====
PyJWT==2.8.0
Werkzeug==2.3.7

# ===== UTILITIES =====
python-dateutil==2.8.2
python-dotenv==1.0.0

# ===== DEVELOPMENT & TESTING =====
pytest==7.4.2
pytest-flask==1.2.0
eventlet==0.40.4
```

**Merge Decision Tree**:
1. Alphabetize within each section
2. Use `==` for all versions (frozen dependencies)
3. Remove duplicates (keep first occurrence)
4. Group related packages with comments
5. Run `pip check` to detect conflicts:
   ```bash
   pip install -r requirements.txt
   pip check
   ```

---

### 4. 🟠 HIGH: backend/models/db.py

**Problem**: Multiple branches add blockchain-related columns, causing duplicates

**Typical Conflict Pattern**:
```python
class Booking(db.Model):
    # Original fields...
    id = db.Column(db.Integer, primary_key=True)
    booking_code = db.Column(db.String(32), unique=True)
    
    # Branch 1 adds:
    blockchain_tx_hash = db.Column(db.String(255), nullable=True)
    
    # Branch 2 ALSO adds:
    blockchain_tx_hash = db.Column(db.String(255), nullable=True)  # DUPLICATE!
    blockchain_tx_confirmed = db.Column(db.Boolean, default=False)
```

**Resolution Strategy**:

Create a **single blockchain fields mixin**:
```python
from sqlalchemy import Column, String, Boolean, DateTime, Integer

class BlockchainMixin:
    """Mixin for blockchain-related fields across all models"""
    
    blockchain_tx_hash = Column(String(255), nullable=True, index=True)
    blockchain_tx_confirmed = Column(Boolean, default=False)
    blockchain_verified_at = Column(DateTime, nullable=True)
    nft_token_id = Column(Integer, nullable=True)  # For TicketNFT
    contract_address = Column(String(255), nullable=True)  # For deployed contracts
```

Then use in models:
```python
class Booking(db.Model, BlockchainMixin):
    __tablename__ = "bookings"
    
    id = db.Column(db.Integer, primary_key=True)
    booking_code = db.Column(db.String(32), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    # ... existing fields ...
    # blockchain fields inherited from mixin


class Ticket(db.Model, BlockchainMixin):
    __tablename__ = "tickets"
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_code = db.Column(db.String(20), unique=True, nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'))
    # ... existing fields ...
    # blockchain fields inherited from mixin
```

**Merge Decision Tree**:
1. Check for duplicate column names → use mixin approach
2. Group blockchain fields logically
3. Add indexes to frequently-queried blockchain fields (tx_hash)
4. Create Alembic migration after merge:
   ```bash
   alembic revision --autogenerate -m "add blockchain fields"
   ```

---

### 5. 🟠 HIGH: backend/routes/payment.py

**Problem**: Payment flow modifications across multiple branches (VNPay, Blockchain, Verification)

**Typical Conflict Pattern**:
```python
# Original route
@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid():
    # ...
    payment.status = 'SUCCESS'

# Branch adds blockchain verification
@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid():
    # ... + blockchain verification logic
    if blockchain_enabled:
        record_to_blockchain(...)

# Another branch adds transaction polling
@payment_bp.route('/mark-paid', methods=['POST'])
def mark_paid():
    # ... + transaction status checking
    transaction = get_transaction_status(...)
```

**Resolution Strategy**:

Establish **payment state machine**:
```python
from enum import Enum

class PaymentStatus(Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    BLOCKCHAIN_PENDING = "BLOCKCHAIN_PENDING"
    BLOCKCHAIN_VERIFIED = "BLOCKCHAIN_VERIFIED"

@payment_bp.route('/create', methods=['POST'])
def create_payment():
    """Create payment and initiate VNPay or blockchain flow"""
    data = request.get_json()
    payment = Payment(
        booking_id=data['booking_id'],
        amount=data['amount'],
        status=PaymentStatus.PENDING.value
    )
    db.session.add(payment)
    
    if use_blockchain:
        return redirect_to_blockchain_payment(payment)
    else:
        return redirect_to_vnpay(payment)

@payment_bp.route('/vnpay/return', methods=['GET'])
def vnpay_return():
    """Handle VNPay callback"""
    # ... verify signature ...
    if successful:
        payment.status = PaymentStatus.SUCCESS.value
        if blockchain_enabled:
            try:
                record_to_blockchain(payment)
                payment.status = PaymentStatus.BLOCKCHAIN_PENDING.value
            except Exception as e:
                logger.error(f"Blockchain recording failed: {e}")
    db.session.commit()

@payment_bp.route('/status/<payment_id>', methods=['GET'])
def get_payment_status(payment_id):
    """Universal payment status endpoint (VNPay + Blockchain)"""
    payment = Payment.query.get(payment_id)
    
    result = {
        'id': payment.id,
        'status': payment.status,
        'provider': payment.provider,
    }
    
    # Add blockchain info if applicable
    if payment.blockchain_tx_hash:
        result['blockchain'] = {
            'tx_hash': payment.blockchain_tx_hash,
            'verified': payment.blockchain_verified
        }
    
    return jsonify(result)

@payment_bp.route('/verify-blockchain/<payment_id>', methods=['POST'])
def verify_blockchain_payment(payment_id):
    """Explicit blockchain verification endpoint"""
    payment = Payment.query.get(payment_id)
    try:
        is_verified = verify_on_chain(payment.blockchain_tx_hash)
        if is_verified:
            payment.status = PaymentStatus.BLOCKCHAIN_VERIFIED.value
            generate_tickets(payment.booking_id)
        db.session.commit()
        return jsonify({'success': True, 'verified': is_verified})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
```

**Merge Decision Tree**:
1. Keep VNPay flow intact (working baseline)
2. Add blockchain as optional feature (controlled by flag)
3. Support both payment methods simultaneously
4. Use payment state machine (Enum) for status tracking
5. Create separate verification endpoint for blockchain

---

## Pre-Merge Checklist

Before executing each merge step:

- [ ] Current branch clean (`git status` shows no changes)
- [ ] Latest remote branches fetched (`git fetch origin`)
- [ ] Current branch up-to-date with main
- [ ] Test environment ready (Python venv, DB, .env)
- [ ] Backup created (or in Git history)

## Post-Merge Checklist (FOR EACH BRANCH)

After resolving conflicts:

- [ ] Python syntax: `python -m py_compile backend/**/*.py`
- [ ] Import check: `python -c "import backend.app; backend.app.create_app()"`
- [ ] Requirements validated: `pip check`
- [ ] Smart contracts: `npx hardhat compile` (if blockchain files added)
- [ ] Config keys exist: All required env vars validated
- [ ] No merge conflict markers remain: `git grep -n '<<<<<<<'`
- [ ] Commit message clear: `git log -1 --oneline`
- [ ] Git history linear: `git log --graph --oneline -10`

## Emergency Rollback

If merge becomes too complex:

```bash
# Option 1: Abort current merge
git merge --abort

# Option 2: Reset to before merge
git reset --hard HEAD

# Option 3: Start fresh branch
git checkout -b conflict-fix-attempt-2
git merge --no-ff origin/target-branch
```

---

## Recommended Git Workflow

### For Each Branch Merge:

```bash
# 1. Prepare
git fetch origin
git checkout develop/consolidated-optimizations

# 2. Merge with no-ff (keeps merge commit)
git merge --no-ff origin/feature/blockchain
# (Resolve conflicts)

# 3. Validate
python -m py_compile backend/**/*.py
pip check
# Run manual tests

# 4. Complete
git add .
git commit -m "merge: integrate feature/blockchain with conflict resolution"

# 5. Review
git log --graph --oneline -5
git diff HEAD~1..HEAD --stat
```

---

**Next Steps**: Start merging in recommended sequence, use this guide for hotspots
