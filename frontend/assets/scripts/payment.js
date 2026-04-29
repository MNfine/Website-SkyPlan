// Payment page functionality

document.addEventListener('DOMContentLoaded', async function () {
  // Initialize Core Systems
  await initPaymentUI();
});

async function initPaymentUI() {
  console.log('[Payment] Initializing Payment UI...');

  // 1. Initialize Booking Data from LocalStorage
  initializeBookingSummary();

  // 2. Bootstrap/Create Booking Code if missing
  await bootstrapBookingCodeFromPending();

  // 3. Initialize UI Components
  initializePaymentMethods();
  initializeCardFormatting();
  initializePaymentValidation();
  initializeVoucher(); // Added voucher support

  // Sync wallet UI initially
  if (typeof updatePaymentUI === 'function') {
    updatePaymentUI();
  }

  // Listen for global wallet state changes
  window.addEventListener('walletStateChanged', function () {
    if (typeof updatePaymentUI === 'function') {
      updatePaymentUI();
    }
  });

  console.log('[Payment] Payment UI initialized.');
}

function parseVND(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;

  // Remove formatting (dots, commas, currency symbols) and convert to number
  const cleaned = value.toString()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/[^\d]/g, '');

  return Number(cleaned || 0);
}

function initializeBookingSummary() {
  // ── Source-of-truth priority ──────────────────────────────────────────
  // 1. #totalAmount DOM element written by payment_order.js  (most reliable)
  // 2. window.lastAmount set by payment_order.js vnpay block
  // 3. booking payload fields (various key names)
  // ─────────────────────────────────────────────────────────────────────

  function resolveAmount() {
    // 1. DOM total already written by payment_order.js render()
    var totalAmountEl = document.getElementById('totalAmount');
    if (totalAmountEl) {
      var domTotal = parseVND(totalAmountEl.textContent);
      if (domTotal > 0) {
        console.log('[Payment] Using DOM #totalAmount:', domTotal);
        return domTotal;
      }
    }

    // 2. window.lastAmount set by payment_order.js vnpay block
    if (window.lastAmount && window.lastAmount > 0) {
      console.log('[Payment] Using window.lastAmount:', window.lastAmount);
      return window.lastAmount;
    }

    // 3. Booking payload – broad field coverage
    var booking = getBookingCreatePayload();
    if (booking) {
      console.log('[Payment] FULL booking object:', JSON.stringify(booking, null, 2));
      var result = calculateTotal(booking, 0);
      if (result.total > 0) {
        console.log('[Payment] Using calculateTotal from booking:', result.total);
        return result.total;
      }
    }

    console.warn('[Payment] Could not resolve total — defaulting to 0');
    return 0;
  }

  var total = resolveAmount();

  window.PaymentState = {
    amount: total,
    bookingCode: localStorage.getItem('currentBookingCode') || '-',
    discount: 0,
    discountPercent: 0
  };

  console.log('[Payment] PaymentState.amount set to:', total);
  updateSummaryUI();
}

function calculateTotal(booking, discountPercent) {
  discountPercent = discountPercent || 0;
  if (!booking) return { subtotal: 0, discount: 0, total: 0 };

  // Prefer a ready-made backend total
  var backendTotal = parseVND(
    booking.totalCost || booking.totalPrice || booking.total_price || booking.total ||
    booking.totalAmount || booking.total_amount || 0
  );
  if (backendTotal > 0) {
    var disc = Math.round(backendTotal * (discountPercent / 100));
    return { subtotal: backendTotal, discount: disc, total: backendTotal - disc };
  }

  // Sum individual components with broad field-name coverage
  var ticket = parseVND(
    booking.price || booking.ticket_price || booking.ticketPrice ||
    booking.basePrice || booking.base_price || 
    (booking.trip ? (Number(booking.trip.outbound_price || 0) + Number(booking.trip.inbound_price || 0)) : 0) || 0
  );
  var extrasVal = 0;
  if (typeof booking.extras === 'object' && booking.extras !== null) {
    extrasVal = Number(booking.extras.totalCost || booking.extras.total || 0);
  } else {
    extrasVal = parseVND(booking.extras || booking.extraFees || booking.extra_fees || 0);
  }
  var extras = extrasVal;
  var taxes = parseVND(
    booking.tax || booking.taxes || booking.taxAmount || booking.tax_amount ||
    booking.fees || 200000
  );

  var subtotal = ticket + extras + taxes;
  var discount = Math.round(subtotal * (discountPercent / 100));
  var total = subtotal - discount;

  console.log('[Payment] Calculation Detail:', { ticket: ticket, extras: extras, taxes: taxes, subtotal: subtotal, discount: discount, total: total });
  return { subtotal: subtotal, discount: discount, total: total };
}

function formatVND(value) {
  return value.toLocaleString('vi-VN') + " VND";
}

function updateSummaryUI() {
  const totalAmountEl = document.getElementById('totalAmount');
  if (totalAmountEl) totalAmountEl.textContent = formatVND(window.PaymentState.amount);

  const finalAmountEl = document.getElementById('finalAmount');
  if (finalAmountEl) finalAmountEl.textContent = formatVND(window.PaymentState.amount);

  const discountAmountEl = document.getElementById('discountAmount');
  if (discountAmountEl) {
    discountAmountEl.textContent = "-" + formatVND(window.PaymentState.discount);
  }

  const bookingCodeEl = document.getElementById('bookingCode');
  if (bookingCodeEl) bookingCodeEl.textContent = window.PaymentState.bookingCode;

  const cryptoBookingCodeEl = document.getElementById('cryptoBookingCode');
  if (cryptoBookingCodeEl) cryptoBookingCodeEl.textContent = window.PaymentState.bookingCode;
}

// ── AUTHORITATIVE TOTAL from payment_order.js ────────────────────────────────
// payment_order.js reads skyplan_fare_selection from localStorage and is the
// single source of truth for the correct total. It dispatches 'orderTotalReady'
// after it finishes rendering. We listen here to always reflect the real total.
document.addEventListener('orderTotalReady', function(e) {
  var total = e && e.detail && e.detail.total;
  if (!total || total <= 0) {
    console.warn('[Payment] orderTotalReady: invalid total received:', total);
    return;
  }

  if (!window.PaymentState) window.PaymentState = { discount: 0, discountPercent: 0, bookingCode: '-' };
  window.PaymentState.amount = total;

  console.log('[Payment] orderTotalReady: syncing total =>', formatVND(total));

  // Re-render summary with the authoritative total
  updateSummaryUI();

  // Refresh the blockchain ETH estimate if panel is open
  if (typeof BlockchainPayment !== 'undefined' && typeof BlockchainPayment.refreshAmount === 'function') {
    BlockchainPayment.refreshAmount(total);
  }
});
// ─────────────────────────────────────────────────────────────────────────────

