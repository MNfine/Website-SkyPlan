// Payment page functionality

document.addEventListener('DOMContentLoaded', function () {
  validateBookingData();
  
  // Delay updatePaymentAmounts to ensure DOM is fully ready
  setTimeout(() => {
    updatePaymentAmounts(); // Update amounts from booking data
  }, 100);
  
  initializePaymentMethods();
  initializeCardFormatting();
  initializePaymentValidation();
  
  // Delay voucher initialization to ensure payment_order has updated totalAmount
  setTimeout(() => {
    initializeVoucher();
  }, 600); // Run after payment_order render (which runs at 200ms from payment.html)
  
  // Listen for language changes
  window.addEventListener('storage', function(e) {
    if (e.key === 'preferredLanguage') {
      const newLang = e.newValue || 'vi';
      if (typeof applyPaymentTranslations === 'function') {
        applyPaymentTranslations(newLang);
      }
      updateVoucherMessagesLanguage(newLang);
    }
  });
  
  // Listen for direct language selector changes (not just storage)
  document.addEventListener('languageChanged', function(e) {
    const newLang = e.detail.language || e.detail.lang || 'vi';
    console.log('🌐 Language changed event received:', newLang);
    if (typeof applyPaymentTranslations === 'function') {
      applyPaymentTranslations(newLang);
    }
    updateVoucherMessagesLanguage(newLang);
  });
  
  // Also listen on window for broader coverage
  window.addEventListener('languageChanged', function(e) {
    const newLang = e.detail.language || e.detail.lang || 'vi';
    console.log('🌐 Window language changed event received:', newLang);
    if (typeof applyPaymentTranslations === 'function') {
      applyPaymentTranslations(newLang);
    }
    updateVoucherMessagesLanguage(newLang);
  });
});

