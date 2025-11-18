// Translations for SkyPlan - Fare Selection page
const fareTranslations = {
    en: {
        // Header (from common translations)
        metaTitle: "SkyPlan - Select fare",
        metaDescription: "Choose the right fare class for your flight with SkyPlan. Book with confidence.",
        // Footer (from common translations)
        footerDesc: "Your trusted travel companion for the best flight deals and unforgettable journeys.",
        quickLinksTitle: "Quick Links",
        aboutUs: "About Us",
        contact: "Contact",
        promotion: "Promotions",
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
        signUpText: "Sign Up",
        signInText: "Sign In",
        

        // Steps
        step1: "Search",
        step2: "Select flight",
        step3: "Select fare",
        step4: "Passenger info",
        step5: "Extras",
        step6: "Payment",
        
        // Fare Selection Page Specific
        fareTitle: "Select fare",
        routeTitle: "From Ho Chi Minh to Hanoi",
        
        // Fare Types
        economy: "Economy",
        premiumEconomy: "Premium Economy",
        business: "Business",
        
        // Fare Features
        seatClass: "Seat class:",
        seating: "Seating",
        baggage: "Baggage",
        flexibility: "Flexibility",
        
        // Seat descriptions
        economyClass: "Economy",
        premiumEconomyClass: "Premium Economy",
        businessClass: "Business",
        
        // Seating options
        seatSelection: "Seat selection",
        
        // Baggage options
        handBaggage1: "1 carry-on bag",
        handBaggage1Plus1: "1 carry-on bag<br>1 checked bag",
        handBaggage2Plus2: "2 carry-on bags<br>2 checked bags",
        
        // Flexibility options
        noRefund: "Non-refundable",
        changeable: "Date change allowed",
        
        // Action
        select: "Select",
        
        // Prices (USD)
        price90: "2.374.000 VND",
        price120: "3.165.000 VND", 
        price350: "9.230.000 VND"
    },
    vi: {
        // Header 
        metaTitle: "SkyPlan - Chọn giá vé",
        metaDescription: "Chọn hạng giá vé phù hợp cho chuyến bay của bạn với SkyPlan.",
        helpText: "Trợ giúp",
        myTripsText: "Chuyến đi của tôi",
        signUpText: "Đăng ký",
        signInText: "Đăng nhập",
        
        // Footer 
        footerDesc: "Đối tác du lịch đáng tin cậy của bạn cho các ưu đãi vé máy bay tốt nhất và những hành trình khó quên.",
        quickLinksTitle: "Liên kết nhanh",
        aboutUs: "Về chúng tôi",
        contact: "Liên hệ",
        promotion: "Khuyến mãi",
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
        
        // Steps
        step1: "Tìm kiếm",
        step2: "Chọn chuyến bay",
        step3: "Chọn giá",
        step4: "Thông tin khách hàng",
        step5: "Dịch vụ thêm",
        step6: "Thanh toán",
        
        // Fare Selection Page Specific
        fareTitle: "Chọn giá vé",
        routeTitle: "Từ Hồ Chí Minh đến Hà Nội",
        
        // Fare Types
        economy: "Phổ thông",
        premiumEconomy: "Phổ thông đặc biệt",
        business: "Thương gia",
        
        // Fare Features
        seatClass: "Hạng ghế:",
        seating: "Chỗ ngồi",
        baggage: "Hành lý",
        flexibility: "Giải pháp",
        
        // Seat descriptions
        economyClass: "Phổ thông",
        premiumEconomyClass: "Phổ thông đặc biệt",
        businessClass: "Thương gia",
        
        // Seating options
        autoAssigned: "Phân bổ tự động",
        seatSelection: "Được chọn chỗ",
        
        // Baggage options
        handBaggage1: "1 kiện xách tay",
        handBaggage1Plus1: "1 kiện xách tay<br>1 kiện ký gửi",
        handBaggage2Plus2: "2 kiện xách tay<br>2 kiện ký gửi",
        
        // Flexibility options
        noRefund: "Không hoàn tiền",
        changeable: "Được đổi ngày bay",
        
        // Action
        select: "Chọn",
        
        // Prices (VND) - USD to VND conversion rate ~25,000
        price90: "2.374.000 VND",
        price120: "3.165.000 VND", 
        price350: "9.230.000 VND"
    }
};

