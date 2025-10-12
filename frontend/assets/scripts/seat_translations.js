// Translations for SkyPlan - Seat Selection page
const seatTranslations = {
    en: {
        // Header (from index_translations.js)
        metaTitle: "SkyPlan - Choose your seat",
        metaDescription: "Select the perfect seat for your flight with SkyPlan. Choose your preferred seating arrangement.",
        // Footer (from index_translations.js)
        footerDesc: "Your trusted travel companion for the best flight deals and unforgettable journeys.",
        quickLinksTitle: "Quick Links",
        aboutUs: "About Us",
        contact: "Contact",
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
        supportTitle: "Support",
        helpCenter: "Help Center",
        customerService: "Customer Service",
        bookingHelp: "Booking Help",
        faq: "FAQ",
        paymentMethodsTitle: "Payment Methods",
        downloadAppTitle: "Download our app",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. All rights reserved.",
        helpText: "Help",
        myTripsText: "My Trips",
        signInText: "Sign In",
        logInText: "Log In",

        // Seat Selection Page Specific
        seatTitle: "Choose your seat",
        flightInfo: "Select seats for flight VN 1234 from Ho Chi Minh to Hanoi",
        businessClass: "Business Class",
        premiumEconomy: "Premium Economy Class",
        economyClass: "Economy Class",
        yourSelection: "Your Seat Selection",
        selectedSeats: "Selected seats:",
        noSeatsSelected: "No seats selected",
        selectedFareClass: "Selected fare class:",
        annotation: "Annotation",
        occupied: "Occupied",
        selecting: "Selecting",
        notAvailable: "Not Available",
        continue: "Continue",
        
        // Fare classes
        economy: "Economy",
        premiumEconomy: "Premium Economy", 
        business: "Business",
        
        // Countdown Timer
        seatReserved: "Seat reserved for:",
        pleaseComplete: "Please complete your selection quickly!",
        timeExpired: "Time expired! Please select your seats again.",
        selectAtLeastOne: "Please select at least one seat before continuing.",
        seatReservedNotification: "Seat {seat} reserved for 30 seconds"
    },
    vi: {
        // Header 
        metaTitle: "SkyPlan - Chọn ghế",
        metaDescription: "Chọn ghế ngồi phù hợp cho chuyến bay của bạn với SkyPlan.",
        helpText: "Trợ giúp",
        myTripsText: "Chuyến đi của tôi",
        signInText: "Đăng ký",
        logInText: "Đăng nhập",
        // Footer 
        footerDesc: "Đối tác du lịch đáng tin cậy của bạn cho các ưu đãi vé máy bay tốt nhất và những hành trình khó quên.",
        quickLinksTitle: "Liên kết nhanh",
        aboutUs: "Về chúng tôi",
        contact: "Liên hệ",
        privacyPolicy: "Chính sách bảo mật",
        termsOfService: "Điều khoản dịch vụ",
        supportTitle: "Hỗ trợ",
        helpCenter: "Trung tâm trợ giúp",
        customerService: "Dịch vụ khách hàng",
        bookingHelp: "Hỗ trợ đặt vé",
        faq: "Câu hỏi thường gặp",
        paymentMethodsTitle: "Phương thức thanh toán",
        downloadAppTitle: "Tải ứng dụng của chúng tôi",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. Bảo lưu mọi quyền.",
        
        // Seat Selection Page Specific
        seatTitle: "Chọn ghế ngồi",
        flightInfo: "Chọn ghế cho chuyến bay VN 1234 từ Hồ Chí Minh đến Hà Nội",
        businessClass: "Hạng thương gia",
        premiumEconomy: "Hạng phổ thông đặc biệt",
        economyClass: "Hạng phổ thông",
        yourSelection: "Ghế bạn đã chọn",
        selectedSeats: "Ghế đã chọn:",
        noSeatsSelected: "Chưa chọn ghế nào",
        selectedFareClass: "Hạng vé đã chọn:",
        annotation: "Chú thích",
        occupied: "Đã có người",
        selecting: "Đang chọn",
        notAvailable: "Không khả dụng",
        continue: "Tiếp tục",
        
        // Fare classes
        economy: "Hạng phổ thông",
        premiumEconomy: "Hạng phổ thông đặc biệt",
        business: "Hạng thương gia",
        
        // Countdown Timer
        seatReserved: "Ghế được giữ trong:",
        pleaseComplete: "Vui lòng hoàn thành việc chọn ghế!",
        timeExpired: "Hết thời gian! Vui lòng chọn ghế lại.",
        selectAtLeastOne: "Vui lòng chọn ít nhất một ghế trước khi tiếp tục.",
        seatReservedNotification: "Ghế {seat} được giữ trong 30 giây"
    }
};

// Export for usage in seat.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = seatTranslations;
}

// Function to apply translations for seat page
function applySeatTranslations(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (seatTranslations[lang] && seatTranslations[lang][key]) {
            element.textContent = seatTranslations[lang][key];
        }
    });

    // Update page title
    if (seatTranslations[lang]['metaTitle']) {
        document.title = seatTranslations[lang]['metaTitle'];
    }
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && seatTranslations[lang]['metaDescription']) {
        metaDescription.setAttribute('content', seatTranslations[lang]['metaDescription']);
    }
}

// Function to change language for seat page
function changeSeatLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    applySeatTranslations(lang);
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}