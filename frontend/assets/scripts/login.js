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
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;
  
  // API endpoint
  const API_URL = '/api/auth';
  
  // Check if user is already logged in
  checkLoginStatus();

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
  
  /* User authentication functions */
  function saveUserData(data, remember = false) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(data.user));
    storage.setItem('token', data.token);
    storage.setItem('isLoggedIn', 'true');
  }
  
  function clearUserData() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('isLoggedIn');
  }
  
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
  
  function checkLoginStatus() {
    const userData = getUserData();
    if (userData) {
      console.log('User is already logged in', userData.user);
      
      // Redirect to home page if on login page
      if (window.location.pathname.includes('login') || window.location.pathname === '/login') {
        window.location.href = '/';
      }
    }
  }
  
  async function performLogin(email, password, remember) {
    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner"></span> Đang xử lý...';
      }
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại');
      }
      
      // Save user data
      saveUserData(data, remember);
      
      // Redirect to home or previous page
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/';
      window.location.href = redirect;
      
    } catch (error) {
      showError('password', error.message || 'Đăng nhập thất bại, vui lòng thử lại');
      console.error('Login error:', error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        const loginBtnText = document.documentElement.lang === 'en' ? 'Login' : 'Đăng nhập';
        submitButton.textContent = loginBtnText;
      }
    }
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

      // Call API to login
      performLogin(email, password, remember);
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
      alert('Đăng nhập với Google');
      console.log('Google login clicked');
    });
  }

  if (btnFacebook) {
    btnFacebook.addEventListener('click', () => {
      alert('Đăng nhập với Facebook');
      console.log('Facebook login clicked');
    });
  }

  /* Back button functionality */
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Navigate to home page (index.html)
      window.location.href = '/';
    });
  }
});
