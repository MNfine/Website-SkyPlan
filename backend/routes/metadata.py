from __future__ import annotations

from flask import Blueprint, jsonify

from backend.models.db import session_scope
from backend.models.booking import Booking
from backend.config import BlockchainConfig

metadata_bp = Blueprint('metadata', __name__)


@metadata_bp.route('/ticket/<booking_code>.json', methods=['GET'])
def ticket_metadata(booking_code: str):
    """Public NFT metadata for a booking.

    Keep metadata minimal and avoid personally identifiable information.
    """
    booking_code = (booking_code or '').strip()
    if not booking_code:
        return jsonify({'success': False, 'message': 'Missing booking_code'}), 400

    with session_scope() as session:
        booking = session.query(Booking).filter_by(booking_code=booking_code).first()
        if not booking:
            return jsonify({'success': False, 'message': 'Not found'}), 404

        outbound = None
        try:
            outbound = booking.outbound_flight.as_dict() if booking.outbound_flight else None
        except Exception:
            outbound = None

        attributes = [
            {'trait_type': 'Booking Code', 'value': booking.booking_code},
            {'trait_type': 'Status', 'value': booking.status.name if booking.status else None},
            {'trait_type': 'Passenger Count', 'value': len(booking.passengers or []) if hasattr(booking, 'passengers') else None},
        ]

        if outbound:
            attributes.extend([
                {'trait_type': 'Flight Number', 'value': outbound.get('flight_number')},
                {'trait_type': 'Airline', 'value': outbound.get('airline')},
                {'trait_type': 'From', 'value': outbound.get('departure_airport')},
                {'trait_type': 'To', 'value': outbound.get('arrival_airport')},
                {'display_type': 'date', 'trait_type': 'Departure Time', 'value': _iso_to_unix(outbound.get('departure_time'))},
            ])

        payload = {
            'name': f"SkyPlan Ticket #{booking.booking_code}",
            'description': 'Blockchain-verified ticket for a SkyPlan booking.',
            'attributes': [a for a in attributes if a.get('value') is not None],
        }

        return jsonify(payload), 200


def _iso_to_unix(iso_str: str | None):
    if not iso_str:
        return None
    try:
        from datetime import datetime

        dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        return int(dt.timestamp())
    except Exception:
        return None


@metadata_bp.route('/blockchain-config', methods=['GET'])
def blockchain_config():
    """Get blockchain contract addresses for frontend.
    
    This endpoint returns the contract addresses deployed on Sepolia testnet
    that the frontend needs to interact with smart contracts.
    """
    return jsonify({
        'success': True,
        'data': {
            'bookingRegistryAddress': BlockchainConfig.BOOKING_REGISTRY_ADDRESS,
            'ticketNFTAddress': BlockchainConfig.TICKET_NFT_ADDRESS,
            'skyTokenAddress': BlockchainConfig.SKY_TOKEN_ADDRESS,
            'sepoliaChainId': '11155111',
            'sepoliaChainIdHex': '0xaa36a7',
        },
        'configured': BlockchainConfig.is_configured(),
    }), 200
