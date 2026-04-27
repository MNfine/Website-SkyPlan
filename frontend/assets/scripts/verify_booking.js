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
  apiBaseUrl: `${window.SkyPlanConfig?.apiBaseUrl || ''}/api/bookings/blockchain`,
  explorerBaseUrl: 'https://sepolia.etherscan.io',
  chainName: 'Sepolia',
  networkId: 11155111,
  requestTimeoutMs: 120000,
  cacheTtlMs: 60000
};

// DOM elements
let elements = {};
let isVerifying = false;
let verifyTimeoutHandle = null;

const VERIFY_CACHE_PREFIX = 'verify_booking_cache_';

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
    resultIntegrityStatus: document.getElementById('resultIntegrityStatus'),
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
  if (!elements.verifyForm) {
    console.error('Form not found:', elements.verifyForm);
    return;
  }

  elements.verifyForm.addEventListener('submit', handleFormSubmit);

  elements.copyTxHashBtn?.addEventListener('click', () => copyToClipboard(elements.resultTransactionHash.textContent));
  elements.verifyAgainBtn?.addEventListener('click', resetForm);
  elements.retryBtn?.addEventListener('click', resetForm);
  elements.notFoundRetryBtn?.addEventListener('click', resetForm);

  // Clear validation error when user starts typing
  elements.bookingCodeInput.addEventListener('input', function () {
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

  if (isVerifying) {
    notifyToast('Yêu cầu đang được xử lý, vui lòng chờ giây lát.', 'info', 2200);
    return;
  }

  const bookingCode = elements.bookingCodeInput.value.trim().toUpperCase();
  const inputHint = document.querySelector('.input-hint');

  // Helper function to show validation error
  function showValidationError(message) {
    // Apply error state and force red styling
    const input = elements.bookingCodeInput;
    input.classList.add('error');
    input.style.setProperty('border-color', '#ef4444', 'important');
    input.style.setProperty('border-width', '2px', 'important');
    input.style.setProperty('border-style', 'solid', 'important');
    input.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
    input.style.boxShadow = 'none';
    input.style.outline = 'none';

    // Show error message
    if (inputHint) {
      inputHint.style.display = 'block';
      inputHint.style.color = '#ef4444';
      inputHint.style.fontWeight = '400';
      inputHint.style.fontSize = '12px';
      inputHint.style.marginTop = '8px';
      inputHint.textContent = message;
    }

    input.focus();
  }

  // Validate input - EMPTY CHECK
  if (!bookingCode || bookingCode.length === 0) {
    showValidationError('Vui lòng nhập mã đặt chỗ');
    return;
  }

  // Validate input - LENGTH CHECK
  if (bookingCode.length < 5) {
    showValidationError('Mã đặt chỗ không hợp lệ (tối thiểu 5 ký tự)');
    return;
  }

  elements.bookingCodeInput.value = bookingCode;

  // Show loading state
  showLoadingState();
  setVerifyPending(true);

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
    const errMsg = (error && error.message ? error.message : '').toLowerCase();
    if (errMsg.includes('not found') || errMsg.includes('không tìm thấy')) {
      showNotFoundState();
      notifyToast('Không tìm thấy mã đặt chỗ. Vui lòng kiểm tra lại.', 'info', 3500);
      return;
    }
    showError(
      'verificationError',
      error.message || 'Có lỗi xảy ra khi kiểm tra'
    );
  } finally {
    setVerifyPending(false);
  }
}

/**
 * Call API to verify booking on blockchain
 */
async function verifyBookingOnBlockchain(bookingCode) {
  const cachedResult = readCachedVerification(bookingCode);
  if (cachedResult) {
    return cachedResult;
  }

  const authToken = getAuthToken();
  const controller = new AbortController();

  verifyTimeoutHandle = window.setTimeout(() => {
    controller.abort();
  }, VERIFY_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(`${VERIFY_CONFIG.apiBaseUrl}/onchain-hash`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        booking_code: bookingCode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }

    writeCachedVerification(bookingCode, data);
    return data;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Yeu cau het thoi gian cho. Vui long thu lai.');
    }
    console.error('API call failed:', error);
    throw error;
  } finally {
    if (verifyTimeoutHandle) {
      clearTimeout(verifyTimeoutHandle);
      verifyTimeoutHandle = null;
    }
  }
}

function getVerifyCacheKey(bookingCode) {
  return `${VERIFY_CACHE_PREFIX}${bookingCode}`;
}

function readCachedVerification(bookingCode) {
  try {
    const raw = sessionStorage.getItem(getVerifyCacheKey(bookingCode));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.payload) {
      sessionStorage.removeItem(getVerifyCacheKey(bookingCode));
      return null;
    }

    if (Date.now() - parsed.ts > VERIFY_CONFIG.cacheTtlMs) {
      sessionStorage.removeItem(getVerifyCacheKey(bookingCode));
      return null;
    }

    return parsed.payload;
  } catch (error) {
    return null;
  }
}

