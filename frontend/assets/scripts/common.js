// Common JS for SkyPlan: shared UI logic (menu, language selector, authentication, etc.)

// ====== GLOBAL LANGUAGE HELPER - used by ALL scripts ======
window.getPersistedLanguage = function() {
    const prefRaw = (localStorage.getItem('preferredLanguage') || '').toLowerCase();
    const langRaw = (localStorage.getItem('language') || '').toLowerCase();
    const pref = prefRaw === 'en' ? 'en' : (prefRaw === 'vi' ? 'vi' : '');
    const lang = langRaw === 'en' ? 'en' : (langRaw === 'vi' ? 'vi' : '');
    const docLang = (document.documentElement.lang || '').toLowerCase() === 'en' ? 'en' : 'vi';

    // Canonical choice: prefer `language` key when present, then legacy `preferredLanguage`.
    // This also heals stale mismatches like preferredLanguage=vi while language=en.
    const chosen = lang || pref || docLang || 'vi';

    try {
        if (pref !== chosen || lang !== chosen) {
            localStorage.setItem('preferredLanguage', chosen);
            localStorage.setItem('language', chosen);
        }
    } catch (_) {}

    return chosen;
};

// ====== GLOBAL BLOCKCHAIN INTEGRATION POPUP ======
window.showBlockchainIntegrationPopup = function(options) {
    const opts = options || {};
    const lang = (typeof window.getPersistedLanguage === 'function' ? window.getPersistedLanguage() : 'vi') === 'en' ? 'en' : 'vi';

    const i18nSources = [
        (window.translations && window.translations[lang]) || null,
        (window.confirmationTranslations && window.confirmationTranslations[lang]) || null,
        (window.myTripsTranslations && window.myTripsTranslations[lang]) || null,
        (window.supportTranslations && window.supportTranslations[lang]) || null,
        (window.walletTranslations && window.walletTranslations[lang]) || null
    ].filter(Boolean);

    function pick(keys, fallback) {
        for (const src of i18nSources) {
            for (const key of keys) {
                if (src && src[key]) return src[key];
            }
        }
        return fallback;
    }

    const text = {
        title: pick(['ticketUpgradeModalTitle'], lang === 'vi' ? 'Tích hợp vé Blockchain' : 'Blockchain Ticket Integration'),
        message: pick(['ticketUpgradeModalDesc'], lang === 'vi' ? 'Bạn muốn tích hợp ngay hay xem hướng dẫn trước?' : 'Do you want to integrate now or view the guide first?'),
        integrate: pick(['ticketUpgradeIntegrate'], lang === 'vi' ? 'Tích hợp ngay' : 'Integrate now'),
        guide: pick(['ticketUpgradeGuide'], lang === 'vi' ? 'Xem hướng dẫn' : 'View guide'),
        close: pick(['closeText'], lang === 'vi' ? 'Đóng' : 'Close')
    };

    let overlay = document.getElementById('global-blockchain-integration-popup');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-blockchain-integration-popup';
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'display:none',
            'align-items:center',
            'justify-content:center',
            'background:rgba(15,23,42,.45)',
            'z-index:99999'
        ].join(';');

        overlay.innerHTML = [
            '<div role="dialog" aria-modal="true" style="width:min(92vw,480px);background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(2,6,23,.25);padding:18px 18px 14px 18px;font-family:inherit;">',
            '  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">',
            '    <h3 id="global-blockchain-popup-title" style="margin:0;font-size:1.1rem;color:#0f172a;"></h3>',
            '    <button id="global-blockchain-popup-close" aria-label="close" style="border:none;background:transparent;font-size:1.2rem;cursor:pointer;color:#64748b;">x</button>',
            '  </div>',
            '  <p id="global-blockchain-popup-message" style="margin:10px 0 16px 0;color:#334155;line-height:1.5;"></p>',
            '  <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">',
            '    <button id="global-blockchain-popup-guide" style="padding:9px 14px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;"></button>',
            '    <button id="global-blockchain-popup-integrate" style="padding:9px 14px;border-radius:10px;border:1px solid #0ea5e9;background:#0ea5e9;color:#fff;cursor:pointer;"></button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById('global-blockchain-popup-title');
    const messageEl = document.getElementById('global-blockchain-popup-message');
    const integrateBtn = document.getElementById('global-blockchain-popup-integrate');
    const guideBtn = document.getElementById('global-blockchain-popup-guide');
    const closeBtn = document.getElementById('global-blockchain-popup-close');

    if (titleEl) titleEl.textContent = opts.title || text.title;
    if (messageEl) messageEl.textContent = opts.message || text.message;
    if (integrateBtn) integrateBtn.textContent = opts.integrateLabel || text.integrate;
    if (guideBtn) guideBtn.textContent = opts.guideLabel || text.guide;
    if (closeBtn) closeBtn.title = text.close;

    return new Promise(function(resolve) {
        function cleanup(result) {
            overlay.style.display = 'none';
            overlay.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onEsc);
            if (integrateBtn) integrateBtn.onclick = null;
            if (guideBtn) guideBtn.onclick = null;
            if (closeBtn) closeBtn.onclick = null;
            resolve(result);
        }

        function onOverlayClick(e) {
            if (e.target === overlay) cleanup('cancel');
        }
        function onEsc(e) {
            if (e.key === 'Escape') cleanup('cancel');
        }

        if (integrateBtn) integrateBtn.onclick = function() { cleanup('integrate'); };
        if (guideBtn) guideBtn.onclick = function() { cleanup('guide'); };
        if (closeBtn) closeBtn.onclick = function() { cleanup('cancel'); };

        overlay.style.display = 'flex';
        overlay.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onEsc);
    });
};

