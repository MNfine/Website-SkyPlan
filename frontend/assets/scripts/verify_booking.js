// Verify Booking page functionality
// ENABLE DEBUG MODE FOR DEVELOPMENT
window.SKYPLAN_DEBUG = true;


// Quiet mode: suppress non-essential console output unless debugging flag is enabled
(function () {
  try {
    if (!window.SKYPLAN_DEBUG) {
      console._orig = console._orig || {};
      ['log', 'info', 'debug'].forEach(function (m) { if (!console._orig[m]) console._orig[m] = console[m]; console[m] = function () { }; });
    }
  } catch (e) { }
})();

// Configuration
const VERIFY_CONFIG = {
  apiBaseUrl: '/api/bookings/blockchain',
  explorerBaseUrl: 'https://sepolia.etherscan.io',
  chainName: 'Sepolia',
  networkId: 11155111
};

// DOM elements
let elements = {};

document.addEventListener('DOMContentLoaded', function () {
  loadCommonComponents().finally(() => {
    initializeElements();
    attachEventListeners();
    applyInitialTranslations();
  });

  // Listen for language changes
  window.addEventListener('storage', function (e) {
    if (e.key === 'preferredLanguage') {
      const newLang = e.newValue || 'vi';
      if (typeof applyVerifyBookingTranslations === 'function') {
        applyVerifyBookingTranslations(newLang);
      }
    }
  });

  document.addEventListener('languageChanged', function (e) {
    const newLang = e.detail.language || e.detail.lang || 'vi';
    // Update verify booking translations
    if (typeof applyVerifyBookingTranslations === 'function') {
      applyVerifyBookingTranslations(newLang);
    }
    // Update header/footer shared translations by finding all [data-i18n] elements
    updateSharedTranslations(newLang);
  });
});

/**
 * Update header/footer translations when language changes
 */
function updateSharedTranslations(lang) {
  // Call header/footer translation functions if available
  if (typeof applyTranslations === 'function') {
    applyTranslations(lang);
  } else {
    // Fallback: update elements with data-i18n attribute in header and footer containers
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');
    
    if (headerContainer) {
      updateElementTranslations(headerContainer, lang);
    }
    if (footerContainer) {
      updateElementTranslations(footerContainer, lang);
    }
  }
}

/**
 * Generic function to update translations for elements with data-i18n attribute
 */
function updateElementTranslations(container, lang) {
  // Try to get translation object from window.translations first, then from verifyBookingTranslations
  let translations = (window.translations && window.translations[lang]) || 
                     (typeof verifyBookingTranslations !== 'undefined' && verifyBookingTranslations[lang]) || 
                     {};
  
  if (!translations || Object.keys(translations).length === 0) {
    translations = {};
  }

  container.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key && translations[key]) {
      const text = translations[key];
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = text;
      } else if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        const hasIcon = element.querySelector('i');
        if (hasIcon) {
          element.innerHTML = `${hasIcon.outerHTML}<span>${text}</span>`;
        } else {
          element.textContent = text;
        }
      } else {
        element.textContent = text;
      }
    }
  });
}

function loadCommonComponents() {
  const headerPromise = fetch('components/header.html')
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error('Header load failed'))))
    .then((html) => {
      const headerContainer = document.getElementById('header-container');
      if (headerContainer) {
        headerContainer.innerHTML = html;
      }
      if (typeof initializeMobileMenu === 'function') {
        initializeMobileMenu();
      }
      if (typeof initializeLanguageSelector === 'function') {
        initializeLanguageSelector();
      }
      if (typeof updateHeaderUserInfo === 'function') {
        updateHeaderUserInfo();
      }
    })
    .catch(() => { });

  const footerPromise = fetch('components/footer.html')
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error('Footer load failed'))))
    .then((html) => {
      const footerContainer = document.getElementById('footer-container');
      if (footerContainer) {
        footerContainer.innerHTML = html;
      }
    })
    .catch(() => { });

  return Promise.allSettled([headerPromise, footerPromise]);
}

/**
 * Initialize DOM elements references
 */