window.initPaymentUI = initPaymentUI;




// Global source of truth for payment
window.PaymentState = {
  amount: 0,
  bookingCode: null,
  discount: 0,
  discountPercent: 0
};

let paymentFlowInProgress = false;
let bookingCreateInFlightPromise = null;

function getPaymentLoadingMessage() {
  const lang = localStorage.getItem('preferredLanguage') || 'en';
  return lang === 'en'
    ? 'Processing payment and preparing confirmation...'
    : 'Processing payment and preparing confirmation...';
}

function setPayButtonLocked(locked) {
  const btn = document.getElementById('mainPayBtn') || document.querySelector('.pay-btn');
  if (!btn) return;
  btn.disabled = !!locked;
  btn.style.opacity = locked ? '0.75' : '';
  btn.style.pointerEvents = locked ? 'none' : '';
}

function showPaymentProcessingUI() {
  setPayButtonLocked(true);
  if (window.Loader && typeof window.Loader.show === 'function') {
    window.Loader.show();
  }

  let el = document.getElementById('paymentProcessingHint');
  if (!el) {
    el = document.createElement('div');
    el.id = 'paymentProcessingHint';
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:24px',
      'transform:translateX(-50%)',
      'z-index:100000',
      'background:#0f172a',
      'color:#fff',
      'padding:10px 14px',
      'border-radius:10px',
      'font-size:13px',
      'box-shadow:0 12px 30px rgba(2,6,23,.25)'
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = getPaymentLoadingMessage();
  el.style.display = 'block';
}

function hidePaymentProcessingUI() {
  setPayButtonLocked(false);
  if (window.Loader && typeof window.Loader.hide === 'function') {
    window.Loader.hide();
  }
  const el = document.getElementById('paymentProcessingHint');
  if (el) el.style.display = 'none';
}

function getAuthTokenForPayment() {
  try {
    if (window.AuthState && typeof window.AuthState.getToken === 'function') {
      const token = window.AuthState.getToken();
      if (token) return token;
    }
  } catch (_) { }
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
}

function getBookingCreatePayload() {
  try {
    const pendingRaw = localStorage.getItem('pendingBookingPayload');
    if (pendingRaw) {
      return JSON.parse(pendingRaw);
    }
  } catch (_) { }

  try {
    const completeRaw = localStorage.getItem('completeBookingData');
    if (completeRaw) {
      return JSON.parse(completeRaw);
    }
  } catch (_) { }

  return null;
}

async function createBackendBookingFromLocalData() {
  if (bookingCreateInFlightPromise) {
    return bookingCreateInFlightPromise;
  }

  bookingCreateInFlightPromise = (async function () {
    const payload = getBookingCreatePayload();
    if (!payload) return null;

    const wallet = window.MetaMaskWallet && window.MetaMaskWallet.account;
    if (wallet && !payload.wallet_address && !payload.walletAddress) {
      payload.wallet_address = wallet;
    }

    const token = getAuthTokenForPayment();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
      const resp = await fetch('/api/bookings/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok || !data.success || !data.booking_code) return null;

      localStorage.setItem('currentBookingCode', data.booking_code);
      localStorage.setItem('lastBookingCode', data.booking_code);
      try { localStorage.removeItem('pendingBookingPayload'); } catch (_) { }

      const codeEl = document.getElementById('bookingCode');
      if (codeEl) codeEl.textContent = data.booking_code;

      return data.booking_code;
    } catch (_) {
      return null;
    } finally {
      bookingCreateInFlightPromise = null;
    }
  })();

  return bookingCreateInFlightPromise;
}

async function bootstrapBookingCodeFromPending() {
  try {
    const hasPendingPayload = !!getBookingCreatePayload();

    // New checkout flow must not reuse stale booking codes from older sessions.
    if (hasPendingPayload) {
      const existingCode = localStorage.getItem('currentBookingCode') || localStorage.getItem('lastBookingCode');
      if (existingCode && /^SP\d+/i.test(existingCode)) {
        const codeEl = document.getElementById('bookingCode');
        if (codeEl) codeEl.textContent = existingCode;
        return;
      }

      await createBackendBookingFromLocalData();
      return;
    }

    const existingCode = localStorage.getItem('currentBookingCode');
    if (existingCode && /^SP\d+/i.test(existingCode)) {
      const codeEl = document.getElementById('bookingCode');
      if (codeEl) codeEl.textContent = existingCode;
      return;
    }

    await createBackendBookingFromLocalData();
  } catch (_) {
    // Non-fatal: page can still proceed with existing fallback behavior.
  }
}

function getEffectivePaymentAmount() {
  if (window.PaymentState && window.PaymentState.amount > 0) {
    return window.PaymentState.amount;
  }

  const finalAmountEl = document.getElementById('finalAmount');
  if (finalAmountEl) {
    const amt = parseVND(finalAmountEl.textContent);
    if (amt > 0) return amt;
  }

  const totalAmountEl = document.getElementById('totalAmount');
  if (totalAmountEl) {
    const amt = parseVND(totalAmountEl.textContent);
    if (amt > 0) return amt;
  }

  const booking = getBookingCreatePayload();
  if (booking) {
    const amt = parseVND(booking.total_amount || booking.totalAmount || 0);
    if (amt > 0) return amt;
  }

  return 1598000; // Last resort fallback
}

async function markBookingPaidOnBackend(provider) {
  try {
    await bootstrapBookingCodeFromPending();

    const hasPendingPayload = !!getBookingCreatePayload();
    let bookingCode =
      localStorage.getItem('currentBookingCode') ||
      document.getElementById('bookingCode')?.textContent ||
      '';

    if (!bookingCode && !hasPendingPayload) {
      bookingCode = localStorage.getItem('lastBookingCode') || '';
    }

    if (!bookingCode || !/^SP\d+/i.test(bookingCode)) {
      bookingCode = await createBackendBookingFromLocalData();
      if (!bookingCode) return null;
    }

    const amount = getEffectivePaymentAmount();
    const token = getAuthTokenForPayment();
    const payload = {
      booking_code: bookingCode,
      amount: amount,
      provider: provider || 'manual',
      voucher_code: window.__skyplanAppliedVoucherCode || null,
      wallet_address: (typeof window.MetaMaskWallet !== 'undefined' && window.MetaMaskWallet.account) ? window.MetaMaskWallet.account : null
    };
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    async function postMarkPaid(code) {
      const candidates = ['/api/payment/mark-paid', '/api/payment/mark-paid/', '/api/payments/mark-paid'];
      let lastResponse = null;
      let lastBody = null;
      for (const url of candidates) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...payload, booking_code: code })
          });
          const body = await resp.json().catch(() => ({}));
          lastResponse = resp;
          lastBody = body;
          if (resp.ok && body && body.success) {
            return { response: resp, result: body };
          }
          if (resp.status !== 404) {
            return { response: resp, result: body };
          }
        } catch (_) {
          // try next endpoint candidate
        }
      }
      return { response: lastResponse, result: lastBody || {} };
    }

    let { response, result } = await postMarkPaid(bookingCode);

    // If stored code is stale/fake, create a real booking and retry once.
    if ((response && !response.ok && (response.status === 404 || response.status === 400)) || !result || !result.success) {
      const recreated = await createBackendBookingFromLocalData();
      if (recreated) {
        bookingCode = recreated;
        ({ response, result } = await postMarkPaid(bookingCode));
      }
    }

    if (!response || !response.ok || !result || !result.success) return null;

    const serverCode = result.booking_code || bookingCode;
    localStorage.setItem('currentBookingCode', serverCode);
    localStorage.setItem('lastBookingCode', serverCode);
    window.lastAmount = amount;
    window.lastTxnRef = serverCode;
    return result;
  } catch (_) {
    return null;
  }
}