// Update payment amounts from booking data
function updatePaymentAmounts() {
  try {
    console.log('🔄 Starting updatePaymentAmounts function');
    
  const bookingDataStr = localStorage.getItem('completeBookingData');
    if (!bookingDataStr) {
      console.log('⚠️ No booking data found, creating mock data for testing...');
      // Create mock booking data matching the structure from overview.js
      const mockBookingData = {
        totalCost: 2500000,
        seats: {
          seats: [
            { price: 1800000, seatNumber: '12A', type: 'economy' }
          ]
        },
        extras: {
          totalCost: 500000,
          meals: [{ name: 'Combo meal', price: 150000, quantity: 1 }],
          baggage: { kg: 20, price: 350000 }
        },
        trip: {
          from: 'Ho Chi Minh',
          to: 'Ha Noi',
          departureDate: '2025-11-15'
        },
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('completeBookingData', JSON.stringify(mockBookingData));
    }
    
    const bookingData = JSON.parse(localStorage.getItem('completeBookingData'));
    console.log('🔍 Raw completeBookingData from storage:', bookingData);

    // Defensive normalization: if seats or extras are missing or empty, try to reconstruct from other localStorage keys
    try {
      // Normalize seats
      if (!bookingData.seats || !Array.isArray(bookingData.seats.seats) || bookingData.seats.seats.length === 0) {
        const rawSelected = JSON.parse(localStorage.getItem('selectedSeats') || '[]');
        if (Array.isArray(rawSelected) && rawSelected.length > 0) {
          const fareClass = localStorage.getItem('fareClass') || 'economy';
          const normalizedSeats = rawSelected.map(s => ({
            price: Number(s.price || s.priceVND || s.amount || s.fare || 0),
            seatNumber: s.seatNumber || s.seat_label || s.label || s.code || s.id || '',
            type: s.type || s.fareClass || fareClass
          }));
          bookingData.seats = { seats: normalizedSeats, fareClass: fareClass, totalCost: normalizedSeats.reduce((a, b) => a + (Number(b.price) || 0), 0) };
          console.log('🔁 Normalized seats reconstructed from selectedSeats:', bookingData.seats);
        }
      }

      // Normalize extras
      if (!bookingData.extras || (typeof bookingData.extras.totalCost === 'undefined' && typeof bookingData.extras.total === 'undefined')) {
        const rawExtras = JSON.parse(localStorage.getItem('skyplan_extras_v2') || 'null');
        if (rawExtras) {
          bookingData.extras = bookingData.extras || {};
          bookingData.extras.totalCost = Number(rawExtras.totalCost || rawExtras.total || rawExtras.total_cost || 0);
          bookingData.extras.meals = Array.isArray(rawExtras.meals) ? rawExtras.meals : (rawExtras.meals || []);
          bookingData.extras.baggage = rawExtras.baggage || rawExtras.baggageInfo || null;
          bookingData.extras.services = Array.isArray(rawExtras.services) ? rawExtras.services : (rawExtras.services || []);
          console.log('🔁 Normalized extras reconstructed from skyplan_extras_v2:', bookingData.extras);
        }
      }

      // Ensure total cost exists: seats + extras + tax
      if (!bookingData.totalCost || Number(bookingData.totalCost) === 0) {
        const seatsTotal = bookingData.seats && bookingData.seats.totalCost ? Number(bookingData.seats.totalCost) : (Array.isArray(bookingData.seats?.seats) ? bookingData.seats.seats.reduce((s, r) => s + (Number(r.price) || 0), 0) : 0);
        const extrasTotal = bookingData.extras ? Number(bookingData.extras.totalCost || bookingData.extras.total || 0) : 0;
        const fixedFees = 200000;
        const recomputed = Math.max(0, seatsTotal + extrasTotal + fixedFees);
        bookingData.totalCost = recomputed;
        console.log('🔁 Recomputed totalCost for bookingData:', bookingData.totalCost);
      }

      // Persist normalized bookingData back to storage for future reads
      localStorage.setItem('completeBookingData', JSON.stringify(bookingData));
    } catch (e) {
      console.warn('⚠️ Failed to normalize completeBookingData:', e);
    }
    const totalCost = bookingData.totalCost || 1598000; // Fallback to default
    
    console.log('💰 Updating payment amounts:', {
      bookingData: bookingData,
      totalCost: totalCost
    });
    
    // Update all total amount displays
    const totalAmountElements = document.querySelectorAll('#totalAmount');
    const baseAmountElements = document.querySelectorAll('#baseAmount');
    const vnpayAmountElements = document.querySelectorAll('.payment-details strong');
    
    console.log('🔍 Found elements:', {
      totalElements: totalAmountElements.length,
      baseElements: baseAmountElements.length,
      vnpayElements: vnpayAmountElements.length
    });
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    };
    
    // Calculate breakdown: total already includes seats + extras + fees
    const taxAmount = 200000; // Fixed tax amount (fees)
    
    // Get extras and seats from booking data
    const extrasTotal = (bookingData.extras && bookingData.extras.totalCost) || 0;
    
    // Calculate seats total - handle multiple seat data formats
    let seatsTotal = 0;
    if (bookingData.seats && bookingData.seats.seats) {
      seatsTotal = bookingData.seats.seats.reduce((sum, seat) => sum + (seat.price || 0), 0);
    }
    
    // If seats total is 0, calculate base ticket price from total - extras - fees
    if (seatsTotal === 0) {
      // Base flight price = Total - Extras - Fixed fees (200k)
      seatsTotal = totalCost - extrasTotal - taxAmount;
    }
    
    // Ensure seatsTotal is not negative
    seatsTotal = Math.max(0, seatsTotal);
    
    // Base amount is seats + extras (before fees)  
    const baseAmount = seatsTotal + extrasTotal;
    
    // Update base amount (flight ticket price)
    console.log('🔍 Updating base amount elements:', { 
      elementsFound: baseAmountElements.length, 
      baseAmount: baseAmount,
      formattedAmount: formatCurrency(baseAmount)
    });
    baseAmountElements.forEach((el, index) => {
      if (el) {
        console.log(`🔍 Updating element ${index}:`, el);
        el.textContent = formatCurrency(baseAmount);
      }
    });
    
    // Update total amount
    totalAmountElements.forEach(el => {
      if (el) el.textContent = formatCurrency(totalCost);
    });
    
    // Update tax amount
    const taxAmountEl = document.getElementById('taxAmount');
    if (taxAmountEl) {
      taxAmountEl.textContent = formatCurrency(taxAmount);
    }
    
    // Update final amount (prefer any saved finalPaymentAmount after voucher)
    let finalPayment = totalCost;
    try {
      const storedFinal = localStorage.getItem('finalPaymentAmount');
      const parsedStored = storedFinal ? Number(storedFinal) : NaN;
      if (!isNaN(parsedStored) && parsedStored > 0) {
        finalPayment = parsedStored;
      }
    } catch (e) {
      // ignore and keep totalCost
    }

    const finalAmountEl = document.getElementById('finalAmount');
    if (finalAmountEl) {
      finalAmountEl.textContent = formatCurrency(finalPayment);
    }

    // Update VNPay payment details to reflect final payment (after voucher if any)
    if (vnpayAmountElements.length > 0) {
      vnpayAmountElements[0].textContent = formatCurrency(finalPayment);
    }
    
    console.log('💰 Payment amounts breakdown:', {
      seatsTotal: formatCurrency(seatsTotal),
      extrasTotal: formatCurrency(extrasTotal),
      taxAmount: formatCurrency(taxAmount),
      baseAmount: formatCurrency(baseAmount),
      totalAmount: formatCurrency(totalCost),
  finalAmount: formatCurrency(finalPayment),
      rawBookingData: bookingData,
      seatsPriceDetails: bookingData.seats,
      calculationSteps: {
        step1_seatsFromData: bookingData.seats && bookingData.seats.seats 
          ? bookingData.seats.seats.reduce((sum, seat) => sum + (seat.price || 0), 0) 
          : 0,
        step2_calculatedSeats: seatsTotal,
        step3_baseAmount: baseAmount,
        step4_totalWithTax: totalCost
      }
    });
    
  } catch (error) {
    console.error('Error updating payment amounts:', error);
  }
}

