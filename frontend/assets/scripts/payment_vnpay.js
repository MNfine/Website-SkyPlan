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
      if (typeof showToast === 'function') { try { showToast('Lỗi: ' + error.message, { type: 'error', duration: 6000 }); } catch (e) { alert('Lỗi: ' + error.message); } }
      else alert('Lỗi: ' + error.message);
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