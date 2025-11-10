// Confirmation page functionality for handling VNPay callbacks and payment confirmation

(function() {
  // Payment confirmation handler
  async function confirmPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // VNPay response parameters
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');
    const vnpTransactionId = urlParams.get('vnp_TransactionNo');
    const vnpTxnRef = urlParams.get('vnp_TxnRef'); // This is our payment ID
    const vnpAmount = urlParams.get('vnp_Amount');
    const vnpOrderInfo = urlParams.get('vnp_OrderInfo');
    
    // Check if this is a VNPay callback
    if (vnpResponseCode && vnpTxnRef) {
      await handleVNPayCallback(vnpResponseCode, vnpTransactionId, vnpTxnRef, vnpAmount, vnpOrderInfo);
    } else {
      // Load existing confirmation data from localStorage
      loadConfirmationData();
    }
  }

  // Handle VNPay payment callback
  async function handleVNPayCallback(responseCode, transactionId, txnRef, amount, orderInfo) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      showErrorMessage('Authentication required');
      return;
    }

    const paymentStatus = responseCode === '00' ? 'SUCCESS' : 'FAILED';
    
    try {
      // Show loading
      showLoading('Đang xác nhận thanh toán...');
      
      // Confirm payment with backend
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_id: parseInt(txnRef),
          transaction_id: transactionId,
          status: paymentStatus
        })
      });

      const result = await response.json();
      hideLoading();

      if (response.ok && result.success) {
        if (paymentStatus === 'SUCCESS') {
          showSuccessConfirmation(result.payment, amount);
          // Store for future reference
          localStorage.setItem('lastBookingCode', result.payment.booking_code);
          localStorage.setItem('lastTxnRef', transactionId);
          localStorage.setItem('lastAmount', (parseInt(amount) / 100).toString()); // VNPay amount is in cents
          
          // Update seat status after successful payment
          updateSeatStatusAfterPayment();
        } else {
          showPaymentFailure(transactionId, amount, result.can_retry, result.retry_count);
        }
      } else {
        throw new Error(result.message || 'Failed to confirm payment');
      }
    } catch (error) {
      hideLoading();
      console.error('Error confirming payment:', error);
      showErrorMessage('Không thể xác nhận trạng thái thanh toán: ' + error.message);
    }
  }

  // Show success confirmation
  function showSuccessConfirmation(payment, amount) {
    const bookingCodeEl = document.getElementById('bookingCode');
    const txnRefEl = document.getElementById('txnRef');
    const amountEl = document.getElementById('amount');
    
    if (bookingCodeEl) {
      bookingCodeEl.textContent = payment.booking_code;
    }
    
    if (txnRefEl) {
      txnRefEl.textContent = payment.transaction_id || 'N/A';
    }
    
    if (amountEl) {
      const displayAmount = amount ? (parseInt(amount) / 100) : payment.amount;
      amountEl.textContent = Number(displayAmount).toLocaleString('vi-VN') + ' VND';
    }

    // Update page title and messages
    const titleEl = document.querySelector('.success-title, h1');
    if (titleEl) {
      titleEl.textContent = getLang() === 'vi' ? 'Thanh toán thành công!' : 'Payment Successful!';
      titleEl.className = 'success-title';
      titleEl.style.color = '#4caf50';
    }

    // Show success icon
    const iconEl = document.querySelector('.confirmation-icon');
    if (iconEl) {
      iconEl.innerHTML = '<i class="fas fa-check-circle" style="color: #4caf50; font-size: 4rem;"></i>';
    }
  }

  // Show payment failure
  function showPaymentFailure(transactionId, amount, canRetry = true, retryCount = 1) {
    const lang = getLang();
    const titleEl = document.querySelector('.success-title, h1');
    if (titleEl) {
      titleEl.textContent = lang === 'vi' ? 'Thanh toán thất bại!' : 'Payment Failed!';
      titleEl.style.color = '#f44336';
    }

    // Show error icon
    const iconEl = document.querySelector('.confirmation-icon');
    if (iconEl) {
      iconEl.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336; font-size: 4rem;"></i>';
    }

    // Update transaction info
    const txnRefEl = document.getElementById('txnRef');
    const amountEl = document.getElementById('amount');
    
    if (txnRefEl) {
      txnRefEl.textContent = transactionId || 'N/A';
    }
    
    if (amountEl) {
      const displayAmount = amount ? (parseInt(amount) / 100) : 0;
      amountEl.textContent = Number(displayAmount).toLocaleString('vi-VN') + ' VND';
    }

    // Add retry information
    if (canRetry && retryCount > 1) {
      const infoEl = document.createElement('div');
      infoEl.style.cssText = 'margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;';
      infoEl.innerHTML = `
        <strong>${lang === 'vi' ? 'Thông tin:' : 'Info:'}</strong><br>
        ${lang === 'vi' ? 
          `Đây là lần thử thanh toán thứ ${retryCount}. Bạn có thể thử lại với phương thức thanh toán khác.` :
          `This is payment attempt #${retryCount}. You can try again with a different payment method.`
        }
      `;
      
      const container = document.querySelector('.confirmation-container, .main-content');
      if (container) {
        container.appendChild(infoEl);
      }
    }

    // Add action buttons
    const actionsEl = document.querySelector('.confirmation-actions');
    if (actionsEl && canRetry) {
      const bookingCode = localStorage.getItem('currentBookingCode');
      
      const retryBtn = document.createElement('a');
      retryBtn.href = bookingCode ? `payment.html?booking_code=${bookingCode}` : 'payment.html';
      retryBtn.className = 'btn btn-primary';
      retryBtn.textContent = lang === 'vi' ? 'Thử lại thanh toán' : 'Retry Payment';
      actionsEl.prepend(retryBtn);
      
      const myTripsBtn = document.createElement('a');
      myTripsBtn.href = 'my_trips.html';
      myTripsBtn.className = 'btn btn-outline';
      myTripsBtn.textContent = lang === 'vi' ? 'Xem booking của tôi' : 'View My Bookings';
      actionsEl.appendChild(myTripsBtn);
    }
  }

  // Load existing confirmation data (fallback)
  function loadConfirmationData() {
    const bookingCode = localStorage.getItem('lastBookingCode') || 
                       localStorage.getItem('currentBookingCode') || 
                       'N/A';
    const txnRef = localStorage.getItem('lastTxnRef') || 'N/A';
    
    // Debug: check all possible amount sources
    const lastAmount = localStorage.getItem('lastAmount');
    const bookingTotal = localStorage.getItem('bookingTotal');
    const windowLastAmount = window.lastAmount;
    
    // Debug logs disabled
    // console.log('Confirmation amount debug:', bookingTotal || lastAmount);
    
    // Use the most reliable source - prioritize bookingTotal (set by overview/payment_order)
    let amount = bookingTotal || lastAmount || '0';
    
    // If still 0 or invalid, try to get from current booking
    if (!amount || amount === '0') {
      try {
        const currentBooking = localStorage.getItem('currentBooking');
        if (currentBooking) {
          const booking = JSON.parse(currentBooking);
          amount = booking.totalCost || booking.total_amount || amount;
        }
      } catch (e) {
        // Silent error handling
      }
    }
    
    const bookingCodeEl = document.getElementById('bookingCode');
    const txnRefEl = document.getElementById('txnRef');
    const amountEl = document.getElementById('amount');
    
    if (bookingCodeEl) {
      bookingCodeEl.textContent = bookingCode;
    }
    
    if (txnRefEl) {
      txnRefEl.textContent = txnRef;
    }
    
    if (amountEl) {
      amountEl.textContent = Number(amount).toLocaleString('vi-VN') + ' VND';
    }
  }

  // Utility functions
  function showLoading(message) {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'confirmation-loading';
    loadingEl.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 1.2rem;
      ">
        <div>
          <i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i>
          ${message}
        </div>
      </div>
    `;
    document.body.appendChild(loadingEl);
  }

  function hideLoading() {
    const loadingEl = document.getElementById('confirmation-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  function showErrorMessage(message) {
    const titleEl = document.querySelector('.success-title, h1');
    if (titleEl) {
      titleEl.textContent = getLang() === 'vi' ? 'Có lỗi xảy ra!' : 'Error Occurred!';
      titleEl.style.color = '#f44336';
    }

    // Show error icon
    const iconEl = document.querySelector('.confirmation-icon');
    if (iconEl) {
      iconEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff9800; font-size: 4rem;"></i>';
    }

    // Show error message
    const messageEl = document.createElement('div');
    messageEl.style.cssText = 'color: #f44336; text-align: center; margin: 20px 0; padding: 15px; background: #ffebee; border-radius: 5px;';
    messageEl.textContent = message;
    
    const container = document.querySelector('.confirmation-container, .main-content');
    if (container) {
      container.appendChild(messageEl);
    }
  }

  function getLang() {
    return localStorage.getItem('preferredLanguage') || 'vi';
  }

  // Download ticket functionality
  function downloadTicket() {
    const bookingCode = document.getElementById('bookingCode')?.textContent || 'N/A';
    const amount = document.getElementById('amount')?.textContent || 'N/A';
    const txnRef = document.getElementById('txnRef')?.textContent || 'N/A';
    
    // Create ticket content
    const ticketContent = `
SkyPlan - Vé máy bay điện tử
=====================================
Mã vé: ${bookingCode}
Mã giao dịch: ${txnRef}
Số tiền: ${amount}
Ngày thanh toán: ${new Date().toLocaleDateString('vi-VN')}
=====================================
Cảm ơn bạn đã sử dụng dịch vụ SkyPlan!

Lưu ý: Đây là vé điện tử, vui lòng xuất trình
mã vé tại quầy check-in sân bay.
`;

    // Create and download file
    const blob = new Blob([ticketContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SkyPlan_Ve_${bookingCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    // Show success notification
    const lang = getLang();
    const message = lang === 'vi' ? 'Đã tải vé thành công!' : 'Ticket downloaded successfully!';
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'success', duration: 3000 });
    }
  }

  // Update seat status after successful payment
  async function updateSeatStatusAfterPayment() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const flightId = urlParams.get('outbound_flight_id') || urlParams.get('flight_id');
      
      if (!flightId) {
        return;
      }
      
      // Get selected seats from localStorage (saved during seat selection)
      const selectedSeatsData = localStorage.getItem('selectedSeats');
      if (!selectedSeatsData) {
        return;
      }
      
      const selectedSeats = JSON.parse(selectedSeatsData);
      
      // Call backend API to update seat status
      const response = await fetch('/api/seats/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          flight_id: parseInt(flightId),
          seats: selectedSeats,
          booking_code: localStorage.getItem('lastBookingCode')
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Clear selected seats from localStorage after successful booking
        localStorage.removeItem('selectedSeats');
      }
      
    } catch (error) {
      console.error('Error updating seat status:', error);
    }
  }

  // Initialize confirmation page
  document.addEventListener('DOMContentLoaded', function() {
    confirmPaymentStatus();
    
    // Add download button event listener
    const downloadBtn = document.getElementById('downloadTicketBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadTicket);
    }
  });

})();