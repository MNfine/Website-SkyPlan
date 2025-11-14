// Authentication utilities for SkyPlan frontend

// AuthState - Centralized authentication management
const AuthState = {
  // Get current authentication token
  getToken: function() {
    // Check localStorage first (for "remember me")
    let token = localStorage.getItem('authToken');
    console.debug('[AuthState.getToken] Retrieved from localStorage:', token); // Debug log
    if (token) return token;
    
    // Check sessionStorage (for current session)
    token = sessionStorage.getItem('authToken');
    console.debug('[AuthState.getToken] Retrieved from sessionStorage:', token); // Debug log
    if (token) return token;
    
    // Try other token keys
    const keys = ['accessToken', 'token', 'jwt'];
    for (const key of keys) {
      token = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (token) {
        console.debug(`[AuthState.getToken] Retrieved from key ${key}:`, token); // Debug log
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
      
      return null;
    } catch {
      return null;
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: function() {
    const token = this.getToken();
    console.debug('[AuthState.getToken]', token); // Debug log for token retrieval
    return !!token;
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
    if (!this.isAuthenticated() || !this.isTokenValid()) {
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
  
  if (user && AuthState.isAuthenticated()) {
    console.log('User authenticated:', user); // Debug log
    
    // Show user info
    userNameElements.forEach(el => {
      el.textContent = user.fullname || user.email || 'User';
    });
    
    // Hide auth buttons, show user menu
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) userMenu.style.display = 'block';
    
    // Apply translations to user dropdown after showing it
    if (typeof applyTranslations === 'function') {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      applyTranslations(lang);
    }
    
  } else {
    console.log('User not authenticated'); // Debug log
    
    // Show auth buttons, hide user menu  
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

// Setup logout buttons
function setupLogoutButtons() {
  document.addEventListener('click', function(e) {
    if (e.target.matches('.logout-btn') || e.target.closest('.logout-btn')) {
      e.preventDefault();
      console.log('Logout button clicked'); // Debug log
      AuthState.logout();
    }
  });
}

// Auto-update header on page load and auth changes
document.addEventListener('DOMContentLoaded', function() {
  // Delay to ensure header is loaded
  setTimeout(() => {
    updateHeaderUserInfo();
    setupLogoutButtons();
  }, 500);
});

// Listen for storage changes (cross-tab auth sync)
window.addEventListener('storage', function(e) {
  if (e.key === 'authToken' || e.key === 'currentUser') {
    updateHeaderUserInfo();
  }
});

// Make AuthState globally available
window.AuthState = AuthState;
window.updateHeaderUserInfo = updateHeaderUserInfo;