// Small notification helper: prefer showToast; if it's not loaded, try to load toast.js dynamically once,
// then use showToast. Falls back to alert() when toast is not available or fails to load.
(function () {
  let toastState = 'idle'; // 'idle' | 'loading' | 'ready' | 'failed'
  function ensureToastReady(cb) {
    if (typeof window.showToast === 'function') {
      toastState = 'ready';
      return cb(true);
    }
    if (toastState === 'failed') return cb(false);
    if (toastState === 'loading') {
      // wait for ready or failed
      const waitStart = Date.now();
      const interval = setInterval(() => {
        if (typeof window.showToast === 'function') {
          clearInterval(interval);
          toastState = 'ready';
          cb(true);
        } else if (toastState === 'failed' || Date.now() - waitStart > 5000) {
          clearInterval(interval);
          toastState = 'failed';
          cb(false);
        }
      }, 100);
      return;
    }

    // start loading
    toastState = 'loading';
    const script = document.createElement('script');
    script.src = 'assets/scripts/toast.js';
    script.async = true;
    script.onload = function () {
      if (typeof window.showToast === 'function') {
        toastState = 'ready';
        cb(true);
      } else {
        toastState = 'failed';
        cb(false);
      }
    };
    script.onerror = function () {
      toastState = 'failed';
      cb(false);
    };
    document.head.appendChild(script);
  }

  window.notify = function (msg, type = 'info', duration = 5000) {
    try {
      if (typeof window.showToast === 'function') {
        window.showToast(msg, { type: type, duration: duration });
        return;
      }
      // try to load toast.js and then show
      ensureToastReady(function (ready) {
        if (ready && typeof window.showToast === 'function') {
          try { window.showToast(msg, { type: type, duration: duration }); } catch (e) { alert(msg); }
        } else {
          alert(msg);
        }
      });
    } catch (e) {
      try { alert(msg); } catch (er) { /* ignore */ }
    }
  };
})();

// Initialize payment method selection
function initializePaymentMethods() {
  const paymentMethods = document.querySelectorAll('.payment-method');
  const radioButtons = document.querySelectorAll('input[name="payment"]');

  // Initial sync: set default based on checked radio
  const initialChecked = document.querySelector('input[name="payment"]:checked');
  if (initialChecked) {
    console.log('[Payment] Initial method:', initialChecked.value);
    paymentMethods.forEach(method => {
      method.classList.remove('active');
      const content = method.querySelector('.method-content');
      if (content) content.style.display = 'none';
    });
    const selectedMethod = initialChecked.closest('.payment-method');
    if (selectedMethod) {
      selectedMethod.classList.add('active');
      const content = selectedMethod.querySelector('.method-content');
      if (content) content.style.display = 'block';
    }
  }

  radioButtons.forEach(radio => {
    radio.addEventListener('change', function () {
      console.log('[Payment] Method changed to:', this.value);
      console.log("WalletState:", window.WalletState);
      console.log("SelectedMethod:", this.value);
      paymentMethods.forEach(method => {
        method.classList.remove('active');
        const content = method.querySelector('.method-content');
        if (content) content.style.display = 'none';
      });

      // Add active class to selected method and show its content
      const selectedMethod = this.closest('.payment-method');
      if (selectedMethod) {
        selectedMethod.classList.add('active');
        const content = selectedMethod.querySelector('.method-content');
        if (content) content.style.display = 'block';
      }

      // Sync global UI (button visibility, etc.)
      if (typeof updatePaymentUI === 'function') {
        updatePaymentUI();
      }
    });
  });

  // Make payment methods clickable
  paymentMethods.forEach(method => {
    const header = method.querySelector('.method-header');
    if (header) {
      header.addEventListener('click', function () {
        const radio = method.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    }
  });
}

// Initialize card number formatting
function initializeCardFormatting() {
  const cardNumberInput = document.getElementById('cardNumber');
  const expiryDateInput = document.getElementById('expiryDate');
  const cvvInput = document.getElementById('cvv');

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function (e) {
      let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;

      if (formattedValue.length > 19) {
        formattedValue = formattedValue.substring(0, 19);
      }

      e.target.value = formattedValue;
      if (typeof window.updatePayBtn === 'function') { try { window.updatePayBtn(); } catch (_) { } }
    });
  }

  if (expiryDateInput) {
    expiryDateInput.addEventListener('input', function (e) {
      // Keep only digits, format visually as MM/YY without auto-correcting
      let digits = e.target.value.replace(/\D/g, '').slice(0, 4);
      const mm = digits.slice(0, 2);
      const yy = digits.slice(2, 4);
      e.target.value = mm + (yy ? '/' + yy : (digits.length > 2 ? '/' : ''));
      // Update pay button lock state while typing
      if (typeof window.updatePayBtn === 'function') {
        try { window.updatePayBtn(); } catch (_) { }
      }
    });
  }

  if (cvvInput) {
    cvvInput.addEventListener('input', function (e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = value;
      if (typeof window.updatePayBtn === 'function') { try { window.updatePayBtn(); } catch (_) { } }
    });
  }
  // Also watch card name to toggle lock
  const cardNameInput = document.getElementById('cardName');
  if (cardNameInput) {
    cardNameInput.addEventListener('input', function () {
      if (typeof window.updatePayBtn === 'function') { try { window.updatePayBtn(); } catch (_) { } }
    });
  }
}

