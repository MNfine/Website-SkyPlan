/**
 * BlockchainPayment Module
 * Handles Ethereum/MetaMask transactions for SkyPlan flight bookings
 * Supports Sepolia testnet for development and testing
 */

const BlockchainPayment = (function () {
  'use strict';

  // Configuration - will be loaded from server
  let CONFIG = {
    SEPOLIA_CHAIN_ID: '11155111',
    SEPOLIA_CHAIN_ID_HEX: '0xaa36a7',
    BOOKING_REGISTRY_ADDRESS: null,
    TICKET_NFT_ADDRESS: null,
    SKY_TOKEN_ADDRESS: null,
    MIN_GAS_LIMIT: 21000,
    GAS_PRICE_MULTIPLIER: 1.2,
  };

  // Flag to track if config is loaded
  let configLoaded = false;

  // Initialize blockchain config from server
  async function initializeBlockchainConfig() {
    if (configLoaded) {
      return CONFIG;
    }

    try {
      if (window.SkyPlanConfig && typeof window.SkyPlanConfig.getBlockchainConfig === 'function') {
        const blockchainConfig = await window.SkyPlanConfig.getBlockchainConfig();
        if (blockchainConfig) {
          CONFIG.BOOKING_REGISTRY_ADDRESS = blockchainConfig.bookingRegistryAddress;
          CONFIG.TICKET_NFT_ADDRESS = blockchainConfig.ticketNFTAddress;
          CONFIG.SKY_TOKEN_ADDRESS = blockchainConfig.skyTokenAddress;
          CONFIG.SEPOLIA_CHAIN_ID = blockchainConfig.sepoliaChainId;
          CONFIG.SEPOLIA_CHAIN_ID_HEX = blockchainConfig.sepoliaChainIdHex;
          configLoaded = true;
          console.log('✓ Blockchain config loaded from server', CONFIG);
          return CONFIG;
        }
      }
    } catch (error) {
      console.error('Failed to initialize blockchain config:', error);
    }

    console.warn('⚠️ Using fallback blockchain config (addresses may be unset)');
    return CONFIG;
  }

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
      // Initialize blockchain config from server
      await initializeBlockchainConfig();

      showDemoPanel();

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
      // Initialize blockchain config from server
      await initializeBlockchainConfig();

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

      // Ensure wallet is on Sepolia before sending to avoid opaque RPC failures.
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const onSepolia =
        currentChainId === CONFIG.SEPOLIA_CHAIN_ID_HEX ||
        currentChainId === CONFIG.SEPOLIA_CHAIN_ID;
      if (!onSepolia) {
        throw {
          code: 'wrong_network',
          message: (lang === 'vi')
            ? 'Ví đang ở sai mạng. Vui lòng chuyển sang Sepolia Testnet.'
            : 'Wrong network. Please switch wallet to Sepolia Testnet.',
        };
      }

      // Show processing status
      showStatus('pending');

      // Get wallet info
      const fromAddress = window.MetaMaskWallet.account;
      // Use self-transfer in test mode when contract address is still placeholder.
      const toAddress =
        CONFIG.BOOKING_REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000'
          ? fromAddress
          : CONFIG.BOOKING_REGISTRY_ADDRESS;

      // Prepare transaction parameters
      // Convert amount to Wei (1 ETH = 10^18 Wei)
      // For now, send as a fixed test amount
      const ethAmount = '0.001'; // 0.001 ETH for testing
      const amountWei = ethToWei(ethAmount);

      const gasLimitHex = '0x5208'; // 21000 in hex
      const valueHex = '0x' + BigInt(amountWei).toString(16);

      const txParams = {
        from: fromAddress,
        to: toAddress,
        value: valueHex,
        gas: gasLimitHex, // Standard ETH transfer gas (hex quantity)
        gasPrice: await estimateGasPrice(),
        // Keep transfer payload empty to avoid intrinsic gas failures on standard ETH transfer.
        data: '0x',
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
    const nestedMessage = extractErrorMessage(error);
    const errorStr = (nestedMessage || '').toLowerCase();
    let errorMessage = getMessage('unknownError', lang_code);

    if (
      errorStr.includes('user rejected') ||
      errorStr.includes('user denied') ||
      String(error && error.code) === '4001'
    ) {
      errorCode = 'user_rejected';
      errorMessage = getMessage('userRejected', lang_code);
    } else if (
      String(error && error.code) === 'wrong_network' ||
      errorStr.includes('wrong network') ||
      errorStr.includes('sai mạng') ||
      errorStr.includes('chain')
    ) {
      errorCode = 'wrong_network';
      errorMessage = (lang_code === 'vi')
        ? 'Ví đang ở sai mạng. Hãy chuyển sang Sepolia Testnet.'
        : 'Wallet is on the wrong network. Please switch to Sepolia Testnet.';
    } else if (
      errorStr.includes('cannot read properties') ||
      errorStr.includes('undefined') ||
      errorStr.includes('toWei'.toLowerCase())
    ) {
      errorCode = 'wallet_config_error';
      errorMessage = (lang_code === 'vi')
        ? 'Loi cau hinh vi. Vui long tai lai trang va ket noi lai MetaMask.'
        : 'Wallet configuration error. Please refresh and reconnect MetaMask.';
    } else if (
      errorStr.includes('insufficient funds') ||
      errorStr.includes('gas') ||
      errorStr.includes('intrinsic gas too low') ||
      errorStr.includes('exceeds allowance')
    ) {
      errorCode = 'insufficient_gas';
      errorMessage = getMessage('insufficientGas', lang_code);
    } else if (errorStr.includes('execution reverted')) {
      errorCode = 'tx_reverted';
      errorMessage = getMessage('transactionFailed', lang_code);
    } else if (
      errorStr.includes('rpc') ||
      errorStr.includes('network') ||
      errorStr.includes('json-rpc') ||
      errorStr.includes('internal')
    ) {
      errorCode = 'rpc_error';
      errorMessage = getMessage('rpcError', lang_code);
    } else if (nestedMessage) {
      // Show specific wallet error if available to avoid opaque unknown_error UX.
      errorMessage = localizeRawWalletError(nestedMessage, lang_code);
    }

    currentTransaction.status = 'failed';
    currentTransaction.errorCode = errorCode;
    currentTransaction.errorMessage = errorMessage;

    showStatus('failed', null, errorCode, errorMessage);
    notify(errorMessage, 'error', 6000);
  }

  function extractErrorMessage(error) {
    if (!error) return '';

    const seen = new Set();
    const queue = [error];

    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      if (seen.has(current)) continue;
      seen.add(current);

      if (typeof current.message === 'string' && current.message.trim()) {
        return current.message;
      }
      if (typeof current.reason === 'string' && current.reason.trim()) {
        return current.reason;
      }

      if (current.data) queue.push(current.data);
      if (current.error) queue.push(current.error);
      if (current.originalError) queue.push(current.originalError);
      if (current.cause) queue.push(current.cause);
      if (current.info) queue.push(current.info);
    }

    try {
      return String(error);
    } catch (_err) {
      return '';
    }
  }

  function localizeRawWalletError(message, lang) {
    if (!message) return message;
    if (lang !== 'vi') return message;

    const m = String(message).toLowerCase();

    if (m.includes('cannot read properties') || m.includes('undefined')) {
      return 'Loi he thong JavaScript. Vui long tai lai trang va thu lai.';
    }
    if (m.includes('insufficient funds')) {
      return 'So du ETH khong du de tra phi gas.';
    }
    if (m.includes('user rejected') || m.includes('user denied')) {
      return 'Ban da tu choi giao dich trong MetaMask.';
    }
    if (m.includes('wrong network') || m.includes('chain')) {
      return 'Sai mang blockchain. Vui long chuyen sang Sepolia Testnet.';
    }

    return message;
  }

  function ethToWei(ethAmount) {
    const amountStr = String(ethAmount || '0').trim();
    if (!/^\d+(\.\d+)?$/.test(amountStr)) {
      throw new Error('Invalid ETH amount format');
    }

    const parts = amountStr.split('.');
    const whole = parts[0] || '0';
    const fraction = (parts[1] || '').padEnd(18, '0').slice(0, 18);
    return (BigInt(whole) * BigInt('1000000000000000000') + BigInt(fraction || '0')).toString();
  }

  // Public API
  return {
    initializeBlockchainConfig: initializeBlockchainConfig,
    initiatePayment: initiatePayment,
    sendTransaction: sendTransaction,
    showStatus: showStatus,
    resetStatusUI: resetStatusUI,
    getMessage: getMessage,
  };
})();

// Export globally
window.BlockchainPayment = BlockchainPayment;