function initializeElements() {
  elements = {
    // Form
    verifyForm: document.getElementById('verifyBookingForm'),
    bookingCodeInput: document.getElementById('bookingCode'),

    // Results container
    verifyResults: document.getElementById('verifyResults'),

    // State sections
    loadingState: document.getElementById('loadingState'),
    successState: document.getElementById('successState'),
    errorState: document.getElementById('errorState'),
    notFoundState: document.getElementById('notFoundState'),

    // Success state elements
    resultBookingCode: document.getElementById('resultBookingCode'),
    resultOnChainStatus: document.getElementById('resultOnChainStatus'),
    resultTransactionHash: document.getElementById('resultTransactionHash'),
    resultBlockNumber: document.getElementById('resultBlockNumber'),
    resultConfirmations: document.getElementById('resultConfirmations'),
    explorerLink: document.getElementById('explorerLink'),

    // Copy buttons
    copyTxHashBtn: document.getElementById('copyTxHashBtn'),

    // Action buttons
    verifyAgainBtn: document.getElementById('verifyAgainBtn'),
    retryBtn: document.getElementById('retryBtn'),
    notFoundRetryBtn: document.getElementById('notFoundRetryBtn'),

    // Error elements
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage')
  };
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  console.log('attachEventListeners called');
  console.log('Elements:', {
    form: !!elements.verifyForm,
    input: !!elements.bookingCodeInput,
    formId: elements.verifyForm?.id
  });
  
  if (!elements.verifyForm) {
    console.error('❌ Form not found! verifyForm is:', elements.verifyForm);
    return;
  }
  
  console.log('✅ Form found, attaching submit listener');
  elements.verifyForm.addEventListener('submit', function(e) {
    console.log('📝 Form submit event fired!', e);
    handleFormSubmit(e);
  });
  
  elements.copyTxHashBtn?.addEventListener('click', () => copyToClipboard(elements.resultTransactionHash.textContent));
  elements.verifyAgainBtn?.addEventListener('click', resetForm);
  elements.retryBtn?.addEventListener('click', resetForm);
  elements.notFoundRetryBtn?.addEventListener('click', resetForm);
  
  // Clear error state when user focuses on input
  // Clear error state when user starts typing
  elements.bookingCodeInput.addEventListener('input', function() {
    console.log('Input typed - clearing error');
    // Remove inline error styles
    this.style.border = '';
    this.style.backgroundColor = '';
    this.style.boxShadow = '';
    this.classList.remove('error');
    
    const inputHint = document.querySelector('.input-hint');
    if (inputHint) {
      inputHint.style.color = '';
      inputHint.style.fontWeight = '';
      inputHint.style.fontSize = '';
      inputHint.style.marginTop = '';
      inputHint.style.display = '';
      inputHint.textContent = '';
      inputHint.classList.remove('error');
      inputHint.textContent = '';
    }
  });
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  console.log('🔥 handleFormSubmit called');
  e.preventDefault();
  console.log('✅ preventDefault() called');

  const bookingCode = elements.bookingCodeInput.value.trim();
  const inputHint = document.querySelector('.input-hint');

  console.log('📋 Form data:', {
    code: bookingCode,
    length: bookingCode.length,
    isEmpty: !bookingCode,
    inputElement: !!elements.bookingCodeInput,
    hintElement: !!inputHint
  });

  // Helper function to show validation error
  function showValidationError(message) {
    console.log('❌ VALIDATION ERROR:', message);
    
    // DIRECT INLINE STYLES - No CSS class override possible
    const input = elements.bookingCodeInput;
    input.style.border = '2px solid #ef4444 !important';
    input.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
    input.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.3)';
    input.style.outline = 'none';
    
    // Show error message
    if (inputHint) {
      inputHint.style.display = 'block';
      inputHint.style.color = '#ef4444';
      inputHint.style.fontWeight = '700';
      inputHint.style.fontSize = '14px';
      inputHint.style.marginTop = '8px';
      inputHint.textContent = message;
    }
    
    input.focus();
    console.log('✅ Error state applied:', {
      borderStyle: input.style.border,
      bgColor: input.style.backgroundColor,
      message: inputHint?.textContent
    });
  }

  // Validate input - EMPTY CHECK
  if (!bookingCode || bookingCode.length === 0) {
    showValidationError('⚠️ Vui lòng nhập mã đặt chỗ');
    return;
  }

  // Validate input - LENGTH CHECK
  if (bookingCode.length < 5) {
    showValidationError('⚠️ Mã đặt chỗ không hợp lệ (tối thiểu 5 ký tự)');
    return;
  }

  console.log('✅ VALIDATION PASSED: Proceeding with API call');

  // Show loading state
  showLoadingState();

  try {
    // Call API to verify booking
    const response = await verifyBookingOnBlockchain(bookingCode);

    if (response.success) {
      displayVerificationResult(response);
      showSuccessState();
    } else {
      if (response.message && response.message.includes('not found')) {
        showNotFoundState();
      } else {
        showError('verificationFailed', response.message || 'Không thể xác minh đặt chỗ');
      }
    }
  } catch (error) {
    console.error('Verification error:', error);
    showError(
      'verificationError',
      error.message || 'Có lỗi xảy ra khi kiểm tra'
    );
  }
}

/**
 * Call API to verify booking on blockchain
 */
