/**
 * BlockchainPayment Module
 * Handles Ethereum/MetaMask transactions for SkyPlan flight bookings
 * Supports Sepolia testnet for development and testing
 */

const BlockchainPayment = (function () {
  'use strict';

  // Configuration
  const CONFIG = {
    SEPOLIA_CHAIN_ID: '11155111',
    SEPOLIA_CHAIN_ID_HEX: '0xaa36a7',
    PAYMENT_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000000', // Placeholder - update with actual contract
    MIN_GAS_LIMIT: 21000, // Minimum gas for standard ETH transfer
    GAS_PRICE_MULTIPLIER: 1.2, // Add 20% buffer to gas price
  };

  // State management
  let currentTransaction = {
    txHash: null,
    bookingId: null,
    amount: null,
    status: 'idle', // idle, pending, success, failed
    errorCode: null,
    errorMessage: null,
  };

  // Translation helper
  function getMessage(key, lang = 'vi') {
    const messages = {
      vi: {
        connectWallet: 'Kết nối Ví',
        walletConnected: 'Ví đã kết nối:',
        enterAmount: 'Vui lòng nhập số tiền',
        invalidAmount: 'Số tiền không hợp lệ',
        gasEstimationFailed: 'Không thể ước tính gas',
        userRejected: 'Bạn đã từ chối giao dịch',
        insufficientGas: 'Không đủ ETH để thanh toán gas',
        insufficientBalance: 'Số dư không đủ để thực hiện giao dịch',
        rpcError: 'Lỗi kết nối blockchain',
        transactionFailed: 'Giao dịch thất bại',
        processingTransaction: 'Đang xử lý giao dịch...',
        waitingConfirmation: 'Chờ xác nhận giao dịch...',
        transactionSuccess: 'Giao dịch thành công!',
        transactionPending: 'Giao dịch đang chờ xác nhận',
        viewOnExplorer: 'Xem trên Explorer',
        retryPayment: 'Thử lại',
        sendTransaction: 'Gửi Giao dịch',
        networkError: 'Lỗi mạng',
        unknownError: 'Lỗi không xác định',
      },
      en: {
        connectWallet: 'Connect Wallet',
        walletConnected: 'Wallet Connected:',
        enterAmount: 'Please enter an amount',
        invalidAmount: 'Invalid amount',
        gasEstimationFailed: 'Gas estimation failed',
        userRejected: 'You rejected the transaction',
        insufficientGas: 'Insufficient ETH for gas fees',
        insufficientBalance: 'Insufficient balance',
        rpcError: 'Blockchain connection error',
        transactionFailed: 'Transaction failed',
        processingTransaction: 'Processing transaction...',
        waitingConfirmation: 'Waiting for confirmation...',
        transactionSuccess: 'Transaction successful!',
        transactionPending: 'Transaction pending confirmation',
        viewOnExplorer: 'View on Explorer',
        retryPayment: 'Retry Payment',
        sendTransaction: 'Send Transaction',
        networkError: 'Network error',
        unknownError: 'Unknown error',
      }
    };

    const lang_messages = messages[lang] || messages['vi'];
    return lang_messages[key] || key;
  }

  /**
   * Initialize blockchain payment process
   */
  async function initiatePayment() {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';

    try {
      // Get booking and amount from localStorage/page
      const bookingCode = document.getElementById('bookingCode')?.textContent || 'SP' + Date.now();
      const amount = 1598000; // Amount in VND (from payment.html)

      // Show payment details
      updatePaymentDetails(amount);

      // Show send button
      const sendBtn = document.getElementById('sendCryptoPaymentBtn');
      if (sendBtn) {
        sendBtn.style.display = 'block';
        sendBtn.onclick = () => sendTransaction(bookingCode, amount);
      }

      notify(getMessage('processingTransaction', lang), 'info', 3000);

    } catch (error) {
      console.error('Payment initiation error:', error);
      const msg = getMessage('unknownError', lang) + ': ' + error.message;
      notify(msg, 'error', 5000);
    }
  }

  /**
   * Update payment details display
   */
  function updatePaymentDetails(amountVnd) {
    try {
      // Estimate ETH amount (placeholder conversion)
      // In production, use real ETH price from an oracle
      const ethPrice = 2000; // USD per ETH (placeholder)
      const usdAmount = amountVnd / 24500; // VND to USD conversion (approximate)
      const ethAmount = (usdAmount / ethPrice).toFixed(6);

      const cryptoAmountEth = document.getElementById('cryptoAmountEth');
      if (cryptoAmountEth) {
        cryptoAmountEth.textContent = `~${ethAmount} ETH`;
      }

      const cryptoAmountVnd = document.getElementById('cryptoAmountVnd');
      if (cryptoAmountVnd) {
        cryptoAmountVnd.textContent = `${amountVnd.toLocaleString()} VND`;
      }

    } catch (error) {
      console.error('Error updating payment details:', error);
    }
  }

  /**
   * Send blockchain transaction
   */
  async function sendTransaction(bookingCode, amountVnd) {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';

    try {
      // Validate input
      if (!bookingCode || !amountVnd) {
        notify(getMessage('invalidAmount', lang), 'warning', 4000);
        return;
      }

      // Check MetaMask connection
      if (!window.MetaMaskWallet || !window.MetaMaskWallet.isConnected) {
        notify(getMessage('userRejected', lang), 'warning', 4000);
        return;
      }

      // Show processing status
      showStatus('pending');

      // Get wallet info
      const fromAddress = window.MetaMaskWallet.account;
      const toAddress = CONFIG.PAYMENT_CONTRACT_ADDRESS;

      // Prepare transaction parameters
      // Convert amount to Wei (1 ETH = 10^18 Wei)
      // For now, send as a fixed test amount
      const ethAmount = '0.001'; // 0.001 ETH for testing
      const amountWei = window.web3 ? 
        window.web3.utils.toWei(ethAmount, 'ether') : 
        (BigInt(ethAmount.replace('.', '')) * BigInt(10 ** (18 - ethAmount.split('.')[1].length))).toString();

      const txParams = {
        from: fromAddress,
        to: toAddress,
        value: amountWei,
        gas: '21000', // Standard ETH transfer gas
        gasPrice: await estimateGasPrice(),
        data: bookingCode, // Include booking code in tx data
      };

      // Send transaction via MetaMask
      const txHash = await sendTransactionViaMetaMask(txParams);

      if (!txHash) {
        throw new Error('No transaction hash received');
      }

      // Store transaction info
      currentTransaction = {
        txHash: txHash,
        bookingId: bookingCode,
        amount: amountVnd,
        status: 'pending',
        errorCode: null,
        errorMessage: null,
      };

      // Save to backend
      await saveTransactionHashToBackend(bookingCode, txHash, fromAddress, toAddress);

      // Display transaction hash
      displayTransactionHash('pending', txHash);

      // Start polling for transaction status
      pollTransactionStatus(txHash, lang);

      notify(getMessage('processingTransaction', lang), 'success', 4000);

    } catch (error) {
      console.error('Transaction send error:', error);
      handleTransactionError(error, lang);
    }
  }

  /**
   * Send transaction via MetaMask
   */
  async function sendTransactionViaMetaMask(txParams) {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      // Request transaction signature and send
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      return txHash;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Estimate gas price
   */
  async function estimateGasPrice() {
    try {
      if (!window.ethereum) {
        return '0x3b9aca00'; // Default: 1 Gwei in hex
      }

      const gasPrice = await window.ethereum.request({
        method: 'eth_gasPrice',
      });

      // Multiply by buffer to ensure transaction goes through
      const gasPriceNum = BigInt(gasPrice);
      const bufferedGasPrice = gasPriceNum * BigInt(Math.floor(CONFIG.GAS_PRICE_MULTIPLIER * 100)) / BigInt(100);

      return '0x' + bufferedGasPrice.toString(16);

    } catch (error) {
      console.error('Gas price estimation error:', error);
      return '0x3b9aca00'; // Fallback
    }
  }

  /**
   * Poll transaction status
   */
  async function pollTransactionStatus(txHash, lang, maxRetries = 60, pollInterval = 2000) {
    let retries = 0;
    const lang_code = lang || 'vi';

    const pollInterval_id = setInterval(async () => {
      try {
        // Get transaction receipt
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });

        if (receipt) {
          clearInterval(pollInterval_id);

          // Check transaction status
          const isSuccess = receipt.status === '0x1';

          if (isSuccess) {
            currentTransaction.status = 'success';
            showStatus('success', txHash);
            await confirmPaymentToBackend(txHash, 'success', {
              confirmations: parseInt(receipt.blockNumber, 16),
              block_number: receipt.blockNumber,
              gas_used: receipt.gasUsed,
            });
            notify(getMessage('transactionSuccess', lang_code), 'success', 5000);
          } else {
            currentTransaction.status = 'failed';
            currentTransaction.errorCode = 'tx_reverted';
            showStatus('failed', txHash, 'tx_reverted', getMessage('transactionFailed', lang_code));
            await confirmPaymentToBackend(txHash, 'failed', {
              error_code: 'tx_reverted',
              error_message: getMessage('transactionFailed', lang_code),
            });
            notify(getMessage('transactionFailed', lang_code), 'error', 5000);
          }

          return;
        }

        retries++;
        if (retries >= maxRetries) {
          clearInterval(pollInterval_id);
          currentTransaction.status = 'failed';
          currentTransaction.errorCode = 'timeout';
          showStatus('failed', txHash, 'timeout', getMessage('networkError', lang_code));
          await confirmPaymentToBackend(txHash, 'failed', {
            error_code: 'timeout',
            error_message: getMessage('networkError', lang_code),
          });
          notify(getMessage('networkError', lang_code), 'error', 5000);
        }

      } catch (error) {
        console.error('Poll transaction error:', error);
      }

    }, pollInterval);
  }

  /**
   * Save transaction hash to backend
   */
  async function saveTransactionHashToBackend(bookingCode, txHash, fromAddress, toAddress) {
    try {
      const response = await fetch('/api/payment/blockchain/save-hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingCode,
          txHash: txHash,
          fromAddress: fromAddress,
          toAddress: toAddress,
        }),
      });

      const data = await response.json();
      return data.success;

    } catch (error) {
      console.error('Error saving transaction hash:', error);
      return false;
    }
  }

  /**
   * Confirm payment to backend
   */
  async function confirmPaymentToBackend(txHash, status, details = {}) {
    try {
      const response = await fetch('/api/payment/blockchain/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: txHash,
          status: status,
          details: details,
        }),
      });

      const data = await response.json();
      return data.success;

    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Display transaction hash
   */
  function displayTransactionHash(status, txHash) {
    try {
      if (status === 'pending') {
        const el = document.getElementById('txHashPending');
        if (el) {
          el.innerHTML = `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash.substring(0, 10)}...</a>`;
        }
      } else if (status === 'success') {
        const el = document.getElementById('txHashSuccess');
        if (el) {
          el.innerHTML = `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${txHash.substring(0, 10)}...</a>`;
        }
      }
    } catch (error) {
      console.error('Error displaying tx hash:', error);
    }
  }

  /**
   * Show transaction status
   */
  function showStatus(status, txHash = null, errorCode = null, errorMessage = null) {
    try {
      const container = document.getElementById('transactionStatusContainer');
      if (!container) return;

      container.style.display = 'block';

      // Hide all status boxes
      document.getElementById('statusPending').style.display = 'none';
      document.getElementById('statusSuccess').style.display = 'none';
      document.getElementById('statusFailed').style.display = 'none';

      if (status === 'pending') {
        document.getElementById('statusPending').style.display = 'block';
        if (txHash) displayTransactionHash('pending', txHash);

      } else if (status === 'success') {
        document.getElementById('statusSuccess').style.display = 'block';
        if (txHash) displayTransactionHash('success', txHash);

      } else if (status === 'failed') {
        document.getElementById('statusFailed').style.display = 'block';
        if (errorCode) {
          currentTransaction.errorCode = errorCode;
        }
        if (errorMessage) {
          const messageEl = document.getElementById('errorMessage');
          if (messageEl) {
            messageEl.textContent = errorMessage;
          }
          const codeEl = document.getElementById('errorCodeDisplay');
          if (codeEl) {
            codeEl.innerHTML = `<strong>Mã lỗi:</strong> ${errorCode}`;
          }
        }
      }

    } catch (error) {
      console.error('Error showing status:', error);
    }
  }

  /**
   * Handle transaction errors
   */
  function handleTransactionError(error, lang) {
    const lang_code = lang || 'vi';
    let errorCode = 'unknown_error';
    let errorMessage = getMessage('unknownError', lang_code);

    // Parse MetaMask error
    const errorStr = error.message || error.toString();

    if (errorStr.includes('User rejected') || errorStr.includes('User denied')) {
      errorCode = 'user_rejected';
      errorMessage = getMessage('userRejected', lang_code);
    } else if (errorStr.includes('insufficient funds') || errorStr.includes('gas')) {
      errorCode = 'insufficient_gas';
      errorMessage = getMessage('insufficientGas', lang_code);
    } else if (errorStr.includes('RPC Error') || errorStr.includes('network')) {
      errorCode = 'rpc_error';
      errorMessage = getMessage('rpcError', lang_code);
    }

    currentTransaction.status = 'failed';
    currentTransaction.errorCode = errorCode;
    currentTransaction.errorMessage = errorMessage;

    showStatus('failed', null, errorCode, errorMessage);
    notify(errorMessage, 'error', 6000);
  }

  // Public API
  return {
    initiatePayment: initiatePayment,
    sendTransaction: sendTransaction,
    showStatus: showStatus,
    getMessage: getMessage,
  };
})();

// Export globally
window.BlockchainPayment = BlockchainPayment;
