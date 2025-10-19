// 404 translations (no overrides)
const notFoundTranslations = {
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
        // 404 Page
        metaTitle: "SkyPlan - 404 Not Found",
        metaDescription: "The page you requested could not be found.",
        title: "This is not the page you are looking for!",
        descHTML: "The link may be faulty or the page moved.<br>Return to the main page to find the page you are looking for.",
        home: "Back to Home"
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
        // 404 Page
        metaTitle: "SkyPlan - Không tìm thấy trang (404)",
        metaDescription: "Không tìm thấy trang bạn yêu cầu.",
        title: "Đây không phải là trang bạn đang tìm!",
        descHTML: "Liên kết có thể không chính xác hoặc trang đã được di chuyển.<br>Hãy quay lại trang chủ để tìm trang bạn cần.",
        home: "Về trang chủ"
    }
};

function apply404Translations(lang) {
    lang = (lang || 'vi').toLowerCase();
    const t = notFoundTranslations[lang] || notFoundTranslations.vi;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (t[k]) el.textContent = t[k];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const k = el.getAttribute('data-i18n-html');
        if (t[k]) el.innerHTML = t[k];
    });

    const h1 = document.querySelector('.sp404-title');
    const p = document.querySelector('.sp404-desc');
    const btn = document.getElementById('homeBtn');
    if (h1 && !h1.hasAttribute('data-i18n')) h1.textContent = t.title;
    if (p && !p.hasAttribute('data-i18n-html')) p.innerHTML = t.descHTML;
    if (btn && !btn.hasAttribute('data-i18n')) btn.textContent = t.home;

    document.title = t.metaTitle;
    const md = document.querySelector('meta[name="description"]') || (() => {
        const m = document.createElement('meta');
        m.name = 'description';
        document.head.appendChild(m);
        return m;
    })();
    md.setAttribute('content', t.metaDescription);
    document.documentElement.lang = lang;
}


document.addEventListener('DOMContentLoaded', () => {
    const urlLang = new URLSearchParams(location.search).get('lang');
    const lang = (urlLang || localStorage.getItem('preferredLanguage') || 'vi').toLowerCase();
    apply404Translations(lang);
});

window.addEventListener('sp:langchange', e => {
    const code = e && e.detail && e.detail.lang;
    if (code) {
        localStorage.setItem('preferredLanguage', code); // Lưu vào localStorage
        apply404Translations(code);
    }
    (function(L) { var s = document.querySelector('#lang-select,#language-select'); if (s) s.value = L; var b = document.querySelector('[data-lang-label]'); if (b) b.textContent = L.toUpperCase(); })((typeof code !== 'undefined' ? code : (typeof lang !== 'undefined' ? lang : (new URLSearchParams(location.search).get('lang') || localStorage.getItem('preferredLanguage') || 'vi'))).toLowerCase());

});

window.addEventListener('storage', e => {
    if (e.key === 'preferredLanguage' && e.newValue) {
        apply404Translations(e.newValue);
    }
});