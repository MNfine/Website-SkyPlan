-- SkyPlan Database Schema
-- SQLite3 Database for booking and payment management

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    wallet_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    booking_code TEXT UNIQUE NOT NULL,
    flight_code TEXT NOT NULL,
    departure_city TEXT,
    arrival_city TEXT,
    departure_date DATE,
    arrival_date DATE,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Payments table - Tracks all payment transactions
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- vnpay, card, bank, ewallet, blockchain
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    status TEXT DEFAULT 'pending', -- pending, processing, success, failed
    transaction_type TEXT, -- for blockchain: ethereum, usdc, etc.
    
    -- VNPay fields
    vnp_txn_ref TEXT,
    vnp_response_code TEXT,
    
    -- Blockchain fields
    blockchain_tx_hash TEXT UNIQUE,
    blockchain_from_address TEXT,
    blockchain_to_address TEXT,
    blockchain_chain_id TEXT, -- 11155111 for Sepolia
    blockchain_gas_used INTEGER,
    blockchain_gas_price DECIMAL(20, 0),
    blockchain_nonce INTEGER,
    blockchain_confirmations INTEGER DEFAULT 0,
    blockchain_block_number INTEGER,
    blockchain_error_code TEXT, -- reject, insufficient_gas, rpc_error
    blockchain_error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    ticket_number TEXT UNIQUE NOT NULL,
    passenger_name TEXT NOT NULL,
    passenger_email TEXT,
    seat_number TEXT,
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_blockchain_tx_hash ON payments(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
