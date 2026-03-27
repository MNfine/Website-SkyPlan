// Verify Booking page functionality

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
    // Update header/footer shared translations
    if (typeof applyTranslations === 'function') {
      applyTranslations(newLang);
    }
  });
});

/**
 * Load shared header/footer and initialize shared controls.
 */
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
  elements.verifyForm.addEventListener('submit', handleFormSubmit);
  elements.copyTxHashBtn.addEventListener('click', () => copyToClipboard(elements.resultTransactionHash.textContent));
  elements.verifyAgainBtn.addEventListener('click', resetForm);
  elements.retryBtn.addEventListener('click', resetForm);
  elements.notFoundRetryBtn.addEventListener('click', resetForm);
  
  // Clear error state when user focuses on input
  elements.bookingCodeInput.addEventListener('focus', function() {
    this.classList.remove('error');
    const inputHint = document.querySelector('.input-hint');
    if (inputHint) {
      inputHint.classList.remove('error');
      inputHint.textContent = '';
    }
  });
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const bookingCode = elements.bookingCodeInput.value.trim();
  const inputHint = document.querySelector('.input-hint');

  // Reset error state
  elements.bookingCodeInput.classList.remove('error');
  if (inputHint) {
    inputHint.classList.remove('error');
    inputHint.textContent = '';
  }

  // Validate input
  if (!bookingCode) {
    elements.bookingCodeInput.classList.add('error');
    if (inputHint) {
      inputHint.classList.add('error');
      inputHint.textContent = 'Vui lòng nhập mã đặt chỗ';
    }
    elements.bookingCodeInput.focus();
    return;
  }

  if (bookingCode.length < 5) {
    elements.bookingCodeInput.classList.add('error');
    if (inputHint) {
      inputHint.classList.add('error');
      inputHint.textContent = 'Mã đặt chỗ không hợp lệ';
    }
    elements.bookingCodeInput.focus();
    return;
  }

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
