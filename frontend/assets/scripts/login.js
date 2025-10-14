document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* DOM refs */
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const eyeIcon = document.getElementById('eyeIcon');
  const btnGoogle = document.getElementById('btnGoogle');
  const btnFacebook = document.getElementById('btnFacebook');
  const backButton = document.getElementById('backButton');

  /* Helpers */
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

  /* Email validation */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  /* Custom notification toast updated styling */
  function showCustomNotification(message) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    toast.style.color = '#333';
    toast.style.padding = '16px 24px';
    toast.style.borderRadius = '10px';
    toast.style.border = '1px solid #ddd';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.fontFamily = 'Helvetica, Arial, sans-serif';
    toast.style.fontSize = '16px';
    toast.style.zIndex = '9999';
    toast.style.opacity = '1';
    toast.style.transition = 'opacity 0.6s ease';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    setTimeout(() => { document.body.removeChild(toast); }, 3600);
  }

  /* Get current language */
  function getCurrentLanguage() {
    const activeLangElem = document.querySelector('.lang-option.active');
    return activeLangElem ? activeLangElem.getAttribute('data-lang') : 'vi';
  }

  /* Form submit */
  if (form && emailInput && passwordInput) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      clearError('email');
      clearError('password');

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const remember = !!(rememberCheckbox && rememberCheckbox.checked);

      let hasError = false;

      if (!email) {
        showError('email', 'Vui lòng nhập email');
        hasError = true;
      } else if (!isValidEmail(email)) {
        showError('email', 'Email không hợp lệ');
        hasError = true;
      }

      if (!password) {
        showError('password', 'Vui lòng nhập mật khẩu');
        hasError = true;
      }

      if (hasError) return;

      console.log('Login successful:', { email, password, remember });
      const lang = getCurrentLanguage();
      lang === 'en' ? showCustomNotification('Login successful!') : showCustomNotification('Đăng nhập thành công!');
    });
  }

  /* Inline validation */
  if (emailInput) {
    emailInput.addEventListener('input', () => clearError('email'));
  }
  if (passwordInput) {
    passwordInput.addEventListener('input', () => clearError('password'));
  }

  /* Social buttons */
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      const langGoogle = getCurrentLanguage();
      langGoogle === 'en' ? showCustomNotification('Login with Google') : showCustomNotification('Đăng nhập với Google');
      console.log('Google login clicked');
    });
  }

  if (btnFacebook) {
    btnFacebook.addEventListener('click', () => {
      const langFb = getCurrentLanguage();
      langFb === 'en' ? showCustomNotification('Login with Facebook') : showCustomNotification('Đăng nhập với Facebook');
      console.log('Facebook login clicked');
    });
  }

  /* Back button functionality */
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Navigate to home page (index.html)
      window.location.href = './index.html';
    });
  }
});