function writeCachedVerification(bookingCode, payload) {
  try {
    sessionStorage.setItem(
      getVerifyCacheKey(bookingCode),
      JSON.stringify({
        ts: Date.now(),
        payload
      })
    );
  } catch (error) {
    // Ignore cache errors to avoid blocking primary flow.
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
  const rawTxHash = data.booking?.tx_hash || data.tx_hash || '-';
  const txHash = normalizeTxHash(rawTxHash) || rawTxHash;
  const blockNumber = data.on_chain?.block_number || '-';
  const confirmations = data.on_chain?.confirmations || 0;
  const integrity = data.integrity || data.on_chain?.integrity || {};
  const integrityMessage = integrity.message || 'Chưa có dữ liệu kiểm tra toàn vẹn';
  const integrityMatched = integrity.is_match !== false;

  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const trans = (typeof verifyBookingTranslations !== 'undefined' && verifyBookingTranslations[lang]) || {};

  // Map known backend integrity messages to translations
  let displayIntegrityMessage = integrityMessage;
  if (integrityMessage.includes('Dữ liệu hợp lệ') || integrityMessage.includes('Data is valid')) {
    displayIntegrityMessage = trans.integrityValid || integrityMessage;
  } else if (integrityMessage.includes('thay đổi') || integrityMessage.includes('altered')) {
    displayIntegrityMessage = trans.integrityAltered || integrityMessage;
  } else if (integrityMessage.includes('Chưa có dữ liệu')) {
    displayIntegrityMessage = trans.integrityNoData || integrityMessage;
  }

  // Update success state elements
  elements.resultBookingCode.textContent = bookingCode;
  elements.resultOnChainStatus.textContent = getStatusLabel(onChainStatus);
  elements.resultOnChainStatus.className = `status-badge status-${onChainStatus.toLowerCase()}`;
  if (elements.resultIntegrityStatus) {
    elements.resultIntegrityStatus.textContent = displayIntegrityMessage;
    elements.resultIntegrityStatus.className = `status-badge ${integrityMatched ? 'status-confirmed' : 'status-warning'}`;
    elements.resultIntegrityStatus.title = integrity.current_state_hash && integrity.stored_state_hash
      ? `Current: ${integrity.current_state_hash}\nStored: ${integrity.stored_state_hash}`
      : displayIntegrityMessage;
  }
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

function normalizeTxHash(value) {
  if (!value || value === '-') {
    return null;
  }

  let candidate = String(value).trim().toLowerCase();
  if (candidate.startsWith('0x')) {
    candidate = candidate.slice(2);
  }

  if (candidate.length !== 64) {
    return null;
  }

  if (!/^[0-9a-f]{64}$/.test(candidate)) {
    return null;
  }

  return `0x${candidate}`;
}

/**
 * Get localized status label
 */
function getStatusLabel(status) {
  const lang = localStorage.getItem('preferredLanguage') || 'vi';
  const trans = (typeof verifyBookingTranslations !== 'undefined' && verifyBookingTranslations[lang]) || {};

  if (trans[status]) {
    return trans[status];
  }

  const defaultMap = {
    'RECORDED': 'Đã ghi chép',
    'CONFIRMED': 'Đã xác nhận',
    'PENDING': 'Chờ xác nhận',
    'NONE': 'Chưa ghi chép',
    'CANCELLED': 'Đã hủy',
    'UNKNOWN': 'Không xác định'
  };

  return defaultMap[status] || status;
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
    notifyToast('Đã sao chép vào bộ nhớ tạm', 'success');
  } catch (error) {
    console.error('Failed to copy:', error);
    notifyToast('Sao chép thất bại', 'error');
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
  elements.verifyResults.classList.add('hidden');
  const isUnauthorized = typeof message === 'string' && message.toLowerCase().includes('unauthorized');

  if (isUnauthorized) {
    const loginMsg = 'Bạn chưa đăng nhập. Vui lòng đăng nhập để kiểm tra mã đặt chỗ của bạn.';
    notifyToast(loginMsg, 'error', 5000);
    setTimeout(() => {
      window.location.href = '/login?returnUrl=' + encodeURIComponent('/verify_booking');
    }, 900);
  } else {
    notifyToast(message || 'Có lỗi xảy ra khi kiểm tra đặt chỗ', 'error', 4500);
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
  setVerifyPending(false);
}

function setVerifyPending(isPending) {
  isVerifying = isPending;

  if (!elements.verifyForm) {
    return;
  }

  const submitButton = elements.verifyForm.querySelector('button[type="submit"]');
  const buttonText = submitButton ? submitButton.querySelector('.button-text') : null;

  if (submitButton) {
    submitButton.disabled = isPending;
    submitButton.setAttribute('aria-busy', isPending ? 'true' : 'false');
    submitButton.classList.toggle('is-loading', isPending);
  }

  if (elements.bookingCodeInput) {
    elements.bookingCodeInput.readOnly = isPending;
  }

  if (buttonText) {
    if (isPending) {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const loadingTexts = { vi: 'Đang kiểm tra...', en: 'Verifying...', zh: '查询中...', ja: '確認中...' };
      buttonText.textContent = loadingTexts[lang] || loadingTexts['vi'];
    } else {
      // Restore button text using current language translations
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const trans = (typeof verifyBookingTranslations !== 'undefined' && verifyBookingTranslations[lang]) || {};
      buttonText.textContent = trans.verifyButton || 'Kiểm tra';
    }
  }
}

/**
 * Show toast notification using shared toast system
 */
function notifyToast(message, type = 'info', duration = 3000) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, { type, duration });
  } else if (typeof window.notify === 'function') {
    window.notify(message, type, duration, true);
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
