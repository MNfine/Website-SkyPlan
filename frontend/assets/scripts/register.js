document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* DOM refs */
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

  /* Validation functions */
  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidPhone(value) {
    // Vietnamese phone number validation (10-11 digits, starting with 0)
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

      const fullName = fullNameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      const agreeTerms = agreeTermsCheckbox.checked;

      let hasError = false;

      // Full name validation
      if (!fullName) {
        showError('fullName', 'Vui lòng nhập họ và tên');
        hasError = true;
      } else if (!isValidFullName(fullName)) {
        showError('fullName', 'Họ và tên phải có ít nhất 2 từ, mỗi từ ít nhất 2 ký tự');
        hasError = true;
      }

      // Email validation
      if (!email) {
        showError('email', 'Vui lòng nhập email');
        hasError = true;
      } else if (!isValidEmail(email)) {
        showError('email', 'Email không hợp lệ');
        hasError = true;
      }

      // Phone validation
      if (!phone) {
        showError('phone', 'Vui lòng nhập số điện thoại');
        hasError = true;
      } else if (!isValidPhone(phone)) {
        showError('phone', 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)');
        hasError = true;
      }

      // Password validation
      if (!password) {
        showError('password', 'Vui lòng nhập mật khẩu');
        hasError = true;
      } else if (!isValidPassword(password)) {
        showError('password', 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số');
        hasError = true;
      }

      // Confirm password validation
      if (!confirmPassword) {
        showError('confirmPassword', 'Vui lòng xác nhận mật khẩu');
        hasError = true;
      } else if (password !== confirmPassword) {
        showError('confirmPassword', 'Mật khẩu không trùng khớp');
        hasError = true;
      }

      // Terms validation
      if (!agreeTerms) {
        alert('Vui lòng đồng ý với điều khoản sử dụng');
        hasError = true;
      }

      if (hasError) return;

      console.log('Registration successful:', { fullName, email, phone, password, agreeTerms });
      alert('Đăng ký thành công!\n\nHọ tên: ' + fullName + '\nEmail: ' + email + '\nSố điện thoại: ' + phone);
      
      // Redirect to login page after successful registration
      setTimeout(() => {
        window.location.href = './login.html';
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

  /* Social buttons */
  if (btnGoogle) {
    btnGoogle.addEventListener('click', () => {
      alert('Đăng ký với Google');
      console.log('Google registration clicked');
    });
  }

  if (btnFacebook) {
    btnFacebook.addEventListener('click', () => {
      alert('Đăng ký với Facebook');
      console.log('Facebook registration clicked');
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
      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
      if (value.length > 11) {
        value = value.slice(0, 11); // Limit to 11 digits
      }
      e.target.value = value;
    });
  }
});
