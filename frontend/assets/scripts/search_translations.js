const searchTranslations = {
    en: {
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
        blogLink: "Blog",
        bookingHelp: "Booking Help",
        faq: "FAQ",
        promotion: "Promotions",
        paymentMethodsTitle: "Payment Methods",
        downloadAppTitle: "Download our app",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. All rights reserved.",
        // Titles & labels
        searchTitle: "Your trip",
        tripType: "Trip Type",
        oneWay: "One-way",
        roundTrip: "Round-trip",
        fromLabel: "From",
        toLabel: "To",
        departureLabel: "Departure date",
        returnLabel: "Return date",
        searchButton: "Search",
        filtersTitle: "Filters",
        timeTitle: "Departure time",
        budgetTitle: "Budget",
        anyLabel: "Any",
        "search.from": "From",
        "search.to": "To",

        // Cards / Modal CTA
        selectFlight: "Select flight",
        shareTrip: "Share trip",
        bookNowFor: "Book now for",
        bookNowFrom: "Book now from",
        // Inline markers
        dotDeparture: "· Departure",
        dotReturn: "· Return",
        nonstop: "Nonstop",
          noReturnFlights: "No return flights found for the selected date. Showing departure flights:",
        modalTitle: "Flight Details",
        legTo: "To",
        trendButton: "Price chart",
        trendTabTitle: "Cheapest fare by day",
        trendSummaryLoading: "Loading data...",
        trendGridAriaLabel: "Fare trend chart",
        trendCancel: "Cancel",
        trendOk: "OK",
        trendMissingRoute: "Missing route information to display the chart.",
        trendLoadingPrice: "Loading fare data...",
        trendInvalidDate: "Departure date format is invalid for chart rendering.",
        trendLoadError: "Unable to load fare chart data. Please try again.",
        trendNoData: "No fare data available in this time range.",
        trendTooltipHead: "One-way trip",
        trendTooltipNoPrice: "Price not available yet",
        trendTooltipFrom: "From {price}",
    },
    vi: {
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
        blogLink: "Blog",
        bookingHelp: "Hỗ trợ đặt vé",
        faq: "Câu hỏi thường gặp",
        promotion: "Khuyến mãi",
        paymentMethodsTitle: "Phương thức thanh toán",
        downloadAppTitle: "Tải ứng dụng của chúng tôi",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. Bảo lưu mọi quyền.",
        // Titles & labels
        searchTitle: "Chuyến đi của bạn",
        tripType: "Loại vé",
        oneWay: "Một chiều", 
        roundTrip: "Khứ hồi",
        fromLabel: "Từ",
        toLabel: "Đến",
        departureLabel: "Ngày đi",
        returnLabel: "Ngày về",
        searchButton: "Tìm kiếm",
        filtersTitle: "Bộ lọc",
        timeTitle: "Giờ bay",
        budgetTitle: "Ngân sách",
        anyLabel: "Bất kỳ",
        "search.from": "Từ",
        "search.to": "Đến",

        // Cards / Modal CTA
        selectFlight: "Chọn chuyến bay",
        shareTrip: "Chia sẻ chuyến đi",
        bookNowFor: "Đặt ngay với giá",
        bookNowFrom: "Đặt ngay từ",
        // Inline markers
        dotDeparture: "· Khởi hành",
        dotReturn: "· Về",
        nonstop: "Bay thẳng",
        noReturnFlights: "Không tìm thấy chuyến về cho ngày đã chọn. Hiển thị chuyến đi:",
        modalTitle: "Chi tiết chuyến bay",
        legTo: "Đến",
        trendButton: "Biểu đồ giá",
        trendTabTitle: "Biểu đồ giá vé rẻ nhất trong Ngày",
        trendSummaryLoading: "Đang tải dữ liệu...",
        trendGridAriaLabel: "Biểu đồ xu hướng giá vé",
        trendCancel: "Hủy",
        trendOk: "OK",
        trendMissingRoute: "Thiếu thông tin tuyến bay để hiển thị biểu đồ.",
        trendLoadingPrice: "Đang tải dữ liệu giá...",
        trendInvalidDate: "Ngày đi chưa đúng định dạng để vẽ biểu đồ.",
        trendLoadError: "Không thể tải dữ liệu biểu đồ giá. Vui lòng thử lại.",
        trendNoData: "Không có dữ liệu giá trong khoảng thời gian này.",
        trendTooltipHead: "Chuyến đi một chiều",
        trendTooltipNoPrice: "Tạm thời chưa có giá",
        trendTooltipFrom: "Từ {price}",
    }
};

