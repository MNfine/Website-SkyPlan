// Common JS for SkyPlan: shared UI logic (menu, language selector, authentication, etc.)

// Mobile menu functionality
function initializeMobileMenu() {
    console.log("Initializing mobile menu...");
    // Increase timeout to ensure header is fully loaded
    setTimeout(() => {
        try {
            const menuToggle = document.querySelector('.menu-toggle');
            const navLinks = document.querySelector('.nav-links');
            
            if (!menuToggle || !navLinks) {
                console.error('Menu elements not found - will retry in 500ms');
                // Retry once more after additional delay
                setTimeout(() => {
                    try {
                        const menuToggle = document.querySelector('.menu-toggle');
                        const navLinks = document.querySelector('.nav-links');
                        if (menuToggle && navLinks) {
                            console.log("Menu elements found on retry");
                            attachMenuEventListeners(menuToggle, navLinks);
                        } else {
                            console.error('Menu elements still not found after retry');
                        }
                    } catch (error) {
                        console.error('Error initializing menu on retry:', error);
                    }
                }, 1000);
                return;
            }
            
            console.log("Menu elements found immediately");
            attachMenuEventListeners(menuToggle, navLinks);
        } catch (error) {
            console.error('Error initializing mobile menu:', error);
        }
    }, 300); // Increased to 300ms
}

// Helper function to attach menu event listeners
function attachMenuEventListeners(menuToggle, navLinks) {
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });
    
    document.addEventListener('click', function(event) {
        if (navLinks && navLinks.classList.contains('active') &&
            !event.target.closest('.nav-links') &&
            !event.target.closest('.menu-toggle')) {
            navLinks.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });
}

// Language selector functionality (calls correct change language function per page)
function initializeLanguageSelector() {
    setTimeout(() => {
        const langOptions = document.querySelectorAll('.lang-option');
        const selectedLang = document.querySelector('.selected-lang');
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        langOptions.forEach(option => {
            option.addEventListener('click', function(e) {
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
                } else if (typeof changeSearchLanguage === 'function' && (path.includes('search.html') || path.endsWith('/search'))) {
                    changeSearchLanguage(selectedLangValue);
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

// Authentication functions
/**
 * Get authentication data (user and token)
 * @returns {Object|null} User data and token if logged in, null otherwise
 */
function getUserData() {
  // Try session storage first, then local storage
  const userFromSession = sessionStorage.getItem('user');
  const tokenFromSession = sessionStorage.getItem('token');
  
  if (userFromSession && tokenFromSession) {
    return { 
      user: JSON.parse(userFromSession), 
      token: tokenFromSession 
    };
  }
  
  const userFromLocal = localStorage.getItem('user');
  const tokenFromLocal = localStorage.getItem('token');
  
  if (userFromLocal && tokenFromLocal) {
    return { 
      user: JSON.parse(userFromLocal), 
      token: tokenFromLocal 
    };
  }
  
  return null;
}

/**
 * Check if user is logged in
 * @returns {Boolean} True if logged in, false otherwise
 */
function isLoggedIn() {
  return getUserData() !== null;
}

/**
 * Get authentication token
 * @returns {String|null} Authentication token if available, null otherwise
 */
function getAuthToken() {
  const userData = getUserData();
  return userData ? userData.token : null;
}

/**
 * Log out the current user
 */
function logout() {
  // Clear both local and session storage
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('isLoggedIn');
  
  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Simple way to ensure updateHeaderForAuth is called after header loads
 * This replaces the previous complex version that was causing errors
 */
function handleHeaderLoaded() {
  // Simple timeout to ensure DOM is updated
  setTimeout(() => {
    if (typeof updateHeaderForAuth === 'function') {
      try {
        updateHeaderForAuth();
        console.log('Auth header updated successfully');
      } catch (error) {
        console.error('Error updating header auth:', error);
      }
    }
  }, 100);
}

/**
 * Update header based on login status
 * This should be called when the header is loaded
 */
function updateHeaderForAuth() {
  const userData = getUserData();
  const authLinks = document.querySelector('#authLinks');
  const userInfoElement = document.querySelector('#userInfo');
  
  if (!authLinks) return;
  
  if (userData) {
    // User is logged in
    if (authLinks) {
      authLinks.innerHTML = `
        <div class="user-menu">
          <div class="user-menu-trigger">
            <div class="user-avatar">
              ${userData.user.fullname.charAt(0).toUpperCase()}
            </div>
            <span class="user-name">${userData.user.fullname.split(' ')[0]}</span>
            <i class="fas fa-chevron-down"></i>
          </div>
          <div class="user-dropdown">
            <a href="/profile" class="dropdown-item">
              <i class="fas fa-user"></i>
              <span>Hồ sơ cá nhân</span>
            </a>
            <a href="/bookings" class="dropdown-item">
              <i class="fas fa-ticket-alt"></i>
              <span>Đặt chỗ của tôi</span>
            </a>
            <a href="#" id="logoutButton" class="dropdown-item">
              <i class="fas fa-sign-out-alt"></i>
              <span>Đăng xuất</span>
            </a>
          </div>
        </div>
      `;
      
      // Add event listener for logout button
      const logoutButton = document.getElementById('logoutButton');
      if (logoutButton) {
        logoutButton.addEventListener('click', logout);
      }
      
      // Add user menu dropdown functionality
      const userMenu = document.querySelector('.user-menu');
      const userDropdown = document.querySelector('.user-dropdown');
      
      if (userMenu && userDropdown) {
        userMenu.addEventListener('click', function(e) {
          e.stopPropagation();
          userDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', function(e) {
          if (!userMenu.contains(e.target)) {
            userDropdown.classList.remove('show');
          }
        });
      }
    }
    
    if (userInfoElement) {
      userInfoElement.textContent = userData.user.fullname;
    }
  } else {
    // User is not logged in
    // Do nothing as the login/register buttons are already in the header.html
    
    if (userInfoElement) {
      userInfoElement.textContent = 'Khách';
    }
  }
}

/**
 * Protect routes that require authentication
 * Redirect to login page if not logged in
 * @param {Array} routes - Routes that require authentication (e.g., ['/payment', '/passenger'])
 */
function protectRoutes(routes = []) {
  // Default protected routes
  const defaultProtectedRoutes = [
    '/passenger',
    '/payment',
    '/extras',
    '/confirmation',
    '/profile',
    '/bookings'
  ];
  
  // Combine default and custom routes
  const protectedRoutes = [...defaultProtectedRoutes, ...routes];
  
  // Get current path
  const currentPath = window.location.pathname;
  
  // Check if current path is protected
  const isProtected = protectedRoutes.some(route => 
    currentPath === route || currentPath.endsWith(route)
  );
  
  // If protected and not logged in, redirect to login page
  if (isProtected && !isLoggedIn()) {
    // Save current URL to redirect back after login
    const currentUrl = window.location.href;
    window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
  }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
  // Update header authentication UI
  updateHeaderForAuth();
  
  // Protect routes
  protectRoutes();
});