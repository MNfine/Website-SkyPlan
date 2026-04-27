"""Cancel stuck pending transactions on Sepolia by sending 0-value replacement txs.

Usage:
    python backend/tools/cancel_pending_tx.py

This script:
1. Reads your PRIVATE_KEY + SEPOLIA_RPC_URL from .env
2. Finds the gap between confirmed nonce and pending nonce
3. Sends 0-value self-transfer txs with HIGH gas price for each stuck nonce
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

load_dotenv(project_root / '.env')
load_dotenv(project_root / 'skyplan-blockchain' / '.env', override=False)


def main():
    rpc_url = os.getenv('SEPOLIA_RPC_URL') or os.getenv('BLOCKCHAIN_SEPOLIA_RPC')
    private_key = os.getenv('PRIVATE_KEY') or os.getenv('CONTRACT_PRIVATE_KEY')

    if not rpc_url or not private_key:
        print("❌ Missing SEPOLIA_RPC_URL or PRIVATE_KEY in .env")
        return

    if not private_key.startswith('0x'):
        private_key = '0x' + private_key

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        print("❌ Cannot connect to Sepolia RPC")
        return

    signer = Account.from_key(private_key)
    address = signer.address

    confirmed_nonce = w3.eth.get_transaction_count(address, 'latest')
    pending_nonce = w3.eth.get_transaction_count(address, 'pending')

    print(f"🔑 Address: {address}")
    print(f"📊 Confirmed nonce: {confirmed_nonce}")
    print(f"📊 Pending nonce:   {pending_nonce}")
    print(f"📊 RPC gas_price:   {w3.eth.gas_price} wei ({w3.eth.gas_price / 1e9:.4f} Gwei)")

    stuck_count = pending_nonce - confirmed_nonce
    if stuck_count == 0:
        print("✅ No stuck transactions! All nonces are confirmed.")
        return

    print(f"\n⚠️  Found {stuck_count} stuck pending transaction(s): nonce {confirmed_nonce} → {pending_nonce - 1}")

    # Use high gas price to replace stuck txs
    CANCEL_GAS_PRICE = Web3.to_wei(10, 'gwei')  # 10 Gwei - much higher than stuck 0.035
    print(f"💰 Cancel gas price: {CANCEL_GAS_PRICE} wei ({CANCEL_GAS_PRICE / 1e9:.0f} Gwei)")

    confirm = input(f"\nCancel {stuck_count} stuck tx(s)? [y/N]: ").strip().lower()
    if confirm != 'y':
        print("Aborted.")
        return

    for nonce in range(confirmed_nonce, pending_nonce):
        print(f"\n🔄 Cancelling nonce {nonce}...")
        tx = {
            'from': address,
            'to': address,  # self-transfer
            'value': 0,
            'nonce': nonce,
            'chainId': w3.eth.chain_id,
            'gas': 21000,
            'gasPrice': CANCEL_GAS_PRICE,
        }
        signed = signer.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"   📤 Sent cancel tx: {tx_hash.hex()}")
        print(f"   🔗 https://sepolia.etherscan.io/tx/{tx_hash.hex()}")

        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            if receipt['status'] == 1:
                print(f"   ✅ Nonce {nonce} cancelled successfully!")
            else:
                print(f"   ❌ Cancel tx failed on-chain for nonce {nonce}")
        except Exception as e:
            print(f"   ⏳ Timeout waiting for receipt: {e}")
            print(f"   (tx was sent, check etherscan)")

    print(f"\n🎉 Done! You can now retry the blockchain flow.")


if __name__ == '__main__':
    main()
