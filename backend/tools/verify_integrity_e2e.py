from __future__ import annotations

import argparse
import json
from typing import Any

from backend.app import create_app
from backend.models.db import get_session
from backend.models.booking import Booking, FareClass
from backend.models.user import User


def _pick_tampered_fare(current: FareClass) -> FareClass:
    candidates = [FareClass.ECONOMY, FareClass.PREMIUM_ECONOMY, FareClass.BUSINESS]
    for item in candidates:
        if item != current:
            return item
    return FareClass.BUSINESS


def _extract_integrity(payload: dict[str, Any]) -> dict[str, Any]:
    integrity = payload.get("integrity") or payload.get("on_chain", {}).get("integrity") or {}
    return {
        "is_match": integrity.get("is_match"),
        "message": integrity.get("message"),
        "stored_state_hash": integrity.get("stored_state_hash"),
        "current_state_hash": integrity.get("current_state_hash"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="E2E test for booking integrity verification")
    parser.add_argument("--booking-code", required=True, help="Booking code to verify")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        session = get_session()
        booking = session.query(Booking).filter_by(booking_code=args.booking_code).first()
        if not booking:
            print(json.dumps({"ok": False, "error": "booking_not_found", "booking_code": args.booking_code}, ensure_ascii=False))
            session.close()
            return

        if not booking.user_id:
            print(json.dumps({"ok": False, "error": "booking_has_no_user", "booking_code": booking.booking_code}, ensure_ascii=False))
            session.close()
            return

        user = session.query(User).filter_by(id=booking.user_id).first()
        if not user:
            print(json.dumps({"ok": False, "error": "user_not_found", "booking_code": booking.booking_code}, ensure_ascii=False))
            session.close()
            return

        token = user.generate_auth_token()
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        client = app.test_client()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        original_fare = booking.fare_class
        tampered_fare = _pick_tampered_fare(original_fare)

        baseline_resp = client.post(
            "/api/bookings/blockchain/onchain-hash",
            headers=headers,
            json={"booking_code": booking.booking_code},
        )
        baseline_payload = baseline_resp.get_json(silent=True) or {}

        booking.fare_class = tampered_fare
        session.add(booking)
        session.commit()

        tampered_resp = client.post(
            "/api/bookings/blockchain/onchain-hash",
            headers=headers,
            json={"booking_code": booking.booking_code},
        )
        tampered_payload = tampered_resp.get_json(silent=True) or {}

        booking.fare_class = original_fare
        session.add(booking)
        session.commit()
        session.close()

        result = {
            "ok": True,
            "booking_code": args.booking_code,
            "baseline": {
                "http_status": baseline_resp.status_code,
                "integrity": _extract_integrity(baseline_payload),
            },
            "tampered": {
                "http_status": tampered_resp.status_code,
                "integrity": _extract_integrity(tampered_payload),
            },
            "restored": True,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
