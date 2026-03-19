/**
 * Wallet Translations for MetaMask integration
 */

const WALLET_TRANSLATIONS = {
  vi: {
    connectWalletText: 'Kết nối Ví',
    disconnectText: 'Ngắt kết nối',
    walletConnected: 'Ví đã kết nối',
    walletDisconnected: 'Ví đã ngắt kết nối',
    wrongNetwork: 'Mạng lỗi',
    switchToSepolia: 'Vui lòng chuyển sang mạng Sepolia',
  },
  en: {
    connectWalletText: 'Connect Wallet',
    disconnectText: 'Disconnect',
    walletConnected: 'Wallet Connected',
    walletDisconnected: 'Wallet Disconnected',
    wrongNetwork: 'Wrong Network',
    switchToSepolia: 'Please switch to Sepolia network',
  },
};

/**
 * Apply wallet translations to elements
 */
function applyWalletTranslations(lang) {
  lang = lang || localStorage.getItem('preferredLanguage') || 'vi';
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
