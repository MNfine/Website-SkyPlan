// My Trips page functionality

// State management
let currentTab = 'all';
let currentTripToCancel = null;
let bookingsCache = {}; // Cache bookings by booking_code to avoid refetching

// Helper function to get translated text
function getTranslation(key) {
  // Prefer the global preferredLanguage used across the app (fallbacks for compatibility)
  const currentLang = localStorage.getItem('preferredLanguage') || localStorage.getItem('selectedLanguage') || document.documentElement.lang || 'vi';
  return window.myTripsTranslations && window.myTripsTranslations[currentLang] && window.myTripsTranslations[currentLang][key]
    ? window.myTripsTranslations[currentLang][key]
    : // try fallback to global translations object if available
      (window.translations && window.translations[currentLang] && window.translations[currentLang][key]) || key;
}

// Centralized helper to determine the current UI language for this page.
function getCurrentLang() {
  return localStorage.getItem('preferredLanguage') || localStorage.getItem('selectedLanguage') || document.documentElement.lang || 'vi';
}

// Helper function to format date based on language
function formatDate(dateString, lang) {
  // Handle different input formats
  let date;
  
  // Try to parse various date formats
  if (dateString.includes('/')) {
    // DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      date = new Date(parts[2], parts[1] - 1, parts[0]);
    }
  } else {
    // Try standard date parsing
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) {
    return dateString; // Return original if parsing fails
  }
  
  if (lang === 'en') {
    // English format: MMM DD YYYY (e.g., "Nov 08 2025")
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).replace(',', '');
  } else {
    // Vietnamese format: DD/MM/YYYY (e.g., "08/11/2025")
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  initializeTabs();
  loadTripsData();
  
  // Apply translations based on current language
  const currentLang = getCurrentLang();
  
  // Function to apply translations when ready
  function tryApplyTranslations() {
    if (typeof window.myTripsTranslations !== 'undefined') {
      applyMyTripsTranslations(getCurrentLang());
    } else {
      // If translations not loaded yet, try again after a short delay
      setTimeout(tryApplyTranslations, 100);
    }
  }
  
  tryApplyTranslations();
});

// Tab functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const status = this.dataset.status;
      switchTab(status);
    });
  });
}

function switchTab(status) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-status="${status}"]`).classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${status}-content`).classList.add('active');

  currentTab = status;
  checkEmptyState();
}

// Check if current tab is empty and show empty state
function checkEmptyState() {
  const activeContent = document.querySelector('.tab-content.active');
  const tripsList = activeContent.querySelector('.trips-list');
  const emptyState = document.getElementById('empty-state');
  const lang = getCurrentLang();

  if (tripsList && tripsList.children.length === 0) {
    tripsList.style.display = 'none';
    emptyState.style.display = 'block';

    // Update empty state message based on current tab and auth state
    const title = emptyState.querySelector('h3');
    const message = emptyState.querySelector('p');

    // Detect if user is authenticated
    const isAuthenticated = (typeof AuthState !== 'undefined' && AuthState.getToken && AuthState.getToken());

    if (isAuthenticated && currentTab === 'all') {
      // Show logged-in empty state if no trips and user is logged in
      title.textContent = window.myTripsTranslations && window.myTripsTranslations[lang] && window.myTripsTranslations[lang]['noTripsLoggedInTitle']
        ? window.myTripsTranslations[lang]['noTripsLoggedInTitle']
        : getTranslation('noTripsTitle');
      message.textContent = window.myTripsTranslations && window.myTripsTranslations[lang] && window.myTripsTranslations[lang]['noTripsLoggedInMessage']
        ? window.myTripsTranslations[lang]['noTripsLoggedInMessage']
        : getTranslation('noTripsMessage');
    } else {
      switch(currentTab) {
        case 'all':
          title.textContent = getTranslation('noAllTripsTitle');
          message.textContent = getTranslation('noAllTripsMessage');
          break;
        case 'upcoming':
          title.textContent = getTranslation('noUpcomingTripsTitle');
          message.textContent = getTranslation('noUpcomingTripsMessage');
          break;
        case 'completed':
          title.textContent = getTranslation('noCompletedTripsTitle');
          message.textContent = getTranslation('noCompletedTripsMessage');
          break;
        case 'cancelled':
          title.textContent = getTranslation('noCancelledTripsTitle');
          message.textContent = getTranslation('noCancelledTripsMessage');
          break;
      }
    }
  } else {
    if (tripsList) tripsList.style.display = 'flex';
    emptyState.style.display = 'none';
  }
}

