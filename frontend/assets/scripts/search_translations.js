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
        customerService: "Customer Service",
        bookingHelp: "Booking Help",
        faq: "FAQ",
        paymentMethodsTitle: "Payment Methods",
        downloadAppTitle: "Download our app",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. All rights reserved.",
        // Titles & labels
        searchTitle: "Your trip",
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
        customerService: "Dịch vụ khách hàng",
        bookingHelp: "Hỗ trợ đặt vé",
        faq: "Câu hỏi thường gặp",
        paymentMethodsTitle: "Phương thức thanh toán",
        downloadAppTitle: "Tải ứng dụng của chúng tôi",
        appStore: "App Store",
        googlePlay: "Google Play",
        copyright: "© 2024 SkyPlan. Bảo lưu mọi quyền.",
        // Titles & labels
        searchTitle: "Chuyến đi của bạn",
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

// Áp dụng dịch cho trang search
function applySearchTranslations(lang) {
    const dict = _t(lang);
    const aside = _$('.sp-filters') || document;

    // 1) data-i18n (nếu bạn có gắn)
    _$all('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = dict[key];
        if (val == null) return;
        const attr = el.getAttribute('data-i18n-attr');
        if (attr === 'placeholder') el.placeholder = val;
        else if (attr) el.setAttribute(attr, val);
        else el.textContent = val;
    });

    // 2) Form & filters (không cần data-i18n)
    const setText = (sel, v, ctx) => { const el = _$(sel, ctx); if (el) el.textContent = v; };
    setText('.sp-title', dict.searchTitle, aside);
    setText('label[for="from"]', dict.fromLabel, aside);
    setText('label[for="to"]', dict.toLabel, aside);
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

    // 4) Modal
    const modal = _$('#spModal');
    if (modal) {
        const setM = (sel, v) => { const el = _$(sel, modal); if (el) el.textContent = v; };
        setM('#spModalTitle', dict.modalTitle || ''); // có thể không có key thì để trống

        _$all('.sp-leg__title', modal).forEach(tEl => {
            const span = tEl.querySelector('span');
            const city = span ? span.outerHTML : '';
            tEl.innerHTML = `${dict.legTo || ''} ${city}`.trim();
        });

        const shareBtn = _$('.sp-modal__footer .sp-btn.sp-btn--ghost', modal);
        if (shareBtn) {
            shareBtn.textContent = dict.shareTrip;
            shareBtn.setAttribute('aria-label', dict.shareTrip);
        }

        const bookBtn = _$('#spBookBtn', modal);
        if (bookBtn) {
            const txt = (bookBtn.textContent || '').trim();
            const m = txt.match(/([\d\s.,]+(?:VND|₫|USD|€|£))$/i);
            bookBtn.textContent = m ? `${dict.bookNowFor} ${m[1]}` : dict.bookNowFor;
        }
    }

    // 5) <html lang> + <title>
    if (dict.searchTitle) document.title = dict.searchTitle;
    document.documentElement.lang = (lang === 'vi' ? 'vi' : 'en');
}

// Đổi ngôn ngữ (public API cho trang search)
function changeSearchLanguage(lang) {
    const next = (lang === 'en' || lang === 'vi') ? lang : 'vi';
    try { localStorage.setItem('preferredLanguage', next); } catch (_) {}
    document.documentElement.lang = next;
    applySearchTranslations(next);

    if (typeof updateSelectedLanguage === 'function') {
        try { updateSelectedLanguage(next); } catch (_) {}
    }
}

// Expose cho common.js & fallback
window.changeSearchLanguage = changeSearchLanguage;
window.changeLanguage = changeSearchLanguage; // alias thường dùng

// Mặc định VI lần đầu
if (!localStorage.getItem('preferredLanguage')) {
    localStorage.setItem('preferredLanguage', 'vi');
}

// Function để init translations sau khi components đã load
function initSearchTranslations() {
    const qLang = new URLSearchParams(location.search).get('lang');
    const lang = (qLang === 'vi' || qLang === 'en') ?
        qLang :
        (localStorage.getItem('preferredLanguage') || 'en');

    applySearchTranslations(lang);

    // Fallback click .lang-option nếu không dùng common.js
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

// Expose init function
window.initSearchTranslations = initSearchTranslations;