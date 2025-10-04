// Common JS for SkyPlan: shared UI logic (menu, language selector, etc.)

// Mobile menu functionality
function initializeMobileMenu() {
    setTimeout(() => {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', function (e) {
                e.preventDefault();
                menuToggle.classList.toggle('active');
                navLinks.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
            });
        } else {
            console.error('Menu elements not found');
        }
        document.addEventListener('click', function (event) {
            if (navLinks && navLinks.classList.contains('active') &&
                !event.target.closest('.nav-links') &&
                !event.target.closest('.menu-toggle')) {
                navLinks.classList.remove('active');
                if (menuToggle) menuToggle.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        });
    }, 500);
}

// Language selector functionality (calls correct change language function per page)
function initializeLanguageSelector() {
    setTimeout(() => {
        const langOptions = document.querySelectorAll('.lang-option');
        const selectedLang = document.querySelector('.selected-lang');
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        langOptions.forEach(option => {
            option.addEventListener('click', function (e) {
                e.preventDefault();
                const selectedLangValue = this.getAttribute('data-lang');
                langOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                // Change language: use correct function for each page (support both .html and backend route)
                const path = window.location.pathname;
                if (typeof changeOverviewLanguage === 'function' && (path.includes('overview.html') || path.endsWith('/overview'))) {
                    changeOverviewLanguage(selectedLangValue);
                } else if (typeof changePaymentLanguage === 'function' && (path.includes('payment.html') || path.endsWith('/payment'))) {
                    changePaymentLanguage(selectedLangValue);
                } else if (typeof changeSeatLanguage === 'function' && (path.includes('seat.html') || path.endsWith('/seat'))) {
                    changeSeatLanguage(selectedLangValue);
                } else if (typeof changeFareLanguage === 'function' && (path.includes('fare.html') || path.endsWith('/fare'))) {
                    changeFareLanguage(selectedLangValue);
                } else if (typeof changeLanguage === 'function') {
                    changeLanguage(selectedLangValue);
                }
                updateSelectedLanguage(selectedLangValue);
            });
        });
        langOptions.forEach(opt => {
            if (opt.getAttribute('data-lang') === currentLang) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
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
        searchBtn.addEventListener('click', function (event) {
            // Allow form submission without interruption
        });
    }
}

// Smooth scrolling for anchor links
function enableSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}
