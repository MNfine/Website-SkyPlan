// Translations for SkyPlan - Confirmation page
const confirmationTranslations = {
  en: {
    confirmationTitle: 'Payment Confirmation',
    successTitle: 'Payment successful!',
    thanksLine1: 'Thank you for choosing SkyPlan.',
    thanksLine2: 'Your booking has been confirmed.',
    bookingCodeLabel: 'Booking Code:',
    txnRefLabel: 'Transaction ID:',
    amountLabel: 'Amount:',
    backHome: 'Back to Home',
    viewMyTicket: 'View my ticket',
    // Header
    helpText: 'Help',
    myTripsText: 'My Trips',
    signUpText: 'Sign Up',
    signInText: 'Sign In',
    // Footer
    footerDesc: 'Your trusted travel companion for the best flight deals and unforgettable journeys.',
    quickLinksTitle: 'Quick Links',
    aboutUs: 'About Us',
    contact: 'Contact',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    supportTitle: 'Support',
    helpCenter: 'Help Center',
    customerService: 'Customer Service',
    bookingHelp: 'Booking Help',
    faq: 'FAQ',
    paymentMethodsTitle: 'Payment Methods',
    downloadAppTitle: 'Download our app',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    copyright: '© 2024 SkyPlan. All rights reserved.'
  },
  vi: {
    confirmationTitle: 'Xác nhận thanh toán',
    successTitle: 'Thanh toán thành công!',
    thanksLine1: 'Cảm ơn bạn đã sử dụng dịch vụ của SkyPlan.',
    thanksLine2: 'Thông tin đặt vé của bạn đã được xác nhận.',
    bookingCodeLabel: 'Mã vé:',
    txnRefLabel: 'Mã giao dịch:',
    amountLabel: 'Số tiền:',
    backHome: 'Về trang chủ',
    viewMyTicket: 'Xem vé của tôi',
    // Header
    helpText: 'Trợ giúp',
    myTripsText: 'Chuyến đi của tôi',
    signUpText: 'Đăng ký',
    signInText: 'Đăng nhập',
    // Footer
    footerDesc: 'Đối tác du lịch đáng tin cậy của bạn cho các ưu đãi vé máy bay tốt nhất và những hành trình khó quên.',
    quickLinksTitle: 'Liên kết nhanh',
    aboutUs: 'Về chúng tôi',
    contact: 'Liên hệ',
    privacyPolicy: 'Chính sách bảo mật',
    termsOfService: 'Điều khoản dịch vụ',
    supportTitle: 'Hỗ trợ',
    helpCenter: 'Trung tâm trợ giúp',
    customerService: 'Dịch vụ khách hàng',
    bookingHelp: 'Hỗ trợ đặt vé',
    faq: 'Câu hỏi thường gặp',
    paymentMethodsTitle: 'Phương thức thanh toán',
    downloadAppTitle: 'Tải ứng dụng của chúng tôi',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    copyright: '© 2024 SkyPlan. Bảo lưu mọi quyền.'
  }
};

function applyConfirmationTranslations(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = confirmationTranslations?.[lang]?.[key];
    if (val) el.textContent = val;
  });
  if (confirmationTranslations?.[lang]?.confirmationTitle) {
    document.title = `SkyPlan - ${confirmationTranslations[lang].confirmationTitle}`;
  }
}

function changeConfirmationLanguage(lang) {
  localStorage.setItem('preferredLanguage', lang);
  document.documentElement.lang = lang;
  applyConfirmationTranslations(lang);
  try { document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } })); } catch {}
}

try {
  window.applyConfirmationTranslations = applyConfirmationTranslations;
  window.changeConfirmationLanguage = changeConfirmationLanguage;
} catch {}