const MODAL_I18N = {
    vi: {
        share: 'Chia sẻ chuyến đi',
        bookPrefix: 'Đặt ngay với giá ',
        title: 'Chi tiết chuyến bay'
    },
    en: {
        share: 'Share trip',
        bookPrefix: 'Book now for ',
        title: 'Flight Details'
    }
};

window.SKYPLAN_CITY_TRANSLATIONS = {
    vi: {
        AnGiang: 'An Giang',
        CanTho: 'Cần Thơ',
        DaLat: 'Đà Lạt',
        DaNang: 'Đà Nẵng',
        DakLak: 'Đắk Lắk',
        DienBien: 'Điện Biên',
        GiaLai: 'Gia Lai',
        HaNoi: 'Hà Nội',
        HaiPhong: 'Hải Phòng',
        HoChiMinh: 'Hồ Chí Minh',
        Hue: 'Huế',
        KhanhHoa: 'Khánh Hòa',
        LamDong: 'Lâm Đồng',
        NgheAn: 'Nghệ An',
        QuangNinh: 'Quảng Ninh',
        QuangTri: 'Quảng Trị',
        SonLa: 'Sơn La',
        ThanhHoa: 'Thanh Hóa'
    },
    en: {
        AnGiang: 'An Giang',
        CanTho: 'Can Tho',
        DaLat: 'Da Lat',
        DaNang: 'Da Nang',
        DakLak: 'Dak Lak',
        DienBien: 'Dien Bien',
        GiaLai: 'Gia Lai',
        HaNoi: 'Ha Noi',
        HaiPhong: 'Hai Phong',
        HoChiMinh: 'Ho Chi Minh',
        Hue: 'Hue',
        KhanhHoa: 'Khanh Hoa',
        LamDong: 'Lam Dong',
        NgheAn: 'Nghe An',
        QuangNinh: 'Quang Ninh',
        QuangTri: 'Quang Tri',
        SonLa: 'Son La',
        ThanhHoa: 'Thanh Hoa'
    }
};


// Export (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = searchTranslations;
}

function _t(lang) { return searchTranslations[lang] || searchTranslations.vi; }

function _$(sel, ctx) { return (ctx || document).querySelector(sel); }

function _$all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

function getSearchPersistedLanguage() {
    if (typeof window.getPersistedLanguage === 'function') {
        return window.getPersistedLanguage() === 'en' ? 'en' : 'vi';
    }

    const languageRaw = (localStorage.getItem('language') || '').toLowerCase();
    if (languageRaw === 'en' || languageRaw === 'vi') return languageRaw;

    const preferredRaw = (localStorage.getItem('preferredLanguage') || '').toLowerCase();
    if (preferredRaw === 'en' || preferredRaw === 'vi') return preferredRaw;

    const htmlRaw = (document.documentElement.lang || '').toLowerCase();
    return htmlRaw === 'en' ? 'en' : 'vi';
}

