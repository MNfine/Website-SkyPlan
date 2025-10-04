// Translations for SkyPlan - Overview page
const overviewTranslations = {
    en: {
        // Header 
        helpText: "Help",
        myTripsText: "My Trips",
        signInText: "Sign Up",
        logInText: "Sign In",
        // Footer 
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
        // Titles & Labels
        overviewTitle: "Trip Overview",
        tripSummary: "Trip Summary",
        totalLabel: "Total",
        confirmBooking: "Confirm Booking",
        passenger: "passenger",
        handLuggage: "Hand luggage",
        checkedLuggage: "Checked luggage",
        noExtras: "No additional services",
        passengerClass: "Economy",
        // Steps
        step1: "Search",
        step2: "Select flight",
        step3: "Select fare",
        step4: "Passenger info",
        step5: "Extras",
        step6: "Payment",
        // Other
        directFlight: "Direct flight",
        // ...add more as needed
    },
    vi: {
        // Header 
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
        // Titles & Labels
        overviewTitle: "Tổng quan chuyến đi",
        tripSummary: "Tóm tắt chuyến đi",
        totalLabel: "Tổng cộng",
        confirmBooking: "Xác nhận đặt vé",
        passenger: "hành khách",
        handLuggage: "Hành lý xách tay",
        checkedLuggage: "Hành lý ký gửi",
        noExtras: "Không có dịch vụ thêm",
        passengerClass: "Phổ thông",
        // Steps
        step1: "Tìm kiếm",
        step2: "Chọn chuyến bay",
        step3: "Chọn giá",
        step4: "Thông tin khách hàng",
        step5: "Dịch vụ thêm",
        step6: "Thanh toán",
        // Other
        directFlight: "Bay thẳng",
        // ...add more as needed
    }
};

// Export for usage in overview.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = overviewTranslations;
}

// Function to apply translations for overview page
function applyOverviewTranslations(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (overviewTranslations[lang] && overviewTranslations[lang][key]) {
            element.textContent = overviewTranslations[lang][key];
        } else {
            // Log missing keys for easier debugging
            console.warn(`Missing translation for key: '${key}' in language: '${lang}'`);
        }
    });

    // Update page title if needed
    if (overviewTranslations[lang]['overviewTitle']) {
        document.title = overviewTranslations[lang]['overviewTitle'];
    }
}

// Function to change language for overview page
function changeOverviewLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    applyOverviewTranslations(lang);
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}