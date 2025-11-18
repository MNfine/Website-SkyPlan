// My Trips page functionality

// State management
let currentTab = 'all';
let currentTripToCancel = null;

// Helper function to get translated text
function getTranslation(key) {
  const currentLang = localStorage.getItem('selectedLanguage') || 'vi';
  return window.myTripsTranslations && window.myTripsTranslations[currentLang] && window.myTripsTranslations[currentLang][key] 
    ? window.myTripsTranslations[currentLang][key] 
    : key;
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
  const currentLang = localStorage.getItem('selectedLanguage') || 'vi';
  
  // Function to apply translations when ready
  function tryApplyTranslations() {
    if (typeof window.myTripsTranslations !== 'undefined') {
      applyMyTripsTranslations(currentLang);
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
  
  if (tripsList && tripsList.children.length === 0) {
    tripsList.style.display = 'none';
    emptyState.style.display = 'block';
    
    // Update empty state message based on current tab
    const title = emptyState.querySelector('h3');
    const message = emptyState.querySelector('p');
    
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
  } else {
    if (tripsList) tripsList.style.display = 'flex';
    emptyState.style.display = 'none';
  }
}

// Load trips data (mock data for demo)
function loadTripsData() {
  // In a real application, this would fetch from API
  // For demo purposes, we'll use the static HTML data
  checkEmptyState();
}

// Trip actions
function goToOverview(tripId) {
  showNotification(getTranslation('goingToOverview'), 'info', 2000);
  setTimeout(() => {
    window.location.href = `overview.html?tripId=${tripId}`;
  }, 1000);
}

function downloadTicket(tripId) {
  showNotification(getTranslation('downloadingTicket'), 'info', 2000);
  
  // In real app, this would download the ticket file
  setTimeout(() => {
    showNotification(getTranslation('ticketDownloaded'), 'success', 3000);
  }, 2000);
}

function viewTicket(tripId) {
  // Show notification
  showNotification(getTranslation('openingTicket'), 'info', 2000);
  
  // In real app, this would navigate to ticket view
  setTimeout(() => {
    showNotification(getTranslation('ticketOpened'), 'success', 3000);
  }, 1000);
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
    <h4>Thông tin chuyến đi</h4>
    <div class="detail-item">
      <i class="fas fa-route"></i>
      <span>Tuyến bay: <strong>${route}</strong></span>
    </div>
    <div class="detail-item">
      <i class="fas fa-ticket-alt"></i>
      <span>Mã đặt chỗ: <strong>${bookingRef}</strong></span>
    </div>
    <div class="detail-item">
      <i class="fas fa-money-bill-wave"></i>
      <span>Giá vé: <strong>${price}</strong></span>
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

function confirmCancelTrip() {
  if (!currentTripToCancel) return;
  
  const reason = document.getElementById('cancelReason').value;
  const note = document.getElementById('cancelNote').value;
  
  // Show loading
  showNotification('Đang xử lý yêu cầu hủy...', 'info', 2000);
  
  // Simulate API call
  setTimeout(() => {
    // Move trip to cancelled tab
    const tripCard = getTripById(currentTripToCancel);
    if (tripCard) {
      // Update trip status
      const statusElement = tripCard.querySelector('.trip-status');
      statusElement.className = 'trip-status cancelled';
      statusElement.innerHTML = '<span>Đã hủy</span>';
      
      // Update price info
      const priceContainer = tripCard.querySelector('.trip-price');
      const originalPrice = priceContainer.querySelector('.price').textContent;
      priceContainer.innerHTML = `
        <span class="price">${originalPrice}</span>
        <span class="refund-info">Hoàn tiền: ${calculateRefund(originalPrice)}</span>
      `;
      
      // Update actions
      const actionsContainer = tripCard.querySelector('.trip-actions');
      actionsContainer.innerHTML = `
        <button class="btn btn-outline" onclick="viewCancellationDetails('${currentTripToCancel}')">
          <i class="fas fa-info-circle"></i>
          <span>Chi tiết hủy</span>
        </button>
        <button class="btn btn-primary" onclick="rebookSimilarTrip('${currentTripToCancel}')">
          <i class="fas fa-repeat"></i>
          <span>Đặt tương tự</span>
        </button>
      `;
      
      // Move to cancelled section
      const cancelledList = document.querySelector('#cancelled-content .trips-list');
      const upcomingList = document.querySelector('#upcoming-content .trips-list');
      
      if (cancelledList && upcomingList) {
        cancelledList.appendChild(tripCard);
      }
    }
    
    closeCancelModal();
    showNotification(getTranslation('tripCancelledSuccess') + ' ' + getTranslation('refundProcessing'), 'success', 5000);
    
    // Check if upcoming tab is now empty
    if (currentTab === 'upcoming') {
      checkEmptyState();
    }
  }, 2000);
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
      } else {
        console.log('Toast notification:', message);
      }
    };
    script.onerror = function() {
      console.log('Toast notification:', message);
    };
    document.head.appendChild(script);
  } else {
    // Toast.js load was attempted but failed, just log
    console.log('Toast notification:', message);
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
  applyMyTripsTranslations(e.detail.language);
});
