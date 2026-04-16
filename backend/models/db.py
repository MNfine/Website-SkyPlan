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

