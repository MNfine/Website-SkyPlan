// Payment page functionality

document.addEventListener('DOMContentLoaded', function() {
  initializePaymentMethods();
  initializeCardFormatting();
  initializePaymentValidation();
});

// Initialize payment method selection
function initializePaymentMethods() {
  const paymentMethods = document.querySelectorAll('.payment-method');
  const radioButtons = document.querySelectorAll('input[name="payment"]');
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function() {
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
    header.addEventListener('click', function() {
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
    cardNumberInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      
      if (formattedValue.length > 19) {
        formattedValue = formattedValue.substring(0, 19);
      }
      
      e.target.value = formattedValue;
    });
  }
  
  if (expiryDateInput) {
    expiryDateInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      e.target.value = value;
    });
  }
  
  if (cvvInput) {
    cvvInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = value;
    });
  }
}

// Initialize payment validation and submission
function initializePaymentValidation() {
  const payBtn = document.querySelector('.pay-btn');
  
  if (payBtn) {
    payBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const selectedPayment = document.querySelector('input[name="payment"]:checked');
      
      if (!selectedPayment) {
        alert('Vui lòng chọn phương thức thanh toán');
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
    alert('Vui lòng nhập số thẻ hợp lệ');
    return false;
  }
  
  if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
    alert('Vui lòng nhập ngày hết hạn hợp lệ (MM/YY)');
    return false;
  }
  
  if (!cvv || cvv.length < 3) {
    alert('Vui lòng nhập mã CVV hợp lệ');
    return false;
  }
  
  if (!cardName.trim()) {
    alert('Vui lòng nhập tên trên thẻ');
    return false;
  }
  
  return true;
}

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
  window.location.href = 'confirmation.html';
}

// Process e-wallet payment
function processEWalletPayment() {
  alert('Vui lòng chọn ví điện tử để tiếp tục');
}

// E-wallet button handlers
document.addEventListener('DOMContentLoaded', function() {
  const ewalletBtns = document.querySelectorAll('.ewallet-btn');
  
  ewalletBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const walletName = this.querySelector('span').textContent;
      
      // Select e-wallet radio button
      const ewalletRadio = document.getElementById('ewallet');
      ewalletRadio.checked = true;
      ewalletRadio.dispatchEvent(new Event('change'));
      
      // Show selected wallet
      alert(`Đã chọn ${walletName}. Nhấn "Thanh toán với ${walletName}" để tiếp tục.`);
    });
  });
});

// Show loading state
function showLoadingState() {
  const payBtn = document.querySelector('.pay-btn');
  payBtn.disabled = true;
  payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang xử lý...</span>';
}

// Hide loading state
function hideLoadingState() {
  const payBtn = document.querySelector('.pay-btn');
  payBtn.disabled = false;
  payBtn.innerHTML = '<i class="fas fa-lock"></i><span>Thanh toán ngay</span>';
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
  window.location.href = 'confirmation.html';
}

// E-wallet selection functionality
document.addEventListener('DOMContentLoaded', function() {
  const ewalletBtns = document.querySelectorAll('.ewallet-btn');
  const vnpayForm = document.getElementById('vnpayForm');
  
  ewalletBtns.forEach(btn => {
    btn.addEventListener('click', function() {
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
    console.error('Booking code element not found, using default');
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
    console.error('VNPay Error:', error);
    alert('Lỗi: ' + error.message);
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
  window.addEventListener('message', function(event) {
    if (event.data.type === 'vnpay_success') {
      alert('✅ Thanh toán VNPay thành công!\\nMã giao dịch: ' + event.data.txnRef);
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

// --- LOGIC UPDATE ---

// Helper: kiểm tra form thẻ hợp lệ
function isCardFormValid() {
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiryDate = document.getElementById('expiryDate').value;
  const cvv = document.getElementById('cvv').value;
  const cardName = document.getElementById('cardName').value;
  return cardNumber.length >= 13 && /^\d{2}\/\d{2}$/.test(expiryDate) && cvv.length >= 3 && cardName.trim();
}

// Xử lý thay đổi giao diện nút thanh toán
function updatePayBtnUI() {
  const payBtn = document.querySelector('.pay-btn');
  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (!payBtn || !selectedPayment) return;

  if (selectedPayment.value === 'card') {
    if (isCardFormValid()) {
      payBtn.innerHTML = '<span>Thanh toán ngay</span>';
    } else {
      payBtn.innerHTML = '<i class="fas fa-lock"></i><span>Thanh toán ngay</span>';
    }
    payBtn.style.display = '';
    payBtn.style.background = '';
    payBtn.style.color = '';
  } else if (selectedPayment.value === 'bank') {
    payBtn.innerHTML = '<span>Đến trang xác nhận</span>';
    payBtn.style.display = '';
    payBtn.style.background = '#ff9800';
    payBtn.style.color = '#fff';
  } else if (selectedPayment.value === 'ewallet') {
    payBtn.style.display = 'none'; // Ẩn nút khi chọn ví điện tử
  } else {
    payBtn.innerHTML = '<i class="fas fa-lock"></i><span>Thanh toán ngay</span>';
    payBtn.style.display = '';
    payBtn.style.background = '';
    payBtn.style.color = '';
  }
}

// Theo dõi thay đổi input thẻ để cập nhật nút
function listenCardFormChange() {
  ['cardNumber','expiryDate','cvv','cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePayBtnUI);
  });
}

// Theo dõi thay đổi phương thức thanh toán
function listenPaymentMethodChange() {
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', updatePayBtnUI);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  listenCardFormChange();
  listenPaymentMethodChange();
  updatePayBtnUI();
});

// --- SỬA LOGIC CHUYỂN HƯỚNG VNPay ---
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
  window.location.href = 'confirmation.html';
}

// --- SỬA LOGIC BANK ---
function processBankTransfer() {
  // Giả lập đã nhận được tiền, chuyển đến trang xác nhận
  window.location.href = 'confirmation.html';
}