"""Admin wallet blockchain integration for post-payment flow."""
from __future__ import annotations

from decimal import Decimal
import os
from typing import Any, Dict

from web3 import Web3
from eth_account import Account


BOOKING_REGISTRY_WRITE_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "bookingCode", "type": "string"},
            {"internalType": "bytes32", "name": "bookingHash", "type": "bytes32"},
        ],
        "name": "recordBooking",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

TICKET_NFT_WRITE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "bookingCode", "type": "string"},
            {"internalType": "string", "name": "tokenURI_", "type": "string"},
        ],
        "name": "mintTicket",
        "outputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]

SKY_TOKEN_WRITE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "account", "type": "address"},
            {"internalType": "bool", "name": "isAllowed", "type": "bool"},
        ],
        "name": "setAllowed",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "string", "name": "bookingCode", "type": "string"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
        ],
        "name": "mintForBooking",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


def _get_env() -> Dict[str, str]:
    return {
        "rpc_url": os.getenv("SEPOLIA_RPC_URL", "").strip(),
        "private_key": os.getenv("PRIVATE_KEY", "").strip(),
        "booking_registry": os.getenv("BOOKING_REGISTRY_ADDRESS", "").strip(),
        "ticket_nft": os.getenv("TICKET_NFT_ADDRESS", "").strip(),
        "sky_token": os.getenv("SKY_TOKEN_ADDRESS", "").strip(),
        "reward_amount": os.getenv("SKY_REWARD_AMOUNT", "100").strip(),
    }


def _validate_required(config: Dict[str, str]) -> tuple[bool, str]:
    required = ["rpc_url", "private_key", "booking_registry", "ticket_nft", "sky_token"]
    missing = [key for key in required if not config.get(key)]
    if missing:
        return False, f"Missing blockchain config: {', '.join(missing)}"

    for key in ["booking_registry", "ticket_nft", "sky_token"]:
        if not Web3.is_address(config[key]):
            return False, f"Invalid address in config: {key}={config[key]}"

    pk = config["private_key"]
    if not pk.startswith("0x"):
        pk = "0x" + pk
    if len(pk) != 66:
        return False, "Invalid PRIVATE_KEY length"

    return True, "ok"


def _get_w3_and_signer(config: Dict[str, str]) -> tuple[Web3, Any]:
    w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
    if not w3.is_connected():
        raise RuntimeError("Cannot connect to Sepolia RPC")

    pk = config["private_key"]
    if not pk.startswith("0x"):
        pk = "0x" + pk
    signer = Account.from_key(pk)
    return w3, signer


def _send_tx(w3: Web3, signer: Any, function_call, nonce: int, gas_limit: int = 500000) -> str:
    tx = function_call.build_transaction(
        {
            "from": signer.address,
            "nonce": nonce,
            "chainId": w3.eth.chain_id,
            "gas": gas_limit,
            "gasPrice": w3.eth.gas_price,
        }
    )
    signed = signer.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=240)
    if receipt.get("status") != 1:
        raise RuntimeError(f"On-chain tx failed: {tx_hash.hex()}")
    return tx_hash.hex()


def run_post_payment_blockchain_flow(booking, token_uri: str | None = None) -> Dict[str, Any]:
    """
    Execute admin-wallet flow after payment success:
    1) recordBooking
    2) mintTicket
    3) setAllowed + mintForBooking

    Uses idempotency flags on booking:
    - onchain_recorded
    - nft_minted
    - sky_minted
    """
    result: Dict[str, Any] = {
        "success": False,
        "steps": {
            "record_booking": {"executed": False, "tx_hash": None, "message": None},
            "mint_nft": {"executed": False, "tx_hash": None, "message": None},
            "mint_sky": {"executed": False, "tx_hash": None, "message": None},
        },
    }

    if not booking:
        result["message"] = "Booking is required"
        return result

    if not booking.wallet_address:
        result["message"] = "Booking missing wallet_address"
        return result

    if not booking.booking_hash:
        result["message"] = "Booking missing booking_hash"
        return result

    if not Web3.is_address(booking.wallet_address):
        result["message"] = "Invalid booking wallet_address"
        return result

    config = _get_env()
    valid, validate_message = _validate_required(config)
    if not valid:
        result["message"] = validate_message
        return result

    if not token_uri:
        token_uri = f"https://skyplan.local/api/metadata/ticket/{booking.booking_code}.json"

    try:
        w3, signer = _get_w3_and_signer(config)

        registry = w3.eth.contract(
            address=Web3.to_checksum_address(config["booking_registry"]),
            abi=BOOKING_REGISTRY_WRITE_ABI,
        )
        ticket_nft = w3.eth.contract(
            address=Web3.to_checksum_address(config["ticket_nft"]),
            abi=TICKET_NFT_WRITE_ABI,
        )
        sky_token = w3.eth.contract(
            address=Web3.to_checksum_address(config["sky_token"]),
            abi=SKY_TOKEN_WRITE_ABI,
        )

        checksum_wallet = Web3.to_checksum_address(booking.wallet_address)
        nonce = w3.eth.get_transaction_count(signer.address, "pending")

        if not bool(getattr(booking, "onchain_recorded", False)):
            tx_hash = _send_tx(
                w3,
                signer,
                registry.functions.recordBooking(booking.booking_code, booking.booking_hash),
                nonce,
                gas_limit=350000,
            )
            nonce += 1
            booking.onchain_recorded = True
            booking.onchain_record_tx_hash = tx_hash
            result["steps"]["record_booking"] = {
                "executed": True,
                "tx_hash": tx_hash,
                "message": "Recorded booking on-chain",
            }
        else:
            result["steps"]["record_booking"]["message"] = "Skipped (already recorded)"

        if not bool(getattr(booking, "nft_minted", False)):
            tx_hash = _send_tx(
                w3,
                signer,
                ticket_nft.functions.mintTicket(checksum_wallet, booking.booking_code, token_uri),
                nonce,
                gas_limit=500000,
            )
            nonce += 1
            booking.nft_minted = True
            booking.nft_mint_tx_hash = tx_hash
            result["steps"]["mint_nft"] = {
                "executed": True,
                "tx_hash": tx_hash,
                "message": "Minted ticket NFT",
            }
        else:
            result["steps"]["mint_nft"]["message"] = "Skipped (already minted)"

        if not bool(getattr(booking, "sky_minted", False)):
            allow_tx = _send_tx(
                w3,
                signer,
                sky_token.functions.setAllowed(checksum_wallet, True),
                nonce,
                gas_limit=150000,
            )
            nonce += 1

            amount_human = Decimal(config.get("reward_amount") or "100")
            amount_wei = int(amount_human * (10 ** 18))

            mint_tx = _send_tx(
                w3,
                signer,
                sky_token.functions.mintForBooking(checksum_wallet, booking.booking_code, amount_wei),
                nonce,
                gas_limit=400000,
            )
            nonce += 1

            booking.sky_minted = True
            booking.sky_mint_tx_hash = mint_tx
            result["steps"]["mint_sky"] = {
                "executed": True,
                "tx_hash": mint_tx,
                "message": f"setAllowed tx={allow_tx}; minted {amount_human} SKY",
            }
        else:
            result["steps"]["mint_sky"]["message"] = "Skipped (already minted)"

        result["success"] = True
        result["message"] = "Blockchain post-payment flow completed"
        return result

    except Exception as e:
        result["message"] = str(e)
        return result
