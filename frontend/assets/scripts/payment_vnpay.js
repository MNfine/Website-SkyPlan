/**
 * VNPay Integration Tool for SkyPlan
 * Add to payment.html to integrate VNPay payment
 */

document.addEventListener('DOMContentLoaded', function() {
  // VNPay Integration
  function processVNPayPayment() {
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
    const bookingCodeFromStorage = localStorage.getItem('currentBookingCode') || localStorage.getItem('lastBookingCode');
    const bookingCodeFromDOM = document.querySelector('.booking-code-text')?.textContent;
    let bookingCode = bookingCodeFromDOM || bookingCodeFromStorage || `SP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
    
    // Save booking code for confirmation page
    localStorage.setItem('currentBookingCode', bookingCode);
    localStorage.setItem('lastBookingCode', bookingCode);
    console.log('VNPay using booking code:', bookingCode);

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