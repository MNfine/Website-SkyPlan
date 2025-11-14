// Common JS for SkyPlan: shared UI logic (menu, language selector, authentication, etc.)

// Retry init user dropdown when header loads late
let userDropdownInitAttempts = 0;
const MAX_USER_DROPDOWN_INIT_ATTEMPTS = 20; // ~5s if each retry is 250ms

// Mobile menu functionality
function initializeMobileMenu() {
    console.log("Initializing mobile menu...");
    // Increase timeout to ensure header is fully loaded
    setTimeout(() => {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (menuToggle && navLinks) {
            if (!menuToggle.dataset.bound) {
                menuToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    menuToggle.classList.toggle('active');
                    navLinks.classList.toggle('active');
                    document.body.classList.toggle('no-scroll');
                });
                menuToggle.dataset.bound = '1';
            }
        } else {
            console.error('Menu elements not found');
        }
        if (!document.body.dataset.menuOutsideClickBound) {
            document.addEventListener('click', function(event) {
                if (navLinks && navLinks.classList.contains('active') &&
                    !event.target.closest('.nav-links') &&
                    !event.target.closest('.menu-toggle')) {
                    navLinks.classList.remove('active');
                    if (menuToggle) menuToggle.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });
            document.body.dataset.menuOutsideClickBound = '1';
        }
    }, 500);
}

// Language selector functionality (calls correct change language function per page)
function initializeLanguageSelector() {
    setTimeout(() => {
        const langOptions = document.querySelectorAll('.lang-option');
        const selectedLang = document.querySelector('.selected-lang');
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        langOptions.forEach(option => {
            if (option.dataset.bound === '1') return;
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const selectedLangValue = this.getAttribute('data-lang');
                langOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                // Change language: use correct function for each page (support both .html and backend route)
                const path = window.location.pathname;
                if (typeof changeOverviewLanguage === 'function' && (path.includes('overview.html') || path.endsWith('/overview'))) {
                    changeOverviewLanguage(selectedLangValue);
                } else if (typeof changeConfirmationLanguage === 'function' && (path.includes('confirmation.html') || path.endsWith('/confirmation'))) {
                    changeConfirmationLanguage(selectedLangValue);
                } else if (typeof changePaymentLanguage === 'function' && (path.includes('payment.html') || path.endsWith('/payment'))) {
                    changePaymentLanguage(selectedLangValue);
                } else if (typeof changeSeatLanguage === 'function' && (path.includes('seat.html') || path.endsWith('/seat'))) {
                    changeSeatLanguage(selectedLangValue);
                } else if (typeof changeFareLanguage === 'function' && (path.includes('fare.html') || path.endsWith('/fare'))) {
                    changeFareLanguage(selectedLangValue);
                } else if (typeof changeSearchLanguage === 'function' && (path.includes('search.html') || path.endsWith('/search'))) {
                    changeSearchLanguage(selectedLangValue);
                } else if (typeof changeSearchLanguage === 'function' && (path.includes('404.html') || path.endsWith('/404'))) {
                    changeSearchLanguage(selectedLangValue);
                } else if (typeof applyMyTripsTranslations === 'function' && (path.includes('my_trips.html') || path.endsWith('/my_trips'))) {
                    applyMyTripsTranslations(selectedLangValue);
                } else if (typeof changeBlogLanguage === 'function' && (path.includes('blog.html') || path.endsWith('/blog'))) {
                    changeBlogLanguage(selectedLangValue);
                } else if (typeof changeBlogLanguage === 'function' && (path.includes('promotion.html') || path.endsWith('/promotion'))) {
                    changeBlogLanguage(selectedLangValue);
                } else if (typeof changeLanguage === 'function') {
                    changeLanguage(selectedLangValue);
                } else if (typeof applyTranslations === 'function') {
                    applyTranslations(selectedLangValue);
                }
                
                // Always update header translations when language changes
                setTimeout(() => {
                    if (typeof applyTranslations === 'function') {
                        applyTranslations(selectedLangValue);
                    }
                }, 100);
                
                updateSelectedLanguage(selectedLangValue);
            });
            option.dataset.bound = '1';
        });
        langOptions.forEach(opt => {
            if (opt.getAttribute('data-lang') === currentLang) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        // Ensure the header's selected language UI reflects the saved language on load
        if (typeof updateSelectedLanguage === 'function') {
            updateSelectedLanguage(currentLang);
        }
    }, 100);
}

// Update selected language display
function updateSelectedLanguage(lang) {
    const selectedLang = document.querySelector('.selected-lang');
    if (selectedLang) {
        if (lang === 'vi') {
            selectedLang.innerHTML = `
        <span class="lang-flag flag-vi"></span>
        <span>VI</span>
      `;
        } else {
            selectedLang.innerHTML = `
        <span class="lang-flag flag-en"></span>
        <span>EN</span>
      `;
        }
    }
}

