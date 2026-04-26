// Authentication utilities for SkyPlan frontend

function getPersistedLanguage() {
  const prefRaw = (localStorage.getItem('preferredLanguage') || '').toLowerCase();
  const langRaw = (localStorage.getItem('language') || '').toLowerCase();
  const pref = prefRaw === 'en' ? 'en' : (prefRaw === 'vi' ? 'vi' : '');
  const lang = langRaw === 'en' ? 'en' : (langRaw === 'vi' ? 'vi' : '');
  const chosen = lang || pref || ((document.documentElement.lang || '').toLowerCase() === 'en' ? 'en' : 'vi');

  try {
    if (pref !== chosen || lang !== chosen) {
      localStorage.setItem('preferredLanguage', chosen);
      localStorage.setItem('language', chosen);
    }
  } catch (_) {}

  return chosen;
}

// AuthState - Centralized authentication management
const AuthState = {
  // Get current authentication token
  getToken: function() {
    // Normalize token values so strings like 'null' / 'undefined' / '' are treated as no-token
    const normalize = (v) => {
      if (!v && v !== 0) return null;
      try {
        if (typeof v === 'string') {
          const t = v.trim();
          if (t === '' || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return null;
          return t;
        }
        return v;
      } catch (_) { return null; }
    };

    // Check localStorage first (for "remember me")
    let token = normalize(localStorage.getItem('authToken'));
    console.debug('[AuthState.getToken] Retrieved from localStorage:', token);
    if (token) return token;

    // Check sessionStorage (for current session)
    token = normalize(sessionStorage.getItem('authToken'));
    console.debug('[AuthState.getToken] Retrieved from sessionStorage:', token);
    if (token) return token;

    // Try other token keys (legacy)
    const keys = ['accessToken', 'token', 'jwt'];
    for (const key of keys) {
      token = normalize(localStorage.getItem(key)) || normalize(sessionStorage.getItem(key));
      if (token) {
        // Heal legacy token keys so all pages read a canonical key.
        try {
          const fromLocal = normalize(localStorage.getItem(key));
          const targetStorage = fromLocal ? localStorage : sessionStorage;
          if (!normalize(localStorage.getItem('authToken')) && !normalize(sessionStorage.getItem('authToken'))) {
            targetStorage.setItem('authToken', token);
          }
        } catch (_) {}
        console.debug(`[AuthState.getToken] Retrieved from key ${key}:`, token);
        return token;
      }
    }

    return null;
  },
  
  // Get current user data
  getUser: function() {
    try {
      let user = localStorage.getItem('currentUser');
      if (user) return JSON.parse(user);
      
      user = sessionStorage.getItem('currentUser');
      if (user) return JSON.parse(user);

      // Legacy key fallback + canonical healing
      const legacyLocal = localStorage.getItem('user');
      if (legacyLocal) {
        localStorage.setItem('currentUser', legacyLocal);
        return JSON.parse(legacyLocal);
      }
      const legacySession = sessionStorage.getItem('user');
      if (legacySession) {
        sessionStorage.setItem('currentUser', legacySession);
        return JSON.parse(legacySession);
      }
      
      return null;
    } catch {
      return null;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: function() {
    const token = this.getToken();
    console.debug('[AuthState.isAuthenticated] token:', token);
    if (!token) return false;
    // Prefer authoritative token validity check when available
    try {
      if (typeof this.isTokenValid === 'function' && !this.isTokenValid()) {
        console.debug('[AuthState.isAuthenticated] token appears invalid by isTokenValid check');
        return false;
      }
    } catch (e) {
      console.debug('[AuthState.isAuthenticated] isTokenValid threw', e);
    }
    return true;
  },
  
  // Set authentication data
  setAuth: function(token, user, remember = true) { // Default to `localStorage`
    const storage = remember ? localStorage : sessionStorage;
    
    storage.setItem('authToken', token);
    storage.setItem('currentUser', JSON.stringify(user));
    
    // Clear from other storage
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('authToken');
    otherStorage.removeItem('currentUser');
    
    // Emit login event for wallet button UI to update
    window.dispatchEvent(new CustomEvent('auth-login', { detail: { user, remember } }));
  },
  
  // Clear authentication data
  clearAuth: function() {
    // Clear from both storages
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    
    // Clear other possible token keys
    const keys = ['accessToken', 'token', 'jwt'];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },
  
  // Logout user
  logout: function() {
    this.clearAuth();
    
    // Clear any booking data (optional, depends on requirements)
    try {
      localStorage.removeItem('currentPassenger');
      localStorage.removeItem('selectedSeats');
      localStorage.removeItem('skyplan_extras_v2');
      localStorage.removeItem('bookingTotal');
      localStorage.removeItem('skyplan_trip_selection');
    } catch {}
    
    // Emit logout event for wallet button UI to update
    window.dispatchEvent(new CustomEvent('auth-logout'));
    
    // Redirect to login page
    window.location.href = 'login.html';
  },
  
  // Check token validity (simple check - real implementation should verify with backend)
  isTokenValid: function() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Simple JWT decode to check expiration (if using JWT)
      if (token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
          return false;
        }
      }
      return true;
    } catch {
      return true; // Assume valid if can't decode
    }
  },
  
  // Redirect to login if not authenticated
  requireAuth: function(returnUrl = null) {
    // Do not hard-fail on client-side exp parsing; backend 401 is authoritative.
    if (!this.isAuthenticated()) {
      const url = returnUrl || window.location.pathname + window.location.search;
      this.clearAuth();
      window.location.href = `login.html?returnUrl=${encodeURIComponent(url)}`;
      return false;
    }
    return true;
  },
  
  // Make authenticated API request
  fetchWithAuth: function(url, options = {}) {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    return fetch(url, {
      ...options,
      headers
    }).then(response => {
      // Auto-logout on 401
      if (response.status === 401) {
        this.clearAuth();
        window.location.href = 'login.html?message=session-expired';
        throw new Error('Authentication expired');
      }
      return response;
    });
  }
};

