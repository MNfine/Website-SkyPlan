// Translations for SkyPlane website
const translations = {
  en: {
    // Meta information
    metaTitle: "SkyPlan - Best deals are waiting for you",
    metaDescription: "Find the best flight deals with SkyPlan. Book your next trip with confidence.",
    
    // Header
    helpText: "Help",
    myTripsText: "My Trips",
    signUpText: "Sign Up",
    signInText: "Sign In",
    
    // Hero section
    heroTitle: "Best deals are waiting for you",
    
    // Search box
    "search.from": "From",
  "search.from_value": "Ha Noi",
    "search.to": "To",
    "search.to_value": "Ho Chi Minh City",
    "search.departure": "Departure",
    "search.return": "Return",
    
    // Popular routes
  popularRoutesTitle: "Popular Routes",
  appComingSoon: "Coming soon",
    
    // Features
    feature1Title: "Guarantee of the best price",
    feature1Desc: "We offer the cheapest prices on flights and if you find a lower flight price elsewhere, we'll refund the difference.",
    feature2Title: "Refunds & Cancellations",
    feature2Desc: "Test flight and accommodation rules before booking with our detailed refund policies.",
    feature3Title: "Credit 24 Information",
    feature3Desc: "Now you can buy your travel experiences instantly and pay over time with our no hidden fees offers.",
    
    // App promo
    appPromoTitle: "Get our new mobile app and book flights with 10% discount!",
    appPromoDesc: "Download our new SkyPlan app and have control of your trips in your pocket. With our app you'll get secret deals and extra booking discounts.",
    appButtonText: "Download in Mobile Store",
    
    // Footer
    footerDesc: "Your trusted travel companion for the best flight deals and unforgettable journeys.",
    quickLinksTitle: "Quick Links",
    aboutUs: "About Us",
    contact: "Contact",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    supportTitle: "Support",
    helpCenter: "Help Center",
    customerService: "Customer Service",
    bookingHelp: "Booking Help",
    faq: "FAQ",
    paymentMethodsTitle: "Payment Methods",
    downloadAppTitle: "Download Our App",
    appStore: "App Store",
    googlePlay: "Google Play",
    copyright: "© 2024 SkyPlan. All rights reserved."
  },
  
  vi: {
    // Meta information
    metaTitle: "SkyPlan - Ưu đãi tốt nhất đang chờ đón bạn",
    metaDescription: "Tìm các chuyến bay nội địa giá tốt nhất tại Việt Nam với SkyPlan. Đặt chuyến đi tiếp theo của bạn với sự tự tin.",
    
    // Header
    helpText: "Trợ giúp",
    myTripsText: "Chuyến đi của tôi",
    signUpText: "Đăng ký",
    signInText: "Đăng nhập",
    
    // Hero section
    heroTitle: "Ưu đãi tốt nhất đang chờ đón bạn",
    
    // Search box
    "search.from": "Từ",
  "search.from_value": "Hà Nội",
    "search.to": "Đến",
    "search.to_value": "Hồ Chí Minh",
    "search.departure": "Ngày đi",
    "search.return": "Ngày về",
    
    // Popular routes
  popularRoutesTitle: "Điểm đến phổ biến",
  appComingSoon: "Sắp ra mắt",
    
    // Features
    feature1Title: "Đảm bảo giá tốt nhất",
    feature1Desc: "Chúng tôi cung cấp giá vé máy bay rẻ nhất và nếu bạn tìm thấy giá vé thấp hơn ở nơi khác, chúng tôi sẽ hoàn lại khoản chênh lệch.",
    feature2Title: "Hoàn tiền & Hủy vé",
    feature2Desc: "Kiểm tra các quy định về chuyến bay và chỗ ở trước khi đặt với chính sách hoàn tiền chi tiết của chúng tôi.",
    feature3Title: "Thanh toán linh hoạt",
    feature3Desc: "Giờ đây bạn có thể mua trải nghiệm du lịch ngay lập tức và thanh toán theo thời gian với các ưu đãi không có phí ẩn của chúng tôi.",
    
    // App promo
    appPromoTitle: "Tải ứng dụng di động và đặt vé với ưu đãi giảm giá 10%!",
    appPromoDesc: "Tải xuống ứng dụng SkyPlan mới và kiểm soát các chuyến đi của bạn trong túi. Với ứng dụng của chúng tôi, bạn sẽ nhận được ưu đãi bí mật và giảm giá đặt vé thêm.",
    appButtonText: "Tải về từ Mobile Store",
    
    // Footer
    footerDesc: "Đối tác du lịch đáng tin cậy của bạn cho các ưu đãi vé máy bay tốt nhất và những hành trình khó quên.",
    quickLinksTitle: "Liên kết nhanh",
    aboutUs: "Về chúng tôi",
    contact: "Liên hệ",
    privacyPolicy: "Chính sách bảo mật",
    termsOfService: "Điều khoản dịch vụ",
    supportTitle: "Hỗ trợ",
    helpCenter: "Trung tâm trợ giúp",
    customerService: "Dịch vụ khách hàng",
    bookingHelp: "Hỗ trợ đặt vé",
    faq: "Câu hỏi thường gặp",
    paymentMethodsTitle: "Phương thức thanh toán",
    downloadAppTitle: "Tải ứng dụng của chúng tôi",
    appStore: "App Store",
    googlePlay: "Google Play",
    copyright: "© 2024 SkyPlan. Bảo lưu mọi quyền."
  }
};

