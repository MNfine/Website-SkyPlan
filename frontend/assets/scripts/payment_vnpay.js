/**
 * VNPay Integration Tool for SkyPlan
 * Add to payment.html to integrate VNPay payment
 */

document.addEventListener('DOMContentLoaded', function() {
  function getAuthToken() {
    try {
      if (window.AuthState && typeof window.AuthState.getToken === 'function') {
        const token = window.AuthState.getToken();
        if (token) return token;
      }
    } catch (_) { }
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
  }

  async function ensureBackendBookingCode() {
    const existing = localStorage.getItem('currentBookingCode') || localStorage.getItem('lastBookingCode');
    if (existing && /^SP\d+/i.test(existing)) return existing;

    const pending = localStorage.getItem('pendingBookingPayload');
    if (!pending) return existing || null;

    const payload = JSON.parse(pending);
    const wallet = window.MetaMaskWallet && window.MetaMaskWallet.account;
    if (wallet && !payload.wallet_address && !payload.walletAddress) {
      payload.wallet_address = wallet;
    }

    const token = getAuthToken();
    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, (token ? { 'Authorization': `Bearer ${token}` } : {})),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok || !json || !json.success || !json.booking_code) return existing || null;

    const code = json.booking_code;
    localStorage.setItem('currentBookingCode', code);
    localStorage.setItem('lastBookingCode', code);
    localStorage.setItem('bookingSource', 'backend');
    try { localStorage.removeItem('pendingBookingPayload'); } catch (_) {}
    return code;
  }

  // VNPay Integration
  async function processVNPayPayment(eventArg) {
    // Get final amount from DOM - check if voucher was applied
    let amount = 1598000; // Default fallback
    
    // Try to get finalAmount first (after voucher discount)
    const finalAmountEl = document.getElementById('finalAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (finalAmountEl && finalAmountEl.textContent) {
      // Parse amount from finalAmount (after voucher)
      const parsedFinal = parseFloat(finalAmountEl.textContent.replace(/[^\d]/g, ''));
      if (!isNaN(parsedFinal) && parsedFinal > 0) {
        amount = parsedFinal;
        console.log('VNPay using finalAmount (after voucher):', amount);
      }
    } else if (totalAmountEl && totalAmountEl.textContent) {
      // Fallback to totalAmount (before voucher)
      const parsedTotal = parseFloat(totalAmountEl.textContent.replace(/[^\d]/g, ''));
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        amount = parsedTotal;
        console.log('VNPay using totalAmount (no voucher):', amount);
      }
    }
    
    // Save final payment amount to localStorage for confirmation page
    localStorage.setItem('finalPaymentAmount', amount.toString());
    console.log('Saved finalPaymentAmount to localStorage:', amount);
    
    const orderInfo = 'Ve may bay HAN-SGN';

    // Get booking code consistently with other payment methods
    const bookingCodeFromStorage = await ensureBackendBookingCode();
    const bookingCodeFromDOM = document.querySelector('.booking-code-text')?.textContent;
    let bookingCode = bookingCodeFromDOM || bookingCodeFromStorage;
    if (!bookingCode) {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const msg = (lang === 'vi')
        ? 'Không tạo được booking code từ hệ thống. Vui lòng quay lại bước trước và thử lại.'
        : 'Could not create booking code from backend. Please go back and try again.';
      notify(msg, 'error', 6000);
      return;
    }

    // Save booking code for confirmation page (ensure we have at least a client code stored)
    localStorage.setItem('currentBookingCode', bookingCode);
    localStorage.setItem('lastBookingCode', bookingCode);
    console.log('VNPay using booking code:', bookingCode);

    const btnElement = (eventArg && eventArg.target && eventArg.target.closest('.vnpay-checkout-btn'))
      || document.querySelector('.vnpay-checkout-btn');
    if (!btnElement) return;
    const originalContent = btnElement.innerHTML;
    try {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const text = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('vnpayConnecting', lang) : 'Đang kết nối VNPay...';
      btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>'+ text +'</span>';
    } catch { btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang kết nối VNPay...</span>'; }
    btnElement.disabled = true;

    const txnRef = bookingCode; // use booking code as txnRef to match backend

    const paymentData = {
      orderInfo: orderInfo,
      amount: amount,
      txnRef: txnRef,
      voucher_code: localStorage.getItem('skyplanAppliedVoucherCode') || window.__skyplanAppliedVoucherCode || null
    };

    // Create a Payment record on backend first so VNPay return can reconcile
    (async function createPaymentRecord() {
      try {
        const createUrl = (window.SkyPlanConfig?.getApiEndpoints().paymentCreate) || '/api/payment/create';
        const token = getAuthToken();
        const res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            booking_code: bookingCode,
            amount: amount,
            provider: 'vnpay',
            voucher_code: localStorage.getItem('skyplanAppliedVoucherCode') || window.__skyplanAppliedVoucherCode || null
          })
        });
        const body = await res.json();
        if (!res.ok || !body.success) {
          console.warn('Failed to create Payment record before VNPay:', body);
          // proceed anyway to allow VNPay sandbox to run, but backend may not reconcile
        }
      } catch (err) {
        console.warn('Error creating payment record for VNPay:', err);
      }
    })();

  const apiEndpoint = window.SkyPlanConfig?.getApiEndpoints().vnpayCreate || '/api/payment/vnpay/create';

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
        const lang = localStorage.getItem('preferredLanguage') || 'vi';
        const fallback = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('vnpayCreateFail', lang) : 'Không thể tạo thanh toán VNPay';
        throw new Error(data.error || fallback);
      }
    })
    .catch(error => {
      if (window.SkyPlanDebug) console.error('VNPay Error:', error);
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const prefix = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('errorPrefix', lang) : 'Lỗi: ';
      const msg = prefix + error.message;
      if (typeof showToast === 'function') { try { showToast(msg, { type: 'error', duration: 6000 }); } catch (e) { alert(msg); } }
      else alert(msg);
      btnElement.innerHTML = originalContent;
      btnElement.disabled = false;
    });
  }
  
  // Attach event listener to VNPay checkout button
  const vnpayBtn = document.querySelector('.vnpay-checkout-btn');
  if (vnpayBtn) {
    vnpayBtn.addEventListener('click', function(event) {
      event.preventDefault();
      processVNPayPayment(event);
    });
  }
});