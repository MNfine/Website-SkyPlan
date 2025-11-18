/**
 * VNPay Integration Tool for SkyPlan
 * Add to payment.html to integrate VNPay payment
 */

document.addEventListener('DOMContentLoaded', function() {
  // VNPay Integration
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
    try {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const text = (typeof getPaymentTranslation === 'function') ? getPaymentTranslation('vnpayConnecting', lang) : 'Đang kết nối VNPay...';
      btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>'+ text +'</span>';
    } catch { btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Đang kết nối VNPay...</span>'; }
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
      processVNPayPayment();
    });
  }
});