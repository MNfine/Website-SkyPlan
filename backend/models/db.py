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
	"""Create all tables (used at startup)."""
	from .payments import Payment  # noqa: F401  ensure models imported
	from .flights import Flight  # noqa: F401
	from .passenger import Passenger  # noqa: F401
	Base.metadata.create_all(bind=engine)

