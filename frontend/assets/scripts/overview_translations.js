// Translations for SkyPlan - Overview page
const overviewTranslations = {
    en: {
        // Header 
        helpText: "Help",
        myTripsText: "My Trips",
        signInText: "Sign In",
        signUpText: "Sign Up",
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
        passenger: "Passenger",
        handLuggage: "Hand luggage",
        checkedLuggage: "Checked luggage",
        noExtras: "No additional services",
        passengerClass: "Economy",
        // Overview specific labels we use in scripts
        selectedExtrasTitle: "Selected extras",
        fareLabel: "Fare",
        extrasLabel: "Extras",
        checkedBaggagePrefix: "Checked baggage: ",
        fareClasses: {
            economy: "Economy",
            "premium-economy": "Premium Economy",
            business: "Business"
        },
        seatFeatures: {
            autoAssigned: "Auto-assigned seat",
            seatSelection: "Seat selection"
        },
        baggageFeatures: {
            handBaggage1: "Carry-on: 1 item",
            handBaggage1Plus1: "Carry-on: 1 + Checked: 1",
            handBaggage2Plus2: "Carry-on: 2 + Checked: 2"
        },
        flexFeatures: {
            noRefund: "No refund",
            changeable: "Change date allowed"
        },
        // Steps
        step1: "Search",
        step2: "Select flight",
        step3: "Select fare",
        step4: "Passenger info",
        step5: "Extras",
        step6: "Payment",
        // Other
        directFlight: "Direct flight",
        outboundLabel: "Outbound",
        inboundLabel: "Return",
        // Cities
        cities: {
            HaNoi: "Ha Noi",
            HoChiMinh: "Ho Chi Minh",
            DaNang: "Da Nang",
            CanTho: "Can Tho"
        },
        routeBetween: (from, to) => `${from} to ${to}`,
        formatDate: (date) => {
            try {
                const d = new Date(date);
                const day = d.getDate(); // no leading zero
                const month = d.toLocaleString('en', { month: 'short' });
                const year = d.getFullYear();
                return `${month} ${day} ${year}`; // e.g., Jun 10 2023
            } catch { return date; }
        },
        // ...add more as needed
    },
    vi: {
        // Header 
        helpText: "Trợ giúp",
        myTripsText: "Chuyến đi của tôi",
        signInText: "Đăng nhập",
        signUpText: "Đăng ký",
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
        passenger: "Hành khách",
        handLuggage: "Hành lý xách tay",
        checkedLuggage: "Hành lý ký gửi",
        noExtras: "Không có dịch vụ thêm",
        passengerClass: "Phổ thông",
        // Overview specific labels we use in scripts
        selectedExtrasTitle: "Dịch vụ đã chọn",
        fareLabel: "Giá vé",
        extrasLabel: "Dịch vụ thêm",
        checkedBaggagePrefix: "Hành lý ký gửi: ",
        fareClasses: {
            economy: "Phổ thông",
            "premium-economy": "Phổ thông đặc biệt",
            business: "Thương gia"
        },
        seatFeatures: {
            autoAssigned: "Phân bổ chỗ ngồi tự động",
            seatSelection: "Được chọn chỗ"
        },
        baggageFeatures: {
            handBaggage1: "Hành lý xách tay: 1 kiện",
            handBaggage1Plus1: "Xách tay: 1 kiện + Ký gửi: 1 kiện",
            handBaggage2Plus2: "Xách tay: 2 kiện + Ký gửi: 2 kiện"
        },
        flexFeatures: {
            noRefund: "Không hoàn tiền",
            changeable: "Được đổi ngày bay"
        },
        // Steps
        step1: "Tìm kiếm",
        step2: "Chọn chuyến bay",
        step3: "Chọn giá",
        step4: "Thông tin khách hàng",
        step5: "Dịch vụ thêm",
        step6: "Thanh toán",
        // Other
        directFlight: "Bay thẳng",
        outboundLabel: "Chiều đi",
        inboundLabel: "Chiều về",
        // Cities
        cities: {
            HaNoi: "Hà Nội",
            HoChiMinh: "Hồ Chí Minh",
            DaNang: "Đà Nẵng",
            CanTho: "Cần Thơ"
        },
        routeBetween: (from, to) => `${from} đến ${to}`,
        formatDate: (date) => {
            try {
                const d = new Date(date);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            } catch { return date; }
        },
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

    // Helpers
    // If a real selected trip exists in storage, avoid overriding route cities here.
    let storedTrip = null;
    try { storedTrip = JSON.parse(localStorage.getItem('skyplan_trip_selection') || 'null'); } catch {}
    const hasTrip = storedTrip && typeof storedTrip === 'object';

    const params = new URLSearchParams(window.location.search);
    const iataToCode = { HAN: 'HaNoi', SGN: 'HoChiMinh', DAD: 'DaNang', VCA: 'CanTho' };
    const cities = overviewTranslations[lang].cities || {};
    const routeBetween = overviewTranslations[lang].routeBetween || ((a, b) => `${a} - ${b}`);
    const formatDate = overviewTranslations[lang].formatDate || ((x) => x);

    if (!hasTrip) {
        // Infer from/to codes only when no explicit selected trip exists
        const segs = document.querySelectorAll('.flight-segment');
        let fromCode = params.get('from');
        let toCode = params.get('to');
        if (!fromCode && segs[0]) {
            const depIATA = segs[0].querySelector('.departure .location')?.textContent?.trim();
            if (depIATA && iataToCode[depIATA]) fromCode = iataToCode[depIATA];
        }
        if (!toCode && segs[0]) {
            const arrIATA = segs[0].querySelector('.arrival .location')?.textContent?.trim();
            if (arrIATA && iataToCode[arrIATA]) toCode = iataToCode[arrIATA];
        }
        fromCode = fromCode || 'HaNoi';
        toCode = toCode || 'HoChiMinh';

        const fromName = (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function')
            ? window.resolveCityLabel(fromCode, lang)
            : (cities[fromCode] || fromCode);
        const toName = (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function')
            ? window.resolveCityLabel(toCode, lang)
            : (cities[toCode] || toCode);

        // Update heading
        const heading = document.getElementById('route-heading');
        if (heading) heading.textContent = routeBetween(fromName, toName);

        // Also update city labels inside segments
        const cityDepartOut = document.querySelector('.city-depart-out');
        const cityArriveOut = document.querySelector('.city-arrive-out');
        const cityDepartRet = document.querySelector('.city-depart-ret');
        const cityArriveRet = document.querySelector('.city-arrive-ret');
        if (cityDepartOut) cityDepartOut.textContent = fromName;
        if (cityArriveOut) cityArriveOut.textContent = toName;
        if (cityDepartRet) cityDepartRet.textContent = toName;
        if (cityArriveRet) cityArriveRet.textContent = fromName;
    } else {
        // When a selected trip exists, reflect it using current language dictionary
        const fromCode = storedTrip.fromCode || storedTrip.from || '';
        const toCode = storedTrip.toCode || storedTrip.to || '';
        const fromName = (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function')
            ? window.resolveCityLabel(fromCode, lang)
            : ((cities && cities[fromCode]) || fromCode);
        const toName = (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function')
            ? window.resolveCityLabel(toCode, lang)
            : ((cities && cities[toCode]) || toCode);
        const heading = document.getElementById('route-heading');
        if (heading) heading.textContent = routeBetween(fromName, toName);
        const cityDepartOut = document.querySelector('.city-depart-out');
        const cityArriveOut = document.querySelector('.city-arrive-out');
        const cityDepartRet = document.querySelector('.city-depart-ret');
        const cityArriveRet = document.querySelector('.city-arrive-ret');
        if (cityDepartOut) cityDepartOut.textContent = fromName;
        if (cityArriveOut) cityArriveOut.textContent = toName;
        if (cityDepartRet) cityDepartRet.textContent = toName;
        if (cityArriveRet) cityArriveRet.textContent = fromName;
    }

    // Dates
    function toISO(y, m, d) { const pad = n => String(n).padStart(2, '0'); return `${y}-${pad(m)}-${pad(d)}`; }
    function parseAnyDateToISO(text) {
        if (!text) return '';
        // 1) Try native Date for EN-like strings (e.g., '10 Jun 2023', 'June 10, 2023')
        const tryNative = new Date(text);
        if (!isNaN(tryNative.getTime())) {
            return toISO(tryNative.getFullYear(), tryNative.getMonth() + 1, tryNative.getDate());
        }
        // 2) Try DD/MM/YYYY
        let m = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (m) {
            const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
            if (dd && mm && yy) return toISO(yy, mm, dd);
        }
        // 3) Try Vietnamese pattern 'Ngày 10 thg 6, 2023' or any dd non-digit mm non-digit yyyy
        m = text.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
        if (m) {
            const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
            if (dd && mm && yy) return toISO(yy, mm, dd);
        }
        // 4a) Try '10 Jun 2023' (day first)
        const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
        m = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\b/);
        if (m) {
            const dd = parseInt(m[1], 10), mon = (monthMap[m[2].slice(0, 3).toLowerCase()] || 0), yy = parseInt(m[3], 10);
            if (dd && mon && yy) return toISO(yy, mon, dd);
        }
        // 4b) Try 'Jun 10 2023' (month first)
        m = text.match(/\b([A-Za-z]{3,})\s+(\d{1,2})(?:,)?\s+(\d{4})\b/);
        if (m) {
            const mon = (monthMap[m[1].slice(0, 3).toLowerCase()] || 0), dd = parseInt(m[2], 10), yy = parseInt(m[3], 10);
            if (dd && mon && yy) return toISO(yy, mon, dd);
        }
        return '';
    }
    const depParam = params.get('departure');
    const retParam = params.get('return');
    const dateTexts = document.querySelectorAll('.flight-segment .flight-header .date-text');
    const depISO = depParam || (dateTexts[0]?.dataset?.iso || (dateTexts[0]?.textContent ? parseAnyDateToISO(dateTexts[0].textContent) : ''));
    const retISO = retParam || (dateTexts[1]?.dataset?.iso || (dateTexts[1]?.textContent ? parseAnyDateToISO(dateTexts[1].textContent) : ''));
    if (dateTexts[0] && depISO) dateTexts[0].textContent = formatDate(depISO);
    if (dateTexts[1] && retISO) dateTexts[1].textContent = formatDate(retISO);
}

// Function to change language for overview page
function changeOverviewLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    applyOverviewTranslations(lang);
    // Broadcast so header/footer or other modules can react immediately
    try {
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    } catch { }
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}

// Re-apply when global language changes (from header)
document.addEventListener('languageChanged', function (e) {
    const lang = (e && e.detail && e.detail.lang) ? e.detail.lang : (localStorage.getItem('preferredLanguage') || 'vi');
    applyOverviewTranslations(lang);
});