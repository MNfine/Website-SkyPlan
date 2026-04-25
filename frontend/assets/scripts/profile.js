document.addEventListener('DOMContentLoaded', function() {
  // Helper to get current language from localStorage
  function getCurrentLang() {
    try {
      if (typeof window.getPersistedLanguage === 'function') {
        return window.getPersistedLanguage();
      }
      var lang = (localStorage.getItem('language') || localStorage.getItem('preferredLanguage') || 'vi').toLowerCase();
      return lang === 'en' ? 'en' : 'vi';
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

  function toIsoDate(dateString) {
    if (!dateString) return null;
    var parts = dateString.split('/');
    if (parts.length !== 3) return null;
    var day = parts[0].padStart(2, '0');
    var month = parts[1].padStart(2, '0');
    var year = parts[2];
    return year + '-' + month + '-' + day;
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

  function formatPoints(value) {
    var numeric = Number(value);
    if (!isFinite(numeric)) numeric = 0;
    return new Intl.NumberFormat(getCurrentLang() === 'en' ? 'en-US' : 'vi-VN').format(numeric);
  }

  function getTierInfo(totalEarned) {
    var earned = Number(totalEarned);
    if (!isFinite(earned)) earned = 0;

    if (earned >= 3000) return { tier: 'Platinum', className: 'tier-platinum' };
    if (earned >= 1000) return { tier: 'Gold', className: 'tier-gold' };
    if (earned >= 500) return { tier: 'Silver', className: 'tier-silver' };
    return { tier: 'Registered', className: 'tier-registered' };
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
        var payload = {
          fullname: fullName,
          phone: phone,
          gender: gender,
          birth_date: toIsoDate(dob)
        };

        var updateUrl = '/api/auth/update';
        var updateRequest = (window.AuthState && typeof AuthState.fetchWithAuth === 'function')
          ? AuthState.fetchWithAuth(updateUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
          : fetch(updateUrl, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

        updateRequest
          .then(function(response) {
            return response.json().then(function(data) {
              return { ok: response.ok, data: data };
            });
          })
          .then(function(result) {
            if (!result.ok || !result.data || !result.data.success) {
              throw new Error((result.data && result.data.message) || 'Failed to update profile');
            }

            var user = result.data.user || {};
            if (inputs.fullName && user.fullname) inputs.fullName.value = user.fullname;
            if (inputs.phone && (user.phone || user.mobile)) inputs.phone.value = user.phone || user.mobile;
            if (inputs.dob && user.dob) inputs.dob.value = user.dob;
            if (inputs.gender && user.gender) inputs.gender.value = user.gender;

            var accountPhoneEl = document.getElementById('accountPhone');
            if (accountPhoneEl && (user.phone || user.mobile)) {
              accountPhoneEl.textContent = user.phone || user.mobile;
            }

            var profileNameEl = document.getElementById('profile-name');
            if (profileNameEl && user.fullname) profileNameEl.textContent = user.fullname;

            var lang = getCurrentLang();
            showToast(lang === 'vi' ? 'Thành công!' : 'Success!', getTranslation('successMessage'), 'success');
          })
          .catch(function(err) {
            var lang = getCurrentLang();
            showToast(lang === 'vi' ? 'Thất bại' : 'Failed', err.message || 'Failed to update profile', 'error');
          });
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
        const totalEarned = data.user.total_earned_sky ?? data.user.totalEarned ?? data.user.points ?? 0;
        const tierInfo = getTierInfo(totalEarned);

        if (accountEmailEl && data.user.email) accountEmailEl.textContent = data.user.email;
        if (accountPhoneEl && (data.user.phone || data.user.mobile)) accountPhoneEl.textContent = data.user.phone || data.user.mobile;
        if (memberIdEl && (data.user.memberId || data.user.id)) memberIdEl.textContent = data.user.memberId || data.user.id;
        if (memberTierEl) {
          memberTierEl.textContent = data.user.member_tier || data.user.tier || tierInfo.tier;
          memberTierEl.classList.remove('tier-registered', 'tier-silver', 'tier-gold', 'tier-platinum');
          memberTierEl.classList.add(tierInfo.className);
        }
        if (memberPointsEl) {
          const pointsLabel = getTranslation('profile.account.pointsUnit');
          memberPointsEl.innerHTML = formatPoints(totalEarned) + '<span data-i18n="profile.account.pointsUnit">' + pointsLabel + '</span>';
        }

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
  var normalizedLang = String(lang || '').toLowerCase() === 'en' ? 'en' : 'vi';
  if (typeof window.broadcastLanguageChange === 'function') {
    window.broadcastLanguageChange(normalizedLang);
  } else {
    localStorage.setItem('preferredLanguage', normalizedLang);
    localStorage.setItem('language', normalizedLang);
    document.documentElement.lang = normalizedLang;
  }
  
  // Apply profile translations first (including title)
  if (typeof applyProfileTranslations === 'function') {
    applyProfileTranslations(normalizedLang);
  }
  
  // Update language selector display
  if (typeof updateSelectedLanguage === 'function') {
    updateSelectedLanguage(normalizedLang);
  }
  
  // Apply translations to header and footer using common.js function
  if (typeof applyTranslations === 'function') {
    applyTranslations(normalizedLang);
  }
}

document.addEventListener('languageChanged', function(e) {
  var lang = (e && e.detail && (e.detail.lang || e.detail.language)) || getCurrentLang();
  if (typeof applyProfileTranslations === 'function') {
    applyProfileTranslations(lang);
  }
});