// Initialize payment validation and submission
function initializePaymentValidation() {
  const payBtn = document.querySelector('.pay-btn');

  if (payBtn) {
    payBtn.addEventListener('click', function (e) {
      e.preventDefault();

      if (paymentFlowInProgress) {
        return;
      }

      const selectedPayment = document.querySelector('input[name="payment"]:checked');

      if (!selectedPayment) {
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('selectPaymentMethod', lang) : 'Please select a payment method';
        notify(msg, 'info', 4000);
        return;
      }

      switch (selectedPayment.value) {
        case 'card':
          if (validateCardForm()) {
            processCardPayment();
          }
          break;
        case 'bank':
          processBankTransfer();
          break;
        case 'ewallet':
          processEWalletPayment();
          break;
        case 'blockchain':
          processBlockchainPayment();
          break;
      }
    });
  }
}

// Validate card form
function validateCardForm() {
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiryDate = document.getElementById('expiryDate').value;
  const cvv = document.getElementById('cvv').value;
  const cardName = document.getElementById('cardName').value;

  if (!cardNumber || cardNumber.length < 13) {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCardNumber', lang) : 'Please enter a valid card number';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidExpiryDate', lang) : 'Please enter a valid expiry date (MM/YY)';
    notify(msg, 'info', 4000);
    return false;
  }
  // Validate month range and expiration
  const lang = localStorage.getItem('preferredLanguage') || 'en';
  const mm = parseInt(expiryDate.slice(0, 2), 10);
  const yy = parseInt(expiryDate.slice(3, 5), 10);
  if (mm < 1 || mm > 12) {
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidMonth', lang) : 'Please enter a valid month (01-12)';
    notify(msg, 'info', 4000);
    return false;
  }
  const fullYear = 2000 + yy; // YY → 20YY
  const now = new Date();
  const exp = new Date(fullYear, mm - 1, 1);
  // consider valid if current month or later
  if (exp.getFullYear() < now.getFullYear() || (exp.getFullYear() === now.getFullYear() && exp.getMonth() < now.getMonth())) {
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('cardExpired', lang) : 'Card expired';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!cvv || cvv.length < 3) {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCVV', lang) : 'Please enter a valid CVV code';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!cardName.trim()) {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCardName', lang) : 'Please enter name on card';
    notify(msg, 'info', 4000);
    return false;
  }

  return true;
}

// Non-intrusive validity check used to enable/disable unlock icon (no toasts)
function isCardFormValid() {
  const numberEl = document.getElementById('cardNumber');
  const expiryEl = document.getElementById('expiryDate');
  const cvvEl = document.getElementById('cvv');
  const nameEl = document.getElementById('cardName');
  if (!numberEl || !expiryEl || !cvvEl || !nameEl) return false;
  const cardNumber = numberEl.value.replace(/\s/g, '');
  const expiry = expiryEl.value.trim();
  const cvv = cvvEl.value.trim();
  const name = nameEl.value.trim();
  if (!cardNumber || cardNumber.length < 13) return false;
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const mm = parseInt(expiry.slice(0, 2), 10);
  const yy = parseInt(expiry.slice(3, 5), 10);
  if (isNaN(mm) || mm < 1 || mm > 12) return false;
  const fullYear = 2000 + (isNaN(yy) ? 0 : yy);
  const now = new Date();
  const exp = new Date(fullYear, mm - 1, 1);
  if (exp.getFullYear() < now.getFullYear() || (exp.getFullYear() === now.getFullYear() && exp.getMonth() < now.getMonth())) return false;
  if (!cvv || cvv.length < 3) return false;
  if (!name) return false;
  return true;
}

try { window.isCardFormValid = isCardFormValid; } catch (_) { }

// Process card payment
function processCardPayment() {
  if (paymentFlowInProgress) return;
  paymentFlowInProgress = true;
  showPaymentProcessingUI();
  showLoadingState();

  // Simulate payment processing
  setTimeout(async () => {
    hideLoadingState();
    await showPaymentSuccess('card');
  }, 2000);
}

// Process bank transfer
async function processBankTransfer() {
  if (paymentFlowInProgress) return;
  paymentFlowInProgress = true;
  showPaymentProcessingUI();
  await showPaymentSuccess('bank');
}

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
 * Calculate ETH from VND using real-time price
 */
async function calculateETH(amountVND) {
  const price = await getETHPrice();
  if (!amountVND || amountVND <= 0) {
    return "0.000000";
  }
  const eth = amountVND / price;
  return eth.toFixed(6);
}

// Process e-wallet payment
function processEWalletPayment() {
  const lang = localStorage.getItem('preferredLanguage') || 'en';
  const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('selectEwallet', lang) : 'Please select an e-wallet to continue';
  notify(msg, 'info', 4000);
}

// E-wallet button handlers
document.addEventListener('DOMContentLoaded', function () {
  const ewalletBtns = document.querySelectorAll('.ewallet-btn');

  ewalletBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const walletName = this.querySelector('span').textContent;

      // Select e-wallet radio button
      const ewalletRadio = document.getElementById('ewallet');
      ewalletRadio.checked = true;
      ewalletRadio.dispatchEvent(new Event('change'));

      // Show selected wallet using toast
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const msg = (lang === 'vi') ? `Đã chọn ${walletName}. Nhấn "Thanh toán với ${walletName}" để tiếp tục.` : `Selected ${walletName}. Click "Pay with ${walletName}" to continue.`;
      notify(msg, 'info', 5000);
    });
  });
});