// Validate booking data on payment page load
function validateBookingData() {
  try {
    const bookingData = localStorage.getItem('completeBookingData');
    const bookingTimestamp = localStorage.getItem('bookingTimestamp');
    
    if (!bookingData) {
      throw new Error('No booking data found');
    }
    
    const data = JSON.parse(bookingData);
    
    // Check if booking data is too old (more than 30 minutes)
    const timestamp = parseInt(bookingTimestamp);
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (timestamp && (now - timestamp > thirtyMinutes)) {
      throw new Error('Booking session expired');
    }
    
    // Validate required fields - flights is critical, passenger can be incomplete
    if (!data.flights) {
      throw new Error('Missing flight information');
    }

    // Ensure we have passenger data for booking creation
    if (!data.passenger) {
      console.log('⚠️ Payment page: No passenger info found, trying to get from alternative sources...');
      
      // Try to get passenger from different localStorage keys
      const passengerKeys = ['currentPassenger', 'skyplan_passenger_data', 'passengerInfo'];
      let passengerFound = false;
      
      for (const key of passengerKeys) {
        try {
          const passengerData = JSON.parse(localStorage.getItem(key));
          if (passengerData && (passengerData.firstName || passengerData.fullName)) {
            data.passenger = passengerData;
            passengerFound = true;
            console.log('✅ Found passenger data in:', key);
            break;
          }
        } catch (e) {
          // Continue to next key
        }
      }
      
      if (!passengerFound) {
        console.warn('⚠️ No passenger data found in any storage key');
        // Don't throw error, let booking proceed with minimal data
      }
    }

    // Update localStorage with complete data
    localStorage.setItem('completeBookingData', JSON.stringify(data));

    console.log('Booking data validated successfully:', data);
    return data;  } catch (error) {
    console.error('Booking validation failed:', error);
    
    // Show user-friendly message
    let message = 'Thông tin đặt vé bị thiếu hoặc hết hạn';
    if (error.message.includes('flight')) {
      message = 'Thông tin chuyến bay bị thiếu';
    } else if (error.message.includes('expired')) {
      message = 'Phiên đặt vé đã hết hạn';
    }
    
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
    
    // Redirect to overview page after a short delay
    setTimeout(() => {
      window.location.href = 'overview.html';
    }, 2000);
    
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
  // Save final payment amount before processing
  saveFinalPaymentAmount();
  
  showLoadingState();

  // Simulate payment processing
  setTimeout(() => {
    hideLoadingState();
    showPaymentSuccess();
  }, 2000);
}

// Process bank transfer
function processBankTransfer() {
  // Save final payment amount before processing
  saveFinalPaymentAmount();
  
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

// Helper function to save final payment amount
function saveFinalPaymentAmount() {
  let amount = 0;
  
  // Try to get finalAmount first (after voucher)
  const finalAmountEl = document.getElementById('finalAmount');
  const totalAmountEl = document.getElementById('totalAmount');
  
  if (finalAmountEl && finalAmountEl.textContent) {
    const parsedFinal = parseFloat(finalAmountEl.textContent.replace(/[^\d]/g, ''));
    if (!isNaN(parsedFinal) && parsedFinal > 0) {
      amount = parsedFinal;
    }
  }
  
  // Fallback to totalAmount if finalAmount is not valid
  if (amount === 0 && totalAmountEl && totalAmountEl.textContent) {
    const parsedTotal = parseFloat(totalAmountEl.textContent.replace(/[^\d]/g, ''));
    if (!isNaN(parsedTotal) && parsedTotal > 0) {
      amount = parsedTotal;
    }
  }
  
  if (amount > 0) {
    localStorage.setItem('finalPaymentAmount', amount.toString());
    console.log('💾 Saved finalPaymentAmount:', amount);
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
  // Lấy booking code từ localStorage hoặc từ DOM
  const bookingCodeFromStorage = localStorage.getItem('currentBookingCode') || localStorage.getItem('lastBookingCode');
  const bookingCodeFromDOM = document.querySelector('.booking-code-text')?.textContent;
  const bookingCode = bookingCodeFromDOM || bookingCodeFromStorage || `SP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
  
  // Get final payment amount from localStorage
  const finalPaymentAmount = localStorage.getItem('finalPaymentAmount');
  const amount = finalPaymentAmount || window.lastAmount || 1598000;
  
  console.log('✅ Payment success - saving:', { bookingCode, amount });
  
  // Save payment status
  if (bookingCode) {
    localStorage.setItem('paid_' + bookingCode, 'true');
    localStorage.setItem('amount_' + bookingCode, amount);
  }
  localStorage.setItem('lastTxnRef', bookingCode);
  localStorage.setItem('lastBookingCode', bookingCode);
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
// Get translation helper function
function getTranslation(key) {
  const lang = localStorage.getItem('preferredLanguage') || localStorage.getItem('selectedLanguage') || 'vi';
  if (typeof paymentTranslations !== 'undefined' && paymentTranslations[lang] && paymentTranslations[lang][key]) {
    return paymentTranslations[lang][key];
  }
  return null;
}

// Update voucher messages when language changes
function updateVoucherMessagesLanguage(newLang) {
  // Update voucher button text if voucher is applied
  const applyBtn = document.getElementById('applyVoucher');
  const removeBtn = document.querySelector('.remove-voucher-btn');
  
  if (applyBtn && applyBtn.disabled) {
    // Voucher is applied, update button text
    applyBtn.textContent = getTranslation('voucherAppliedText') || 'Đã áp dụng';
  }
  
  if (removeBtn) {
    removeBtn.textContent = getTranslation('removeVoucher') || 'Hủy bỏ';
  }
  
  // Re-generate voucher success message if voucher is applied
  if (window.currentAppliedVoucher) {
    const voucherMessage = document.getElementById('voucherMessage');
    if (voucherMessage && voucherMessage.textContent.includes('✓')) {
      const discountAmount = window.currentAppliedVoucher.discountAmount;
      
      // Use local formatCurrency function
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
          minimumFractionDigits: 0
        }).format(amount).replace('₫', 'VND');
      };
      
      const discountText = formatCurrency(discountAmount);
      const message = (getTranslation('voucherApplied') || '✓ Áp dụng thành công: Giảm {1}').replace('{1}', discountText);
      voucherMessage.textContent = message;
      voucherMessage.className = 'voucher-message success';
    }
  }
}

function initializeVoucher() {
  const voucherInput = document.getElementById('voucherCode');
  const applyBtn = document.getElementById('applyVoucher');
  const voucherMessage = document.getElementById('voucherMessage');
  const voucherDiscount = document.getElementById('voucherDiscount');

  console.log('🎫 Initializing voucher system:', {
    voucherInput: !!voucherInput,
    applyBtn: !!applyBtn,
    voucherMessage: !!voucherMessage,
    voucherDiscount: !!voucherDiscount
  });

  if (!voucherInput || !applyBtn) {
    console.error('🎫 Voucher elements not found!');
    return;
  }

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
  
  // Function to get current total amount from DOM
  function getCurrentTotalAmount() {
    // Try to get from totalAmount first, fallback to finalAmount
    let totalAmountEl = document.getElementById('totalAmount');
    if (!totalAmountEl) {
      totalAmountEl = document.getElementById('finalAmount');
    }
    
    const amount = totalAmountEl ? parseFloat(totalAmountEl.textContent.replace(/[^\d]/g, '')) : 1598000;
    
    console.log('🎫 Getting current total amount:', {
      element: !!totalAmountEl,
      elementId: totalAmountEl ? totalAmountEl.id : 'None found',
      rawText: totalAmountEl ? totalAmountEl.textContent : 'Not found',
      parsedAmount: amount
    });
    
    return amount;
  }

  // Initialize finalAmount with current total (before any voucher is applied)
  function initializeFinalAmount() {
    const totalAmountEl = document.getElementById('totalAmount');
    const finalAmountEl = document.getElementById('finalAmount');
    
    if (totalAmountEl && finalAmountEl) {
      const currentTotal = totalAmountEl.textContent;
      // Prefer any existing saved finalPaymentAmount
      let initAmount = currentTotal;
      try {
        const stored = localStorage.getItem('finalPaymentAmount');
        const parsed = stored ? Number(stored) : NaN;
        if (!isNaN(parsed) && parsed > 0) initAmount = formatCurrency(parsed);
      } catch (e) {}

      finalAmountEl.textContent = initAmount;
      console.log('🎫 Initialized finalAmount with:', initAmount);
      
      // Also save numeric value to localStorage
      const parsedTotal = parseFloat((initAmount + '').replace(/[^\d]/g, ''));
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        localStorage.setItem('finalPaymentAmount', parsedTotal.toString());
        console.log('💾 Initialized finalPaymentAmount in localStorage:', parsedTotal);
      }

      // Also update VNPay display (if present)
      const vnpayEls = document.querySelectorAll('.payment-details strong');
      if (vnpayEls.length > 0) {
        vnpayEls[0].textContent = initAmount;
      }
    }
  }
  
  // Call initialization after a short delay to ensure DOM is updated
  setTimeout(initializeFinalAmount, 500);

  // Add event listeners
  applyBtn.addEventListener('click', function() {
    console.log('🎫 Apply button clicked!');
    applyVoucherCode();
  });
  voucherInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      applyVoucherCode();
    }
  });

  function applyVoucherCode() {
    const code = voucherInput.value.trim().toUpperCase();

    if (!code) {
      const message = getTranslation('voucherPlaceholder') || 'Vui lòng nhập mã voucher';
      showVoucherMessage(message, 'error');
      return;
    }

    const voucher = vouchers[code];
    if (!voucher) {
      const message = getTranslation('voucherInvalid') || 'Mã voucher không hợp lệ';
      showVoucherMessage(message, 'error');
      return;
    }

    // Get current amount from DOM instead of using cached originalAmount
    const currentAmount = getCurrentTotalAmount();
    console.log('🎫 Applying voucher with current amount:', currentAmount);
    
    if (currentAmount < voucher.minAmount) {
      const minAmountText = formatCurrency(voucher.minAmount);
      const message = (getTranslation('voucherMinAmount') || 'Đơn hàng phải từ {0} để áp dụng mã này').replace('{0}', minAmountText);
      showVoucherMessage(message, 'error');
      return;
    }

    // Apply voucher
    appliedVoucher = { code, ...voucher };
    const discount = calculateDiscount(currentAmount, voucher);
    const finalAmount = currentAmount - discount;
    
    // Store for language updates
    window.currentAppliedVoucher = {
      code: code,
      discountAmount: discount,
      finalAmount: finalAmount
    };

    // Update UI
    document.getElementById('discountAmount').textContent = `-${formatCurrency(discount)}`;
    document.getElementById('finalAmount').textContent = formatCurrency(finalAmount);
    voucherDiscount.classList.remove('hidden');

    // Save final payment amount to localStorage (after voucher)
    localStorage.setItem('finalPaymentAmount', finalAmount.toString());
    console.log('💾 Saved finalPaymentAmount after voucher:', finalAmount);

  // Also update VNPay displayed amount immediately
  const vnpayEls = document.querySelectorAll('.payment-details strong');
  if (vnpayEls.length > 0) vnpayEls[0].textContent = formatCurrency(finalAmount);

    const discountText = formatCurrency(discount);
    const message = (getTranslation('voucherApplied') || '✓ Áp dụng thành công: Giảm {1}').replace('{1}', discountText);
    showVoucherMessage(message, 'success');
    voucherInput.disabled = true;
    applyBtn.textContent = getTranslation('voucherAppliedText') || 'Đã áp dụng';
    applyBtn.disabled = true;

    // Add remove button
    addRemoveVoucherButton();
  }

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
    // Check if remove button already exists
    const existingRemoveBtn = document.querySelector('.remove-voucher-btn');
    if (existingRemoveBtn) {
      existingRemoveBtn.remove();
    }

    const removeBtn = document.createElement('button');
    removeBtn.textContent = getTranslation('removeVoucher') || 'Hủy bỏ';
    removeBtn.className = 'remove-voucher-btn';
    removeBtn.style.cssText = `
      margin-left: 6px;
      padding: 8px 12px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      height: auto;
      line-height: 1;
    `;

    removeBtn.addEventListener('click', function() {
      // Reset voucher
      appliedVoucher = null;
      window.currentAppliedVoucher = null; // Clear stored voucher info
      voucherDiscount.classList.add('hidden');
      voucherInput.value = '';
      voucherInput.disabled = false;
      applyBtn.textContent = getTranslation('applyVoucher') || 'Áp dụng';
      applyBtn.disabled = false;
      showVoucherMessage('', '');
      removeBtn.remove();
      
      // Reset total amount display to original amount
      const totalAmountEl = document.getElementById('totalAmount');
      const originalAmount = totalAmountEl ? totalAmountEl.textContent : '1.598.000 VND';
      const finalAmountEl = document.getElementById('finalAmount');
      if (finalAmountEl) {
        finalAmountEl.textContent = originalAmount;
      }
      
      // Reset finalPaymentAmount in localStorage to original total
      if (totalAmountEl) {
        const parsedTotal = parseFloat(totalAmountEl.textContent.replace(/[^\d]/g, ''));
        if (!isNaN(parsedTotal) && parsedTotal > 0) {
          localStorage.setItem('finalPaymentAmount', parsedTotal.toString());
          console.log('💾 Reset finalPaymentAmount to original total:', parsedTotal);
        }
      }
      // Also update VNPay displayed amount immediately
      const vnpayEls = document.querySelectorAll('.payment-details strong');
      if (vnpayEls.length > 0) {
        vnpayEls[0].textContent = originalAmount;
      }
    });

    // Add button after apply button
    applyBtn.insertAdjacentElement('afterend', removeBtn);
  }
}
