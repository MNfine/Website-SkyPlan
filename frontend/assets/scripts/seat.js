// Seat Page Notifications and Interactions
// This file handles toast notifications, seat-specific interactions, and API data loading

// Simplified Seat Manager for API data loading
const SeatManager = {
    flightId: null,
    availableSeats: [],
    seatMap: new Map(),
    
    // Initialize seat management - load data and update existing HTML
    init: async function(flightId) {
        this.flightId = flightId;
        await this.loadSeats();
        this.updateExistingSeats();
    },
    
    // Load seats from API
    loadSeats: async function() {
        try {
            console.log(`Loading seats for flight ID: ${this.flightId}`);
            const response = await fetch(`/api/seats/flight/${this.flightId}/seats`);
            
            if (!response.ok) {
                throw new Error(`Failed to load seats: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.availableSeats = data.seats;
                this.seatMap.clear();
                
                data.seats.forEach(seat => {
                    this.seatMap.set(seat.seat_number, seat); // Use seat_number as key
                });
                
                console.log(`Loaded ${data.seats.length} seats for flight ${this.flightId}`);
            } else {
                throw new Error(data.message || 'API returned success: false');
            }
        } catch (error) {
            console.error('Error loading seats:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to load seat information', 'error');
            }
        }
    },
    
    // Update existing seat elements with API data - không thay đổi HTML structure
    updateExistingSeats: function() {
        const existingSeats = document.querySelectorAll('.seat[data-seat]');
        
        existingSeats.forEach(seatElement => {
            const seatNumber = seatElement.getAttribute('data-seat');
            const apiSeat = this.seatMap.get(seatNumber);
            
            if (apiSeat) {
                // Remove existing status classes
                seatElement.classList.remove('available', 'occupied', 'selected');
                
                // Update seat status based on API data
                if (apiSeat.status === 'CONFIRMED') {
                    seatElement.classList.add('occupied');
                    seatElement.style.cursor = 'not-allowed';
                } else {
                    seatElement.classList.add('available');
                    seatElement.style.cursor = 'pointer';
                }
                
                // Add seat data attributes for future use
                seatElement.setAttribute('data-seat-id', apiSeat.id);
                seatElement.setAttribute('data-seat-status', apiSeat.status);
                seatElement.setAttribute('data-seat-class', apiSeat.seat_class);
                seatElement.setAttribute('data-price-modifier', apiSeat.price_modifier || 0);
            }
        });
    }
};

// Toast notification functions for seat page
const SeatNotifications = {
  // Show welcome message when page loads with fare class
  showWelcomeMessage: function(fareClass) {
    if (!fareClass) return;
    
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    let fareDisplayName = '';
    
    switch(fareClass) {
      case 'economy':
        fareDisplayName = currentLang === 'vi' ? 'Hạng phổ thông' : 'Economy';
        break;
      case 'premium-economy':
        fareDisplayName = currentLang === 'vi' ? 'Hạng phổ thông đặc biệt' : 'Premium Economy';
        break;
      case 'business':
        fareDisplayName = currentLang === 'vi' ? 'Hạng thương gia' : 'Business';
        break;
    }
    
    const welcomeMsg = currentLang === 'vi' ? 
      `Chào mừng! Bạn đang chọn ghế cho ${fareDisplayName}` : 
      `Welcome! You're selecting seats for ${fareDisplayName}`;
    
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(welcomeMsg, {type: 'info', duration: 4000});
      }
    }, 1000);
  },

  // Show seat selection notification
  showSeatSelected: function(seatCode) {
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const selectMsg = currentLang === 'vi' ? 
      `Đã chọn ghế ${seatCode}` : 
      `Selected seat ${seatCode}`;
    
    if (typeof showToast === 'function') {
      showToast(selectMsg, {type: 'success', duration: 2000});
    }
  },

  // Show seat deselection notification
  showSeatDeselected: function(seatCode) {
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const deselectMsg = currentLang === 'vi' ? 
      `Đã bỏ chọn ghế ${seatCode}` : 
      `Deselected seat ${seatCode}`;
    
    if (typeof showToast === 'function') {
      showToast(deselectMsg, {type: 'info', duration: 2000});
    }
  },

  // Show restricted seat notification
  showRestrictedSeat: function() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const restrictedMsg = currentLang === 'vi' ? 
      'Ghế này không khả dụng cho hạng vé của bạn' : 
      'This seat is not available for your fare class';
    
    if (typeof showToast === 'function') {
      showToast(restrictedMsg, {type: 'error', duration: 3000});
    }
  },

  // Show countdown expired notification
  showTimeExpired: function() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const timeExpiredMsg = seatTranslations[currentLang]['timeExpired'] || 
      (currentLang === 'vi' ? 'Hết thời gian! Vui lòng chọn ghế lại.' : 'Time expired! Please select your seats again.');
    
    if (typeof showToast === 'function') {
      showToast(timeExpiredMsg, {type: 'error', duration: 4000});
    }
  },

  // Show validation error when no seats selected
  showNoSeatsSelected: function() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const selectAtLeastOneMsg = seatTranslations[currentLang]['selectAtLeastOne'] || 
      (currentLang === 'vi' ? 'Vui lòng chọn ít nhất một ghế trước khi tiếp tục.' : 'Please select at least one seat before continuing.');
    
    if (typeof showToast === 'function') {
      showToast(selectAtLeastOneMsg, {type: 'error', duration: 3000});
    }
  },


};

// Show welcome message for fare class
function showWelcomeMessage() {
  const fareClass = new URLSearchParams(window.location.search).get('class');
  SeatNotifications.showWelcomeMessage(fareClass);
}

// Enhance countdown timer with notifications
function enhanceCountdownNotifications() {
  // Override the original timeout handler if it exists
  const originalTimeoutHandler = window.handleCountdownTimeout;
  window.handleCountdownTimeout = function() {
    SeatNotifications.showTimeExpired();
    if (originalTimeoutHandler) {
      originalTimeoutHandler();
    }
  };
}

// Note: Continue button click handler is now in seat.html inline script
// to avoid duplicate event listeners and duplicate toast notifications

// Initialize seat data loading
function initializeSeatData() {
  // Get flight ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  let flightId = urlParams.get('flight_id') || urlParams.get('outbound_flight_id');
  
  // Fallback to a known flight ID if not provided
  if (!flightId) {
    flightId = 1; // Use actual flight ID from database (VJ516)
    console.log('Using fallback flight ID:', flightId);
  }
  
  // Initialize seat manager to load API data
  SeatManager.init(flightId);
}

// Initialize all seat page enhancements
function initializeSeatEnhancements() {
  // Wait for DOM and other scripts to load
  setTimeout(() => {
    showWelcomeMessage();
    enhanceCountdownNotifications();
    initializeSeatData(); // Load API data và update existing HTML
    // Note: enhanceContinueButton() removed - handler is in seat.html to avoid duplicate listeners
  }, 500);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSeatEnhancements);
} else {
  initializeSeatEnhancements();
}