// Show loading state
function showLoadingState() {
  const payBtn = document.querySelector('.pay-btn');
  if (!payBtn) return;
  payBtn.disabled = true;
  // keep icon and update text using translation helper if available
  const iconHtml = '<i class="fas fa-spinner fa-spin"></i>';
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const text = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('processing', lang) : 'Đang xử lý...';
  payBtn.innerHTML = iconHtml + '<span>' + text + '</span>';
}

// Hide loading state
function hideLoadingState() {
  const payBtn = document.querySelector('.pay-btn');
  if (!payBtn) return;
  payBtn.disabled = false;
  const iconHtml = '<i class="fas fa-lock"></i>';
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const text = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('payNow', lang) : 'Thanh toán ngay';
  payBtn.innerHTML = iconHtml + '<span>' + text + '</span>';
}

// Show payment success
async function showPaymentSuccess(provider = 'manual') {
  if (!paymentFlowInProgress) {
    paymentFlowInProgress = true;
    showPaymentProcessingUI();
  }

  const persisted = await markBookingPaidOnBackend(provider);
  if (!persisted) {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    const msg = (lang === 'vi')
      ? 'Không thể xác nhận booking trên hệ thống. Vui lòng quay lại bước trước và thử lại.'
      : 'Could not persist booking confirmation. Please go back and try again.';
    notify(msg, 'error', 6000);
    paymentFlowInProgress = false;
    hidePaymentProcessingUI();
    return;
  }

  // Save successful payment status for each booking code
  // Get booking code (bookingCode) and amount
  const bookingCode = localStorage.getItem('currentBookingCode') || document.getElementById('bookingCode')?.textContent || window.lastTxnRef || '';
  const amount = getEffectivePaymentAmount();
  if (bookingCode) {
    localStorage.setItem('paid_' + bookingCode, 'true');
    localStorage.setItem('amount_' + bookingCode, amount);
    localStorage.setItem('lastBookingCode', bookingCode);
  }

  if (window.__skyplanAppliedVoucherCode) {
    try {
      const key = 'skyplanRedeemVouchers';
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = Array.isArray(current)
        ? current.filter((item) => String(item?.code || '').toUpperCase() !== String(window.__skyplanAppliedVoucherCode).toUpperCase())
        : [];
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (_) { }
    window.__skyplanAppliedVoucherCode = null;
    localStorage.removeItem('skyplanAppliedVoucherCode');
  }
  localStorage.setItem('lastTxnRef', bookingCode);
  localStorage.setItem('lastAmount', amount);
  try { localStorage.removeItem('pendingBookingPayload'); } catch (_) { }

  // Show loader before redirect
  if (window.Loader) {
    window.Loader.show();
    setTimeout(function () {
      window.location.href = 'confirmation.html';
    }, 1500);
  } else {
    window.location.href = 'confirmation.html';
  }
}

// E-wallet selection functionality
document.addEventListener('DOMContentLoaded', function () {
  const ewalletBtns = document.querySelectorAll('.ewallet-btn');
  const vnpayForm = document.getElementById('vnpayForm');

  ewalletBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      // Remove active class from all buttons
      ewalletBtns.forEach(b => b.classList.remove('active'));

      // Add active class to selected button
      this.classList.add('active');

      // Show VNPay form if VNPay is selected
      const wallet = this.getAttribute('data-wallet');
      if (wallet === 'vnpay') {
        vnpayForm.style.display = 'block';
      } else {
        vnpayForm.style.display = 'none';
      }
    });
  });
});

// VNPay Integration with Python Backend
function processVNPayPayment() {
  const amount = 1598000; // Amount in VND
  const orderInfo = 'Ve may bay HAN-SGN';

  let bookingCode = 'SP';
  try {
    bookingCode = document.getElementById('bookingCode').textContent || 'SP';
  } catch (e) {
    if (window.SkyPlanDebug) console.error('Booking code element not found, using default');
  }

  const btnElement = event.target.closest('.vnpay-checkout-btn');
  const originalContent = btnElement.innerHTML;
  btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang kết nối VNPay...</span>';
  btnElement.disabled = true;

  const paymentData = {
    orderInfo: orderInfo,
    amount: amount,
    txnRef: bookingCode + '_' + Date.now()
  };

  const apiEndpoint = window.SkyPlanConfig?.getApiEndpoints().vnpayCreate || 'http://localhost:5000/api/payment/vnpay/create';

  fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error(data.error || 'Không thể tạo thanh toán VNPay');
      }
    })
    .catch(error => {
      if (window.SkyPlanDebug) console.error('VNPay Error:', error);
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const prefix = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('errorPrefix', lang) : 'Lỗi: ';
      notify(prefix + error.message, 'error', 6000);
      btnElement.innerHTML = originalContent;
      btnElement.disabled = false;
    });
}

// Simulate VNPay for testing (when backend is not available)
function simulateVNPayTest(paymentData) {
  const btnElement = event.target.closest('.vnpay-checkout-btn');

  // Show VNPay test interface
  const testWindow = window.open('', 'vnpay_test', 'width=600,height=700');
  testWindow.document.write(`
    <html>
      <head>
        <title>VNPay Test Environment</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .logo { text-align: center; color: #1e88e5; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .amount { font-size: 28px; color: #d32f2f; text-align: center; margin: 20px 0; }
          .info { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .btn { width: 100%; padding: 15px; background: #1e88e5; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 10px 0; }
          .btn:hover { background: #1565c0; }
          .btn-cancel { background: #757575; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🏦 VNPAY TEST</div>
          <div class="amount">${paymentData.amount.toLocaleString('vi-VN')} VND</div>
          <div class="info">
            <strong>Nội dung:</strong> ${paymentData.orderInfo}<br>
            <strong>Mã giao dịch:</strong> ${paymentData.txnRef}
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">
            Đây là môi trường test. Trong thực tế, bạn sẽ nhập thông tin thẻ/ngân hàng.
          </p>
          <button class="btn" onclick="completePayment()">✅ Thanh toán thành công</button>
          <button class="btn btn-cancel" onclick="cancelPayment()">❌ Hủy thanh toán</button>
        </div>
        
        <script>
          function completePayment() {
            window.opener.postMessage({
              type: 'vnpay_success',
              txnRef: '${paymentData.txnRef}',
              amount: ${paymentData.amount}
            }, '*');
            window.close();
          }
          
          function cancelPayment() {
            window.opener.postMessage({
              type: 'vnpay_cancel'
            }, '*');
            window.close();
          }
        </script>
      </body>
    </html>
  `);

  // Listen for messages from test window
  window.addEventListener('message', function (event) {
    if (event.data.type === 'vnpay_success') {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const successMsg = (lang === 'vi') ? `✅ Thanh toán VNPay thành công!\nMã giao dịch: ${event.data.txnRef}` : `✅ VNPay payment successful!\nTxn: ${event.data.txnRef}`;
      // Use notify wrapper which will dynamically load toast.js if needed
      notify(successMsg, 'success', 4000);
      showPaymentSuccess();
    } else if (event.data.type === 'vnpay_cancel') {
      // Reset button
      btnElement.innerHTML = '<i class="fas fa-credit-card"></i><span>Thanh toán với VNPay</span>';
      btnElement.disabled = false;
    }
  });
}