// Apply translations for search page
function applySearchTranslations(lang) {
    const dict = _t(lang);
    const aside = _$('.sp-filters') || document;

    // 1) data-i18n (if you have it attached)
    _$all('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = dict[key];
        if (val == null) return;
        const attr = el.getAttribute('data-i18n-attr');
        if (attr === 'placeholder') el.placeholder = val;
        else if (attr) el.setAttribute(attr, val);
        else el.textContent = val;
    });

    // 2) Form & filters (no need for data-i18n)
    const setText = (sel, v, ctx) => { const el = _$(sel, ctx); if (el) el.textContent = v; };
    setText('.sp-title', dict.searchTitle, aside);
    // Trip type labels
    const tripTypeLabels = document.querySelectorAll('.sp-trip-option span');
    if (tripTypeLabels[0]) tripTypeLabels[0].textContent = dict.roundTrip || 'Round-trip';
    if (tripTypeLabels[1]) tripTypeLabels[1].textContent = dict.oneWay || 'One-way';
    // Find and set from/to labels by their data-i18n attributes or position
    const fromLabel = document.querySelector('label[data-i18n="search.from"]');
    const toLabel = document.querySelector('label[data-i18n="search.to"]');
    if (fromLabel) fromLabel.textContent = dict.fromLabel;
    if (toLabel) toLabel.textContent = dict.toLabel;
    setText('label[for="dep"]', dict.departureLabel, aside);
    setText('label[for="ret"]', dict.returnLabel, aside);

    const searchBtn = _$('.sp-btn.sp-btn-secondary', aside);
    if (searchBtn) {
        const icon = searchBtn.querySelector('i');
        searchBtn.innerHTML = (icon ? icon.outerHTML + ' ' : '') + dict.searchButton;
        searchBtn.setAttribute('aria-label', dict.searchButton);
    }

    setText('.sp-subtitle', dict.filtersTitle, aside);

    const titles = _$all('.sp-filters .sp-section .sp-section-title', aside);
    if (titles[1]) titles[1].textContent = dict.timeTitle;
    if (titles[0]) titles[0].textContent = dict.budgetTitle;



    const anyEl = _$('.sp-price-top span:last-child', aside);
    if (anyEl) anyEl.textContent = dict.anyLabel;

    // Trend chart toolbar + modal
    const trendBtnText = _$('#spOpenTrendBtn span');
    if (trendBtnText) trendBtnText.textContent = dict.trendButton || 'Price chart';

    const trendTab = _$('#spTrendModal .sp-trend-tab');
    if (trendTab) trendTab.textContent = dict.trendTabTitle || 'Cheapest fare by day';

    const trendSummary = _$('#spTrendSummary');
    if (trendSummary && !trendSummary.dataset.lockedByTrendRender) {
        trendSummary.textContent = dict.trendSummaryLoading || 'Loading data...';
    }

    const trendGrid = _$('#spTrendGrid');
    if (trendGrid) trendGrid.setAttribute('aria-label', dict.trendGridAriaLabel || 'Fare trend chart');

    const trendCancel = _$('#spTrendCancel');
    if (trendCancel) trendCancel.textContent = dict.trendCancel || 'Cancel';

    const trendOk = _$('#spTrendOk');
    if (trendOk) trendOk.textContent = dict.trendOk || 'OK';

    // 3) Cards
    _$all('.sp-card .sp-btn.sp-btn-block').forEach(btn => {
        btn.textContent = dict.selectFlight;
        btn.setAttribute('aria-label', dict.selectFlight);
    });

    _$all('.sp-card .sp-date').forEach(el => {
        const raw = el.textContent;
        el.textContent = raw
            .replace(/·\s*Khởi hành/gi, dict.dotDeparture)
            .replace(/·\s*Về/gi, dict.dotReturn)
            .replace(/·\s*Departure/gi, dict.dotDeparture)
            .replace(/·\s*Return/gi, dict.dotReturn);
    });

    _$all('.sp-duration').forEach(el => {
        const parts = String(el.innerHTML).split('<br>');
        if (parts.length === 2) {
            parts[1] = dict.nonstop;
            el.innerHTML = parts.join('<br>');
        } else {
            el.innerHTML = String(el.innerHTML).replace(/Bay thẳng|Nonstop/gi, dict.nonstop);
        }
    });
    
    // 4) Update airport names and city names
    updateAirportAndCityNames(lang);

    // 4) Modal
    const modal = _$('#spModal');
    if (modal) {
        const setM = (sel, v) => { const el = _$(sel, modal); if (el) el.textContent = v; };
        setM('#spModalTitle', dict.modalTitle || ''); // may not have key then leave empty

        _$all('.sp-leg__title', modal).forEach(tEl => {
            const span = tEl.querySelector('span');
            let city = span ? span.textContent : '';
            
            // Translate city name if it contains airport code
            const airportMatch = city.match(/\(([A-Z]{3})\)$/);
            if (airportMatch) {
                const code = airportMatch[1];
                const airportData = {
                    'HAN': { vi: 'Hà Nội', en: 'Hanoi' },
                    'SGN': { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' },
                    'DAD': { vi: 'Đà Nẵng', en: 'Da Nang' },
                    'CXR': { vi: 'Nha Trang', en: 'Nha Trang' },
                    'PQC': { vi: 'Phú Quốc', en: 'Phu Quoc' },
                    'VCA': { vi: 'Cần Thơ', en: 'Can Tho' },
                    'HUI': { vi: 'Huế', en: 'Hue' },
                    'VII': { vi: 'Vinh', en: 'Vinh' }
                };
                const data = airportData[code];
                if (data) {
                    const cityName = data[lang] || data.vi;
                    city = `${cityName} (${code})`;
                }
            }
            
            // Update only the "To" text, keep city span intact
            const toSpan = tEl.querySelector('[data-i18n="legTo"]');
            if (toSpan) {
                toSpan.textContent = dict.legTo || 'To';
            }
            // Update city span if it has content
            if (city && span) {
                span.textContent = city;
            }
        });

        const shareBtn = _$('.sp-modal__footer .sp-btn.sp-btn--ghost', modal);
        if (shareBtn) {
            shareBtn.textContent = dict.shareTrip;
            shareBtn.setAttribute('aria-label', dict.shareTrip);
        }

        const bookBtn = _$('#spBookBtn', modal);
        if (bookBtn) {
            const stored = (bookBtn.dataset && bookBtn.dataset.price) ? bookBtn.dataset.price : '';
            if (stored) {
                bookBtn.textContent = `${dict.bookNowFor} ${stored}`;
            } else {
                const txt = (bookBtn.textContent || '').trim();
                const m = txt.match(/([\d\s.,]+(?:VND|₫|USD|€|£))$/i);
                bookBtn.textContent = m ? `${dict.bookNowFor} ${m[1]}` : dict.bookNowFor;
            }
        }
    }

    // 5) <html lang> + <title>
    if (dict.searchTitle) document.title = dict.searchTitle;
    document.documentElement.lang = (lang === 'vi' ? 'vi' : 'en');
}

