document.addEventListener('DOMContentLoaded', function() {
  // Helper to get current language from localStorage
  function getCurrentLang() {
    try { 
      return localStorage.getItem('preferredLanguage') || 'vi'; 
    } catch { 
      return 'vi'; 
    }
  }
  
  // Apply translations on load
  if (typeof applyProfileTranslations === 'function') {
    applyProfileTranslations(getCurrentLang());
  }

  // Get translation by key for current language
  function getTranslation(key) {
    var lang = getCurrentLang();
    var translations = window.profileTranslations || {};
    return (translations[lang] && translations[lang][key]) || key;
  }

  // Toast notification with auto-hide
  function showToast(title, message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'success');
    toast.innerHTML = 
      '<div class="toast-icon">' + (type === 'error' ? '✕' : '✓') + '</div>' +
      '<div class="toast-content">' +
        '<div class="toast-title">' + title + '</div>' +
        (message ? '<div class="toast-message">' + message + '</div>' : '') +
      '</div>' +
      '<button class="toast-close">×</button>';
    
    document.body.appendChild(toast);
    setTimeout(function() { toast.classList.add('show'); }, 10);
    
    toast.querySelector('.toast-close').addEventListener('click', function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    });
    
    setTimeout(function() {
      if (toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
      }
    }, 3000);
  }

  // Validation functions
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    return /^(\+84|0)[0-9]{9,10}$/.test(phone.replace(/\s/g, ''));
  }

  function validateDate(dateString) {
    if (!dateString) return false;
    
    var parts = dateString.split('/');
    if (parts.length !== 3) return false;
    
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    
    var date = new Date(year, month - 1, day);
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return false;
    }
    
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Error handling functions
  function showError(fieldId, message) {
    var field = document.getElementById(fieldId);
    var errorDiv = document.getElementById(fieldId + 'Error');
    if (field && errorDiv) {
      field.classList.add('error');
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  function clearError(fieldId) {
    var field = document.getElementById(fieldId);
    var errorDiv = document.getElementById(fieldId + 'Error');
    if (field && errorDiv) {
      field.classList.remove('error');
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
  }

  function clearAllErrors() {
    ['fullName', 'email', 'phone', 'dob', 'gender'].forEach(clearError);
  }

  // Language selector handler
  setTimeout(function() {
    document.querySelectorAll('.lang-option').forEach(function(option) {
      option.addEventListener('click', function() {
        var lang = this.getAttribute('data-lang');
        if (lang) changeProfileLanguage(lang);
      });
    });
  }, 500);

  // DOM references
  var inputs = {
    fullName: document.getElementById('fullName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    dob: document.getElementById('dob'),
    gender: document.getElementById('gender')
  };

  // Input event handlers
  if (inputs.fullName) inputs.fullName.addEventListener('input', function() { clearError('fullName'); });
  if (inputs.email) inputs.email.addEventListener('input', function() { clearError('email'); });
  
  if (inputs.phone) {
    inputs.phone.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '');
      clearError('phone');
    });
  }
  
  if (inputs.dob) {
    inputs.dob.addEventListener('input', function(e) {
      var value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
      if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5);
      if (value.length > 10) value = value.slice(0, 10);
      e.target.value = value;
      clearError('dob');
    });
  }
  
  if (inputs.gender) inputs.gender.addEventListener('change', function() { clearError('gender'); });

  // Sidebar menu navigation
  var menu = document.getElementById('profileMenu');
  if (menu) {
    menu.addEventListener('click', function(e) {
      var item = e.target.closest('.menu-item');
      if (!item || item.getAttribute('data-disabled') === '1') return;
      var targetSel = item.getAttribute('data-target');
      if (!targetSel) return;
      
      menu.querySelectorAll('.menu-item').forEach(function(m) { m.classList.remove('active'); });
      item.classList.add('active');
      
      document.querySelectorAll('.profile-content .card').forEach(function(card) { card.hidden = true; });
      var target = document.querySelector(targetSel);
      if (target) target.hidden = false;
    });
  }

  // Form submission handler
  var form = document.querySelector('.profile-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      clearAllErrors();
      
      var isValid = true;
      var fullName = inputs.fullName ? inputs.fullName.value.trim() : '';
      var email = inputs.email ? inputs.email.value.trim() : '';
      var phone = inputs.phone ? inputs.phone.value.trim() : '';
      var dob = inputs.dob ? inputs.dob.value : '';
      var gender = inputs.gender ? inputs.gender.value : '';
      
      // Validate fields
      if (!fullName) {
        showError('fullName', getTranslation('error.requiredName'));
        isValid = false;
      } else if (fullName.length < 2) {
        showError('fullName', getTranslation('error.nameMinLength'));
        isValid = false;
      }
      
      if (!email) {
        showError('email', getTranslation('error.requiredEmail'));
        isValid = false;
      } else if (!validateEmail(email)) {
        showError('email', getTranslation('error.invalidEmail'));
        isValid = false;
      }
      
      if (!phone) {
        showError('phone', getTranslation('error.requiredPhone'));
        isValid = false;
      } else if (!validatePhone(phone)) {
        showError('phone', getTranslation('error.phoneFormat'));
        isValid = false;
      }
      
      if (!dob) {
        showError('dob', getTranslation('error.requiredDob'));
        isValid = false;
      } else if (!validateDate(dob)) {
        showError('dob', getTranslation('error.invalidDate'));
        isValid = false;
      }
      
      if (!gender) {
        showError('gender', getTranslation('error.requiredGender'));
        isValid = false;
      }
      
      if (isValid) {
        var lang = getCurrentLang();
        showToast(lang === 'vi' ? 'Thành công!' : 'Success!', getTranslation('successMessage'), 'success');
      }
    });
  }
  
  window.profileGetCurrentLang = getCurrentLang;

  // --- ENFORCE AUTH ---
  // Use AuthState (supports localStorage & sessionStorage) instead of reading localStorage directly
  if (window.AuthState && typeof AuthState.requireAuth === 'function') {
    const ok = AuthState.requireAuth(window.location.pathname + window.location.search);
    if (!ok) return; // requireAuth will redirect if not authenticated
  }

  // Retrieve token via AuthState.getToken to support sessionStorage tokens as well
  const token = (window.AuthState && typeof AuthState.getToken === 'function')
    ? AuthState.getToken()
    : (localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

  if (!token) {
    // Fallback: redirect to login
    alert('You need to log in to view your profile.');
    window.location.href = '/login.html';
    return;
  }

  // Use centralized fetchWithAuth when available so 401 handling is consistent
  const profileUrl = (typeof window !== 'undefined' && window.location && window.location.pathname && window.location.pathname.startsWith('/'))
    ? '/api/auth/profile'
    : '/api/auth/profile';

  const doFetch = (window.AuthState && typeof AuthState.fetchWithAuth === 'function')
    ? AuthState.fetchWithAuth(profileUrl, { method: 'GET' })
    : fetch(profileUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });

  doFetch
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch profile information.');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.success) {
        console.debug('[profile] profile data', data.user);
        // Fill account display fields if present
        const accountEmailEl = document.getElementById('accountEmail');
        const accountPhoneEl = document.getElementById('accountPhone');
        const memberIdEl = document.getElementById('memberId');
        const memberTierEl = document.getElementById('memberTier');
        const memberPointsEl = document.getElementById('memberPoints');

        if (accountEmailEl && data.user.email) accountEmailEl.textContent = data.user.email;
        if (accountPhoneEl && (data.user.phone || data.user.mobile)) accountPhoneEl.textContent = data.user.phone || data.user.mobile;
        if (memberIdEl && (data.user.memberId || data.user.id)) memberIdEl.textContent = data.user.memberId || data.user.id;
        if (memberTierEl && data.user.tier) memberTierEl.textContent = data.user.tier;
        if (memberPointsEl && (data.user.points || data.user.loyaltyPoints)) memberPointsEl.textContent = (data.user.points || data.user.loyaltyPoints) + ' ' + (memberPointsEl.querySelector('[data-i18n]') ? '' : '');

        // Fill legacy/profile-name and profile-email if present (some templates use these ids)
        const profileNameEl = document.getElementById('profile-name');
        const profileEmailEl = document.getElementById('profile-email');
        if (profileNameEl && data.user.fullname) profileNameEl.textContent = data.user.fullname;
        if (profileEmailEl && data.user.email) profileEmailEl.textContent = data.user.email;

        // Populate form inputs if present
        try {
          const fullNameInput = document.getElementById('fullName');
          const emailInput = document.getElementById('email');
          const phoneInput = document.getElementById('phone');
          const dobInput = document.getElementById('dob');
          const genderSelect = document.getElementById('gender');

          if (fullNameInput && data.user.fullname) fullNameInput.value = data.user.fullname;
          if (emailInput && data.user.email) emailInput.value = data.user.email;
          if (phoneInput && (data.user.phone || data.user.mobile)) phoneInput.value = data.user.phone || data.user.mobile;
          if (dobInput && (data.user.dob || data.user.dateOfBirth)) dobInput.value = data.user.dob || data.user.dateOfBirth;
          if (genderSelect && data.user.gender) genderSelect.value = data.user.gender;
        } catch (e) {
          console.warn('[profile] failed to populate form inputs', e);
        }

      } else {
        alert((data && data.message) || 'Failed to load profile.');
      }
    })
    .catch(error => {
      console.error('Error fetching profile:', error);
      alert('An error occurred while loading your profile.');
    });
});

// Language switcher for profile page
function changeProfileLanguage(lang) {
  localStorage.setItem('preferredLanguage', lang);
  document.documentElement.lang = lang;
  
  // Apply profile translations first (including title)
  if (typeof applyProfileTranslations === 'function') {
    applyProfileTranslations(lang);
  }
  
  // Update language selector display
  if (typeof updateSelectedLanguage === 'function') {
    updateSelectedLanguage(lang);
  }
  
  // Apply translations to header and footer using common.js function
  if (typeof applyTranslations === 'function') {
    applyTranslations(lang);
  }
}