// ====== SHARED HEADER TRANSLATIONS ======
// Some pages inject the header after their page-level translations run.
// This helper ensures the header (including the user dropdown) always matches the current language.
window.applyHeaderTranslations = function(lang) {
    const normalizedLang = String(lang || '').toLowerCase() === 'en' ? 'en' : 'vi';
    const dict = {
        en: {
            checkinOnlineText: 'Online Check-in',
            helpText: 'Help',
            myTripsText: 'My Trips',
            profileText: 'Profile',
            verifyBookingMenuText: 'Verify Booking',
            myNftTicketsText: 'My NFT Tickets',
            mySkyTokensText: 'My SKY Tokens',
            logoutText: 'Logout',
            signInText: 'Sign In',
            signUpText: 'Sign Up',
            connectWalletText: 'Connect Wallet',
            disconnectText: 'Disconnect'
        },
        vi: {
            checkinOnlineText: 'Check-in online',
            helpText: 'Trợ giúp',
            myTripsText: 'Chuyến đi của tôi',
            profileText: 'Hồ sơ cá nhân',
            verifyBookingMenuText: 'Kiểm tra đặt chỗ',
            myNftTicketsText: 'Vé NFT của tôi',
            mySkyTokensText: 'SKY Tokens của tôi',
            logoutText: 'Đăng xuất',
            signInText: 'Đăng nhập',
            signUpText: 'Đăng ký',
            connectWalletText: 'Kết nối Ví',
            disconnectText: 'Ngắt kết nối'
        }
    };

    const headerRoot = document.querySelector('#header-container') ||
        document.querySelector('#header-placeholder') ||
        document.querySelector('header.header');
    if (!headerRoot) return;

    const headerDict = dict[normalizedLang];
    headerRoot.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (!key || !(key in headerDict)) return;
        el.textContent = headerDict[key];
    });
};

// When pages manually inject the header, they usually dispatch `header-loaded`.
// Re-apply header translations then to avoid stuck VI labels.
document.addEventListener('header-loaded', function() {
    try {
        const lang = window.getPersistedLanguage ? window.getPersistedLanguage() : 'vi';
        if (typeof window.applyHeaderTranslations === 'function') {
            window.applyHeaderTranslations(lang);
        }
    } catch (_) {}
});

// Retry init user dropdown when header loads late
let userDropdownInitAttempts = 0;
const MAX_USER_DROPDOWN_INIT_ATTEMPTS = 20; // ~5s if each retry is 250ms