// Helper function to create VNPay URL (simplified for demo)
function createVNPayURL(params) {
  const vnpayGateway = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const queryString = Object.keys(params)
    .sort()
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');

  // In production, you need to add secure hash (vnp_SecureHash)
  // This should be done on backend with your secret key
  return `${vnpayGateway}?${queryString}`;
}

// Helper function to format date for VNPay
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// --- LOCK ICON UI UPDATE (no duplicate validators) ---

// Handle payment button UI changes
function updatePayBtnUI() {
  const payBtn = document.querySelector('.pay-btn');
  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (!payBtn || !selectedPayment) return;
  const mainPayBtn = document.getElementById('mainPayBtn');
  const mainPayBtnText = document.getElementById('mainPayBtnText');
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  if (!mainPayBtn) return;
  if (selectedPayment.value === 'card') {
    mainPayBtn.style.display = '';
    mainPayBtn.style.background = '';
    mainPayBtn.style.color = '';
    if (mainPayBtnText) {
      // choose icon only when card form invalid
      const formValid = (typeof window.isCardFormValid === 'function') ? window.isCardFormValid() : false;
      if (formValid) {
        // when form valid, remove lock icon
        mainPayBtnText.textContent = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('payNow', lang) : 'Thanh toán ngay';
        const icon = mainPayBtn.querySelector('i');
        if (icon) icon.remove();
      } else {
        // when invalid, ensure lock icon exists
        mainPayBtnText.textContent = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('payNow', lang) : 'Thanh toán ngay';
        let icon = mainPayBtn.querySelector('i');
        if (!icon) {
          icon = document.createElement('i');
          icon.className = 'fas fa-lock';
          mainPayBtn.insertBefore(icon, mainPayBtn.firstChild);
        } else {
          icon.className = 'fas fa-lock';
        }
      }
    }
  } else if (selectedPayment.value === 'bank') {
    mainPayBtn.style.display = '';
    mainPayBtn.style.background = '#ff9800';
    mainPayBtn.style.color = '#fff';
    if (mainPayBtnText) {
      mainPayBtnText.textContent = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('bankConfirm', lang) : 'Đến trang xác nhận';
    }
    // remove icon for bank confirmation
    const iconEl = mainPayBtn.querySelector('i');
    if (iconEl) iconEl.remove();
  } else if (selectedPayment.value === 'ewallet') {
    mainPayBtn.style.display = 'none';
  } else {
    mainPayBtn.style.display = '';
    mainPayBtn.style.background = '';
    mainPayBtn.style.color = '';
    if (mainPayBtnText) mainPayBtnText.textContent = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('payNow', lang) : 'Thanh toán ngay';
  }
  // Do not call page-level updater here to avoid conflicting DOM updates
}

// Monitor card input changes to update button
function listenCardFormChange() {
  ['cardNumber', 'expiryDate', 'cvv', 'cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePayBtnUI);
  });
}

// make sure input changes also trigger the page-level updater (in case it's preferred)
document.addEventListener('DOMContentLoaded', function () {
  ['cardNumber', 'expiryDate', 'cvv', 'cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () {
      try { if (typeof window.updatePayBtn === 'function') window.updatePayBtn(); } catch (e) { }
    });
  });
});

// Theo dõi thay đổi phương thức thanh toán
function listenPaymentMethodChange() {
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', updatePayBtnUI);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  listenCardFormChange();
  listenPaymentMethodChange();
  updatePayBtnUI();
  initializeVoucher();
});

