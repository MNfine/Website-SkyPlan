document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Helper to get translated text
  function getTranslation(key) {
    try {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      
      if (window.translations && window.translations[lang]) {
        // Try flat key first (e.g., "register.errorFullNameRequired")
        if (window.translations[lang][key]) {
          return window.translations[lang][key];
        }
        
        // Try nested path (e.g., register -> errorFullNameRequired)
        const keys = key.split('.');
        let value = window.translations[lang];
        for (const k of keys) {
          if (value && typeof value === 'object') {
            value = value[k];
          } else {
            break;
          }
        }
        if (typeof value === 'string') {
          return value;
        }
      }
    } catch (e) {
      console.error('Translation error:', e);
    }
    
    // Fallback - return English if lang is 'en', Vietnamese otherwise
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    
    const fallbacksEn = {
      'register.successToast': 'Registration successful!',
      'register.googleInfoToast': 'Google sign up feature is under development',
      'register.facebookInfoToast': 'Facebook sign up feature is under development',
      'register.errorFullNameRequired': 'Please enter your full name',
      'register.errorFullNameInvalid': 'Full name must have at least 2 words, each word at least 2 characters',
      'register.errorEmailRequired': 'Please enter your email',
      'register.errorEmailInvalid': 'Invalid email address',
      'register.errorPhoneRequired': 'Please enter your phone number',
      'register.errorPhoneInvalid': 'Invalid phone number (10-11 digits, starting with 0)',
      'register.errorPasswordRequired': 'Please enter your password',
      'register.errorPasswordInvalid': 'Password must be at least 8 characters, including uppercase, lowercase and number',
      'register.errorConfirmPasswordRequired': 'Please confirm your password',
      'register.errorConfirmPasswordMismatch': 'Passwords do not match',
      'register.errorAgreeTerms': 'Please agree to the terms and privacy policy',
    };
    
    const fallbacksVi = {
      'register.successToast': 'Đăng ký thành công!',
      'register.googleInfoToast': 'Tính năng đăng ký với Google đang được phát triển',
      'register.facebookInfoToast': 'Tính năng đăng ký với Facebook đang được phát triển',
      'register.errorFullNameRequired': 'Vui lòng nhập họ và tên',
      'register.errorFullNameInvalid': 'Họ và tên phải có ít nhất 2 từ, mỗi từ ít nhất 2 ký tự',
      'register.errorEmailRequired': 'Vui lòng nhập email',
      'register.errorEmailInvalid': 'Email không hợp lệ',
      'register.errorPhoneRequired': 'Vui lòng nhập số điện thoại',
      'register.errorPhoneInvalid': 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)',
      'register.errorPasswordRequired': 'Vui lòng nhập mật khẩu',
      'register.errorPasswordInvalid': 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số',
      'register.errorConfirmPasswordRequired': 'Vui lòng xác nhận mật khẩu',
      'register.errorConfirmPasswordMismatch': 'Mật khẩu không trùng khớp',
      'register.errorAgreeTerms': 'Vui lòng đồng ý với điều khoản và chính sách',
    };
    
    const fallbacks = lang === 'en' ? fallbacksEn : fallbacksVi;
    return fallbacks[key] || '';
  }

  // DOM references
  const form = document.getElementById('registerForm');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const agreeTermsCheckbox = document.getElementById('agreeTerms');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeIconConfirm = document.getElementById('eyeIconConfirm');
  const btnGoogle = document.getElementById('btnGoogle');
  const btnFacebook = document.getElementById('btnFacebook');
  const backButton = document.getElementById('backButton');

  // Helper functions
  const getErrorEl = (fieldId) => document.getElementById(fieldId + 'Error');

  function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorDiv = getErrorEl(fieldId);

    if (input) {
      input.classList.remove('error');
      input.setAttribute('aria-invalid', 'false');
    }
    if (errorDiv) {
      errorDiv.classList.remove('show');
      errorDiv.textContent = '';
    }
  }

  function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorDiv = getErrorEl(fieldId);

    if (input) {
      input.classList.add('error');
      input.setAttribute('aria-invalid', 'true');
    }
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }

  /* Validation functions */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhone(value) {
    // Vietnamese phone number validation 
    return /^0[0-9]{9,10}$/.test(value);
  }

  function isValidFullName(value) {
    // At least 2 words, each word at least 2 characters
    const words = value.trim().split(/\s+/);
    return words.length >= 2 && words.every(word => word.length >= 2);
  }

  function isValidPassword(value) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(value);
  }

  /* Toggle password visibility */
  if (togglePasswordBtn && passwordInput && eyeIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';

      eyeIcon.innerHTML = isVisible
        ? '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>'
        : '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line>';
    });
  }

  if (toggleConfirmPasswordBtn && confirmPasswordInput && eyeIconConfirm) {
    toggleConfirmPasswordBtn.addEventListener('click', () => {
      const isVisible = confirmPasswordInput.type === 'text';
      confirmPasswordInput.type = isVisible ? 'password' : 'text';

      eyeIconConfirm.innerHTML = isVisible
        ? '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>'
        : '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line>';
    });
  }

  /* Form submit */
  if (form && fullNameInput && emailInput && phoneInput && passwordInput && confirmPasswordInput && agreeTermsCheckbox) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear all errors
      clearError('fullName');
      clearError('email');
      clearError('phone');
      clearError('password');
      clearError('confirmPassword');
      clearError('agreeTerms');

      const fullName = fullNameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const agreeTerms = agreeTermsCheckbox.checked;

      let hasError = false;

      // Full name validation
      if (!fullName) {
        showError('fullName', getTranslation('register.errorFullNameRequired'));
        hasError = true;
      } else if (!isValidFullName(fullName)) {
        showError('fullName', getTranslation('register.errorFullNameInvalid'));
        hasError = true;
      }

      // Email validation
      if (!email) {
        showError('email', getTranslation('register.errorEmailRequired'));
        hasError = true;
      } else if (!isValidEmail(email)) {
        showError('email', getTranslation('register.errorEmailInvalid'));
        hasError = true;
      }

      // Phone validation
      if (!phone) {
        showError('phone', getTranslation('register.errorPhoneRequired'));
        hasError = true;
      } else if (!isValidPhone(phone)) {
        showError('phone', getTranslation('register.errorPhoneInvalid'));
        hasError = true;
      }

      // Password validation
      if (!password) {
        showError('password', getTranslation('register.errorPasswordRequired'));
        hasError = true;
      } else if (!isValidPassword(password)) {
        showError('password', getTranslation('register.errorPasswordInvalid'));
        hasError = true;
      }

      // Confirm password validation
      if (!confirmPassword) {
        showError('confirmPassword', getTranslation('register.errorConfirmPasswordRequired'));
        hasError = true;
      } else if (password !== confirmPassword) {
        showError('confirmPassword', getTranslation('register.errorConfirmPasswordMismatch'));
        hasError = true;
      }

      // If there are errors in the fields above, don't check terms yet
      if (hasError) return;

      // Terms validation - only check if all other fields are valid
      if (!agreeTerms) {
        showError('agreeTerms', getTranslation('register.errorAgreeTerms'));
        return;
      }

      // NOTE: In production, send registration data to backend API
      // Example: fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ fullName, email, phone, password }) })
      
      // Show success toast notification
      showToast(getTranslation('register.successToast'), {
        type: 'success',
        duration: 2000,
        dismissible: true
      });

      // Redirect to login page after successful registration
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    });
  }

  /* Inline validation */
  if (fullNameInput) {
    fullNameInput.addEventListener('input', () => clearError('fullName'));
  }
  if (emailInput) {
    emailInput.addEventListener('input', () => clearError('email'));
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', () => clearError('phone'));
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      clearError('password');
      // Also clear confirm password error if password changes
      clearError('confirmPassword');
    });
  }
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', () => clearError('confirmPassword'));
  }
  if (agreeTermsCheckbox) {
    agreeTermsCheckbox.addEventListener('change', () => clearError('agreeTerms'));
  }

  /* Social buttons */
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      showToast(getTranslation('register.googleInfoToast'), {
        type: 'info',
        duration: 3000
      });
      // NOTE: Implement Google OAuth registration here
    });
  }

  if (btnFacebook) {
    btnFacebook.addEventListener('click', () => {
      showToast(getTranslation('register.facebookInfoToast'), {
        type: 'info',
        duration: 3000
      });
      // NOTE: Implement Facebook OAuth registration here
    });
  }

  /* Back button functionality */
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Navigate to home page (index.html)
      window.location.href = './index.html';
    });
  }

  /* Phone input formatting */
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, ''); 
      if (value.length > 11) {
        value = value.slice(0, 11); // Limit to 11 digits
      }
      e.target.value = value;
    });
  }

  /* Clear all error messages when language is changed */
  const langToggle = document.getElementById('langToggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      // Clear all visible errors when switching language
      setTimeout(() => {
        clearError('fullName');
        clearError('email');
        clearError('phone');
        clearError('password');
        clearError('confirmPassword');
        clearError('agreeTerms');
      }, 100);
    });
  }
});
