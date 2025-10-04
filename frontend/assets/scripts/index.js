// Index JavaScript functionality for SkyPlane website

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize shared UI
  initializeMobileMenu();
  initializeLanguageSelector();
  initializeSearch();
  enableSmoothScrolling();
  // Set the default language to Vietnamese (VI) on initial load (only for index)
  const defaultLang = 'vi';
  localStorage.setItem('preferredLanguage', defaultLang);
  changeLanguage(defaultLang);
});