// Shared helper to load header and footer components (separate promises to prevent footer delay)
function loadHeaderFooter() {
    return new Promise((resolve) => {
        const headerContainer = document.getElementById('header-container') || document.getElementById('header-placeholder');
        
        // Load and initialize header - critical for UI
        if (headerContainer) {
            fetch('components/header.html')
                .then(r => r.ok ? r.text() : Promise.reject())
                .then(html => {
                    headerContainer.innerHTML = html;
                    if (typeof initializeMobileMenu === 'function') initializeMobileMenu();
                    if (typeof initializeLanguageSelector === 'function') initializeLanguageSelector();

                    // Re-apply saved language immediately after header injection so reload
                    // does not fall back to static VI labels in header.html.
                    const lang = getCurrentLanguage();
                    if (typeof window.applyHeaderTranslations === 'function') {
                        window.applyHeaderTranslations(lang);
                    }
                    if (typeof updateSelectedLanguage === 'function') {
                        updateSelectedLanguage(lang);
                    }
                    if (typeof window.broadcastLanguageChange === 'function') {
                        window.broadcastLanguageChange(lang);
                    }
                    resolve();
                })
                .catch(() => resolve());
        } else {
            resolve();
        }

        // Load footer asynchronously (non-blocking)
        const footerContainer = document.getElementById('footer-container') || document.getElementById('footer-placeholder');
        if (footerContainer) {
            fetch('components/footer.html')
                .then(r => r.ok ? r.text() : Promise.reject())
                .then(html => {
                    footerContainer.innerHTML = html;
                    // Re-apply current language after async footer injection.
                    // This prevents untranslated footer text when another script reloads components.
                    const lang = getCurrentLanguage();
                    if (typeof window.broadcastLanguageChange === 'function') {
                        window.broadcastLanguageChange(lang);
                    } else {
                        try {
                            document.dispatchEvent(new CustomEvent('languageChanged', {
                                detail: { language: lang, lang: lang }
                            }));
                        } catch (_) {}
                    }
                })
                .catch(() => {});
        }
    });
}

// Get current language
function getCurrentLanguage() {
    if (typeof window.getPersistedLanguage === 'function') {
        return window.getPersistedLanguage();
    }
    const saved = (localStorage.getItem('language') || localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi').toLowerCase();
    return saved === 'en' ? 'en' : 'vi';
}

// Read JSON from localStorage safely
function readJSON(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
}

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
        const currentLang = getCurrentLanguage();
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
                } else if (typeof applyVerifyBookingTranslations === 'function' && (path.includes('verify_booking.html') || path.endsWith('/verify_booking'))) {
                    applyVerifyBookingTranslations(selectedLangValue);
                } else if (typeof changeProfileLanguage === 'function' && (path.includes('profile.html') || path.endsWith('/profile'))) {
                    changeProfileLanguage(selectedLangValue);
                } else if (typeof changeLanguage === 'function') {
                    changeLanguage(selectedLangValue);
                } else if (typeof applyTranslations === 'function') {
                    applyTranslations(selectedLangValue);
                }

                // Keep language state consistent even on pages without a dedicated changeLanguage() function.
                if (typeof window.broadcastLanguageChange === 'function') {
                    window.broadcastLanguageChange(selectedLangValue);
                } else {
                    localStorage.setItem('preferredLanguage', selectedLangValue);
                    document.documentElement.lang = selectedLangValue;
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

    function getLang() { return window.getPersistedLanguage(); }

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
    // Backwards-compatible alias used by some pages
    window.resolveCity = resolveCityLabel;
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

    // Toggle dropdown on button click (works on both mobile and desktop)
    userButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // On mobile, just provide visual feedback (no actual dropdown toggle needed since logout is always visible)
        // On desktop, toggle the dropdown
        if (window.innerWidth > 1024) {
            userDropdown.classList.toggle('active');
            console.debug('[initializeUserDropdown] Toggled dropdown, state:', userDropdown.classList.contains('active'));
        } else {
            // Mobile: add a brief visual effect
            userButton.style.opacity = '0.7';
            setTimeout(() => {
                userButton.style.opacity = '1';
            }, 100);
        }
    });

    // Close dropdown when clicking outside (only on desktop)
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024) return; // Skip on mobile
        
        if (!userDropdown.contains(e.target) && !userButton.contains(e.target)) {
            if (userDropdown.classList.contains('active')) {
                userDropdown.classList.remove('active');
                console.debug('[initializeUserDropdown] Closed dropdown by outside click');
            }
        }
    });

    // Close on ESC (only on desktop)
    document.addEventListener('keydown', function(e) {
        if (window.innerWidth <= 1024) return; // Skip on mobile
        
        if (e.key === 'Escape' && userDropdown.classList.contains('active')) {
            userDropdown.classList.remove('active');
            console.debug('[initializeUserDropdown] Closed dropdown by ESC');
        }
    });

    // Mark as initialized
    userButton.dataset.dropdownBound = 'true';
    console.debug('[initializeUserDropdown] Dropdown initialized successfully');
}

