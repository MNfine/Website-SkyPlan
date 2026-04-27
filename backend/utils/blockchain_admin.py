"""Admin wallet blockchain integration for post-payment flow."""
from __future__ import annotations

from decimal import Decimal
import os
from typing import Any, Dict
from pathlib import Path

from web3 import Web3
from web3.logs import DISCARD
from eth_account import Account
from flask import current_app, has_app_context
from dotenv import load_dotenv

from backend.models.booking import Booking, BookingStatus


def _log_info(message: str) -> None:
    if has_app_context():
        current_app.logger.info(message)
        return
    print(message)


def _log_warning(message: str) -> None:
    if has_app_context():
        current_app.logger.warning(message)
        return
    print(message)


def _log_error(message: str) -> None:
    if has_app_context():
        current_app.logger.error(message)
        return
    print(message)


def _member_tier_from_earned(total_earned: Decimal) -> str:
    if total_earned >= Decimal('3000'):
        return 'Platinum'
    if total_earned >= Decimal('1000'):
        return 'Gold'
    if total_earned >= Decimal('500'):
        return 'Silver'
    return 'Registered'


def _sky_reward_for_tier(member_tier: str) -> Decimal:
    reward_map = {
        'Registered': Decimal('100'),
        'Silver': Decimal('110'),
        'Gold': Decimal('120'),
        'Platinum': Decimal('150'),
    }
    return reward_map.get(member_tier, Decimal('100'))


def _calculate_tier_from_total_earned(total_earned: Decimal) -> str:
    if total_earned >= Decimal('3000'):
        return 'Platinum'
    if total_earned >= Decimal('1000'):
        return 'Gold'
    if total_earned >= Decimal('500'):
        return 'Silver'
    return 'Registered'


def _calculate_booking_sky_reward(booking) -> tuple[Decimal, str]:
    total_earned = Decimal('0')

    user = getattr(booking, 'user', None)
    bookings = getattr(user, 'bookings', None) if user is not None else None

    if bookings is not None:
        for item in bookings:
            if getattr(item, 'id', None) == getattr(booking, 'id', None):
                continue
            if not bool(getattr(item, 'sky_minted', False)):
                continue
            try:
                total_earned += Decimal(str(getattr(item, 'sky_reward_amount', 0) or 0))
            except Exception:
                continue

    member_tier = _calculate_tier_from_total_earned(total_earned)
    return _sky_reward_for_tier(member_tier), member_tier


def _calculate_user_tier(user) -> tuple[str, Decimal, Decimal]:
    total_earned = Decimal('0')
    total_redeemed = Decimal('0')

    bookings = getattr(user, 'bookings', None) if user is not None else None
    if bookings is not None:
        for item in bookings:
            if not bool(getattr(item, 'sky_minted', False)):
                continue
            try:
                total_earned += Decimal(str(getattr(item, 'sky_reward_amount', 0) or 0))
                total_redeemed += Decimal(str(getattr(item, 'sky_redeemed_amount', 0) or 0))
            except Exception:
                continue

    return _calculate_tier_from_total_earned(total_earned), total_earned, total_redeemed


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
    ,
    {
        "inputs": [
            {"internalType": "string", "name": "bookingCode", "type": "string"},
            {"internalType": "bytes32", "name": "bookingHash", "type": "bytes32"},
            {"internalType": "address", "name": "owner", "type": "address"},
        ],
        "name": "recordBookingFor",
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
    },
    {
        "inputs": [
            {"internalType": "address", "name": "bookingRegistryAddress", "type": "address"}
        ],
        "name": "setRegistry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "to", "type": "address"},
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "bookingCode", "type": "string"},
            {"indexed": False, "internalType": "string", "name": "tokenURI", "type": "string"},
        ],
        "name": "TicketMinted",
        "type": "event",
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "address", "name": "from", "type": "address"},
            {"indexed": True, "internalType": "address", "name": "to", "type": "address"},
            {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
        ],
        "name": "Transfer",
        "type": "event",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "bookingCode", "type": "string"}
        ],
        "name": "getTokenIdByBookingCode",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
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
    {
        "inputs": [
            {"internalType": "address", "name": "bookingRegistryAddress", "type": "address"}
        ],
        "name": "setRegistry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

REGISTRY_READ_ABI = [
    {
        "inputs": [],
        "name": "registry",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    }
]

OWNABLE_READ_ABI = [
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    }
]

ACCESSCONTROL_READ_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "role", "type": "bytes32"},
            {"internalType": "address", "name": "account", "type": "address"},
        ],
        "name": "hasRole",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    }
]