// Change language (public API for search page)
function changeSearchLanguage(lang) {
    const next = (lang === 'en' || lang === 'vi') ? lang : 'vi';
    try {
        localStorage.setItem('preferredLanguage', next);
        localStorage.setItem('language', next);
    } catch (_) {}
    document.documentElement.lang = next;
    applySearchTranslations(next);

    // Trigger date format update via custom event
    const event = new CustomEvent('languageChanged', {
        detail: { lang: next }
    });
    document.dispatchEvent(event);

    if (typeof updateSelectedLanguage === 'function') {
        try { updateSelectedLanguage(next); } catch (_) {}
    }
}

// Expose for common.js & fallback
window.changeSearchLanguage = changeSearchLanguage;
window.changeLanguage = changeSearchLanguage; // commonly used alias

// Default to VI on first load
if (!localStorage.getItem('preferredLanguage') && !localStorage.getItem('language')) {
    localStorage.setItem('preferredLanguage', 'vi');
    localStorage.setItem('language', 'vi');
}

// Function to init translations after components are loaded
function initSearchTranslations() {
    const qLang = new URLSearchParams(location.search).get('lang');
    const storedLang = getSearchPersistedLanguage();
    
    const lang = (qLang === 'vi' || qLang === 'en') ?
        qLang :
        (storedLang || 'vi');

    try {
        localStorage.setItem('preferredLanguage', lang);
        localStorage.setItem('language', lang);
    } catch (_) {}

    applySearchTranslations(lang);

    // Fallback click .lang-option if not using common.js
    if (!window.__search_lang_bound) {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest && e.target.closest('.lang-option');
            if (!btn) return;
            e.preventDefault();
            const next = btn.getAttribute('data-lang') || 'vi';
            changeSearchLanguage(next);
        });
        window.__search_lang_bound = true;
    }

    // Fallback <select id="languageSelect">
    const sel = document.getElementById('languageSelect');
    if (sel && !sel.__bound) {
        sel.addEventListener('change', () => changeSearchLanguage(sel.value));
        sel.__bound = true;
    }
}