// City translations centralized here (codes and labels per language)
const cityTranslations = {
  vi: {
    HaNoi: 'Hà Nội',
    HoChiMinh: 'Hồ Chí Minh',
    DaNang: 'Đà Nẵng',
    CanTho: 'Cần Thơ',
    LamDong: 'Lâm Đồng',
    QuangTri: 'Quảng Trị',
    DakLak: 'Đắk Lắk',
    KhanhHoa: 'Khánh Hòa',
    HaiPhong: 'Hải Phòng',
    Hue: 'Huế',
    DienBien: 'Điện Biên',
    GiaLai: 'Gia Lai',
    AnGiang: 'An Giang',
    ThanhHoa: 'Thanh Hóa',
    NgheAn: 'Nghệ An',
    QuangNinh: 'Quảng Ninh',
    SonLa: 'Sơn La',
    DaLat: 'Đà Lạt'
  },
  en: {
    HaNoi: 'Ha Noi',
    HoChiMinh: 'Ho Chi Minh',
    DaNang: 'Da Nang',
    CanTho: 'Can Tho',
    LamDong: 'Lam Dong',
    QuangTri: 'Quang Tri',
    DakLak: 'Dak Lak',
    KhanhHoa: 'Khanh Hoa',
    HaiPhong: 'Hai Phong',
    Hue: 'Hue',
    DienBien: 'Dien Bien',
    GiaLai: 'Gia Lai',
    AnGiang: 'An Giang',
    ThanhHoa: 'Thanh Hoa',
    NgheAn: 'Nghe An',
    QuangNinh: 'Quang Ninh',
    SonLa: 'Son La',
    DaLat: 'Da Lat'
  }
};

// Export for usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = translations;
  module.exports.cityTranslations = cityTranslations;
}
if (typeof window !== 'undefined') {
  window.SKYPLAN_CITY_TRANSLATIONS = cityTranslations;
  // expose all translations for runtime lookups (e.g., toasts)
  window.translations = translations;
}

// Function to apply translations
function applyTranslations(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });
  
  // Update route cards visibility
  updateRouteCards(lang);
  
  // Update page title and meta description
  if (translations[lang]['metaTitle']) {
    document.title = translations[lang]['metaTitle'];
  }
  
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && translations[lang]['metaDescription']) {
    metaDesc.setAttribute('content', translations[lang]['metaDescription']);
  }
}

// Function to update route cards based on language
function updateRouteCards(lang) {
  const allCards = document.querySelectorAll('.route-card');
  
  allCards.forEach(card => {
    const cardLang = card.getAttribute('data-lang');
    if (cardLang === lang) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// Function to change language
function changeLanguage(lang) {
  // Only change if explicitly called by user action
  localStorage.setItem('preferredLanguage', lang);
  document.documentElement.lang = lang;
  applyTranslations(lang);
  
  // Notify listeners (dropdowns, date inputs) about language change
  try {
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  } catch (e) {}
}

// Ensure Vietnamese is set as default on first visit
if (!localStorage.getItem('preferredLanguage')) {
  localStorage.setItem('preferredLanguage', 'vi');
}