// Header user info update
function updateHeaderUserInfo() {
  const user = AuthState.getUser();
  
  // Updated selectors to match new HTML structure
  const userNameElements = document.querySelectorAll('.user-name');
  const authButtons = document.querySelector('.auth-buttons');
  const userMenu = document.querySelector('.user-menu');
  
  console.debug('[AuthState.getUser]', AuthState.getUser());
  console.debug('[AuthState.isAuthenticated]', AuthState.isAuthenticated());
  console.debug('[userNameElements]', userNameElements);
  console.debug('[authButtons]', authButtons);
  console.debug('[userMenu]', userMenu);
  
  const hasValidUser = user && typeof user === 'object' && (user.fullname || user.email || user.id || user.username);
  if (hasValidUser && AuthState.isAuthenticated()) {
    console.log('User authenticated:', user); // Debug log

    // Show user info
    userNameElements.forEach(el => {
      el.textContent = user.fullname || user.email || user.username || 'User';
    });

    // Hide auth buttons, show user menu (mark as authenticated)
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) {
      userMenu.classList.add('authenticated');
      userMenu.style.display = '';
    }

    // Keep nav-links-main visible in all states so header links are always accessible
    const navLinksMain = document.querySelector('.nav-links-main');
    if (navLinksMain) {
      navLinksMain.style.display = 'flex';
    }

    // Apply translations to user dropdown after showing it
    if (typeof applyTranslations === 'function') {
      const lang = getPersistedLanguage();
      applyTranslations(lang);
    }

  } else {
    console.log('User not authenticated or invalid user object'); // Debug log

    // If token exists but user object is missing or invalid, clear auth to avoid inconsistent UI
    if (AuthState.isAuthenticated() && !hasValidUser) {
      console.debug('[updateHeaderUserInfo] Clearing stale auth because token present but user missing or malformed');
      try { AuthState.clearAuth(); } catch (e) { console.debug('clearAuth failed', e); }
    }

    // Show auth buttons, hide user menu (remove authenticated mark)
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) {
      userMenu.classList.remove('authenticated');
      userMenu.style.display = '';
    }

    // Show nav-links-main when logged out
    const navLinksMain = document.querySelector('.nav-links-main');
    if (navLinksMain) navLinksMain.style.display = 'flex';
  }
}

// Setup logout buttons
function setupLogoutButtons() {
  if (document.body && document.body.dataset.logoutButtonsBound === 'true') {
    return;
  }

  document.addEventListener('click', function(e) {
    if (e.target.matches('.logout-btn') || e.target.closest('.logout-btn')) {
      e.preventDefault();
      console.log('Logout button clicked'); // Debug log
      AuthState.logout();
    }
  });

  if (document.body) {
    document.body.dataset.logoutButtonsBound = 'true';
  }
}

// Auto-update header on page load and auth changes
document.addEventListener('DOMContentLoaded', function() {
  // Delay to ensure header is loaded
  setTimeout(() => {
    updateHeaderUserInfo();
    setupLogoutButtons();
  }, 500);
});

// Re-sync auth UI after pages that inject header asynchronously dispatch this event
document.addEventListener('header-loaded', function() {
  setTimeout(() => {
    updateHeaderUserInfo();
    setupLogoutButtons();
  }, 0);
});

// Listen for storage changes (cross-tab auth sync)
window.addEventListener('storage', function(e) {
  if (e.key === 'authToken' || e.key === 'currentUser') {
    updateHeaderUserInfo();
  }
});

// Keep nav-links-main visible on resize as well
window.addEventListener('resize', function() {
  const user = AuthState.getUser();
  const navLinksMain = document.querySelector('.nav-links-main');
  
  if (user && AuthState.isAuthenticated() && navLinksMain) {
    navLinksMain.style.display = 'flex';
  }
});

// Make AuthState globally available
window.AuthState = AuthState;
window.updateHeaderUserInfo = updateHeaderUserInfo;