// Load trips data from API
async function loadTripsData() {
  // Use centralized AuthState helper to detect token (checks localStorage/sessionStorage and aliases)
  const token = (typeof AuthState !== 'undefined' && AuthState.getToken) ? AuthState.getToken() : (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  if (!token) {
    showLoginRequired();
    return;
  }

  try {
    showLoadingState();
    
    const response = await fetch('/api/bookings/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    hideLoadingState();

    if (response.ok && result.success) {
        try {
          // Cache bookings for download ticket feature
          if (Array.isArray(result.bookings)) {
            result.bookings.forEach(booking => {
              if (booking.booking_code) {
                bookingsCache[booking.booking_code] = booking;
              }
            });
          }
          renderTripsData(result.bookings);
        } catch (err) {
          console.error('🔍 MyTrips Render Error:', err);
          // Show a visible error so user sees something instead of empty state
          showErrorState('Lỗi khi hiển thị chuyến đi. Xem console để biết thêm chi tiết.');
        }
    } else {
      throw new Error(result.message || 'Failed to load bookings');
    }
  } catch (error) {
    hideLoadingState();
    console.error('Error loading trips:', error);
    showErrorState(error.message);
  }
}

// Show login required message
function showLoginRequired() {
  const container = document.querySelector('.trips-container, .main-content');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-lock" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
        <h3>${getTranslation('loginRequired') || 'Đăng nhập để xem chuyến đi'}</h3>
        <p>${getTranslation('loginRequiredDesc') || 'Vui lòng đăng nhập để xem danh sách chuyến đi của bạn.'}</p>
        <a href="login.html" class="btn btn-primary">${getTranslation('signInText') || 'Đăng nhập'}</a>
      </div>
    `;
  }
}

// Show loading state
function showLoadingState() {
  // Prefer injecting loading state into existing .trips-list containers so we don't
  // destroy the page structure (which would prevent renderTripsData from finding
  // its target container). If no .trips-list exists yet, fall back to replacing
  // .main-content for compatibility.
  const lists = document.querySelectorAll('.trips-list');
  const loadingHtml = `
    <div class="loading-state" style="text-align: center; padding: 40px;">
      <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #1976d2; margin-bottom: 20px;"></i>
      <p>${getTranslation('loadingTrips') || 'Đang tải chuyến đi...'}</p>
    </div>
  `;

  if (lists && lists.length > 0) {
    // Insert loading into each tab's list area so UX stays consistent
    lists.forEach(list => {
      list.innerHTML = loadingHtml;
    });
    return;
  }

  const container = document.querySelector('.trips-container, .main-content');
  if (container) {
    container.innerHTML = loadingHtml;
  }
}

// Hide loading state
function hideLoadingState() {
  const loadingEl = document.querySelector('.loading-state');
  if (loadingEl) {
    loadingEl.remove();
  }
}

// Show error state
function showErrorState(message) {
  const container = document.querySelector('.trips-container, .main-content');
  if (container) {
    container.innerHTML = `
      <div class="error-state" style="text-align: center; padding: 40px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 20px;"></i>
        <h3>${getTranslation('errorLoadingTrips') || 'Không thể tải chuyến đi'}</h3>
        <p style="color: #666; margin-bottom: 20px;">${message}</p>
        <button class="btn btn-primary" onclick="loadTripsData()">${getTranslation('tryAgain') || 'Thử lại'}</button>
      </div>
    `;
  }
}

// Render trips data
function renderTripsData(bookings) {
  if (!bookings || bookings.length === 0) {
    showEmptyState();
    return;
  }

  const lang = getCurrentLang();
  
  // Filter bookings by status
  const allBookings = bookings;
  const upcomingBookings = bookings.filter(b => 
    b.status === 'CONFIRMED' || b.status === 'PENDING'
  );
  const completedBookings = bookings.filter(b => 
    b.status === 'COMPLETED'
  );
  const cancelledBookings = bookings.filter(b => 
    b.status === 'CANCELLED'
  );
  
  // Render into each tab's container
  const containers = {
    'all': document.querySelector('#all-content .trips-list'),
    'upcoming': document.querySelector('#upcoming-content .trips-list'),
    'completed': document.querySelector('#completed-content .trips-list'),
    'cancelled': document.querySelector('#cancelled-content .trips-list')
  };
  
  // Render all bookings
  if (containers.all) {
    let html = '';
    allBookings.forEach(booking => {
      html += generateBookingHTML(booking, lang);
    });
    containers.all.innerHTML = html;
  }
  
  // Render upcoming bookings
  if (containers.upcoming) {
    let html = '';
    upcomingBookings.forEach(booking => {
      html += generateBookingHTML(booking, lang);
    });
    containers.upcoming.innerHTML = html;
  }
  
  // Render completed bookings
  if (containers.completed) {
    let html = '';
    completedBookings.forEach(booking => {
      html += generateBookingHTML(booking, lang);
    });
    containers.completed.innerHTML = html;
  }
  
  // Render cancelled bookings
  if (containers.cancelled) {
    let html = '';
    cancelledBookings.forEach(booking => {
      html += generateBookingHTML(booking, lang);
    });
    containers.cancelled.innerHTML = html;
  }
  
  // Update tabs if they exist
  updateTabCounts(bookings);
  
  // Check empty state for current tab
  checkEmptyState();
}

// Generate HTML for a single booking
function formatTimeForDisplay(dateString, lang) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return '';
  // HH:MM 24h
  return date.toLocaleTimeString(lang === 'en' ? 'en-US' : 'vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function generateBookingHTML(booking, lang) {
  const statusClass = getStatusClass(booking.status);
  const statusText = getStatusText(booking.status, lang);
  const tripTypeText = booking.trip_type === 'ROUND_TRIP'
    ? (lang === 'vi' ? 'Khứ hồi' : 'Round Trip')
    : (lang === 'vi' ? 'Một chiều' : 'One Way');

  // Dates
  const createdDate = formatDate(booking.created_at, lang);
  const outbound = booking.outbound_flight || {};
  const departDate = outbound.departure_time ? formatDate(outbound.departure_time, lang) : '';

  // City names from airport codes
  const originCode = outbound.origin_code || outbound.departure_airport || '';
  const destCode = outbound.destination_code || outbound.arrival_airport || '';
  const originName = originCode ? getCityName(originCode, lang) : '';
  const destName = destCode ? getCityName(destCode, lang) : '';
  // Format: "Sân bay Nội Bài (HAN)"
  const originNameFull = originName && originCode ? `${originName} (${originCode})` : originName || originCode || '';
  const destNameFull = destName && destCode ? `${destName} (${destCode})` : destName || destCode || '';

  // Times
  const departTime  = outbound.departure_time ? formatTimeForDisplay(outbound.departure_time, lang) : '';
  const arrivalTime = outbound.arrival_time ? formatTimeForDisplay(outbound.arrival_time, lang) : '';

  // Airline text
  let airlineText = '';
  if (outbound) {
    const parts = [];
    if (outbound.airline_name || outbound.airline) parts.push(outbound.airline_name || outbound.airline);
    if (outbound.flight_number) parts.push(outbound.flight_number);
    airlineText = parts.join(' - ');
  }

  // Duration (nếu đủ dữ liệu thì tính, không thì để trống)
  let durationText = '';
  if (outbound && outbound.departure_time && outbound.arrival_time) {
    const dep = new Date(outbound.departure_time);
    const arr = new Date(outbound.arrival_time);
    const diffMs = arr - dep;
    if (!isNaN(diffMs) && diffMs > 0) {
      const totalMin = Math.round(diffMs / 60000);
      const hours = Math.floor(totalMin / 60);
      const mins  = totalMin % 60;
      durationText = `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
  }

  // Số hành khách (fallback đủ kiểu, thiếu thì cho 1)
  const passengerCount =
    booking.passenger_count ||
    booking.total_passengers ||
    booking.num_passengers ||
    1;

  const passengerWord = lang === 'vi'
    ? 'hành khách'
    : (passengerCount === 1 ? 'passenger' : 'passengers');

  return `
    <div class="trip-card"
         data-trip-id="${booking.booking_code}"
         data-status="${booking.status.toLowerCase()}"
         onclick="goToOverview('${booking.booking_code}')">

      <!-- PILL TRẠNG THÁI, GIỐNG SƯỜN HTML -->
      <div class="trip-status ${statusClass}">
        <span>${statusText}</span>
      </div>
      
      <!-- HEADER: ROUTE + GIÁ + HÀNH KHÁCH -->
      <div class="trip-header">
        <div class="route-info">
          <div class="route-title">
            <h3>
              <span class="route-text">
                ${originName || ''} → ${destName || ''}
              </span>
            </h3>
          </div>
          <p class="booking-ref">
            ${lang === 'vi' ? 'Mã đặt chỗ:' : 'Booking code:'}
            <strong>${booking.booking_code}</strong>
          </p>
        </div>

        <div class="trip-price">
          <span class="price">
            ${Number(booking.total_amount || 0).toLocaleString('vi-VN')} VND
          </span>
          <span class="passengers">
            ${passengerCount} ${passengerWord}
          </span>
        </div>
      </div>

      <!-- BODY: THÔNG TIN CHUYẾN BAY + BOOKING DETAILS -->
      <div class="trip-details">
        <div class="flight-segment">
          <div class="flight-info">
            <div class="airline">
              <i class="fas fa-plane"></i>
              <span>${airlineText || (lang === 'vi' ? 'Chuyến bay' : 'Flight')}</span>
            </div>
            <div class="flight-time">
              <span class="departure">
                <strong>${departTime || '--:--'}</strong>
                <small>${originNameFull}</small>
              </span>
              <div class="duration">
                <div class="line"></div>
                <span>${durationText}</span>
              </div>
              <span class="arrival">
                <strong>${arrivalTime || '--:--'}</strong>
                <small>${destNameFull}</small>
              </span>
            </div>
          </div>
        </div>

        <div class="booking-details">
          <div class="detail-item">
            <i class="fas fa-calendar"></i>
            <span>
              ${lang === 'vi' ? 'Ngày bay:' : 'Flight date:'}
              <strong>${departDate || '--'}</strong>
            </span>
          </div>
          ${(() => {
            if (booking.passengers && booking.passengers.length > 0) {
              return booking.passengers.map(p => {
                const passengerName = p.full_name || p.fullName || 
                  ((p.firstname || p.firstName || '') + ' ' + (p.lastname || p.lastName || '')).trim() || 'N/A';
                // Get seat number - try multiple possible field names
                const seatNumber = p.seat_number || p.seatNumber || p.seat || '';
                let html = `
                  <div class="detail-item">
                    <i class="fas fa-users"></i>
                    <span>
                      ${lang === 'vi' ? 'Hành khách:' : 'Passenger:'}
                      <strong>${passengerName}</strong>
                    </span>
                  </div>`;
                // Always show seat field, even if empty (to match HTML template structure)
                html += `
                  <div class="detail-item">
                    <i class="fas fa-chair"></i>
                    <span>
                      ${lang === 'vi' ? 'Ghế:' : 'Seat:'}
                      <strong>${seatNumber || '--'}</strong>
                    </span>
                  </div>`;
                return html;
              }).join('');
            } else {
              return `
              <div class="detail-item">
                <i class="fas fa-users"></i>
                <span>
                  ${lang === 'vi' ? 'Hành khách:' : 'Passengers:'}
                  <strong>${passengerCount} ${passengerWord}</strong>
                </span>
              </div>`;
            }
          })()}
        </div>
      </div>

      <!-- ACTION BUTTONS: BỌC TRONG .trip-buttons GIỐNG MẪU -->
      <div class="trip-actions">
        <div class="trip-buttons">
          ${generateActionButtons(booking, lang)}
        </div>
      </div>
    </div>
  `;
}

// Get status class for styling - map CONFIRMED to 'upcoming' for display
function getStatusClass(status) {
  const statusMap = {
    'PENDING': 'pending',
    'CONFIRMED': 'upcoming',  // Map CONFIRMED to 'upcoming' to match HTML template
    'PAYMENT_FAILED': 'payment-failed',
    'CANCELLED': 'cancelled',
    'EXPIRED': 'expired',
    'COMPLETED': 'completed'
  };
  return statusMap[status] || 'pending';
}

// Get status text - map CONFIRMED to 'Sắp tới' for display
function getStatusText(status, lang) {
  const statusTexts = {
    'PENDING': lang === 'vi' ? 'Chờ thanh toán' : 'Pending Payment',
    'CONFIRMED': lang === 'vi' ? 'Sắp tới' : 'Upcoming',  // Map to 'Sắp tới' to match HTML template
    'PAYMENT_FAILED': lang === 'vi' ? 'Thanh toán thất bại' : 'Payment Failed',
    'CANCELLED': lang === 'vi' ? 'Đã hủy' : 'Cancelled',
    'EXPIRED': lang === 'vi' ? 'Hết hạn' : 'Expired',
    'COMPLETED': lang === 'vi' ? 'Hoàn thành' : 'Completed'
  };
  return statusTexts[status] || status;
}

// Generate action buttons based on booking status - match HTML template with 3 buttons
function generateActionButtons(booking, lang) {
  let buttons = '';
  
  switch (booking.status) {
    case 'PENDING':
    case 'PAYMENT_FAILED':
      const buttonText = booking.status === 'PAYMENT_FAILED' ? 
        (lang === 'vi' ? 'Thử lại thanh toán' : 'Retry Payment') :
        (lang === 'vi' ? 'Tiếp tục thanh toán' : 'Continue Payment');
        
      buttons += `<button class="btn btn-primary" onclick="event.stopPropagation(); continuePayment('${booking.booking_code}'); return false;">
        ${buttonText}
      </button>`;
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); cancelBooking('${booking.booking_code}'); return false;">
        ${lang === 'vi' ? 'Hủy booking' : 'Cancel Booking'}
      </button>`;
      break;
      
    case 'CONFIRMED':
      // Match HTML template: 3 buttons - Tải vé (view ticket), Thay đổi, Hủy chuyến
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); viewTicket('${booking.booking_code}'); return false;">
        <i class="fas fa-download"></i>
        <span>${lang === 'vi' ? 'Tải vé' : 'Download Ticket'}</span>
      </button>`;
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); modifyTrip('${booking.booking_code}'); return false;">
        <i class="fas fa-edit"></i>
        <span>${lang === 'vi' ? 'Thay đổi' : 'Modify'}</span>
      </button>`;
      buttons += `<button class="btn btn-danger" onclick="event.stopPropagation(); cancelTrip('${booking.booking_code}'); return false;">
        <i class="fas fa-times"></i>
        <span>${lang === 'vi' ? 'Hủy chuyến' : 'Cancel Trip'}</span>
      </button>`;
      break;
      
    case 'CANCELLED':
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); rebookSimilarTrip('${booking.booking_code}'); return false;">
        ${lang === 'vi' ? 'Đặt lại' : 'Rebook'}
      </button>`;
      break;
      
    case 'COMPLETED':
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); viewTicket('${booking.booking_code}'); return false;">
        <i class="fas fa-download"></i>
        <span>${lang === 'vi' ? 'Tải vé' : 'Download Ticket'}</span>
      </button>`;
      buttons += `<button class="btn btn-outline" onclick="event.stopPropagation(); rebookSimilarTrip('${booking.booking_code}'); return false;">
        <i class="fas fa-edit"></i>
        <span>${lang === 'vi' ? 'Đặt chuyến tương tự' : 'Book Similar'}</span>
      </button>`;
      break;
  }
  
  return buttons;
}

// Get city name from airport code
function getCityName(code, lang = 'vi') {
  const cityData = {
    'HAN': { vi: 'Hà Nội', en: 'Ha Noi' },
    'SGN': { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' },
    'DAD': { vi: 'Đà Nẵng', en: 'Da Nang' },
    'CXR': { vi: 'Nha Trang', en: 'Nha Trang' },
    'PQC': { vi: 'Phú Quốc', en: 'Phu Quoc' },
    'VCA': { vi: 'Cần Thơ', en: 'Can Tho' },
    'HUI': { vi: 'Huế', en: 'Hue' },
    'VII': { vi: 'Vinh', en: 'Vinh' },
    'HPH': { vi: 'Hải Phòng', en: 'Hai Phong' },
    'DLI': { vi: 'Đà Lạt', en: 'Da Lat' }
  };
  
  const data = cityData[code];
  if (data) {
    return data[lang] || data.vi;
  }
  return code; // Fallback to code if not found
}

// Get airport name (placeholder - should use translation data)
function getAirportName(code, lang) {
  // This should use the same airport translation data as other pages
  if (typeof window.getLocalizedAirportName === 'function') {
    return window.getLocalizedAirportName(code, lang);
  }
  return code; // Fallback to airport code
}

// Show empty state
function showEmptyState() {
  const container = document.querySelector('.trips-container, .main-content');
  if (container) {
    const lang = getCurrentLang(); // dùng hàm chung

    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 60px 20px;">
        <i class="fas fa-plane-departure" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
        <h3 data-i18n="noTripsTitle">${getTranslation('noTripsTitle')}</h3>
        <p style="color: #666; margin-bottom: 30px;" data-i18n="noTripsMessage">
          ${getTranslation('noTripsMessage')}
        </p>
        <a href="index.html" class="btn btn-primary">
          <span data-i18n="searchFlights">${getTranslation('searchFlights')}</span>
        </a>
      </div>
    `;

    // Cho chắc ăn, apply lại translation sau khi inject
    applyMyTripsTranslations(lang);
  }
}