// Voucher functionality
function initializeVoucher() {
  const voucherInput = document.getElementById('voucherInput') || document.getElementById('voucherCode');
  const applyBtn = document.getElementById('applyVoucherBtn') || document.getElementById('applyVoucher');
  const voucherMessage = document.getElementById('voucherMessage');
  const voucherDiscount = document.getElementById('voucherDiscount');
  const voucherListEl = document.getElementById('dynamicVoucherList');

  if (!voucherInput || !applyBtn) return;

  function getVoucherLang() {
    if (typeof window.getCurrentLanguage === 'function') {
      const current = String(window.getCurrentLanguage() || '').toLowerCase();
      if (current === 'en' || current === 'vi') return current;
    }
    const preferred = String(localStorage.getItem('preferredLanguage') || localStorage.getItem('language') || '').toLowerCase();
    if (preferred === 'en' || preferred === 'vi') return preferred;
    return String(document.documentElement.lang || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';
  }

  // Voucher codes and their conditions
  const baseVouchers = {
    'XMAS10': {
      type: 'percentage',
      value: 10,
      minAmount: 0,
      description: 'Giảm 10% tổng đơn hàng'
    },
    'NOEL200': {
      type: 'fixed',
      value: 200000,
      minAmount: 1500000,
      description: 'Giảm 200.000 VND cho đơn từ 1.500.000 VND'
    },
    'EARLY200': {
      type: 'fixed',
      value: 200000,
      minAmount: 2000000,
      description: 'Giảm 200.000 VND cho đơn từ 2.000.000 VND'
    }
  };

  function getDynamicRedeemVouchers() {
    try {
      const key = 'skyplanRedeemVouchers';
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(raw)) return {};

      const now = Date.now();
      const map = {};
      const validList = [];

      raw.forEach((item) => {
        const code = String(item?.code || '').trim().toUpperCase();
        const type = String(item?.type || 'fixed').toLowerCase();
        const value = Number(item?.value || 0);
        const minAmount = Number(item?.minAmount || item?.min_amount || 0);
        const expiresAt = item?.expiresAt || item?.expires_at || null;
        const expiryMs = expiresAt ? new Date(expiresAt).getTime() : null;
        const isExpired = Number.isFinite(expiryMs) ? expiryMs < now : false;

        if (!code || !Number.isFinite(value) || value <= 0 || isExpired) {
          return;
        }

        const normalized = {
          type: type === 'percentage' ? 'percentage' : 'fixed',
          value,
          minAmount: Number.isFinite(minAmount) ? minAmount : 0,
          description: item?.description || `Voucher SKY ${code}`,
          source: item?.source || 'sky_redeem',
          expiresAt,
        };

        map[code] = normalized;
        validList.push({ code, ...normalized });
      });

      localStorage.setItem('skyplanRedeemVouchers', JSON.stringify(validList));
      return map;
    } catch (_) {
      return {};
    }
  }

  function updateAvailableVoucherHint(voucherMap) {
    const hintEl = document.querySelector('[data-i18n="availableVouchers"]');
    if (!hintEl) return;
    const codes = Object.keys(voucherMap);
    if (!codes.length) return;

    const lang = getVoucherLang();
    const codeList = codes.slice(0, 8).join(', ');
    hintEl.textContent = lang === 'en' ? `Available codes: ${codeList}` : `Mã khả dụng: ${codeList}`;
  }

  function renderDynamicVoucherList(voucherMap) {
    if (!voucherListEl) return;
    const entries = Object.entries(voucherMap)
      .filter(([code]) => code.startsWith('SKYDIS') || code.startsWith('SKYUP'));

    if (!entries.length) {
      voucherListEl.innerHTML = '';
      return;
    }

    const lang = getVoucherLang();
    const title = (typeof getPaymentTranslation === 'function')
      ? getPaymentTranslation('redeemedSkyVouchersTitle', lang)
      : (lang === 'en' ? 'Redeemed SKY vouchers:' : 'Voucher từ SKY đã đổi:');
    const useLabel = lang === 'en' ? 'Use' : 'Dùng mã';

    voucherListEl.innerHTML = `<small class="dynamic-voucher-title">${title}</small>`;
    entries.slice(0, 6).forEach(([code, voucher]) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dynamic-voucher-chip';
      const valueText = formatCurrency(Number(voucher.value || 0));
      item.textContent = `${code} (${valueText})`;
      item.title = `${useLabel}: ${code}`;
      item.addEventListener('click', () => {
        voucherInput.value = code;
      });
      voucherListEl.appendChild(item);
    });
  }

  let vouchers = {
    ...baseVouchers,
    ...getDynamicRedeemVouchers(),
  };
  updateAvailableVoucherHint(vouchers);
  renderDynamicVoucherList(vouchers);

  document.addEventListener('languageChanged', function () {
    updateAvailableVoucherHint(vouchers);
    renderDynamicVoucherList(vouchers);
  });

  async function syncServerVouchers() {
    try {
      const token = (typeof getAuthTokenForPayment === 'function') ? getAuthTokenForPayment() : '';
      if (!token) return;

      const response = await fetch('/api/bookings/redeem-vouchers', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const result = await response.json();
      if (!result.success || !Array.isArray(result.vouchers)) return;

      const serverMap = {};
      const normalizedList = [];
      result.vouchers.forEach((item) => {
        const code = String(item?.code || '').trim().toUpperCase();
        const value = Number(item?.value || 0);
        const minAmount = Number(item?.min_amount || item?.minAmount || 0);
        if (!code || !Number.isFinite(value) || value <= 0) return;

        const normalized = {
          type: String(item?.type || 'fixed').toLowerCase() === 'percentage' ? 'percentage' : 'fixed',
          value,
          minAmount: Number.isFinite(minAmount) ? minAmount : 0,
          description: item?.description || `Voucher SKY ${code}`,
          source: 'sky_redeem_server',
          expiresAt: item?.expires_at || item?.expiresAt || null,
        };

        serverMap[code] = normalized;
        normalizedList.push({ code, ...normalized });
      });

      if (!Object.keys(serverMap).length) return;

      try {
        localStorage.setItem('skyplanRedeemVouchers', JSON.stringify(normalizedList.slice(0, 50)));
      } catch (_) { }

      vouchers = {
        ...vouchers,
        ...serverMap,
      };
      updateAvailableVoucherHint(vouchers);
      renderDynamicVoucherList(vouchers);
    } catch (_) {
      // fallback silently to localStorage vouchers only
    }
  }

  syncServerVouchers();

  let appliedVoucher = null;
  const originalAmount = parseFloat(document.getElementById('totalAmount').textContent.replace(/[^\d]/g, ''));

  applyBtn.addEventListener('click', function () {
    const code = voucherInput.value.trim().toUpperCase();

    if (!code) {
      showVoucherMessage('Vui lòng nhập mã voucher', 'error');
      return;
    }

    const voucher = vouchers[code];
    if (!voucher) {
      showVoucherMessage('Mã voucher không hợp lệ', 'error');
      return;
    }

    if (originalAmount < voucher.minAmount) {
      const minAmountText = formatCurrency(voucher.minAmount);
      showVoucherMessage(`Đơn hàng phải từ ${minAmountText} để áp dụng mã này`, 'error');
      return;
    }

    // Apply voucher
    appliedVoucher = { code, ...voucher };
    window.__skyplanAppliedVoucherCode = code;
    localStorage.setItem('skyplanAppliedVoucherCode', code);
    const discount = Math.round(calculateDiscount(originalAmount, voucher));
    const finalAmount = originalAmount - discount;

    // Update state so payment gets correct final amount
    if (window.PaymentState) {
      window.PaymentState.amount = finalAmount;
      window.PaymentState.discount = discount;
      window.PaymentState.discountPercent = voucher.type === 'percentage' ? voucher.value : 0;
    }

    // Update UI
    document.getElementById('discountAmount').textContent = `-${formatCurrency(discount)}`;
    document.getElementById('finalAmount').textContent = formatCurrency(finalAmount);
    voucherDiscount.classList.remove('hidden');

    showVoucherMessage(`✓ Áp dụng thành công: ${voucher.description}`, 'success');
    voucherInput.disabled = true;
    applyBtn.textContent = 'Đã áp dụng';
    applyBtn.disabled = true;

    // Add remove button
    addRemoveVoucherButton();
  });

  function calculateDiscount(amount, voucher) {
    if (voucher.type === 'percentage') {
      return Math.round(amount * voucher.value / 100);
    } else {
      return Math.min(amount, voucher.value);
    }
  }

  function showVoucherMessage(message, type) {
    voucherMessage.textContent = message;
    voucherMessage.className = `voucher-message ${type}`;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount).replace(/₫/g, ' VND');
  }

  function addRemoveVoucherButton() {
    // Check if the button already exists
    if (document.querySelector('.remove-voucher-btn')) {
      return;
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Hủy mã';
    removeBtn.className = 'remove-voucher-btn';

    removeBtn.addEventListener('click', function () {
      // Reset voucher
      appliedVoucher = null;
      window.__skyplanAppliedVoucherCode = null;
      localStorage.removeItem('skyplanAppliedVoucherCode');
      
      // Reset state
      if (window.PaymentState) {
        window.PaymentState.amount = originalAmount;
        window.PaymentState.discount = 0;
        window.PaymentState.discountPercent = 0;
      }

      voucherDiscount.classList.add('hidden');
      document.getElementById('finalAmount').textContent = formatCurrency(originalAmount);
      
      voucherInput.value = '';
      voucherInput.disabled = false;
      applyBtn.textContent = 'Áp dụng';
      applyBtn.disabled = false;
      showVoucherMessage('', '');
      removeBtn.remove();
    });

    applyBtn.parentNode.appendChild(removeBtn);
  }
}

