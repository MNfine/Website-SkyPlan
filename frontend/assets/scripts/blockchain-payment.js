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
    RECEIVER_ADDRESS: null,
    MIN_GAS_LIMIT: 21000,
    GAS_PRICE_MULTIPLIER: 1.2,
  };

  // Flag to track if config is loaded
  let configLoaded = false;

  // Processing flag to prevent double clicks
  let isProcessing = false;

  let cachedETHPrice = null;
  let lastPriceFetchTime = 0;
  const PRICE_CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetch real-time ETH price from CoinGecko
   */
  async function getETHPrice() {
    try {
      const now = Date.now();
      if (cachedETHPrice && (now - lastPriceFetchTime < PRICE_CACHE_TTL)) {
        return cachedETHPrice;
      }

      console.log("[Blockchain] Fetching real-time ETH price...");
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=vnd");
      const data = await res.json();

      if (data && data.ethereum && data.ethereum.vnd) {
        cachedETHPrice = data.ethereum.vnd;
        lastPriceFetchTime = now;
        console.log("[Blockchain] Current ETH Price:", cachedETHPrice, "VND");
        return cachedETHPrice;
      }
      throw new Error("Invalid price data");
    } catch (e) {
      console.error("[Blockchain] ETH API failed, using fallback:", e);
      return 32000000; // Fallback rate
    }
  }

  /**
   * Parse a VND value that may be a number or a formatted string like "1.989.876 VND"
   */
  function parseVND(value) {
    if (!value && value !== 0) return 0;
    if (typeof value === 'number') return value;
    // Remove all non-digit characters (dots, commas, spaces, "VND", etc.)
    const cleaned = String(value).replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }

  /**
   * Format a number as Vietnamese currency: 2.189.876 VND
   */
  function formatVND(value) {
    if (!value && value !== 0) return '0 VND';
    return Number(value).toLocaleString('vi-VN') + ' VND';
  }

  /**
   * Calculate total from booking object, handling multiple possible field names.
   * Logs full booking object for debugging.
   */
  function calculateTotal(booking, discountPercent = 0) {
    if (!booking) return { subtotal: 0, discount: 0, total: 0 };

    // Debug: log full structure so field names are visible in console
    console.log('[Payment] FULL booking object:', JSON.stringify(booking, null, 2));

    // STEP 1 – prefer a ready-made backend total
    const backendTotal = parseVND(booking.totalCost || booking.totalPrice || booking.total_price || booking.total || booking.totalAmount || booking.total_amount);
    if (backendTotal > 0) {
      console.log('[Payment] Using backend total:', backendTotal);
      const discount = Math.round(backendTotal * (discountPercent / 100));
      return { subtotal: backendTotal, discount, total: backendTotal - discount };
    }

    // STEP 2 – sum individual components with broad field-name coverage
    const ticket = parseVND(
      booking.price ||   // most common backend key
      booking.ticketPrice ||
      booking.ticket_price ||
      booking.basePrice ||
      booking.base_price ||
      (booking.trip ? (Number(booking.trip.outbound_price || 0) + Number(booking.trip.inbound_price || 0)) : 0) || 0
    );

    let extrasVal = 0;
    if (typeof booking.extras === 'object' && booking.extras !== null) {
      extrasVal = Number(booking.extras.totalCost || booking.extras.total || 0);
    } else {
      extrasVal = parseVND(booking.extras || booking.extraFees || booking.extra_fees || booking.services || 0);
    }
    const extras = extrasVal;

    const taxes = parseVND(
      booking.tax ||   // singular — common short form
      booking.taxes ||
      booking.taxAmount ||
      booking.tax_amount ||
      booking.fees ||
      0
    );

    console.log('[Payment] Breakdown — ticket:', ticket, '| extras:', extras, '| taxes:', taxes);

    const subtotal = ticket + extras + taxes;
    const discount = Math.round(subtotal * (discountPercent / 100));
    const total = subtotal - discount;

    console.log('[Payment] Calculated total:', total);
    return { subtotal, discount, total };
  }

  /**
   * Calculate ETH from VND using real-time price.
   * Always returns a visible value (minimum 0.000001 ETH).
   */
  async function calculateETH(amountVND) {
    const price = await getETHPrice();
    if (!amountVND || amountVND <= 0) {
      return "0.000000";
    }
    const ethRaw = amountVND / price;
    // Prevent display of "0.000000" for very small (but valid) amounts
    const eth = Math.max(ethRaw, 0.000001);
    return eth.toFixed(6);
  }

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
          CONFIG.RECEIVER_ADDRESS = blockchainConfig.receiverAddress;
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
        redirectCountdown: 'Chuyển sang trang vé sau {secs} giây...',
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
        redirectCountdown: 'Redirecting to ticket page in {secs} seconds...',
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

      // ── Resolve the payment amount from multiple sources ──────────────
      // Scripts load in parallel on DOMContentLoaded so we cannot rely on
      // any single source being ready. Priority:
      //   1. window.PaymentState.amount  (set by payment.js)
      //   2. window.lastAmount           (set by payment_order.js vnpay block)
      //   3. #totalAmount DOM text       (rendered by payment_order.js render())
      // ─────────────────────────────────────────────────────────────────
      function resolveAmountNow() {
        let v = window.PaymentState && Number(window.PaymentState.amount);
        if (v > 0) return v;
        v = window.lastAmount && Number(window.lastAmount);
        if (v > 0) return v;
        const el = document.getElementById('totalAmount');
        if (el) {
          const raw = String(el.textContent || '').replace(/[^0-9]/g, '');
          v = raw ? parseInt(raw, 10) : 0;
          if (v > 0) return v;
        }
        return 0;
      }

      let amountVnd = resolveAmountNow();

      if (!amountVnd || amountVnd <= 0) {
        // Amount not ready yet — orderTotalReady listener will re-invoke us
        console.warn('[Blockchain] Amount not ready yet, will retry on orderTotalReady');
        return;
      }

      // Back-fill PaymentState so sendTransaction() uses the same value
      if (!window.PaymentState) window.PaymentState = { discount: 0, discountPercent: 0 };
      window.PaymentState.amount = amountVnd;

      // Sync booking code
      if (!window.PaymentState.bookingCode || window.PaymentState.bookingCode === '-') {
        window.PaymentState.bookingCode = localStorage.getItem('currentBookingCode') || '-';
      }

      const bookingCode = window.PaymentState.bookingCode || '-';
      console.log('[Blockchain] initiatePayment — amount:', amountVnd, 'booking:', bookingCode);

      console.log("Booking:", bookingCode);
      console.log("Total VND:", amountVnd);

      // Show payment details (includes real-time ETH calculation)
      await updatePaymentDetails(amountVnd);

      // Ensure pay button is bound to sendTransaction, but let metamask.js handle its visibility based on wallet connection state
      const sendBtn = document.getElementById('payWithCryptoBtn');
      if (sendBtn) {
        console.log('[Blockchain] Binding pay button for:', bookingCode);
        sendBtn.onclick = () => {
          console.log('[Blockchain] Pay button clicked via onclick');
          sendTransaction(bookingCode, amountVnd);
        };
      }
      // Payment details ready — no notification here because initiatePayment()
      // fires on every tab switch / total update, not on actual transaction send.

    } catch (error) {
      console.error('Payment initiation error:', error);
      const msg = getMessage('unknownError', lang) + ': ' + error.message;
      notify(msg, 'error', 5000);
    }
  }

  /**
   * Update payment details display
   */
  async function updatePaymentDetails(amountVnd) {
    try {
      const ethAmount = await calculateETH(amountVnd);
      console.log("[Blockchain] Calculated ETH:", ethAmount, "for VND:", amountVnd);

      const cryptoAmountEth = document.getElementById('cryptoAmountEth');
      if (cryptoAmountEth) {
        // Ensure small amounts are visible if needed, though toFixed(6) should be enough
        cryptoAmountEth.textContent = `~${ethAmount} ETH`;
      }

      const cryptoAmountVnd = document.getElementById('cryptoAmountVnd');
      if (cryptoAmountVnd) {
        // Vietnamese dot-separated format: 2.189.876 VND
        cryptoAmountVnd.textContent = formatVND(amountVnd);
      }

      const cryptoBookingCode = document.getElementById('cryptoBookingCode');
      if (cryptoBookingCode) {
        cryptoBookingCode.textContent = window.PaymentState.bookingCode || '-';
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
    console.log("[Blockchain] Send Transaction clicked. Booking:", bookingCode, "Amount VND:", amountVnd);

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
      const networkOk = await ensureCorrectNetwork(lang);
      if (!networkOk) return;

      // Prevent double submission
      if (isProcessing) {
        console.warn('[Blockchain] Transaction already in progress');
        return;
      }
      isProcessing = true;

      // Disable pay button
      const sendBtn = document.getElementById('payWithCryptoBtn');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add('loading');
      }

      // Show processing status
      showStatus('pending');

      // Get wallet info
      const fromAddress = window.MetaMaskWallet.account;
      
      // Determine recipient:
      //   1. RECEIVER_ADDRESS (dedicated payout wallet from server config)
      //   2. Self-transfer (safe fallback - never reverts on plain ETH sends)
      //   NOTE: BOOKING_REGISTRY_ADDRESS is a contract and may not have receive(),
      //         so we intentionally skip it as a fallback for plain ETH transfers.
      let toAddress = fromAddress; // safe default
      
      if (CONFIG.RECEIVER_ADDRESS && 
          CONFIG.RECEIVER_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        toAddress = CONFIG.RECEIVER_ADDRESS;
      }
      
      console.log('[Blockchain] toAddress resolved:', toAddress, '| RECEIVER_ADDRESS in config:', CONFIG.RECEIVER_ADDRESS);

      // Prepare transaction parameters
      const ethAmountCalculated = await calculateETH(amountVnd);
      const amountWei = ethToWei(ethAmountCalculated);

      console.log("[Blockchain] Sending transaction for:", ethAmountCalculated, "ETH (", amountWei, "Wei ) to", toAddress);
      
      // Use a slightly higher gas limit for contracts or non-standard wallets (30k instead of 21k)
      const gasLimitHex = (toAddress.toLowerCase() === fromAddress.toLowerCase()) ? '0x5208' : '0x7530'; 
      const valueHex = '0x' + BigInt(amountWei).toString(16);

      const txParams = {
        from: fromAddress,
        to: toAddress,
        value: valueHex,
        gas: gasLimitHex,
        gasPrice: await estimateGasPrice(),
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

      // Start polling for transaction status after a short delay
      // Delay allows node/backend to catch up
      setTimeout(() => {
        pollTransactionStatus(txHash, lang);
      }, 3000);

      notify(getMessage('processingTransaction', lang), 'success', 4000);

    } catch (error) {
      console.error('Transaction send error:', error);
      isProcessing = false;
      const sendBtn = document.getElementById('payWithCryptoBtn');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.classList.remove('loading');
      }
      handleTransactionError(error, lang);
    }
  }

  /**
   * Ensure wallet is on Sepolia, prompt to switch/add if not
   */
  async function ensureCorrectNetwork(lang) {
    if (!window.ethereum) return false;

    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const onSepolia =
        currentChainId === CONFIG.SEPOLIA_CHAIN_ID_HEX ||
        String(currentChainId) === String(CONFIG.SEPOLIA_CHAIN_ID);

      if (onSepolia) return true;

      // Request switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CONFIG.SEPOLIA_CHAIN_ID_HEX }],
        });
        return true;
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: CONFIG.SEPOLIA_CHAIN_ID_HEX,
                  chainName: 'Sepolia Test Network',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error('Failed to add Sepolia network:', addError);
            throw addError;
          }
        }
        throw switchError;
      }
    } catch (error) {
      console.error('Network check/switch error:', error);
      const msg = (lang === 'vi')
        ? 'Vui lòng chuyển ví sang mạng Sepolia Testnet để tiếp tục.'
        : 'Please switch your wallet to Sepolia Testnet to continue.';
      notify(msg, 'warning', 5000);
      return false;
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
  async function pollTransactionStatus(txHash, lang, maxRetries = 60, pollInterval = 3000) {
    let retries = 0;
    const lang_code = lang || 'vi';

    console.log(`[Blockchain] Starting polling for tx: ${txHash}`);

    const pollInterval_id = setInterval(async () => {
      try {
        // Get transaction receipt
        const receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        });

        if (receipt) {
          clearInterval(pollInterval_id);
          isProcessing = false;
          console.log('[Blockchain] Transaction receipt received:', receipt);

          // Check transaction status
          const isSuccess = receipt.status === '0x1';

          if (isSuccess) {
            currentTransaction.status = 'success';
            showStatus('success', txHash);
            await confirmPaymentToBackend(txHash, 'success', {
              confirmations: 1,
              block_number: receipt.blockNumber,
              gas_used: receipt.gasUsed,
            });
            notify(getMessage('transactionSuccess', lang_code), 'success', 4000);

            // Save payment amount to localStorage so confirmation page can display it correctly
            const bookingCode = currentTransaction.bookingId || '';
            const paymentAmount = currentTransaction.amount || 0;
            if (bookingCode && paymentAmount > 0) {
              try {
                localStorage.setItem('lastBookingCode', bookingCode);
                localStorage.setItem('lastTxnRef', bookingCode);
                localStorage.setItem('lastAmount', String(paymentAmount));
                localStorage.setItem('amount_' + bookingCode, String(paymentAmount));
                localStorage.setItem('finalPaymentAmount', String(paymentAmount));
              } catch (e) {
                console.warn('[Blockchain] Could not save amount to localStorage:', e);
              }
            }

            // Countdown and auto-redirect to confirmation page
            const confirmUrl = `confirmation.html?booking=${bookingCode}&txHash=${encodeURIComponent(txHash)}&method=blockchain`;
            let secs = 5;
            const countdownEl = document.getElementById('redirectCountdown');
            const countdownTpl = getMessage('redirectCountdown', lang_code);
            const setCountdownText = (n) => {
              if (countdownEl) countdownEl.textContent = countdownTpl.replace('{secs}', n);
            };
            setCountdownText(secs);
            const tick = setInterval(() => {
              secs--;
              setCountdownText(secs);
              if (secs <= 0) {
                clearInterval(tick);
                window.location.href = confirmUrl;
              }
            }, 1000);
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

          // Re-enable pay button
          const sendBtn = document.getElementById('payWithCryptoBtn');
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
          }

          return;
        }

        retries++;
        if (retries >= maxRetries) {
          clearInterval(pollInterval_id);
          isProcessing = false;
          currentTransaction.status = 'failed';
          currentTransaction.errorCode = 'timeout';
          showStatus('failed', txHash, 'timeout', getMessage('networkError', lang_code));

          await confirmPaymentToBackend(txHash, 'failed', {
            error_code: 'timeout',
            error_message: getMessage('networkError', lang_code),
          });

          // Re-enable pay button
          const sendBtn = document.getElementById('payWithCryptoBtn');
          if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
          }

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
      const shortHash = txHash ? (txHash.substring(0, 14) + '...' + txHash.substring(txHash.length - 6)) : '-';
      const explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
      const linkHtml = `<a href="${explorerUrl}" target="_blank" title="${txHash}">${shortHash}</a>`;

      if (status === 'pending') {
        const el = document.getElementById('txHashPending');
        const block = document.getElementById('txHashPendingBlock');
        if (el) el.innerHTML = linkHtml;
        if (block) block.style.display = 'block';

      } else if (status === 'success') {
        const el = document.getElementById('txHashSuccess');
        if (el) el.innerHTML = linkHtml;

        // Update redirect button with correct booking + tx params
        const bookingCode = currentTransaction.bookingId || '';
        const paymentAmount = currentTransaction.amount || 0;
        const btn = document.getElementById('viewTicketBtn');
        if (btn) {
          btn.onclick = () => {
            // Save payment amount to localStorage before redirecting
            if (bookingCode && paymentAmount > 0) {
              try {
                localStorage.setItem('lastBookingCode', bookingCode);
                localStorage.setItem('lastTxnRef', bookingCode);
                localStorage.setItem('lastAmount', String(paymentAmount));
                localStorage.setItem('amount_' + bookingCode, String(paymentAmount));
                localStorage.setItem('finalPaymentAmount', String(paymentAmount));
              } catch (e) {
                console.warn('[Blockchain] Could not save amount to localStorage:', e);
              }
            }
            window.location.href = `confirmation.html?booking=${bookingCode}&txHash=${encodeURIComponent(txHash)}&method=blockchain`;
          };
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
        document.getElementById('statusPending').style.display = 'flex';
        if (txHash) displayTransactionHash('pending', txHash);

      } else if (status === 'success') {
        document.getElementById('statusSuccess').style.display = 'flex';
        if (txHash) displayTransactionHash('success', txHash);

      } else if (status === 'failed') {
        document.getElementById('statusFailed').style.display = 'flex';
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

  // ── Status helpers ─────────────────────────────────────────────────────────
  function showStatus(type) {
    // type: 'pending' | 'success' | 'failed'
    var container = document.getElementById('transactionStatusContainer');
    if (container) container.style.display = 'block';

    var pending = document.getElementById('statusPending');
    var success = document.getElementById('statusSuccess');
    var failed  = document.getElementById('statusFailed');

    if (pending) pending.style.display = (type === 'pending') ? 'flex' : 'none';
    if (success) success.style.display = (type === 'success') ? 'flex' : 'none';
    if (failed)  failed.style.display  = (type === 'failed')  ? 'flex' : 'none';
  }

  function resetStatusUI() {
    var container = document.getElementById('transactionStatusContainer');
    if (container) container.style.display = 'none';
    ['statusPending', 'statusSuccess', 'statusFailed'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Public API
  return {
    initializeBlockchainConfig: initializeBlockchainConfig,
    initiatePayment: initiatePayment,
    sendTransaction: sendTransaction,
    showStatus: showStatus,
    resetStatusUI: resetStatusUI,
    getMessage: getMessage,
    // Utility helpers – also used by payment_order.js
    calculateTotal: calculateTotal,
    parseVND: parseVND,
    formatVND: formatVND,
    // Called by payment.js when orderTotalReady fires with the authoritative total
    refreshAmount: function(newTotal) {
      if (!newTotal || newTotal <= 0) return;
      if (!window.PaymentState) window.PaymentState = { discount: 0, discountPercent: 0, bookingCode: '-' };
      window.PaymentState.amount = newTotal;
      console.log('[Blockchain] refreshAmount called with:', newTotal);
      updatePaymentDetails(newTotal);
    },
  };
})();

// Export globally
window.BlockchainPayment = BlockchainPayment;

// ── Auto-refresh crypto panel when payment_order.js finishes rendering ──
// This fires after both DOMContentLoaded handlers have run and the real
// total is written to the DOM and window.PaymentState.
(function () {
  function refreshIfBlockchainActive(total) {
    if (!window.PaymentState) window.PaymentState = { discount: 0, discountPercent: 0, bookingCode: '-' };
    if (total && total > 0) window.PaymentState.amount = total;

    const radio = document.querySelector('input[name="payment"][value="blockchain"]');
    if (!radio || !radio.checked) return;

    if (window.BlockchainPayment && typeof window.BlockchainPayment.initiatePayment === 'function') {
      console.log('[Blockchain] orderTotalReady => re-running initiatePayment, total:', total);
      window.BlockchainPayment.initiatePayment();
    }
  }

  // Fired by payment_order.js after its render() completes
  document.addEventListener('orderTotalReady', function (e) {
    refreshIfBlockchainActive(e && e.detail && e.detail.total);
  });

  // Also handle wallet connecting mid-page
  window.addEventListener('walletStateChanged', function () {
    refreshIfBlockchainActive(window.PaymentState && window.PaymentState.amount);
  });
})();