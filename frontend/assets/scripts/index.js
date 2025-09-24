// Index JavaScript functionality for SkyPlane website

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize mobile menu functionality
  initializeMobileMenu();
  
  // Initialize search functionality
  initializeSearch();
  
  // Ensure the language selector and translations are synchronized on page load
  initializeLanguageSelector();
  
  // Set the default language to Vietnamese (VI) on initial load
  const defaultLang = 'vi';
  localStorage.setItem('preferredLanguage', defaultLang);
  changeLanguage(defaultLang);
});

// Mobile menu functionality
function initializeMobileMenu() {
  // Add delay to ensure header is loaded
  setTimeout(() => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    console.log('Menu toggle:', menuToggle);
    console.log('Nav links:', navLinks);
    
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Menu toggle clicked');
        
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
        
        console.log('Menu active:', navLinks.classList.contains('active'));
      });
    } else {
      console.error('Menu elements not found');
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
      if (navLinks && navLinks.classList.contains('active') && 
          !event.target.closest('.nav-links') && 
          !event.target.closest('.menu-toggle')) {
        navLinks.classList.remove('active');
        if (menuToggle) menuToggle.classList.remove('active');
        document.body.classList.remove('no-scroll');
      }
    });
  }, 500);
}

// Language selector functionality
function initializeLanguageSelector() {
  // This will be called after header is loaded
  setTimeout(() => {
    const langOptions = document.querySelectorAll('.lang-option');
    const selectedLang = document.querySelector('.selected-lang');
    
    // Get current language from localStorage (should already be set)
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    
    langOptions.forEach(option => {
      option.addEventListener('click', function(e) {
        e.preventDefault();
        const selectedLangValue = this.getAttribute('data-lang');
        
        console.log('Language option clicked:', selectedLangValue);
        
        // Update active state
        langOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // Change language
        if (typeof changeLanguage === 'function') {
          changeLanguage(selectedLangValue);
        }
        
        // Update selected language display
        updateSelectedLanguage(selectedLangValue);
      });
    });
    
    // Set active option based on current language (don't change language)
    langOptions.forEach(opt => {
      if (opt.getAttribute('data-lang') === currentLang) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
    
    console.log('Language selector initialized with:', currentLang);
  }, 100); // Much shorter timeout
}

// Update selected language display
function updateSelectedLanguage(lang) {
  const selectedLang = document.querySelector('.selected-lang');
  
  if (selectedLang) {
    if (lang === 'vi') {
      selectedLang.innerHTML = `
        <span class="lang-flag flag-vi"></span>
        <span>VI</span>
      `;
    } else {
      selectedLang.innerHTML = `
        <span class="lang-flag flag-en"></span>
        <span>EN</span>
      `;
    }
    console.log('Updated selected language to:', lang);
  }
}

// Search functionality
function initializeSearch() {
  const searchBtn = document.querySelector('.search-btn');

  if (searchBtn) {
    searchBtn.addEventListener('click', function(event) {
      // Allow form submission without interruption
      console.log('Search button clicked');
    });
  }
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
