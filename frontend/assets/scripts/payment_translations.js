// Translations for SkyPlan - Payment page
const __SKYPLAN_DEBUG__ = (typeof window !== 'undefined' && window.SkyPlanDebug === true);
const paymentTranslations = {
    en: {
        // Steps
        step1: "Search",
        step2: "Select flight",
        step3: "Select fare",
        step4: "Passenger info",
        step5: "Extras",
        step6: "Payment",
        // Payment methods
        cardMethod: "Credit/Debit Card",
        bank: "Bank",
        ewallet: "E-wallet",
        momo: "MoMo",
        zalopay: "ZaloPay",
        vnpay: "VNPay (Available)",
        vnpayTitle: "Pay with VNPay",
        vnpayDesc: "You will be redirected to the VNPay payment page to complete your transaction.",
        bookingCode: "Booking Code:",
        content: "Content:",
        payWithVnpay: "Pay with VNPay",
        orderSummary: "Order Summary",
        route1: "Hanoi → Ho Chi Minh City",
        route1Time: "June 10, 2023 - 10:45 → 13:00",
        route1Class: "Economy • 1 passenger",
        route2: "Ho Chi Minh City → Hanoi",
        route2Time: "August 18, 2023 - 16:20 → 18:30",
        route2Class: "Economy • 1 passenger",
        ticketLabel: "Flight ticket (round trip)",
        taxLabel: "Taxes and fees",
        totalLabel: "Total",
        secure: "Transaction secured by 256-bit SSL",
        // Header 
        helpText: "Help",
        myTripsText: "My Trips",
        signUpText: "Sign Up",
        signInText: "Sign In",
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
        paymentTitle: "Payment",
        payNow: "Pay Now",
        processing: "Processing...",
        errorPrefix: "Error: ",
        vnpayConnecting: "Connecting to VNPay...",
        vnpayCreateFail: "Unable to create VNPay payment",
        selectPaymentMethod: "Please choose a payment method",
        invalidCardNumber: "Please enter a valid card number",
        invalidExpiryDate: "Please enter a valid expiry date (MM/YY)",
        invalidCVV: "Please enter a valid CVV",
        invalidCardName: "Please enter the name on card",
        selectEwallet: "Please select an e-wallet to continue",
        paymentMethod: "Payment Method",
        cardNumber: "Card Number",
        cardHolder: "Card Holder",
        expiryDate: "Expiry Date",
        cvv: "CVV",
        totalAmount: "Total Amount",
        confirmPayment: "Confirm Payment",
        backToOverview: "Back to Overview",
        vnpay: "VNPay",
        momo: "MoMo",
        cash: "Cash at counter",
        // Bank/E-wallet instructions
        bankNameLabel: "Bank:",
        accountNumberLabel: "Account number:",
        accountNameLabel: "Account name:",
        transferContentLabel: "Content:",
        paymentGuide: "Payment instructions:",
        phoneLabel: "Phone number:",
        nameLabel: "Name:",
        chooseWallet: "2. Choose a suitable e-wallet:",
        scanOrTransfer: "1. Scan QR code or transfer using the following info:",
        transferExample: "[Booking code] - [Full name]",
        // Confirm button
        toConfirmation: "Go to confirmation page",
        bankConfirm: "Go to confirmation page",
        // ...add more as needed
    },
    vi: {
        // Steps
        step1: "Tìm kiếm",
        step2: "Chọn chuyến bay",
        step3: "Chọn giá",
        step4: "Thông tin khách hàng",
        step5: "Dịch vụ thêm",
        step6: "Thanh toán",
        // Payment methods
        cardMethod: "Thẻ tín dụng / Thẻ ghi nợ",
        bank: "Ngân hàng",
        ewallet: "Ví điện tử",
        momo: "MoMo",
        zalopay: "ZaloPay",
        vnpay: "VNPay (Khả dụng)",
        vnpayTitle: "Thanh toán qua VNPay",
        vnpayDesc: "Bạn sẽ được chuyển hướng đến trang thanh toán VNPay để hoàn tất giao dịch.",
        bookingCode: "Mã đặt vé:",
        content: "Nội dung:",
        payWithVnpay: "Thanh toán với VNPay",
        orderSummary: "Tóm tắt đơn hàng",
        route1: "Hà Nội → Hồ Chí Minh",
        route1Time: "Ngày 10 thg 6, 2023 - 10:45 → 13:00",
        route1Class: "Phổ thông • 1 hành khách",
        route2: "Hồ Chí Minh → Hà Nội",
        route2Time: "Ngày 18 thg 8, 2023 - 16:20 → 18:30",
        route2Class: "Phổ thông • 1 hành khách",
        ticketLabel: "Vé máy bay (2 chiều)",
        taxLabel: "Thuế và phí",
        totalLabel: "Tổng cộng",
        secure: "Giao dịch được bảo mật bằng SSL 256-bit",
        // Header 
        helpText: "Trợ giúp",
        myTripsText: "Chuyến đi của tôi",
        signUpText: "Đăng ký",
        signInText: "Đăng nhập",
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
        paymentTitle: "Thanh toán",
        payNow: "Thanh toán ngay",
        processing: "Đang xử lý...",
        errorPrefix: "Lỗi: ",
        vnpayConnecting: "Đang kết nối VNPay...",
        vnpayCreateFail: "Không thể tạo thanh toán VNPay",
        selectPaymentMethod: "Vui lòng chọn phương thức thanh toán",
        invalidCardNumber: "Vui lòng nhập số thẻ hợp lệ",
        invalidExpiryDate: "Vui lòng nhập ngày hết hạn hợp lệ (MM/YY)",
        invalidCVV: "Vui lòng nhập mã CVV hợp lệ",
        invalidCardName: "Vui lòng nhập tên trên thẻ",
        selectEwallet: "Vui lòng chọn ví điện tử để tiếp tục",
        paymentMethod: "Phương thức thanh toán",
        cardNumber: "Số thẻ",
        cardHolder: "Chủ thẻ",
        expiryDate: "Ngày hết hạn",
        cvv: "CVV",
        totalAmount: "Tổng số tiền",
        confirmPayment: "Xác nhận thanh toán",
        backToOverview: "Quay lại tổng quan",
        vnpay: "VNPay",
        momo: "MoMo",
        cash: "Thanh toán tại quầy",
        // Bank/E-wallet instructions
        bankNameLabel: "Ngân hàng:",
        accountNumberLabel: "Số tài khoản:",
        accountNameLabel: "Tên tài khoản:",
        transferContentLabel: "Nội dung:",
        paymentGuide: "Hướng dẫn thanh toán:",
        phoneLabel: "Số điện thoại:",
        nameLabel: "Tên:",
        chooseWallet: "2. Chọn ví điện tử phù hợp:",
        scanOrTransfer: "1. Quét mã QR hoặc chuyển tiền theo thông tin:",
        transferExample: "[Mã đặt vé] - [Họ tên]",
        // Confirm button
        toConfirmation: "Đến trang xác nhận",
        bankConfirm: "Đến trang xác nhận",
        // ...add more as needed
    }
};