async function verifyBookingOnBlockchain(bookingCode) {
  try {
    const response = await fetch(`${VERIFY_CONFIG.apiBaseUrl}/onchain-hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        booking_code: bookingCode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

/**
 * Get authentication token
 */
function getAuthToken() {
  // Try to get from sessionStorage or localStorage
  return sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
}

/**
 * Display verification result
 */
function displayVerificationResult(data) {
  const bookingCode = data.booking_code || data.booking?.booking_code || '-';
  const onChainStatus = data.on_chain?.status || 'UNKNOWN';
  const txHash = data.booking?.tx_hash || data.tx_hash || '-';
  const blockNumber = data.on_chain?.block_number || '-';
  const confirmations = data.on_chain?.confirmations || 0;

  // Update success state elements
  elements.resultBookingCode.textContent = bookingCode;
  elements.resultOnChainStatus.textContent = getStatusLabel(onChainStatus);
  elements.resultOnChainStatus.className = `status-badge status-${onChainStatus.toLowerCase()}`;
  elements.resultTransactionHash.textContent = truncateHash(txHash);
  elements.resultTransactionHash.title = txHash;
  elements.resultBlockNumber.textContent = blockNumber !== '-' ? `#${blockNumber}` : '-';
  elements.resultConfirmations.textContent = confirmations > 0 ? confirmations : 'Pending';

  // Update explorer link
  if (txHash && txHash !== '-' && txHash.startsWith('0x')) {
    elements.explorerLink.href = `${VERIFY_CONFIG.explorerBaseUrl}/tx/${txHash}`;
    elements.explorerLink.style.display = 'inline-flex';
  } else {
    elements.explorerLink.style.display = 'none';
  }
}

/**
 * Get localized status label
 */
function getStatusLabel(status) {
  const statusMap = {
    'RECORDED': 'Đã ghi chép',
    'CONFIRMED': 'Đã xác nhận',
    'PENDING': 'Chờ xác nhận',
    'NONE': 'Chưa ghi chép',
    'CANCELLED': 'Đã hủy',
    'UNKNOWN': 'Không xác định'
  };

  return statusMap[status] || status;
}

/**
 * Truncate long hash for display
 */
function truncateHash(hash) {
  if (!hash || hash === '-' || hash.length < 20) {
    return hash;
  }
  return `${hash.substring(0, 10)}...${hash.substring(hash.length - 10)}`;
}

/**
 * Truncate ethereum address for display
 */
function truncateAddress(address) {
  if (!address || address === '-' || address.length < 10) {
    return address;
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  if (!text || text === '-') return;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Đã sao chép vào bộ nhớ tạm', 'success');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Sao chép thất bại', 'error');
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  resetResultsDisplay();
  elements.verifyResults.classList.remove('hidden');
  elements.loadingState.classList.remove('hidden');
}

/**
 * Show success state
 */
function showSuccessState() {
  resetResultsDisplay();
  elements.verifyResults.classList.remove('hidden');
  elements.successState.classList.remove('hidden');
}

/**
 * Show not found state
 */
function showNotFoundState() {
  resetResultsDisplay();
  elements.verifyResults.classList.remove('hidden');
  elements.notFoundState.classList.remove('hidden');
}

/**
 * Show error state
 */
function showError(titleKey, message) {
  resetResultsDisplay();
  elements.verifyResults.classList.remove('hidden');
  elements.errorState.classList.remove('hidden');

  elements.errorTitle.setAttribute('data-i18n', titleKey);
  elements.errorMessage.textContent = message;

  // Re-apply translations to error title
  if (typeof applyVerifyBookingTranslations === 'function') {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    applyVerifyBookingTranslations(lang);
  }
}

/**
 * Reset results display
 */
function resetResultsDisplay() {
  elements.loadingState.classList.add('hidden');
  elements.successState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
  elements.notFoundState.classList.add('hidden');
}

/**
 * Reset form and results
 */
function resetForm() {
  elements.bookingCodeInput.value = '';
  elements.bookingCodeInput.focus();
  elements.verifyResults.classList.add('hidden');
  resetResultsDisplay();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  if (typeof createToast === 'function') {
    createToast(message, type);
  } else {
    alert(message);
  }
}

/**
 * Apply initial translations
 */
function applyInitialTranslations() {
  const preferredLang = localStorage.getItem('preferredLanguage') || 'vi';
  if (typeof applyVerifyBookingTranslations === 'function') {
    applyVerifyBookingTranslations(preferredLang);
  }
}

// Export for testing
window.VerifyBooking = {
  verifyBookingOnBlockchain,
  handleFormSubmit,
  displayVerificationResult,
  getStatusLabel,
  truncateHash,
  truncateAddress,
  VERIFY_CONFIG
};