function bindUserDropdownDelegation() {
    if (document.body && document.body.dataset.userDropdownDelegationBound === 'true') {
        return;
    }

    document.addEventListener('click', function(e) {
        const userButton = e.target.closest('.user-button');
        if (!userButton) return;

        const userDropdown = userButton.closest('.user-dropdown');
        if (!userDropdown) return;

        e.preventDefault();
        e.stopPropagation();

        if (window.innerWidth > 1024) {
            userDropdown.classList.toggle('active');
        }
    }, true);

    if (document.body) {
        document.body.dataset.userDropdownDelegationBound = 'true';
    }
}

// Initialize all common functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeUserDropdown();
    bindUserDropdownDelegation();

    // Reconcile and broadcast persisted language once after DOM is ready.
    // This helps prevent late-loaded components from showing the default VI text.
    try {
        const lang = window.getPersistedLanguage ? window.getPersistedLanguage() : 'vi';
        if (typeof window.broadcastLanguageChange === 'function') {
            window.broadcastLanguageChange(lang);
        } else {
            localStorage.setItem('preferredLanguage', lang);
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
        }
    } catch (_) {}
    
    // Update header auth state when page loads (with delay)
    setTimeout(() => {
        if (typeof updateHeaderUserInfo === 'function') {
            updateHeaderUserInfo();
        }
    }, 600);
});

// Global language change broadcaster
window.broadcastLanguageChange = function(lang) {
    const normalizedLang = (lang || '').toLowerCase() === 'en' ? 'en' : 'vi';

    // Store in localStorage
    localStorage.setItem('preferredLanguage', normalizedLang);
    localStorage.setItem('language', normalizedLang);
    
    // Update document lang
    document.documentElement.lang = normalizedLang;

    // Keep selector UI in sync after reload/injected header
    if (typeof updateSelectedLanguage === 'function') {
        updateSelectedLanguage(normalizedLang);
    }

    // Always keep header (including user dropdown) translated
    if (typeof window.applyHeaderTranslations === 'function') {
        window.applyHeaderTranslations(normalizedLang);
    }
    
    // Dispatch event for all pages to listen
    try {
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: normalizedLang, lang: normalizedLang } 
        }));
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: normalizedLang, lang: normalizedLang } 
        }));
    } catch(e) {
        console.warn('Language change event dispatch failed:', e);
    }
};

// Page-scoped translation applier (currently used by support.js)
window.applyTranslationsForPage = function(pageKey, lang) {
    const key = String(pageKey || '').toLowerCase();
    const normalizedLang = (lang || window.getPersistedLanguage && window.getPersistedLanguage() || 'vi').toLowerCase() === 'en' ? 'en' : 'vi';

    let dict = null;
    if (key === 'support') {
        dict = window.supportTranslations && window.supportTranslations[normalizedLang];
    }
    if (!dict) return;

    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        const k = el.getAttribute('data-i18n');
        if (!k || !dict[k]) return;
        const tag = (el.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            el.setAttribute('placeholder', dict[k]);
        } else {
            el.textContent = dict[k];
        }
    });
};

// Auto-apply Support translations when language changes
document.addEventListener('languageChanged', function(e) {
    try {
        const path = String(window.location && window.location.pathname || '');
        if (!path.includes('support')) return;
        const lang = e && e.detail && (e.detail.lang || e.detail.language);
        if (typeof window.applyTranslationsForPage === 'function') {
            window.applyTranslationsForPage('support', lang);
        }
    } catch (_) {}
});