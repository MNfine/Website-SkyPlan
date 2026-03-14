"""Add blockchain idempotency columns to bookings table (safe, idempotent)."""
from __future__ import annotations

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv


root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(root_dir, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")


def main() -> None:
    engine = create_engine(DATABASE_URL)

    statements = [
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS onchain_recorded BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS nft_minted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sky_minted BOOLEAN NOT NULL DEFAULT FALSE;",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS onchain_record_tx_hash VARCHAR(66);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS nft_mint_tx_hash VARCHAR(66);",
        "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sky_mint_tx_hash VARCHAR(66);",
    ]

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))

    print("✅ Added/verified blockchain idempotent columns in bookings table")


if __name__ == "__main__":
    main()