// ==================== BLOCKCHAIN/CRYPTO PAYMENT ====================

/**
 * Process blockchain (MetaMask) payment
 */
function processBlockchainPayment() {
  const lang = localStorage.getItem('preferredLanguage') || 'vi';

  // Check if MetaMask is initialized and connected
  if (typeof MetaMaskWallet === 'undefined') {
    const msg = (lang === 'vi') ? 'Lỗi: MetaMask chưa được khởi tạo' : 'Error: MetaMask not initialized';
    notify(msg, 'error', 5000);
    return;
  }

  if (!MetaMaskWallet.isConnected) {
    const msg = (lang === 'vi') ? 'Vui lòng kết nối ví MetaMask trước tiên' : 'Please connect MetaMask wallet first';
    notify(msg, 'warning', 5000);
    return;
  }

  // Show blockchain payment details
  const cryptoPaymentDetails = document.getElementById('cryptoPaymentDetails');
  const transactionStatusContainer = document.getElementById('transactionStatusContainer');

  if (cryptoPaymentDetails) {
    cryptoPaymentDetails.style.display = 'block';
  }

  // Call blockchain payment handler from blockchain-payment.js
  if (typeof BlockchainPayment !== 'undefined' && typeof BlockchainPayment.initiatePayment === 'function') {
    BlockchainPayment.initiatePayment();
  } else {
    const msg = (lang === 'vi') ? 'Lỗi: Module thanh toán blockchain chưa được tải' : 'Error: Blockchain payment module not loaded';
    notify(msg, 'error', 5000);
  }
}

// Export function globally
window.processBlockchainPayment = processBlockchainPayment;

/**
 * Synchronize payment section UI with global wallet state
 */


function updatePaymentUI() {
  const connectBtn = document.getElementById("connectWalletBtn");
  const payWithCryptoBtn = document.getElementById("payWithCryptoBtn");
  const mainPayBtn = document.getElementById("mainPayBtn");
  const walletStatus = document.getElementById("walletStatus");
  const walletAddress = document.getElementById("walletAddress");
  const cryptoDetails = document.getElementById("cryptoPaymentDetails");

  const selectedRadio = document.querySelector('input[name="payment"]:checked');
  const selectedMethod = selectedRadio ? selectedRadio.value : 'card';

  const isConnected = !!(window.WalletState && window.WalletState.isConnected);
  const account = window.WalletState && window.WalletState.account;

  console.log("Method:", selectedMethod);
  console.log("Wallet connected:", isConnected);

  // Hide all by default
  if (mainPayBtn) mainPayBtn.style.display = 'none';
  if (connectBtn) connectBtn.style.display = 'none';
  if (payWithCryptoBtn) payWithCryptoBtn.style.display = 'none';
  if (walletStatus) walletStatus.style.display = 'none';
  if (cryptoDetails) cryptoDetails.style.display = 'none';

  if (selectedMethod === 'blockchain') {
    // CRYPTO METHOD
    if (isConnected) {
      if (walletStatus) walletStatus.style.display = 'block';
      if (walletAddress) walletAddress.textContent = account || '0x...';
      if (cryptoDetails) cryptoDetails.style.display = 'block';
      // Show the Send Transaction button immediately; blockchain-payment.js
      // will also show/configure it after its async ETH fetch completes.
      if (payWithCryptoBtn) payWithCryptoBtn.style.display = 'block';

      // Ensure PaymentState.amount is in sync with the DOM total written by payment_order.js.
      // Both scripts fire on DOMContentLoaded and payment_order.js may finish its render()
      // after initializeBookingSummary() already ran with amount=0.
      if (!window.PaymentState || window.PaymentState.amount <= 0) {
        const totalEl = document.getElementById('totalAmount');
        const domTotal = totalEl ? parseVND(totalEl.textContent) : 0;
        if (domTotal > 0) {
          if (!window.PaymentState) window.PaymentState = { bookingCode: '-', discount: 0, discountPercent: 0 };
          window.PaymentState.amount = domTotal;
          console.log('[Payment] updatePaymentUI synced PaymentState.amount from DOM:', domTotal);
        }
      }

      // Sync booking code in case it was set after PaymentState was initialised
      if (window.PaymentState && (!window.PaymentState.bookingCode || window.PaymentState.bookingCode === '-')) {
        window.PaymentState.bookingCode = localStorage.getItem('currentBookingCode') || '-';
      }

      // Trigger blockchain payment flow (populates ETH, VND, booking code labels)
      if (typeof BlockchainPayment !== 'undefined' && typeof BlockchainPayment.initiatePayment === 'function') {
        BlockchainPayment.initiatePayment();
      }
    } else {
      if (connectBtn) connectBtn.style.display = 'block';
    }
  } else {
    // STANDARD METHODS
    if (mainPayBtn) mainPayBtn.style.display = 'block';
  }
}

// Export globally
window.updatePaymentUI = updatePaymentUI;