// Export for usage in fare.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = fareTranslations;
}

// Function to apply translations for fare page
function applyFareTranslations(lang) {
    console.log('applyFareTranslations called with language:', lang);
    console.log('fareTranslations object:', fareTranslations);
    
    // Handle regular data-i18n elements
    const elements = document.querySelectorAll('[data-i18n]');
    console.log('Found elements with data-i18n:', elements.length);
    
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (fareTranslations[lang] && fareTranslations[lang][key]) {
            console.log(`Translating ${key}:`, fareTranslations[lang][key]);
            // Handle HTML content for baggage descriptions
            if (key.includes('handBaggage') || key.includes('baggage')) {
                element.innerHTML = fareTranslations[lang][key];
            } else {
                element.textContent = fareTranslations[lang][key];
            }
        } else {
            // Log missing keys for easier debugging
            console.warn(`Missing translation for key: '${key}' in language: '${lang}'`);
        }
    });

    // Handle price elements separately
    const priceElements = document.querySelectorAll('[data-i18n-price]');
    console.log('Found price elements:', priceElements.length);
    
    priceElements.forEach(element => {
        const priceKey = element.getAttribute('data-i18n-price');
        if (fareTranslations[lang] && fareTranslations[lang][priceKey]) {
            console.log(`Translating price ${priceKey}:`, fareTranslations[lang][priceKey]);
            element.textContent = fareTranslations[lang][priceKey];
        }
    });

    // Update page title
    if (fareTranslations[lang]['metaTitle']) {
        console.log('Updating title to:', fareTranslations[lang]['metaTitle']);
        document.title = fareTranslations[lang]['metaTitle'];
    }
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && fareTranslations[lang]['metaDescription']) {
        console.log('Updating meta description to:', fareTranslations[lang]['metaDescription']);
        metaDescription.setAttribute('content', fareTranslations[lang]['metaDescription']);
    }
}

// Function to change language for fare page
function changeFareLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    applyFareTranslations(lang);
    try { if (typeof initFareRouteTitle === 'function') initFareRouteTitle(lang); } catch(e) {}
    // Broadcast to let other modules refresh (date inputs, common, etc.)
    try { document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } })); } catch(e) {}
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}

// Initialize route title from real search selection
function initFareRouteTitle(langOverride) {
    try {
        const L = langOverride || localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
        // Prefer skyplan_trip_selection from search modal
        let trip = null; try { trip = JSON.parse(localStorage.getItem('skyplan_trip_selection') || 'null'); } catch {}
        const p = new URLSearchParams(location.search);
        let fromRaw = (trip && (trip.fromCode || trip.from)) || localStorage.getItem('route_from') || p.get('from') || '';
        let toRaw = (trip && (trip.toCode || trip.to)) || localStorage.getItem('route_to') || p.get('to') || '';
        // Fallback sensible defaults
        if (!fromRaw) fromRaw = 'HoChiMinh';
        if (!toRaw) toRaw = 'HaNoi';
        const resolve = (val) => {
            if (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function') return window.resolveCityLabel(val, L);
            const MAP = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) || {};
            const dict = MAP[L] || MAP.vi || {};
            return dict[val] || val;
        };
        const fromName = resolve(fromRaw);
        const toName = resolve(toRaw);
        const phrase = (L === 'vi') ? { a: 'Từ', b: 'đến' } : { a: 'From', b: 'to' };
        const el = document.querySelector('.route-title');
        if (el) {
            // prevent later static translation override
            el.removeAttribute('data-i18n');
            el.textContent = `${phrase.a} ${fromName} ${phrase.b} ${toName}`;
        }
    } catch(e) { /* no-op */ }
}