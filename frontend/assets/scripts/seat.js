// Seat Page Notifications and Interactions
// This file handles toast notifications and seat-specific interactions

// Toast notification functions for seat page
const SeatNotifications = {
    // Show welcome message when page loads with fare class
    showWelcomeMessage: function (fareClass) {
        if (!fareClass) return;

        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        let fareDisplayName = '';

        switch (fareClass) {
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
                showToast(welcomeMsg, { type: 'info', duration: 4000 });
            }
        }, 1000);
    },

    // Show seat selection notification
    showSeatSelected: function (seatCode) {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        const selectMsg = currentLang === 'vi' ?
            `Đã chọn ghế ${seatCode}` :
            `Selected seat ${seatCode}`;

        if (typeof showToast === 'function') {
            showToast(selectMsg, { type: 'success', duration: 2000 });
        }
    },

    // Show seat deselection notification
    showSeatDeselected: function (seatCode) {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        const deselectMsg = currentLang === 'vi' ?
            `Đã bỏ chọn ghế ${seatCode}` :
            `Deselected seat ${seatCode}`;

        if (typeof showToast === 'function') {
            showToast(deselectMsg, { type: 'info', duration: 2000 });
        }
    },

    // Show restricted seat notification
    showRestrictedSeat: function () {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        const restrictedMsg = currentLang === 'vi' ?
            'Ghế này không khả dụng cho hạng vé của bạn' :
            'This seat is not available for your fare class';

        if (typeof showToast === 'function') {
            showToast(restrictedMsg, { type: 'error', duration: 3000 });
        }
    },

    // Show countdown expired notification
    showTimeExpired: function () {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        const timeExpiredMsg = seatTranslations[currentLang]['timeExpired'] ||
            (currentLang === 'vi' ? 'Hết thời gian! Vui lòng chọn ghế lại.' : 'Time expired! Please select your seats again.');

        if (typeof showToast === 'function') {
            showToast(timeExpiredMsg, { type: 'error', duration: 4000 });
        }
    },

    // Show validation error when no seats selected
    showNoSeatsSelected: function () {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        const selectAtLeastOneMsg = seatTranslations[currentLang]['selectAtLeastOne'] ||
            (currentLang === 'vi' ? 'Vui lòng chọn ít nhất một ghế trước khi tiếp tục.' : 'Please select at least one seat before continuing.');

        if (typeof showToast === 'function') {
            showToast(selectAtLeastOneMsg, { type: 'error', duration: 3000 });
        }
    },


};

// Normalize URL params from fare page and helpers
function normalizeSeatUrlParams() {
    try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        let changed = false;

        // New flow from fare passes selected_class; seat page historically reads class
        if (!params.has('class') && params.has('selected_class')) {
            params.set('class', params.get('selected_class'));
            changed = true;
        }
        // Keep selected_price untouched for now; could be used later

        if (changed) {
            // Update URL without reloading
            const newQs = params.toString();
            const newUrl = `${url.origin}${url.pathname}?${newQs}${url.hash}`;
            window.history.replaceState({}, '', newUrl);
        }
    } catch (e) {
        // no-op
    }
}

function getFareClassFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('class') || params.get('selected_class') || '';
}

// Show welcome message for fare class
function showWelcomeMessage() {
    const fareClass = getFareClassFromUrl();
    SeatNotifications.showWelcomeMessage(fareClass);
}

// Enhance countdown timer with notifications
function enhanceCountdownNotifications() {
    // Override the original timeout handler if it exists
    const originalTimeoutHandler = window.handleCountdownTimeout;
    window.handleCountdownTimeout = function () {
        SeatNotifications.showTimeExpired();
        if (originalTimeoutHandler) {
            originalTimeoutHandler();
        }
    };
}

// Enhance continue button with notifications
function enhanceContinueButton() {
    if (window.__seat_continue_enhanced) return;
    const btn = document.querySelector('.continue-btn');
    if (!btn) return;

    // Remove any existing event listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function(e) {
        const selectedSeats = document.querySelectorAll('.seat.selected');
        if (!selectedSeats || selectedSeats.length === 0) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (typeof SeatNotifications !== 'undefined' && SeatNotifications.showNoSeatsSelected) {
                SeatNotifications.showNoSeatsSelected();
            } else {
                alert('Vui lòng chọn ít nhất một ghế trước khi tiếp tục.');
            }
            return false;
        }
        // Proceed to next step
        window.location.href = '/passenger';
        return false;
        }, { capture: true });

    window.__seat_continue_enhanced = true;
}

// Initialize all seat page enhancements
function initializeSeatEnhancements() {
    // Wait for DOM and other scripts to load
    setTimeout(() => {
        normalizeSeatUrlParams();
        showWelcomeMessage();
        enhanceCountdownNotifications();
        enhanceContinueButton();
    }, 500);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSeatEnhancements);
} else {
    initializeSeatEnhancements();
}