"""Normalize seats.status values to uppercase enum-compatible values."""

from __future__ import annotations

from sqlalchemy import text

from backend.models.db import SessionLocal


STATUS_MAP = {
    'available': 'AVAILABLE',
    'temporarily_reserved': 'TEMPORARILY_RESERVED',
    'confirmed': 'CONFIRMED',
    'blocked': 'BLOCKED',
}


def fix_seat_status_case() -> None:
    total_updated = 0

    with SessionLocal() as session:
        for legacy_value, normalized_value in STATUS_MAP.items():
            result = session.execute(
                text(
                    """
                    UPDATE seats
                    SET status = :normalized_value
                    WHERE LOWER(COALESCE(status, '')) = :legacy_value
                    AND status <> :normalized_value
                    """
                ),
                {
                    'legacy_value': legacy_value,
                    'normalized_value': normalized_value,
                },
            )
            updated = result.rowcount or 0
            total_updated += updated
            if updated:
                print(f"[fix_seat_status_case] Updated {updated} rows: {legacy_value} -> {normalized_value}")

        session.commit()

    print(f"[fix_seat_status_case] Done. Total updated rows: {total_updated}")


if __name__ == '__main__':
    fix_seat_status_case()