// Update tab counts (if tabs exist)
function updateTabCounts(bookings) {
  const tabs = document.querySelectorAll('.trip-tabs .tab');
  if (tabs.length === 0) return;
  
  const counts = {
    all: bookings.length,
    upcoming: bookings.filter(b => b.status === 'CONFIRMED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length
  };
  
  tabs.forEach(tab => {
    const tabType = tab.getAttribute('data-tab');
    const countEl = tab.querySelector('.count');
    if (countEl && counts[tabType] !== undefined) {
      countEl.textContent = `(${counts[tabType]})`;
    }
  });
}

// Continue payment for pending booking
function continuePayment(bookingCode) {
  localStorage.setItem('currentBookingCode', bookingCode);
  window.location.href = `payment.html?booking_code=${bookingCode}`;
}

// Cancel booking
async function cancelBooking(bookingCode) {
  const lang = localStorage.getItem('selectedLanguage') || 'vi';
  const confirmMsg = lang === 'vi' ? 
    'Bạn có chắc chắn muốn hủy booking này? Hành động này không thể hoàn tác.' : 
    'Are you sure you want to cancel this booking? This action cannot be undone.';
  
  if (!confirm(confirmMsg)) {
    return;
  }

  // Use same token detection as loadTripsData
  const token = (typeof AuthState !== 'undefined' && AuthState.getToken) ? AuthState.getToken() : (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  if (!token) {
    showNotification(
      lang === 'vi' ? 'Vui lòng đăng nhập để tiếp tục' : 'Please login to continue',
      'error', 
      3000
    );
    return;
  }

  try {
    showNotification(
      lang === 'vi' ? 'Đang hủy booking...' : 'Cancelling booking...',
      'info', 
      2000
    );

    const response = await fetch(`/api/bookings/${bookingCode}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showNotification(
        lang === 'vi' ? 'Booking đã được hủy thành công' : 'Booking cancelled successfully',
        'success', 
        3000
      );
      
      // Reload trips data để cập nhật UI
      loadTripsData();
    } else {
      throw new Error(result.message || 'Failed to cancel booking');
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    showNotification(
      lang === 'vi' ? 
        'Không thể hủy booking: ' + error.message : 
        'Could not cancel booking: ' + error.message,
      'error', 
      4000
    );
  }
}

// Trip actions
function goToOverview(tripId) {
  showNotification(getTranslation('goingToOverview'), 'info', 2000);
  try {
    // Ensure overview page knows which booking to check for status
    localStorage.setItem('currentBookingCode', tripId);
    localStorage.setItem('overviewMode', 'existing-trip');
  } catch (e) {
    console.warn('Could not persist currentBookingCode to localStorage', e);
  }

  setTimeout(() => {
    window.location.href = `overview.html?tripId=${tripId}`;
  }, 1000);
}

async function downloadTicket(bookingCode) {
  const lang = localStorage.getItem('selectedLanguage') || 'vi';

  showNotification(
    lang === 'vi' ? 'Đang tải vé điện tử...' : 'Downloading e-ticket...',
    'info',
    2000
  );
  
  try {
    let booking;
    
    // Try to get booking from cache first
    if (bookingsCache[bookingCode]) {
      booking = bookingsCache[bookingCode];
    } else {
      // Fallback: fetch from API if not in cache
      // Use same token detection as loadTripsData
      const token = (typeof AuthState !== 'undefined' && AuthState.getToken) ? AuthState.getToken() : (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
      
      const response = await fetch(`/api/bookings/${bookingCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fetch booking error:', response.status, errorData);
        
        // Show localized error
        if (response.status === 401) {
          throw new Error(lang === 'vi' ? 'Phiên đăng nhập hết hạn' : 'Session expired');
        }
        throw new Error(errorData.message || (lang === 'vi' ? 'Không thể tải thông tin vé' : 'Failed to fetch booking'));
      }
      
      const result = await response.json();
      
      if (!result.success || !result.booking) {
        console.error('Invalid booking response:', result);
        throw new Error(lang === 'vi' ? 'Dữ liệu vé không hợp lệ' : 'Invalid booking data');
      }
      
      booking = result.booking;
      // Cache for future use
      bookingsCache[bookingCode] = booking;
    }
    
    // Get flight info
    const outboundFlight = booking.outbound_flight;
    const returnFlight = booking.inbound_flight;
    const passengers = booking.passengers || [];
    
    // Create ticket content (similar to confirmation page)
    let ticketContent = `
SkyPlan - Vé máy bay điện tử
=====================================
Mã đặt chỗ: ${booking.booking_code}
Trạng thái: ${booking.status}
Tổng tiền: ${Number(booking.total_amount || 0).toLocaleString('vi-VN')} VND
Ngày đặt: ${new Date(booking.created_at).toLocaleDateString('vi-VN')}
=====================================

CHUYẾN BAY ĐI:
${outboundFlight ? `
  Chuyến bay: ${outboundFlight.flight_code || 'N/A'}
  Hãng: ${outboundFlight.airline_name || outboundFlight.airline_code || 'N/A'}
  Từ: ${outboundFlight.origin_name || outboundFlight.origin_code} (${outboundFlight.origin_code})
  Đến: ${outboundFlight.destination_name || outboundFlight.destination_code} (${outboundFlight.destination_code})
  Khởi hành: ${new Date(outboundFlight.departure_time).toLocaleString('vi-VN')}
  Hạ cánh: ${new Date(outboundFlight.arrival_time).toLocaleString('vi-VN')}
` : '  Không có thông tin'}
`;

    if (returnFlight) {
      ticketContent += `
CHUYẾN BAY VỀ:
  Chuyến bay: ${returnFlight.flight_code || 'N/A'}
  Hãng: ${returnFlight.airline_name || returnFlight.airline_code || 'N/A'}
  Từ: ${returnFlight.origin_name || returnFlight.origin_code} (${returnFlight.origin_code})
  Đến: ${returnFlight.destination_name || returnFlight.destination_code} (${returnFlight.destination_code})
  Khởi hành: ${new Date(returnFlight.departure_time).toLocaleString('vi-VN')}
  Hạ cánh: ${new Date(returnFlight.arrival_time).toLocaleString('vi-VN')}
`;
    }

    ticketContent += `
=====================================
HÀNH KHÁCH:
`;
    
    passengers.forEach((bp, idx) => {
      const passenger = bp.passenger || {};
      ticketContent += `  ${idx + 1}. ${passenger.full_name || 'N/A'}`;
      if (bp.seat_number) {
        ticketContent += ` - Ghế: ${bp.seat_number}`;
      }
      ticketContent += '\n';
    });

    ticketContent += `
=====================================
Cảm ơn bạn đã sử dụng dịch vụ SkyPlan!

Lưu ý: Đây là vé điện tử, vui lòng xuất trình
mã đặt chỗ tại quầy check-in sân bay.
`;

    // Create and download file
    const blob = new Blob([ticketContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SkyPlan_Ve_${booking.booking_code}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showNotification(
      lang === 'vi' ? 'Đã tải vé thành công!' : 'Ticket downloaded successfully!',
      'success',
      3000
    );
  } catch (error) {
    console.error('Download ticket error:', error);
    showNotification(
      error.message || (lang === 'vi' ? 'Không thể tải vé' : 'Failed to download ticket'),
      'error',
      4000
    );
  }
}

// viewTicket now calls downloadTicket
function viewTicket(bookingCode) {
  downloadTicket(bookingCode);
}

function modifyTrip(tripId) {
  showNotification(getTranslation('modifyFeatureDev'), 'info', 4000);
}

function downloadInvoice(tripId) {
  showNotification(getTranslation('downloadingInvoice'), 'info', 2000);
  
  // Simulate download
  setTimeout(() => {
    showNotification(getTranslation('invoiceDownloaded'), 'success', 3000);
  }, 1500);
}

function rebookTrip(tripId) {
  showNotification(getTranslation('goingToSearch'), 'info', 3000);
  
  // In real app, this would pre-fill search form
  setTimeout(() => {
    window.location.href = 'search.html';
  }, 1000);
}

function rebookSimilarTrip(tripId) {
  showNotification(getTranslation('findingSimilarFlights'), 'info', 3000);
  
  setTimeout(() => {
    window.location.href = 'search.html';
  }, 1000);
}

function viewCancellationDetails(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  
  showNotification(getTranslation('showingCancellationDetails'), 'info', 2000);
  
  // Create and show a custom modal for cancellation details
  setTimeout(() => {
    showCancellationModal(tripId);
  }, 500);
}

function showCancellationModal(tripId) {
  // Remove existing modal if any
  const existingModal = document.getElementById('cancellationDetailsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal HTML
  const modalHTML = `
    <div id="cancellationDetailsModal" class="modal-overlay" style="display: flex;">
      <div class="modal-content cancellation-modal" style="max-width: 600px; width: 90%;">
        <div class="modal-header">
          <h3><i class="fas fa-info-circle"></i> Chi tiết hủy vé ${tripId}</h3>
          <button class="close-btn" onclick="closeCancellationModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="cancellation-details-grid">
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-clock"></i>
                <span>Thời gian hủy</span>
              </div>
              <div class="detail-value">08/11/2025 14:30</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-comment"></i>
                <span>Lý do hủy</span>
              </div>
              <div class="detail-value">Thay đổi kế hoạch cá nhân</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-receipt"></i>
                <span>Phí hủy</span>
              </div>
              <div class="detail-value cancellation-fee">390.000 VND</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-money-bill-wave"></i>
                <span>Số tiền hoàn</span>
              </div>
              <div class="detail-value refund-amount">1.560.000 VND</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-credit-card"></i>
                <span>Trạng thái hoàn tiền</span>
              </div>
              <div class="detail-value status-completed">
                <span class="status-badge">Đã hoàn vào thẻ</span>
              </div>
            </div>
          </div>
          <div class="refund-note">
            <i class="fas fa-info-circle"></i>
            <span>Tiền hoàn đã được chuyển vào tài khoản thanh toán gốc trong vòng 3-5 ngày làm việc</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="closeCancellationModal()">
            <i class="fas fa-check"></i>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Add enhanced CSS for cancellation details
  const style = document.createElement('style');
  style.textContent = `
    .cancellation-modal .modal-header {
      padding: 20px 24px 16px 24px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .cancellation-modal .modal-header h3 {
      color: #212529;
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      flex: 1;
    }
    
    .cancellation-modal .close-btn {
      background: none;
      border: none;
      color: #6c757d;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .cancellation-modal .close-btn:hover {
      background: #f8f9fa;
      color: #495057;
    }
    
    .cancellation-details-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid var(--primary-color);
    }
    
    .detail-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #212529;
      min-width: 160px;
      flex-shrink: 0;
    }
    
    .detail-label i {
      color: var(--primary-color);
      width: 16px;
      text-align: center;
    }
    
    .detail-value {
      color: #212529;
      font-weight: 600;
      text-align: right;
    }
    
    .cancellation-fee {
      color: #dc3545;
      font-weight: 600;
    }
    
    .refund-amount {
      color: #28a745;
      font-weight: 600;
      font-size: 1.1rem;
    }
    
    .status-badge {
      background: #28a745;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .refund-note {
      background: #e3f2fd;
      border: 1px solid #90caf9;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: #1976d2;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    
    .refund-note i {
      color: #1976d2;
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .cancellation-modal .modal-footer {
      border-top: 1px solid #e9ecef;
      padding-top: 16px;
      display: flex;
      justify-content: center;
    }
    
    .cancellation-modal .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      min-width: 120px;
      justify-content: center;
    }
    
    @media (max-width: 768px) {
      .detail-row {
        flex-direction: column;
        gap: 8px;
      }
      
      .detail-label {
        min-width: auto;
      }
      
      .detail-value {
        text-align: left;
      }
    }
  `;
  document.head.appendChild(style);
}

function closeCancellationModal() {
  const modal = document.getElementById('cancellationDetailsModal');
  if (modal) {
    modal.remove();
  }
}

// Cancel trip functionality
function cancelTrip(tripId) {
  currentTripToCancel = tripId;
  const trip = getTripById(tripId);
  
  if (!trip) {
    showNotification('Không tìm thấy thông tin chuyến đi!', 'error', 4000);
    return;
  }
  
  // Populate modal with trip details
  populateCancelModal(trip);
  
  // Show modal
  document.getElementById('cancelModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function populateCancelModal(trip) {
  const summary = document.getElementById('cancelTripSummary');
  const route = trip.querySelector('.route-info h3').textContent;
  const bookingRef = trip.querySelector('.booking-ref strong').textContent;
  const price = trip.querySelector('.trip-price .price').textContent;
  
  summary.innerHTML = `
    <h4>${getTranslation('tripInformation')}</h4>
    <div class="detail-item">
      <i class="fas fa-route"></i>
      <span>${getTranslation('routeLabel')} <strong>${route}</strong></span>
    </div>
    <div class="detail-item">
      <i class="fas fa-ticket-alt"></i>
      <span>${getTranslation('bookingCodeLabel')} <strong>${bookingRef}</strong></span>
    </div>
    <div class="detail-item">
      <i class="fas fa-money-bill-wave"></i>
      <span>${getTranslation('priceLabel')} <strong>${price}</strong></span>
    </div>
  `;
}

function closeCancelModal() {
  document.getElementById('cancelModal').style.display = 'none';
  document.body.style.overflow = 'auto';
  currentTripToCancel = null;
  
  // Reset form
  document.getElementById('cancelReason').value = '';
  document.getElementById('cancelNote').value = '';
}

async function confirmCancelTrip() {
  if (!currentTripToCancel) return;
  
  const lang = localStorage.getItem('selectedLanguage') || 'vi';
  // Use same token detection as loadTripsData
  const token = (typeof AuthState !== 'undefined' && AuthState.getToken) ? AuthState.getToken() : (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  
  if (!token) {
    showNotification(
      getTranslation('pleaseLoginToContinue'),
      'error', 
      3000
    );
    return;
  }
  
  const reason = document.getElementById('cancelReason').value;
  const note = document.getElementById('cancelNote').value;
  
  // Get booking code from tripCard
  const tripCard = getTripById(currentTripToCancel);
  if (!tripCard) {
    showNotification(
      getTranslation('tripNotFound'),
      'error', 
      3000
    );
    return;
  }
  
  const bookingCode = tripCard.dataset.tripId; // data-trip-id="${booking.booking_code}"
  
  try {
    const response = await fetch(`/api/bookings/${bookingCode}/cancel`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cancellation_reason: reason,
        cancellation_notes: note
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Update trip status
      const statusElement = tripCard.querySelector('.trip-status');
      statusElement.className = 'trip-status cancelled';
      statusElement.innerHTML = `<span>${lang === 'vi' ? 'Đã hủy' : 'Cancelled'}</span>`;
      
      // Update price info
      const priceContainer = tripCard.querySelector('.trip-price');
      const originalPrice = priceContainer.querySelector('.price').textContent;
      priceContainer.innerHTML = `
        <span class="price">${originalPrice}</span>
        <span class="refund-info">${lang === 'vi' ? 'Hoàn tiền:' : 'Refund:'} ${calculateRefund(originalPrice)}</span>
      `;
      
      // Update actions
      const actionsContainer = tripCard.querySelector('.trip-actions');
      actionsContainer.innerHTML = `
        <button class="btn btn-outline" onclick="viewCancellationDetails('${currentTripToCancel}')">
          <i class="fas fa-info-circle"></i>
          <span>${lang === 'vi' ? 'Chi tiết hủy' : 'Cancellation Details'}</span>
        </button>
        <button class="btn btn-primary" onclick="rebookSimilarTrip('${currentTripToCancel}')">
          <i class="fas fa-repeat"></i>
          <span>${lang === 'vi' ? 'Đặt tương tự' : 'Rebook Similar'}</span>
        </button>
      `;
      
      // Move to cancelled section
      const cancelledList = document.querySelector('#cancelled-content .trips-list');
      const upcomingList = document.querySelector('#upcoming-content .trips-list');
      
      if (cancelledList && upcomingList) {
        cancelledList.appendChild(tripCard);
      }
      
      closeCancelModal();
      showNotification(
        getTranslation('tripCancelledSuccessWithSeats'),
        'success', 
        5000
      );
      
      // Check if upcoming tab is now empty
      if (currentTab === 'upcoming') {
        checkEmptyState();
      }
      
      // Reload trips to ensure data is fresh (don't await to avoid blocking success message)
      loadTripsData().catch(err => {
        console.error('Error reloading trips after cancellation:', err);
        // Silently fail - success message already shown
      });
    } else {
      showNotification(
        result.message || getTranslation('cancelTripFailed'),
        'error', 
        4000
      );
    }
  } catch (error) {
    console.error('Cancel trip error:', error);
    showNotification(
      getTranslation('cancelTripError'),
      'error', 
      4000
    );
  }
}

// Helper functions
function getTripById(tripId) {
  return document.querySelector(`[data-trip-id="${tripId}"]`);
}

function calculateRefund(priceText) {
  // Extract number from price text and calculate 80% refund
  const priceNumber = parseInt(priceText.replace(/\D/g, ''));
  const refund = Math.floor(priceNumber * 0.8);
  return refund.toLocaleString('vi-VN') + ' VND';
}

// Notification system
function showNotification(message, type = 'info', duration = 3000) {
  // Try to use toast system first
  if (typeof window.showToast === 'function') {
    window.showToast(message, { type: type, duration: duration });
    return;
  }
  
  // Try alternative notify function
  if (typeof window.notify === 'function') {
    window.notify(message, type, duration);
    return;
  }
  
  // Try to load toast.js dynamically if not available
  if (!window.toastLoadAttempted) {
    window.toastLoadAttempted = true;
    const script = document.createElement('script');
    script.src = 'assets/scripts/toast.js';
    script.onload = function() {
      // Retry notification after toast.js is loaded
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: type, duration: duration });
      }
    };
    script.onerror = function() {
      // Toast script failed to load
    };
    document.head.appendChild(script);
  }
}

// Language support
function initializeLanguage() {
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  applyMyTripsTranslations(lang);
}

function applyMyTripsTranslations(lang) {
  if (typeof window.myTripsTranslations === 'undefined') {
    return;
  }
  
  const translations = window.myTripsTranslations[lang] || window.myTripsTranslations.vi;
  
  // Update page title
  if (translations.myTripsTitle) {
    document.title = translations.myTripsTitle;
  }
  
  // Apply translations to elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });
  
  // Apply placeholder translations
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (translations[key]) {
      element.placeholder = translations[key];
    }
  });
  
  // Translate booking code labels
  document.querySelectorAll('.booking-ref').forEach(element => {
    const strong = element.querySelector('strong');
    if (strong) {
      const code = strong.textContent;
      element.innerHTML = `${translations.bookingCode || 'Mã đặt chỗ:'} <strong>${code}</strong>`;
    }
  });
  
  // Translate passenger count
  document.querySelectorAll('.passengers').forEach(element => {
    const match = element.textContent.match(/(\d+)/);
    if (match) {
      const count = match[1];
      const passengerText = count === '1' ? translations.passenger : translations.passengers;
      element.textContent = `${count} ${passengerText}`;
    }
  });
  
  // Translate detail items (only those without data-i18n nested elements)
  document.querySelectorAll('.detail-item span').forEach(element => {
    // Handle elements with data-i18n children (new structure)
    const dataI18nChild = element.querySelector('[data-i18n]');
    if (dataI18nChild) {
      // This is the new structure with data-i18n
      const key = dataI18nChild.getAttribute('data-i18n');
      if (translations[key]) {
        dataI18nChild.textContent = translations[key];
      }
      
      // Also translate and format the content based on the key
      const strong = element.querySelector('strong');
      if (strong && key === 'cancelReason') {
        const reasonText = strong.textContent;
        let translatedReason = reasonText;
        
        // Translate common cancellation reasons
        if (reasonText.includes('Thay đổi kế hoạch cá nhân') || reasonText.includes('Personal plan change')) {
          translatedReason = translations.personalPlanChange || reasonText;
        } else if (reasonText.includes('Xung đột lịch trình') || reasonText.includes('Schedule conflict')) {
          translatedReason = translations.scheduleConflict || reasonText;
        } else if (reasonText.includes('Trường hợp khẩn cấp') || reasonText.includes('Emergency')) {
          translatedReason = translations.emergencyReason || reasonText;
        } else if (reasonText.includes('Điều kiện thời tiết') || reasonText.includes('Weather condition')) {
          translatedReason = translations.weatherCondition || reasonText;
        } else if (reasonText.includes('Vấn đề sức khỏe') || reasonText.includes('Health issue')) {
          translatedReason = translations.healthIssue || reasonText;
        }
        
        strong.textContent = translatedReason;
      } else if (strong && (key === 'flightDate' || element.textContent.includes('Ngày bay:') || element.textContent.includes('Flight date:'))) {
        // Format flight date
        const formattedDate = formatDate(strong.textContent, lang);
        strong.textContent = formattedDate;
      } else if (strong && (key === 'cancelledAt' || element.textContent.includes('Hủy lúc:') || element.textContent.includes('Cancelled at:'))) {
        // Format cancellation datetime
        let formattedDateTime = strong.textContent;
        if (strong.textContent.includes('/') && strong.textContent.includes(':')) {
          const parts = strong.textContent.split(' ');
          if (parts.length >= 2) {
            const datePart = formatDate(parts[0], lang);
            const timePart = parts[1];
            formattedDateTime = `${datePart} ${timePart}`;
          }
        }
        strong.textContent = formattedDateTime;
      }
      return; // Skip further processing
    }
    
    // Handle old structure without data-i18n
    const text = element.textContent;
    
    if (text.includes('Ngày bay:') || text.includes('Flight date:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        const formattedDate = formatDate(strong.textContent, lang);
        element.innerHTML = `${translations.flightDate || 'Ngày bay:'} <strong>${formattedDate}</strong>`;
      }
    } else if (text.includes('Hành khách:') || text.includes('Passenger:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        element.innerHTML = `${translations.passengerLabel || 'Hành khách:'} <strong>${strong.textContent}</strong>`;
      }
    } else if (text.includes('Ghế:') || text.includes('Seat:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        element.innerHTML = `${translations.seat || 'Ghế:'} <strong>${strong.textContent}</strong>`;
      }
    } else if (text.includes('Hủy lúc:') || text.includes('Cancelled at:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        // Format datetime for cancellation
        let formattedDateTime = strong.textContent;
        if (strong.textContent.includes('/') && strong.textContent.includes(':')) {
          // Split date and time parts
          const parts = strong.textContent.split(' ');
          if (parts.length >= 2) {
            const datePart = formatDate(parts[0], lang);
            const timePart = parts[1];
            formattedDateTime = `${datePart} ${timePart}`;
          }
        }
        element.innerHTML = `${translations.cancelledAt || 'Hủy lúc:'} <strong>${formattedDateTime}</strong>`;
      }
    } else if (text.includes('Lý do hủy:') || text.includes('Cancellation reason:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        const reasonText = strong.textContent;
        let translatedReason = reasonText;
        
        // Translate common cancellation reasons
        if (reasonText.includes('Thay đổi kế hoạch cá nhân') || reasonText.includes('Personal plan change')) {
          translatedReason = translations.personalPlanChange || reasonText;
        } else if (reasonText.includes('Xung đột lịch trình') || reasonText.includes('Schedule conflict')) {
          translatedReason = translations.scheduleConflict || reasonText;
        } else if (reasonText.includes('Trường hợp khẩn cấp') || reasonText.includes('Emergency')) {
          translatedReason = translations.emergencyReason || reasonText;
        } else if (reasonText.includes('Điều kiện thời tiết') || reasonText.includes('Weather condition')) {
          translatedReason = translations.weatherCondition || reasonText;
        } else if (reasonText.includes('Vấn đề sức khỏe') || reasonText.includes('Health issue')) {
          translatedReason = translations.healthIssue || reasonText;
        }
        
        element.innerHTML = `${translations.cancelReason || 'Lý do hủy:'} <strong>${translatedReason}</strong>`;
      }
    } else if (text.includes('Trạng thái:') || text.includes('Status:')) {
      const strong = element.querySelector('strong');
      if (strong) {
        const statusText = strong.textContent.includes('thành công') || strong.textContent.includes('successfully') 
          ? translations.flightCompleted 
          : strong.textContent;
        element.innerHTML = `${translations.status || 'Trạng thái:'} <strong>${statusText}</strong>`;
      }
    }
  });
  
  // Translate refund info
  document.querySelectorAll('.refund-info').forEach(element => {
    const match = element.textContent.match(/[\d.,]+\s*VND/);
    if (match) {
      element.textContent = `${translations.refundInfo || 'Hoàn tiền:'} ${match[0]}`;
    }
  });
  
  // Translate airport names
  document.querySelectorAll('.departure small, .arrival small').forEach(element => {
    const text = element.textContent;
    if (text.includes('Nội Bài') || text.includes('Noi Bai')) {
      element.textContent = `${translations.noibaAirport || 'Sân bay Nội Bài'} (HAN)`;
    } else if (text.includes('Tân Sơn Nhất') || text.includes('Tan Son Nhat')) {
      element.textContent = `${translations.tansonnhatAirport || 'Sân bay Tân Sơn Nhất'} (SGN)`;
    } else if (text.includes('Đà Nẵng') || text.includes('Da Nang')) {
      element.textContent = `${translations.danangAirport || 'Sân bay Đà Nẵng'} (DAD)`;
    } else if (text.includes('Cam Ranh')) {
      element.textContent = `${translations.camranhAirport || 'Sân bay Cam Ranh'} (CXR)`;
    }
  });
  
  // Translate city names in route titles
  if (typeof window.cityTranslations !== 'undefined') {
    const cities = window.cityTranslations[lang] || window.cityTranslations.vi;
    document.querySelectorAll('.route-text').forEach(element => {
      let text = element.textContent;
      
      // Replace city names
      Object.keys(cities).forEach(cityKey => {
        const viName = window.cityTranslations.vi[cityKey];
        const enName = window.cityTranslations.en[cityKey];
        const targetName = cities[cityKey];
        
        // Replace both VI and EN versions with target language
        text = text.replace(new RegExp(viName, 'g'), targetName);
        text = text.replace(new RegExp(enName, 'g'), targetName);
      });
      
      element.textContent = text;
    });
  }
}

// Modal click outside to close
document.addEventListener('click', function(e) {
  const modal = document.getElementById('cancelModal');
  const cancellationModal = document.getElementById('cancellationDetailsModal');
  
  if (e.target === modal) {
    closeCancelModal();
  }
  
  if (e.target === cancellationModal) {
    closeCancellationModal();
  }
});

// ESC key to close modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('cancelModal');
    const cancellationModal = document.getElementById('cancellationDetailsModal');
    
    if (modal && modal.style.display === 'flex') {
      closeCancelModal();
    }
    
    if (cancellationModal) {
      closeCancellationModal();
    }
  }
});

// Export functions for global access
window.goToOverview = goToOverview;
window.downloadTicket = downloadTicket;
window.viewTicket = viewTicket;
window.modifyTrip = modifyTrip;
window.downloadInvoice = downloadInvoice;
window.rebookTrip = rebookTrip;
window.rebookSimilarTrip = rebookSimilarTrip;
window.viewCancellationDetails = viewCancellationDetails;
window.closeCancellationModal = closeCancellationModal;
window.cancelTrip = cancelTrip;
window.closeCancelModal = closeCancelModal;
window.confirmCancelTrip = confirmCancelTrip;
window.initializeLanguage = initializeLanguage;
window.applyMyTripsTranslations = applyMyTripsTranslations;

// Listen for language change events
document.addEventListener('languageChanged', function(e) {
  // Support both e.detail.language and e.detail.lang for compatibility
  const lang = (e.detail && (e.detail.language || e.detail.lang)) || getCurrentLang();
  applyMyTripsTranslations(lang);
  // Also update the empty-state message if visible
  checkEmptyState();

  // Debugging language change event
});