// Search functionality (for index page)
function initializeSearch() {
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function(event) {
            // Allow form submission without interruption
        });
    }
}

// Smooth scrolling for anchor links
function enableSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Global city label resolver: ensures diacritics from SKYPLAN_CITY_TRANSLATIONS for all pages
// Usage: window.resolveCityLabel(raw, lang?) -> localized label or original string
(function() {
    if (typeof window === 'undefined') return;
    // Ensure global city translations exist for all pages
    if (!window.SKYPLAN_CITY_TRANSLATIONS) {
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
    }
    if (window.resolveCityLabel) return; // do not override if already defined

    const IATA_TO_CODE = {
        HAN: 'HaNoi',
        SGN: 'HoChiMinh',
        DAD: 'DaNang',
        PQC: 'PhuQuoc',
        HPH: 'HaiPhong',
        HUI: 'Hue',
        DLI: 'DaLat',
        VCA: 'CanTho',
        CXR: 'KhanhHoa',
        VII: 'NgheAn',
        VDO: 'QuangNinh',
        VDH: 'QuangTri',
        VKG: 'AnGiang',
        DIN: 'DienBien',
        PXU: 'GiaLai',
        SQH: 'SonLa',
        THD: 'ThanhHoa'
    };

    function getLang() { return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi'; }

    function resolveCityLabel(raw, langOverride) {
        if (!raw) return '';
        const lang = langOverride || getLang();
        const MAP = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) || {};
        const dict = MAP[lang] || {};
        const viMap = MAP.vi || {};
        const enMap = MAP.en || {};
        let val = String(raw).trim();
        if (!val) return '';
        // Map IATA -> code
        if (IATA_TO_CODE[val]) val = IATA_TO_CODE[val];
        // If is known code, return localized label
        if (Object.prototype.hasOwnProperty.call(dict, val)) return dict[val] || val;
        // If matches any code in vi/en
        if (Object.prototype.hasOwnProperty.call(viMap, val) || Object.prototype.hasOwnProperty.call(enMap, val))
            return dict[val] || viMap[val] || enMap[val] || val;
        // Try reverse-lookup by comparing labels (case-insensitive)
        const lowers = (s) => (s || '').toString().toLowerCase();
        const sought = lowers(val);
        const mapsToCheck = [viMap, enMap];
        for (const m of mapsToCheck) {
            for (const code of Object.keys(m)) {
                if (lowers(m[code]) === sought) {
                    return dict[code] || m[code] || code;
                }
            }
        }
        return val;
    }

    window.resolveCityLabel = resolveCityLabel;
})();

// User dropdown functionality
function initializeUserDropdown() {
    const userButton = document.querySelector('.user-button');
    const userDropdown = document.querySelector('.user-dropdown');

    // If header hasn't been injected yet, retry a few times
    if (!userButton || !userDropdown) {
        if (userDropdownInitAttempts < MAX_USER_DROPDOWN_INIT_ATTEMPTS) {
            userDropdownInitAttempts++;
            console.debug('[initializeUserDropdown] header not ready, retry attempt', userDropdownInitAttempts);
            setTimeout(initializeUserDropdown, 250);
        } else {
            console.warn('[initializeUserDropdown] header not found after multiple retries, giving up');
        }
        return;
    }

    // Already bound? nothing to do
    if (userButton.dataset.dropdownBound === 'true') {
        console.debug('[initializeUserDropdown] Dropdown already bound, skipping');
        return;
    }

    console.debug('[initializeUserDropdown] Adding event listeners');

    // Toggle dropdown on button click
    userButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        userDropdown.classList.toggle('active');
        console.debug('[initializeUserDropdown] Toggled dropdown, state:', userDropdown.classList.contains('active'));
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!userDropdown.contains(e.target) && !userButton.contains(e.target)) {
            if (userDropdown.classList.contains('active')) {
                userDropdown.classList.remove('active');
                console.debug('[initializeUserDropdown] Closed dropdown by outside click');
            }
        }
    });

    // Close on ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && userDropdown.classList.contains('active')) {
            userDropdown.classList.remove('active');
            console.debug('[initializeUserDropdown] Closed dropdown by ESC');
        }
    });

    // Mark as initialized
    userButton.dataset.dropdownBound = 'true';
    console.debug('[initializeUserDropdown] Dropdown initialized successfully');
}

// Initialize all common functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeUserDropdown();
    
    // Update header auth state when page loads (with delay)
    setTimeout(() => {
        if (typeof updateHeaderUserInfo === 'function') {
            updateHeaderUserInfo();
        }
    }, 600);
});

// Global language change broadcaster
window.broadcastLanguageChange = function(lang) {
    // Store in localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    // Update document lang
    document.documentElement.lang = lang;
    
    // Dispatch event for all pages to listen
    try {
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang, lang: lang } 
        }));
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang, lang: lang } 
        }));
    } catch(e) {
        console.warn('Language change event dispatch failed:', e);
    }
};