// Export for usage in payment.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = paymentTranslations;
}

// Function to apply translations for payment page
function applyPaymentTranslations(lang) {
    if (__SKYPLAN_DEBUG__) console.debug('[i18n] applyPaymentTranslations', lang);
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (paymentTranslations[lang] && paymentTranslations[lang][key]) {
            element.textContent = paymentTranslations[lang][key];
        } else {
            // Only log missing keys when debug flag is on
            if (__SKYPLAN_DEBUG__) console.warn(`Missing translation for key: '${key}' in language: '${lang}'`);
        }
    });
    // Update page title if needed
    if (paymentTranslations[lang]['paymentTitle']) {
        document.title = paymentTranslations[lang]['paymentTitle'];
    }
    // Update mainPayBtnText if present (for dynamic button)
    const mainPayBtnText = document.getElementById('mainPayBtnText');
    const cardRadio = document.getElementById('card');
    const bankRadio = document.getElementById('bank');
    if (mainPayBtnText && cardRadio && bankRadio) {
        if (cardRadio.checked) {
            mainPayBtnText.textContent = paymentTranslations[lang]['payNow'] || 'Thanh toán ngay';
        } else if (bankRadio.checked) {
            mainPayBtnText.textContent = paymentTranslations[lang]['bankConfirm'] || 'Đến trang xác nhận';
        }
    }
}

// Safe helper to get a translation value
function getPaymentTranslation(key, lang) {
    lang = lang || (localStorage.getItem('preferredLanguage') || 'vi');
    if (paymentTranslations[lang] && paymentTranslations[lang][key]) return paymentTranslations[lang][key];
    // fallback to english then key
    if (paymentTranslations['en'] && paymentTranslations['en'][key]) return paymentTranslations['en'][key];
    return key;
}

// expose helpers for other scripts and debugging
try {
    window.getPaymentTranslation = getPaymentTranslation;
    window.paymentTranslations = paymentTranslations;
    window.applyPaymentTranslations = applyPaymentTranslations;
} catch (e) {
    // ignore in restricted environments
}

// Function to change language for payment page
function changePaymentLanguage(lang) {
    if (__SKYPLAN_DEBUG__) console.debug('[i18n] changePaymentLanguage ->', lang);
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    applyPaymentTranslations(lang);
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}
