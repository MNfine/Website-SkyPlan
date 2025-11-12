// Payment page functionality

document.addEventListener('DOMContentLoaded', function () {
  initializePaymentMethods();
  initializeCardFormatting();
  initializePaymentValidation();
});

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

  radioButtons.forEach(radio => {
    radio.addEventListener('change', function () {
      // Remove active class from all methods
      paymentMethods.forEach(method => {
        method.classList.remove('active');
      });

      // Add active class to selected method
      const selectedMethod = this.closest('.payment-method');
      selectedMethod.classList.add('active');
    });
  });

  // Make payment methods clickable
  paymentMethods.forEach(method => {
    const header = method.querySelector('.method-header');
    header.addEventListener('click', function () {
      const radio = method.querySelector('input[type="radio"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change'));
    });
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

      const selectedPayment = document.querySelector('input[name="payment"]:checked');

      if (!selectedPayment) {
        const lang = localStorage.getItem('preferredLanguage') || 'vi';
        const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('selectPaymentMethod', lang) : 'Vui lòng chọn phương thức thanh toán';
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
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCardNumber', lang) : 'Vui lòng nhập số thẻ hợp lệ';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidExpiryDate', lang) : 'Vui lòng nhập ngày hết hạn hợp lệ (MM/YY)';
    notify(msg, 'info', 4000);
    return false;
  }
  // Validate month range and expiration
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const mm = parseInt(expiryDate.slice(0, 2), 10);
  const yy = parseInt(expiryDate.slice(3, 5), 10);
  if (mm < 1 || mm > 12) {
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidMonth', lang) : 'Vui lòng nhập tháng hợp lệ (01-12)';
    notify(msg, 'info', 4000);
    return false;
  }
  const fullYear = 2000 + yy; // YY → 20YY
  const now = new Date();
  const exp = new Date(fullYear, mm - 1, 1);
  // consider valid if current month or later
  if (exp.getFullYear() < now.getFullYear() || (exp.getFullYear() === now.getFullYear() && exp.getMonth() < now.getMonth())) {
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('cardExpired', lang) : 'Thẻ đã hết hạn';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!cvv || cvv.length < 3) {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCVV', lang) : 'Vui lòng nhập mã CVV hợp lệ';
    notify(msg, 'info', 4000);
    return false;
  }

  if (!cardName.trim()) {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('invalidCardName', lang) : 'Vui lòng nhập tên trên thẻ';
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
  showLoadingState();

  // Simulate payment processing
  setTimeout(() => {
    hideLoadingState();
    showPaymentSuccess();
  }, 2000);
}

// Process bank transfer
function processBankTransfer() {
  // Giả lập đã nhận được tiền, chuyển đến trang xác nhận
  if (window.Loader) {
    window.Loader.show();
    setTimeout(function() {
      window.location.href = 'confirmation.html';
    }, 1500);
  } else {
    window.location.href = 'confirmation.html';
  }
}

// Process e-wallet payment
function processEWalletPayment() {
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const msg = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('selectEwallet', lang) : 'Vui lòng chọn ví điện tử để tiếp tục';
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
function showPaymentSuccess() {
  // Lưu trạng thái thanh toán thành công theo từng mã vé
  // Lấy mã vé (bookingCode) và số tiền
  const bookingCode = document.getElementById('bookingCode')?.textContent || window.lastTxnRef || '';
  const amount = window.lastAmount || 1598000;
  if (bookingCode) {
    localStorage.setItem('paid_' + bookingCode, 'true');
    localStorage.setItem('amount_' + bookingCode, amount);
  }
  localStorage.setItem('lastTxnRef', bookingCode);
  localStorage.setItem('lastAmount', amount);
  
  // Show loader trước khi redirect
  if (window.Loader) {
    window.Loader.show();
    setTimeout(function() {
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
          <div class="amount">${paymentData.amount.toLocaleString()} ₫</div>
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

// Xử lý thay đổi giao diện nút thanh toán
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

// Theo dõi thay đổi input thẻ để cập nhật nút
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
  const voucherInput = document.getElementById('voucherInput');
  const applyBtn = document.getElementById('applyVoucherBtn');
  const voucherMessage = document.getElementById('voucherMessage');
  const voucherDiscount = document.getElementById('voucherDiscount');
  
  if (!voucherInput || !applyBtn) return;
  
  // Voucher codes and their conditions
  const vouchers = {
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
  
  let appliedVoucher = null;
  const originalAmount = parseFloat(document.getElementById('totalAmount').textContent.replace(/[^\d]/g, ''));
  
  applyBtn.addEventListener('click', function() {
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
    const discount = calculateDiscount(originalAmount, voucher);
    const finalAmount = originalAmount - discount;
    
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
      return voucher.value;
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
    }).format(amount).replace('₫', 'VND');
  }
  
  function addRemoveVoucherButton() {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Hủy mã';
    removeBtn.className = 'remove-voucher-btn';
    removeBtn.style.cssText = `
      margin-left: 8px;
      padding: 8px 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    `;
    
    removeBtn.addEventListener('click', function() {
      // Reset voucher
      appliedVoucher = null;
      voucherDiscount.classList.add('hidden');
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