def _check_ownable_owner(w3: Web3, contract_address: str, expected_owner: str) -> tuple[bool, str]:
    try:
        c = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=OWNABLE_READ_ABI)
        owner = c.functions.owner().call()
        if Web3.to_checksum_address(owner) != Web3.to_checksum_address(expected_owner):
            return False, f"Signer is not contract owner. owner={owner}, signer={expected_owner}"
        return True, "ok"
    except Exception:
        # Contract may not expose owner(); skip strict check.
        return True, "skip"


def _check_has_role(w3: Web3, contract_address: str, role: bytes, account: str) -> tuple[bool, str]:
    try:
        c = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=ACCESSCONTROL_READ_ABI)
        ok = c.functions.hasRole(role, Web3.to_checksum_address(account)).call()
        if not ok:
            return False, f"Missing required role {role.hex()} for signer {account}"
        return True, "ok"
    except Exception:
        # Contract may not implement AccessControl interface exactly; skip strict check.
        return True, "skip"


def _get_env() -> Dict[str, str]:
    # Defensive reload: ensure envs are available even if process started before changes.
    try:
        project_root = Path(__file__).resolve().parents[2]
        load_dotenv(project_root / '.env', override=False, encoding='utf-8-sig')
        load_dotenv(project_root / 'skyplan-blockchain' / '.env', override=False, encoding='utf-8-sig')
    except Exception:
        pass

    app_cfg = current_app.config if has_app_context() else {}

    def pick(*keys: str, default: str = "") -> str:
        for key in keys:
            val = app_cfg.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
            val = os.getenv(key)
            if val is not None and str(val).strip():
                return str(val).strip()
        return default

    return {
        "rpc_url": pick("SEPOLIA_RPC_URL", "BLOCKCHAIN_SEPOLIA_RPC", default=""),
        "private_key": pick("PRIVATE_KEY", "CONTRACT_PRIVATE_KEY", default=""),
        "booking_registry": pick("BOOKING_REGISTRY_ADDRESS", default=""),
        "ticket_nft": pick("TICKET_NFT_ADDRESS", default=""),
        "sky_token": pick("SKY_TOKEN_ADDRESS", "SKYTOKEN_ADDRESS", default=""),
        "reward_amount": pick("SKY_REWARD_AMOUNT", default="100"),
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
    import time
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
    
    # Retry logic for Sepolia RPC timeout
    max_retries = 3
    for attempt in range(max_retries):
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            if receipt.get("status") != 1:
                raise RuntimeError(f"On-chain tx failed: {tx_hash.hex()}")
            return tx_hash.hex()
        except Exception as e:
            if attempt < max_retries - 1 and "not in the chain" in str(e):
                wait_time = 10 * (attempt + 1)  # 10s, 20s, 30s
                _log_warning(f"[blockchain] TX receipt timeout (attempt {attempt + 1}/{max_retries}): retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise


def _send_tx_with_receipt(w3: Web3, signer: Any, function_call, nonce: int, gas_limit: int = 500000) -> tuple[str, Any]:
    import time
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
    
    # Retry logic for Sepolia RPC timeout
    max_retries = 3
    for attempt in range(max_retries):
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
            if receipt.get("status") != 1:
                raise RuntimeError(f"On-chain tx failed: {tx_hash.hex()}")
            return tx_hash.hex(), receipt
        except Exception as e:
            if attempt < max_retries - 1 and "not in the chain" in str(e):
                wait_time = 10 * (attempt + 1)  # 10s, 20s, 30s
                _log_warning(f"[blockchain] TX receipt timeout (attempt {attempt + 1}/{max_retries}): retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                raise


def _extract_ticket_token_id(ticket_nft, receipt: Any, wallet: str, booking_code: str) -> str | None:
    expected_wallet = Web3.to_checksum_address(wallet)

    try:
        minted_events = ticket_nft.events.TicketMinted().process_receipt(receipt, errors=DISCARD)
        for event in minted_events:
            args = event.get("args", {})
            event_to = args.get("to")
            event_code = args.get("bookingCode")
            token_id = args.get("tokenId")
            if event_to and event_code and token_id is not None:
                if Web3.to_checksum_address(event_to) == expected_wallet and str(event_code) == str(booking_code):
                    return str(int(token_id))
    except Exception:
        pass

    try:
        transfer_events = ticket_nft.events.Transfer().process_receipt(receipt, errors=DISCARD)
        for event in transfer_events:
            args = event.get("args", {})
            event_from = args.get("from")
            event_to = args.get("to")
            token_id = args.get("tokenId")
            if event_from and event_to and token_id is not None:
                if int(event_from, 16) == 0 and Web3.to_checksum_address(event_to) == expected_wallet:
                    return str(int(token_id))
    except Exception:
        pass

    return None


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
    booking_code = getattr(booking, "booking_code", None)

    if not booking:
        result["message"] = "Booking is required"
        _log_warning(f"[blockchain-flow] validation failed: {result['message']}")
        return result

    if not booking.wallet_address:
        result["message"] = "Booking missing wallet_address"
        _log_warning(f"[blockchain-flow] validation failed booking={booking_code}: {result['message']}")
        return result

    if not booking.booking_hash:
        result["message"] = "Booking missing booking_hash"
        _log_warning(f"[blockchain-flow] validation failed booking={booking_code}: {result['message']}")
        return result

    if not Web3.is_address(booking.wallet_address):
        result["message"] = "Invalid booking wallet_address"
        _log_warning(
            f"[blockchain-flow] validation failed booking={booking_code}: {result['message']} value={booking.wallet_address}"
        )
        return result

    config = _get_env()
    valid, validate_message = _validate_required(config)
    if not valid:
        result["message"] = validate_message
        _log_error(f"[blockchain-flow] config failed booking={booking_code}: {validate_message}")
        return result

    if not token_uri:
        token_uri = f"https://skyplan.local/api/metadata/ticket/{booking.booking_code}.json"

    try:
        w3, signer = _get_w3_and_signer(config)
        signer_addr = Web3.to_checksum_address(signer.address)

        # Preflight permissions to avoid opaque on-chain reverts.
        ok, msg = _check_ownable_owner(w3, config["booking_registry"], signer_addr)
        if not ok:
            result["message"] = "BookingRegistry permission error: " + msg
            _log_error(f"[blockchain-flow] permission failed booking={booking.booking_code}: {result['message']}")
            return result

        minter_role = Web3.keccak(text="MINTER_ROLE")
        default_admin_role = b"\x00" * 32

        ok, msg = _check_has_role(w3, config["ticket_nft"], minter_role, signer_addr)
        if not ok:
            result["message"] = "TicketNFT permission error: " + msg
            _log_error(f"[blockchain-flow] permission failed booking={booking.booking_code}: {result['message']}")
            return result

        ok, msg = _check_has_role(w3, config["sky_token"], default_admin_role, signer_addr)
        if not ok:
            result["message"] = "SkyToken permission error (setAllowed): " + msg
            _log_error(f"[blockchain-flow] permission failed booking={booking.booking_code}: {result['message']}")
            return result

        ok, msg = _check_has_role(w3, config["sky_token"], minter_role, signer_addr)
        if not ok:
            result["message"] = "SkyToken permission error (mintForBooking): " + msg
            _log_error(f"[blockchain-flow] permission failed booking={booking.booking_code}: {result['message']}")
            return result

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
        target_registry = Web3.to_checksum_address(config["booking_registry"])

        def fresh_nonce() -> int:
            return w3.eth.get_transaction_count(signer.address, "pending")

        # Keep dependent contracts pointed to the active BookingRegistry.
        try:
            nft_read = w3.eth.contract(address=Web3.to_checksum_address(config["ticket_nft"]), abi=REGISTRY_READ_ABI)
            nft_registry = Web3.to_checksum_address(nft_read.functions.registry().call())
            if nft_registry != target_registry:
                tx_hash = _send_tx(
                    w3,
                    signer,
                    ticket_nft.functions.setRegistry(target_registry),
                    fresh_nonce(),
                    gas_limit=180000,
                )
                _log_info(f"[blockchain-flow] ticket_nft registry updated booking={booking.booking_code}, tx={tx_hash}")
        except Exception as e:
            result["message"] = f"ticket_nft setRegistry failed: {e}"
            _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
            return result

        try:
            sky_read = w3.eth.contract(address=Web3.to_checksum_address(config["sky_token"]), abi=REGISTRY_READ_ABI)
            sky_registry = Web3.to_checksum_address(sky_read.functions.registry().call())
            if sky_registry != target_registry:
                tx_hash = _send_tx(
                    w3,
                    signer,
                    sky_token.functions.setRegistry(target_registry),
                    fresh_nonce(),
                    gas_limit=180000,
                )
                _log_info(f"[blockchain-flow] sky_token registry updated booking={booking.booking_code}, tx={tx_hash}")
        except Exception as e:
            result["message"] = f"sky_token setRegistry failed: {e}"
            _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
            return result

        if not bool(getattr(booking, "onchain_recorded", False)):
            try:
                tx_hash = _send_tx(
                    w3,
                    signer,
                    registry.functions.recordBookingFor(booking.booking_code, booking.booking_hash, checksum_wallet),
                    fresh_nonce(),
                    gas_limit=350000,
                )
            except Exception as e:
                result["message"] = f"record_booking failed: {e}"
                _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
                return result
            booking.onchain_recorded = True
            booking.onchain_record_tx_hash = tx_hash
            result["steps"]["record_booking"] = {
                "executed": True,
                "tx_hash": tx_hash,
                "message": "Recorded booking on-chain (custodial)",
            }
        else:
            result["steps"]["record_booking"]["message"] = "Skipped (already recorded)"

        if not bool(getattr(booking, "nft_minted", False)):
            try:
                tx_hash, receipt = _send_tx_with_receipt(
                    w3,
                    signer,
                    ticket_nft.functions.mintTicket(checksum_wallet, booking.booking_code, token_uri),
                    fresh_nonce(),
                    gas_limit=500000,
                )
            except Exception as e:
                result["message"] = f"mint_nft failed: {e}"
                _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
                return result
            token_id = _extract_ticket_token_id(ticket_nft, receipt, checksum_wallet, booking.booking_code)
            if token_id is None:
                try:
                    queried_token_id = int(ticket_nft.functions.getTokenIdByBookingCode(booking.booking_code).call())
                    if queried_token_id > 0:
                        token_id = str(queried_token_id)
                except Exception:
                    token_id = None

            booking.nft_minted = True
            booking.nft_mint_tx_hash = tx_hash
            booking.nft_contract = Web3.to_checksum_address(config["ticket_nft"])
            if token_id:
                booking.nft_token_id = token_id
            result["steps"]["mint_nft"] = {
                "executed": True,
                "tx_hash": tx_hash,
                "message": f"Minted ticket NFT" + (f" token_id={token_id}" if token_id else ""),
            }
        else:
            result["steps"]["mint_nft"]["message"] = "Skipped (already minted)"

        # Backfill token_id if booking was already minted previously but token id is missing in DB.
        if bool(getattr(booking, "nft_minted", False)) and not getattr(booking, "nft_token_id", None):
            try:
                existing_token_id = int(ticket_nft.functions.getTokenIdByBookingCode(booking.booking_code).call())
                if existing_token_id > 0:
                    booking.nft_token_id = str(existing_token_id)
                    _log_info(f"[blockchain-flow] backfilled nft_token_id booking={booking.booking_code} token_id={existing_token_id}")
            except Exception:
                pass

        if not bool(getattr(booking, "sky_minted", False)):
            try:
                allow_tx = _send_tx(
                    w3,
                    signer,
                    sky_token.functions.setAllowed(checksum_wallet, True),
                    fresh_nonce(),
                    gas_limit=150000,
                )
            except Exception as e:
                result["message"] = f"mint_sky setAllowed failed: {e}"
                _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
                return result
            amount_human, member_tier = _calculate_booking_sky_reward(booking)
            amount_wei = int(amount_human * (10 ** 18))

            try:
                mint_tx = _send_tx(
                    w3,
                    signer,
                    sky_token.functions.mintForBooking(checksum_wallet, booking.booking_code, amount_wei),
                    fresh_nonce(),
                    gas_limit=400000,
                )
            except Exception as e:
                result["message"] = f"mint_sky mintForBooking failed: {e}"
                _log_error(f"[blockchain-flow] step failed booking={booking.booking_code}: {result['message']}")
                return result
            booking.sky_minted = True
            booking.sky_mint_tx_hash = mint_tx
            booking.sky_reward_amount = amount_human

            if getattr(booking, 'user', None) is not None:
                user_tier, _, _ = _calculate_user_tier(booking.user)
                booking.user.member_tier = user_tier

            result["steps"]["mint_sky"] = {
                "executed": True,
                "tx_hash": mint_tx,
                "message": f"setAllowed tx={allow_tx}; minted {amount_human} SKY for {member_tier}",
            }
        else:
            result["steps"]["mint_sky"]["message"] = "Skipped (already minted)"

        result["success"] = True
        result["message"] = "Blockchain post-payment flow completed"
        _log_info(
            f"[blockchain-flow] success booking={booking.booking_code} "
            f"record_tx={booking.onchain_record_tx_hash} nft_tx={booking.nft_mint_tx_hash} sky_tx={booking.sky_mint_tx_hash}"
        )
        return result

    except Exception as e:
        result["message"] = str(e)
        _log_error(f"[blockchain-flow] unexpected error booking={booking_code}: {e}")
        return result
