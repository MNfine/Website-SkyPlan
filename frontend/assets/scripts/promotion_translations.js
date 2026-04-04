(function() {
    var STORAGE_KEY = "skyplan_lang";
    var DEFAULT_LANG = "vi";
    window.ui = window.ui || {};

    function shallowMerge(base, patch) {
        base = base || {};
        for (var k in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, k)) {
                base[k] = patch[k];
            }
        }
        return base;
    }

    var promoUi = {
        en: {
            helpText: "Help",
            myTripsText: "My Trips",
            signUpText: "Sign Up",
            signInText: "Sign In",
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
            promotion: "Promotions",
            paymentMethodsTitle: "Payment Methods",
            downloadAppTitle: "Download our app",
            appStore: "App Store",
            googlePlay: "Google Play",
            copyright: "© 2024 SkyPlan. All rights reserved.",

            // Promotion page
            searchPlaceholder: "Enter the promotion you want (e.g., flight discount)",
            searchButtonAria: "Search",
            promotionsHeading: "Promotions",
            viewPromotion: "View promotion",
            badgeHot: "HOT",
            badgeComing: "COMING SOON",
            timeLabel: "Promo period",
            minTxnLabel: "Minimum transaction",
            bookNow: "Book Now!",
            availableCodes: "Available Codes",
            backToList: "Back to List",
            pageNavLabel: "Pagination",
            prevPageAria: "Previous page",
            nextPageAria: "Next page",
            copy: "Copy",
            copied: "Copied!",
        },
        vi: {
            helpText: "Trợ giúp",
            myTripsText: "Chuyến đi của tôi",
            signUpText: "Đăng ký",
            signInText: "Đăng nhập",
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
            promotion: "Khuyến mãi",
            paymentMethodsTitle: "Phương thức thanh toán",
            downloadAppTitle: "Tải ứng dụng của chúng tôi",
            appStore: "App Store",
            googlePlay: "Google Play",
            copyright: "© 2024 SkyPlan. Bảo lưu mọi quyền.",

            // Promotion page
            searchPlaceholder: "Nhập khuyến mãi mà bạn muốn (ví dụ giảm giá chuyến bay)",
            searchButtonAria: "Tìm",
            promotionsHeading: "Các chương trình khuyến mãi",
            viewPromotion: "Xem khuyến mãi",
            badgeHot: "HOT",
            badgeComing: "SẮP DIỄN RA",
            timeLabel: "Thời gian khuyến mãi",
            minTxnLabel: "Giao dịch tối thiểu",
            bookNow: "Đặt vé ngay!",
            availableCodes: "Mã đang có",
            backToList: "Quay về danh sách",
            pageNavLabel: "Phân trang",
            prevPageAria: "Trang trước",
            nextPageAria: "Trang sau",
            copy: "Sao chép",
            copied: "Đã sao chép!",
        },
    };

    window.ui.en = shallowMerge(window.ui.en, promoUi.en);
    window.ui.vi = shallowMerge(window.ui.vi, promoUi.vi);

    // ===== 2. ITEM TRANSLATIONS (match PROMO_ITEMS ids) =====
    var itemTranslations = {
        en: {
            1: {
                title: "Christmas 2025 Super Deal",
                period: "Nov 8, 2025 – Dec 24, 2025",
                condition: "Domestic tickets from 599,000đ",
                badge: "COMING SOON",
                detail: {
                    heroTitle: "Christmas Super Deal\nFly across Southeast Asia",
                    subtitle: "Fares from 599,000đ",
                    bullets: [
                        { icon: "🎄", text: "Seasonal Christmas offer – limited quantity" },
                        { icon: "✈️", text: "Valid for domestic & Southeast Asia routes" },
                        { icon: "💳", text: "Pay online to get extra 5% off" },
                    ],
                    coupons: [{
                        title: "Save 200,000đ",
                        desc: "Orders from 1,000,000đ",
                        code: "NOEL200",
                    }, ],
                },
            },
            2: {
                title: "Tet 2026 Sale",
                period: "Oct 16, 2025 – Mar 1, 2026",
                condition: "Save as much as 1,000,000đ",
                badge: "HOT",
                detail: {
                    heroTitle: "Happy Lunar New Year",
                    subtitle: "Tet fares up to 1,000,000đ off",
                    bullets: [
                        { icon: "🧧", text: "Applies to Tet 2026 domestic flights" },
                        { icon: "🛫", text: "Flexible refunds per airline policy" },
                        { icon: "🎁", text: "Extra SkyPlan gifts for first 1,000 customers" },
                    ],
                    coupons: [{
                        title: "Family Tet",
                        desc: "Save 500,000đ on Tet tickets",
                        code: "TET500",
                    }, ],
                },
            },
            3: {
                title: "Summer is coming – Book now",
                period: "Jul 14, 2025 – Dec 31, 2025",
                condition: "Enjoy discounts of up to 50%",
                detail: {
                    heroTitle: "Book early – Fly cheaper",
                    subtitle: "Save up to 50% on round-trips",
                    bullets: [{
                            icon: "☀️",
                            text: "Book 30 days in advance for the best deal",
                        },
                        {
                            icon: "🏝️",
                            text: "Valid for both domestic & international flights",
                        },
                        { icon: "🧳", text: "Free 10kg checked baggage" },
                    ],
                    coupons: [{
                        title: "Summer Deal",
                        desc: "10% off all summer tickets",
                        code: "SUMMER10",
                    }],
                },
            },
            4: {
                title: "Trip to Ho Chi Minh City",
                period: "Oct 16, 2025 – Mar 1, 2026",
                condition: "Discounts up to 1,000,000đ",
                detail: {
                    heroTitle: "Welcome to\nHO CHI MINH CITY",
                    subtitle: "Affordable domestic fares",
                    bullets: [{
                            icon: "🛫",
                            text: "Many airlines – various time slots",
                        },
                        {
                            icon: "🎟️",
                            text: "Displayed price is final before payment",
                        },
                    ],
                    coupons: [{
                        title: "HCM Domestic",
                        desc: "Valid for to/from SGN routes",
                        code: "TPHCMDEAL",
                    }, ],
                },
            },
            5: {
                title: "Buy Early, Pay Less",
                period: "Now – Dec 31, 2025",
                condition: "Extra 200,000đ off",
                detail: {
                    heroTitle: "Buy Early, Pay Less",
                    subtitle: "Extra 200,000đ off with online payment",
                    bullets: [{
                            icon: "🕒",
                            text: "Book 45 days in advance to qualify",
                        },
                        {
                            icon: "🚀",
                            text: "New domestic routes are eligible",
                        },
                    ],
                    coupons: [{
                        title: "EARLY200",
                        desc: "Save 200,000đ on orders from 2,000,000đ",
                        code: "EARLY200",
                    }, ],
                },
            },
            6: {
                title: "MoMo Payment Offer",
                period: "Nov 1, 2025 – Jan 31, 2026",
                condition: "Save 100,000đ with MoMo",
                detail: {
                    heroTitle: "Easy checkout with MoMo",
                    subtitle: "Save up to 100,000đ on all flights",
                    bullets: [{
                            icon: "💸",
                            text: "Instant discount when paying via MoMo",
                        },
                        {
                            icon: "🎟️",
                            text: "Valid for domestic tickets too",
                        },
                        {
                            icon: "⚡",
                            text: "Daily limited redemptions",
                        },
                    ],
                    coupons: [{
                        title: "MoMo -100K",
                        desc: "Save 100,000đ on orders from 1,000,000đ",
                        code: "MOMO10",
                    }, ],
                },
            },
        },
    };

    // ===== 3. LANGUAGE STATE & HELPERS (USED BY promotion.js) =====
    function getLang() {
        var saved =
            localStorage.getItem(STORAGE_KEY) ||
            localStorage.getItem("preferredLanguage");
        var lang = saved === "en" || saved === "vi" ? saved : DEFAULT_LANG;
        return lang;
    }

    function setLang(lang) {
        if (lang !== "vi" && lang !== "en") lang = DEFAULT_LANG;
        localStorage.setItem(STORAGE_KEY, lang);
        localStorage.setItem("preferredLanguage", lang);
        document.documentElement.setAttribute("lang", lang);

        document.querySelectorAll("[data-lang]").forEach(function(el) {
            el.toggleAttribute("aria-current", el.getAttribute("data-lang") === lang);
            if (el.classList) {
                el.classList.toggle("active", el.getAttribute("data-lang") === lang);
            }
        });

        document.dispatchEvent(
            new CustomEvent("languageChanged", { detail: { lang: lang } })
        );
    }

    window.getLang = getLang;
    window.setLang = setLang;
    window.changeBlogLanguage = function(lang) {
        setLang(lang);
        if (typeof updateSelectedLanguage === "function") {
            updateSelectedLanguage(lang);
        }
    };

    function t(key, lang) {
        lang = lang || getLang();
        if (window.ui[lang] && window.ui[lang][key] != null) return window.ui[lang][key];
        if (window.ui[DEFAULT_LANG] && window.ui[DEFAULT_LANG][key] != null)
            return window.ui[DEFAULT_LANG][key];
        return key;
    }

    function deepMerge(base, patch) {
        if (!patch || typeof patch !== "object") return base;
        var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
        Object.keys(patch).forEach(function(k) {
            var bv = base && typeof base === "object" ? base[k] : undefined;
            var pv = patch[k];
            out[k] =
                bv && typeof bv === "object" && pv && typeof pv === "object" ?
                deepMerge(bv, pv) :
                pv;
        });
        return out;
    }

    function getLocalizedItem(item, lang) {
        lang = lang || getLang();
        var patch = itemTranslations[lang] && itemTranslations[lang][item.id];
        return patch ? deepMerge(item, patch) : item;
    }
    window.getLocalizedItem = getLocalizedItem;

    // ===== 4. APPLY i18n FOR PROMOTION PAGE (promotion.js gọi hàm này) =====
    function applyPromotionI18n(lang) {
        lang = lang || getLang();

        // Search
        var si = document.querySelector(".promo-search input");
        if (si) si.setAttribute("placeholder", t("searchPlaceholder", lang));
        var sb = document.querySelector(".promo-search button");
        if (sb) sb.setAttribute("aria-label", t("searchButtonAria", lang));

        // Heading
        var heading = document.querySelector(".promo-list-head h2");
        if (heading) heading.textContent = t("promotionsHeading", lang);

        // Card buttons
        document.querySelectorAll(".promo .card .btn").forEach(function(el) {
            if (el.hasAttribute("data-i18n")) return;
            el.textContent = t("viewPromotion", lang);
        });

        // Badges
        document.querySelectorAll(".promo .badge").forEach(function(el) {
            var type = el.getAttribute("data-badge");
            if (!type) {
                var raw = (el.textContent || "").toUpperCase();
                type = raw.indexOf("HOT") >= 0 ? "hot" : "coming";
                el.setAttribute("data-badge", type);
            }
            el.textContent = type === "hot" ? t("badgeHot", lang) : t("badgeComing", lang);
        });

        var labels = document.querySelectorAll(".promo .meta .label");
        labels.forEach(function(el, idx) {
            el.textContent = idx % 2 === 0 ? t("timeLabel", lang) : t("minTxnLabel", lang);
        });

        // Detail texts
        var book = document.getElementById("d-book");
        if (book && !book.hasAttribute("data-i18n")) book.textContent = t("bookNow", lang);
        var avail = document.querySelector(".promo .promo-section-title");
        if (avail && !avail.hasAttribute("data-i18n"))
            avail.textContent = t("availableCodes", lang);
        var back = document.getElementById("d-back");
        if (back && !back.hasAttribute("data-i18n"))
            back.textContent = t("backToList", lang);

        document.querySelectorAll(".promo .coupon-copy").forEach(function(btn) {
            btn.textContent = t("copy", lang);
            btn.setAttribute("aria-label", t("copy", lang));
            btn.title = t("copy", lang);
        });

        var pag = document.querySelector(".promo-pagination");
        if (pag) pag.setAttribute("aria-label", t("pageNavLabel", lang));
        var prev = document.getElementById("pg-prev");
        if (prev) prev.setAttribute("aria-label", t("prevPageAria", lang));
        var next = document.getElementById("pg-next");
        if (next) next.setAttribute("aria-label", t("nextPageAria", lang));
    }
    window.applyPromotionI18n = applyPromotionI18n;

    // ===== 5. HEADER / FOOTER i18n =====
    function applyHeaderFooterI18n(lang) {
        lang = lang || getLang();
        document.querySelectorAll("[data-i18n]").forEach(function(el) {
            var key = el.getAttribute("data-i18n");
            if (key && window.ui[lang] && window.ui[lang][key] != null) {
                el.textContent = window.ui[lang][key];
            }
        });
    }
    window.applyHeaderFooterI18n = applyHeaderFooterI18n;

    // ===== 6. BOOT & EVENTS =====
    document.addEventListener("DOMContentLoaded", function() {
        localStorage.setItem(STORAGE_KEY, DEFAULT_LANG);
        localStorage.setItem("preferredLanguage", DEFAULT_LANG);

        document.documentElement.setAttribute("lang", DEFAULT_LANG);

        applyPromotionI18n(DEFAULT_LANG);
        applyHeaderFooterI18n(DEFAULT_LANG);
    });

    document.addEventListener("languageChanged", function(e) {
        var lang = (e.detail && e.detail.lang) || getLang();
        applyPromotionI18n(lang);
        applyHeaderFooterI18n(lang);
        if (window.skyplanPromo && typeof window.skyplanPromo.rerender === "function") {
            window.skyplanPromo.rerender();
        }
    });

    document.addEventListener("componentsLoaded", function() {
        applyPromotionI18n(getLang());
        applyHeaderFooterI18n(getLang());
    });

    document.addEventListener("click", function(e) {
        var btn = e.target.closest && e.target.closest(".promo .coupon-copy");
        if (!btn) return;
        var el = document.getElementById("i18n-toast");
        if (!el) {
            el = document.createElement("div");
            el.id = "i18n-toast";
            el.setAttribute("aria-live", "polite");
            el.style.position = "fixed";
            el.style.bottom = "16px";
            el.style.left = "50%";
            el.style.transform = "translateX(-50%)";
            el.style.padding = "10px 14px";
            el.style.borderRadius = "12px";
            el.style.background = "#0A969D";
            el.style.color = "#fff";
            el.style.fontWeight = "700";
            el.style.boxShadow = "0 6px 18px rgba(0,0,0,.18)";
            el.style.zIndex = 9999;
            el.style.display = "none";
            document.body.appendChild(el);
        }
        el.textContent = t("copied");
        el.style.display = "block";
        clearTimeout(document._toast_t);
        document._toast_t = setTimeout(function() {
            el.style.display = "none";
        }, 1200);
    });

    window.initializeLanguageSelector = function() {
        var lang = typeof getLang === "function" ? getLang() : "vi";
        document.querySelectorAll("[data-lang]").forEach(function(el) {
            el.toggleAttribute("aria-current", el.getAttribute("data-lang") === lang);
            if (el.classList) {
                el.classList.toggle("active", el.getAttribute("data-lang") === lang);
            }
        });
    };

    document.addEventListener("click", function(e) {
        var btn = e.target.closest && e.target.closest("[data-lang]");
        if (!btn) return;
        var lang = btn.getAttribute("data-lang");
        if (typeof window.changeBlogLanguage === "function") {
            window.changeBlogLanguage(lang);
        } else {
            setLang(lang);
        }
    });

    window.promotionTranslations = promoUi;
    window.promotionItemTranslations = itemTranslations;
})();