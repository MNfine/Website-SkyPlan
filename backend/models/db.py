"""Database initialization and session management for SkyPlan.

PostgreSQL only - requires DATABASE_URL environment variable.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session, DeclarativeBase

from dotenv import load_dotenv
load_dotenv()


DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is required. Please set it to a valid PostgreSQL connection string.")

if not DATABASE_URL.startswith("postgresql"):
    raise ValueError("Only PostgreSQL is allowed. Please set DATABASE_URL to a valid PostgreSQL connection string.")

print("DATABASE_URL:", DATABASE_URL)


class Base(DeclarativeBase):
	pass


# Engine config for PostgreSQL
engine_kwargs = {
	"future": True,
	"pool_pre_ping": True,
	"pool_size": 5,
	"max_overflow": 10,
}

# Allow enabling SQL echo via environment variable for debug
SQL_ECHO = os.getenv('SQL_ECHO', 'false').lower() in ('1', 'true', 'yes')
engine = create_engine(DATABASE_URL, echo=SQL_ECHO, **engine_kwargs)

SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True))


def get_session():
	"""Return a scoped session (for manual control)."""
	return SessionLocal()


@contextmanager
def session_scope() -> Iterator:
	"""Provide a transactional scope around a series of operations."""
	session = get_session()
	try:
		yield session
		session.commit()
	except Exception:
		session.rollback()
		raise
	finally:
		session.close()


def init_db():
	"""Create all tables (used at startup) and apply migrations."""
	from .payments import Payment  # noqa: F401  ensure models imported
	from .flights import Flight  # noqa: F401
	from .passenger import Passenger  # noqa: F401
	from .sky_voucher import SkyVoucher  # noqa: F401
	Base.metadata.create_all(bind=engine)
	
	# Apply migrations/alter tables if needed
	_apply_migrations()


def _apply_migrations():
	"""Apply database migrations/alterations."""
	from sqlalchemy import text, inspect
	
	with engine.connect() as conn:
		inspector = inspect(engine)
		
		# Check if users table exists
		if 'users' in inspector.get_table_names():
			users_columns = [col['name'] for col in inspector.get_columns('users')]
			
			# Add wallet_address column if missing
			if 'wallet_address' not in users_columns:
				try:
					conn.execute(text("ALTER TABLE users ADD COLUMN wallet_address VARCHAR(42) UNIQUE"))
					conn.commit()
					print("[DB Migration] Added wallet_address column to users table")
				except Exception as e:
					print(f"[DB Migration] wallet_address column already exists or error: {e}")
					try:
						conn.rollback()
					except:
						pass

			# Add member_tier column if missing
			if 'member_tier' not in users_columns:
				try:
					conn.execute(text("ALTER TABLE users ADD COLUMN member_tier VARCHAR(20) NOT NULL DEFAULT 'Registered'"))
					conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_member_tier ON users(member_tier)"))
					conn.commit()
					print("[DB Migration] Added member_tier column to users table")
				except Exception as e:
					print(f"[DB Migration] member_tier column already exists or error: {e}")
					try:
						conn.rollback()
					except:
						pass

			# Check if bookings table exists
			if 'bookings' in inspector.get_table_names():
				bookings_columns = [col['name'] for col in inspector.get_columns('bookings')]

				if 'booking_state_hash' not in bookings_columns:
					try:
						conn.execute(text("ALTER TABLE bookings ADD COLUMN booking_state_hash VARCHAR(66)"))
						conn.commit()
						print("[DB Migration] Added booking_state_hash column to bookings table")
					except Exception as e:
						print(f"[DB Migration] booking_state_hash column already exists or error: {e}")
						try:
							conn.rollback()
						except:
							pass

				if 'sky_redeemed_amount' not in bookings_columns:
					try:
						conn.execute(text("ALTER TABLE bookings ADD COLUMN sky_redeemed_amount NUMERIC(12,2) NOT NULL DEFAULT 0"))
						conn.commit()
						print("[DB Migration] Added sky_redeemed_amount column to bookings table")
					except Exception as e:
						print(f"[DB Migration] sky_redeemed_amount column already exists or error: {e}")
						try:
							conn.rollback()
						except:
							pass
			
			# Add wallet_nonce column if missing
			if 'wallet_nonce' not in users_columns:
				try:
					conn.execute(text("ALTER TABLE users ADD COLUMN wallet_nonce VARCHAR(64)"))
					conn.commit()
					print("[DB Migration] Added wallet_nonce column to users table")
				except Exception as e:
					print(f"[DB Migration] wallet_nonce column already exists or error: {e}")
					try:
						conn.rollback()
					except:
						pass

		if 'payments' in inspector.get_table_names():
			payments_columns = [col['name'] for col in inspector.get_columns('payments')]
			if 'voucher_code' not in payments_columns:
				try:
					conn.execute(text("ALTER TABLE payments ADD COLUMN voucher_code VARCHAR(40)"))
					conn.execute(text("CREATE INDEX IF NOT EXISTS idx_payments_voucher_code ON payments(voucher_code)"))
					conn.commit()
					print("[DB Migration] Added voucher_code column to payments table")
				except Exception as e:
					print(f"[DB Migration] voucher_code column already exists or error: {e}")
					try:
						conn.rollback()
					except:
						pass

		# Ensure sky_vouchers table exists
		if 'sky_vouchers' not in inspector.get_table_names():
			try:
				conn.execute(text("""
					CREATE TABLE sky_vouchers (
						id SERIAL PRIMARY KEY,
						user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
						code VARCHAR(40) NOT NULL UNIQUE,
						voucher_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
						redeem_type VARCHAR(20) NOT NULL DEFAULT 'discount',
						value NUMERIC(12,2) NOT NULL,
						min_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
						currency VARCHAR(10) NOT NULL DEFAULT 'VND',
						description VARCHAR(255),
						expires_at TIMESTAMP NOT NULL,
						is_used BOOLEAN NOT NULL DEFAULT FALSE,
						used_at TIMESTAMP NULL,
						created_at TIMESTAMP NOT NULL DEFAULT NOW()
					)
				"""))
				conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sky_vouchers_user_id ON sky_vouchers(user_id)"))
				conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sky_vouchers_expires_at ON sky_vouchers(expires_at)"))
				conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sky_vouchers_is_used ON sky_vouchers(is_used)"))
				conn.commit()
				print("[DB Migration] Created sky_vouchers table")
			except Exception as e:
				print(f"[DB Migration] sky_vouchers table creation failed or already exists: {e}")
				try:
					conn.rollback()
				except:
					pass