// Function to update airport and city names based on language
function updateAirportAndCityNames(lang) {
    const airportData = {
        'HAN': {
            city: { vi: 'Hà Nội', en: 'Hanoi' },
            airport: { vi: 'Sân bay Nội Bài', en: 'Noi Bai Airport' }
        },
        'SGN': {
            city: { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' },
            airport: { vi: 'Sân bay Tân Sơn Nhất', en: 'Tan Son Nhat Airport' }
        },
        'DAD': {
            city: { vi: 'Đà Nẵng', en: 'Da Nang' },
            airport: { vi: 'Sân bay Đà Nẵng', en: 'Da Nang Airport' }
        },
        'CXR': {
            city: { vi: 'Nha Trang', en: 'Nha Trang' },
            airport: { vi: 'Sân bay Cam Ranh', en: 'Cam Ranh Airport' }
        },
        'PQC': {
            city: { vi: 'Phú Quốc', en: 'Phu Quoc' },
            airport: { vi: 'Sân bay Phú Quốc', en: 'Phu Quoc Airport' }
        },
        'VCA': {
            city: { vi: 'Cần Thơ', en: 'Can Tho' },
            airport: { vi: 'Sân bay Cần Thơ', en: 'Can Tho Airport' }
        },
        'HUI': {
            city: { vi: 'Huế', en: 'Hue' },
            airport: { vi: 'Sân bay Phú Bài', en: 'Phu Bai Airport' }
        },
        'VII': {
            city: { vi: 'Vinh', en: 'Vinh' },
            airport: { vi: 'Sân bay Vinh', en: 'Vinh Airport' }
        }
    };
    
    // Update city names in .sp-meta elements
    _$all('.sp-meta').forEach(el => {
        const text = el.textContent.trim();
        // Extract airport code from text like "Hồ Chí Minh (SGN)"
        const match = text.match(/\(([A-Z]{3})\)$/);
        if (match) {
            const code = match[1];
            const data = airportData[code];
            if (data) {
                const cityName = data.city[lang] || data.city.vi;
                el.textContent = `${cityName} (${code})`;
            }
        }
    });
    
    // Update airport names in .sp-airport-name elements
    _$all('.sp-airport-name').forEach(el => {
        const text = el.textContent.trim();
        // Find matching airport by Vietnamese or English name
        for (const [code, data] of Object.entries(airportData)) {
            if (text === data.airport.vi || text === data.airport.en) {
                const airportName = data.airport[lang] || data.airport.vi;
                el.textContent = airportName;
                break;
            }
        }
    });
    
    // Update modal airport content
    const modalSelectors = [
        '[data-out-dep-airport]',
        '[data-out-arr-airport]',
        '[data-in-dep-airport]', 
        '[data-in-arr-airport]'
    ];
    
    modalSelectors.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent.trim();
            // Extract airport code from text like "Hồ Chí Minh (SGN)"
            const match = text.match(/\(([A-Z]{3})\)$/);
            if (match) {
                const code = match[1];
                const data = airportData[code];
                if (data) {
                    const cityName = data.city[lang] || data.city.vi;
                    const newText = `${cityName} (${code})`;
                    el.textContent = newText;
                }
            }
        }
    });
}

// Expose functions
window.initSearchTranslations = initSearchTranslations;
window.applySearchTranslations = applySearchTranslations;

// Expose dictionary for other scripts that need to read translations directly
try { window.searchTranslations = searchTranslations; } catch (_) {}