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

// Xử lý sự kiện tìm kiếm chuyến bay trên trang chủ
document.addEventListener('DOMContentLoaded', function() {
  // Nút submit là button.search-btn trong form
  const form = document.querySelector('form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const from = document.getElementById('from')?.value || '';
    const to = document.getElementById('to')?.value || '';
    const dep = document.getElementById('departure')?.value || '';
    const ret = document.getElementById('return')?.value || '';
    // Chuyển hướng sang search.html với query string
    window.location.href = `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&dep=${encodeURIComponent(dep)}&ret=${encodeURIComponent(ret)}`;
  });
});
