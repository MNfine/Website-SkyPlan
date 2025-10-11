/**
 * Profile page functionality for SkyPlan
 */
document.addEventListener('DOMContentLoaded', function() {
  // API endpoint
  const API_URL = '/api/auth';
  
  // DOM elements for profile data display
  const userAvatarLarge = document.getElementById('userAvatarLarge');
  const userFullName = document.getElementById('userFullName');
  const userEmail = document.getElementById('userEmail');
  const displayFullName = document.getElementById('displayFullName');
  const displayEmail = document.getElementById('displayEmail');
  const displayPhone = document.getElementById('displayPhone');
  
  // DOM elements for forms
  const editPersonalInfoBtn = document.getElementById('editPersonalInfo');
  const viewMode = document.getElementById('viewMode');
  const editMode = document.getElementById('editMode');
  const cancelEditBtn = document.getElementById('cancelEdit');
  
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  
  // Password change form elements
  const passwordForm = document.getElementById('passwordForm');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  // Navigation
  const navItems = document.querySelectorAll('.profile-nav li');
  const sections = document.querySelectorAll('.profile-section');
  
  // Load user data
  loadUserData();
  
  // Section navigation
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.querySelector('a').getAttribute('href').substring(1);
      
      // Update active state in navigation
      navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      
      // Show selected section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetId) {
          section.classList.add('active');
        }
      });
    });
  });
  
  // Switch to edit mode
  if (editPersonalInfoBtn) {
    editPersonalInfoBtn.addEventListener('click', function() {
      viewMode.classList.add('hidden');
      editMode.classList.remove('hidden');
    });
  }
  
  // Cancel edit mode
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function() {
      viewMode.classList.remove('hidden');
      editMode.classList.add('hidden');
      loadFormData(); // Reset form data
    });
  }
  
  // Handle personal info form submission
  if (editMode && editMode.tagName === 'FORM') {
    editMode.addEventListener('submit', function(e) {
      e.preventDefault();
      updateUserProfile();
    });
  }
  
  // Handle password form submission
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updatePassword();
    });
  }
  
  // Function to load user data from API or local storage
  function loadUserData() {
    // First try to get from localStorage/sessionStorage
    const userData = getUserData();
    
    if (userData && userData.user) {
      displayUserData(userData.user);
      loadFormData();
    } else {
      // If not in storage, try to get from API
      const token = getAuthToken();
      
      if (token) {
        fetch(`${API_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to load profile data');
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.user) {
            displayUserData(data.user);
            loadFormData();
          }
        })
        .catch(error => {
          console.error('Error loading profile:', error);
          // If API call fails, redirect to login
          window.location.href = './login.html?redirect=' + encodeURIComponent(window.location.href);
        });
      }
    }
  }
  
  // Display user data in the UI
  function displayUserData(user) {
    // Set avatar initial
    if (userAvatarLarge) {
      userAvatarLarge.textContent = user.fullname.charAt(0).toUpperCase();
    }
    
    // Set user info
    if (userFullName) userFullName.textContent = user.fullname;
    if (userEmail) userEmail.textContent = user.email;
    
    // Set display values
    if (displayFullName) displayFullName.textContent = user.fullname;
    if (displayEmail) displayEmail.textContent = user.email;
    if (displayPhone) displayPhone.textContent = user.phone;
  }
  
  // Load user data into form inputs
  function loadFormData() {
    const userData = getUserData();
    
    if (userData && userData.user) {
      const user = userData.user;
      
      if (fullnameInput) fullnameInput.value = user.fullname;
      if (emailInput) emailInput.value = user.email;
      if (phoneInput) phoneInput.value = user.phone;
      
      // Clear any error messages
      clearErrors();
    }
  }
  
  // Update user profile
  function updateUserProfile() {
    const token = getAuthToken();
    
    if (!token) {
      window.location.href = './login.html';
      return;
    }
    
    // Get form values
    const fullname = fullnameInput ? fullnameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    
    // Validate inputs
    let hasError = false;
    
    if (!fullname) {
      showError('fullname', 'Họ và tên không được để trống');
      hasError = true;
    }
    
    if (!phone) {
      showError('phone', 'Số điện thoại không được để trống');
      hasError = true;
    } else if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      showError('phone', 'Số điện thoại không hợp lệ');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Submit data to API
    fetch(`${API_URL}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullname,
        phone
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update local storage data
        const userData = getUserData();
        if (userData) {
          userData.user = data.user;
          
          // Update in the same storage it was found in
          if (sessionStorage.getItem('user')) {
            sessionStorage.setItem('user', JSON.stringify(data.user));
          }
          
          if (localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
        
        // Update UI
        displayUserData(data.user);
        
        // Show success message
        showToast('Cập nhật thông tin thành công', 'success');
        
        // Switch back to view mode
        viewMode.classList.remove('hidden');
        editMode.classList.add('hidden');
      } else {
        showToast(data.message || 'Không thể cập nhật thông tin', 'error');
      }
    })
    .catch(error => {
      console.error('Error updating profile:', error);
      showToast('Đã xảy ra lỗi khi cập nhật thông tin', 'error');
    });
  }
  
  // Update password
  function updatePassword() {
    const token = getAuthToken();
    
    if (!token) {
      window.location.href = './login.html';
      return;
    }
    
    // Get form values
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
    
    // Validate inputs
    let hasError = false;
    
    if (!currentPassword) {
      showError('currentPassword', 'Vui lòng nhập mật khẩu hiện tại');
      hasError = true;
    }
    
    if (!newPassword) {
      showError('newPassword', 'Vui lòng nhập mật khẩu mới');
      hasError = true;
    } else if (newPassword.length < 8) {
      showError('newPassword', 'Mật khẩu phải có ít nhất 8 ký tự');
      hasError = true;
    } else if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      showError('newPassword', 'Mật khẩu phải có cả chữ và số');
      hasError = true;
    }
    
    if (!confirmPassword) {
      showError('confirmPassword', 'Vui lòng xác nhận mật khẩu');
      hasError = true;
    } else if (confirmPassword !== newPassword) {
      showError('confirmPassword', 'Mật khẩu xác nhận không khớp');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Submit data to API
    fetch(`${API_URL}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        current_password: currentPassword,
        password: newPassword
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Clear form
        if (passwordForm) passwordForm.reset();
        clearErrors();
        
        // Show success message
        showToast('Đổi mật khẩu thành công', 'success');
      } else {
        showError('currentPassword', data.message || 'Mật khẩu hiện tại không đúng');
      }
    })
    .catch(error => {
      console.error('Error updating password:', error);
      showToast('Đã xảy ra lỗi khi đổi mật khẩu', 'error');
    });
  }
  
  // Utility functions
  function showError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement) {
      errorElement.textContent = message;
    }
    
    if (inputElement) {
      inputElement.classList.add('error');
    }
  }
  
  function clearErrors() {
    // Clear all error messages
    document.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
    });
    
    // Remove error class from inputs
    document.querySelectorAll('.form-input').forEach(input => {
      input.classList.remove('error');
    });
  }
  
  function showToast(message, type = 'info') {
    // Create toast element if function exists
    if (typeof createToast === 'function') {
      createToast(message, type);
    } else {
      alert(message);
    }
  }
});