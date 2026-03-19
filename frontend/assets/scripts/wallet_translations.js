/**
 * Wallet Translations for MetaMask integration
 */

const WALLET_TRANSLATIONS = {
  vi: {
    connectWalletText: 'Kết nối Ví',
    disconnectText: 'Ngắt kết nối',
    walletConnected: 'Ví đã kết nối',
    walletDisconnected: 'Ví đã ngắt kết nối',
    connecting: 'Đang kết nối ví...',
    connectedMessage: 'Đã kết nối ví {address}',
    disconnectedMessage: 'Ví đã được ngắt kết nối',
    connectionFailed: 'Kết nối thất bại',
    metamaskNotDetected: 'Không tìm thấy MetaMask. Vui lòng cài MetaMask.',
    unknownError: 'Lỗi không xác định',
    sepoliaRequired: 'Không thể tiếp tục nếu chưa chuyển sang mạng Sepolia.',
    wrongNetwork: 'Mạng lỗi',
    switchToSepolia: 'Vui lòng chuyển sang mạng Sepolia',
  },
  en: {
    connectWalletText: 'Connect Wallet',
    disconnectText: 'Disconnect',
    walletConnected: 'Wallet Connected',
    walletDisconnected: 'Wallet Disconnected',
    connecting: 'Connecting wallet...',
    connectedMessage: 'Wallet {address} connected',
    disconnectedMessage: 'Wallet disconnected',
    connectionFailed: 'Connection failed',
    metamaskNotDetected: 'MetaMask not detected. Please install MetaMask.',
    unknownError: 'Unknown error',
    sepoliaRequired: 'Cannot continue unless you switch to Sepolia network.',
    wrongNetwork: 'Wrong Network',
    switchToSepolia: 'Please switch to Sepolia network',
  },
};

function getWalletLanguage() {
  const localStorageLang = localStorage.getItem('preferredLanguage') || localStorage.getItem('language');
  const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  const lang = (localStorageLang || docLang || 'vi').toLowerCase();
  return lang === 'en' ? 'en' : 'vi';
}

function getWalletTranslation(key, lang) {
  const activeLang = lang || getWalletLanguage();
  const translations = WALLET_TRANSLATIONS[activeLang] || WALLET_TRANSLATIONS.vi;
  return translations[key] || key;
}

function formatWalletTranslation(key, values, lang) {
  let text = getWalletTranslation(key, lang);
  const params = values || {};

  Object.keys(params).forEach(function(name) {
    text = text.replace(new RegExp('\\{' + name + '\\}', 'g'), String(params[name]));
  });

  return text;
}

/**
 * Apply wallet translations to elements
 */
function applyWalletTranslations(lang) {
  lang = lang || getWalletLanguage();
  const translations = WALLET_TRANSLATIONS[lang] || WALLET_TRANSLATIONS.vi;

  document.querySelectorAll('[data-i18n]').forEach(function(element) {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });
}

/**
 * Apply translations on page load
 */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    applyWalletTranslations();
  }, 500);
});

/**
 * Listen for language changes
 */
document.addEventListener('languageChanged', function(e) {
  const newLang = e.detail && e.detail.lang ? e.detail.lang : 'vi';
  applyWalletTranslations(newLang);
});

window.WALLET_TRANSLATIONS = WALLET_TRANSLATIONS;
window.getWalletLanguage = getWalletLanguage;
window.getWalletTranslation = getWalletTranslation;
window.formatWalletTranslation = formatWalletTranslation;
