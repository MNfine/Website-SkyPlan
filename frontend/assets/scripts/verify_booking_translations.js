// Verify Booking Page Translations

const verifyBookingTranslations = {
  vi: {
    // Page Title and Headers
    verifyBookingTitle: 'Kiểm tra đặt chỗ',
    verifyBookingSubtitle: 'Nhập mã đặt chỗ để xem trạng thái trên blockchain',

    // Form Labels
    bookingCodeLabel: 'Mã đặt chỗ',
    bookingCodeHint: 'Nhập mã đặt chỗ được cấp khi hoàn tất đặt chỗ',
    bookingCodeRequired: 'Vui lòng nhập mã đặt chỗ',

    // Buttons
    verifyButton: 'Kiểm tra',
    verifyAnother: 'Kiểm tra khác',
    tryAgain: 'Thử lại',
    myTrips: 'Chuyến bay của tôi',

    // Loading
    loadingMessage: 'Đang kiểm tra trên blockchain...',

    // Success Messages
    verificationSuccess: 'Kiểm tra thành công',
    onChainStatus: 'Trạng thái On-chain',
    blockchainHash: 'Hash Blockchain (Keccak256)',
    walletAddress: 'Địa chỉ Ví',
    transactionHash: 'Hash Giao dịch',
    blockNumber: 'Số Block',
    confirmations: 'Số lần xác nhận',
    viewOnExplorer: 'Xem trên Sepolia Etherscan',
    explorerLink: 'Xem trên Explorer',

    // Error Messages
    verificationFailed: 'Kiểm tra thất bại',
    verificationError: 'Lỗi Kiểm tra',
    invalidBookingCode: 'Mã đặt chỗ không hợp lệ',
    bookingNotFound: 'Không tìm thấy đặt chỗ',
    bookingNotFoundMessage: 'Mã đặt chỗ không tồn tại. Vui lòng kiểm tra lại mã của bạn.',

    // Status Labels
    'RECORDED': 'Đã ghi chép',
    'CONFIRMED': 'Đã xác nhận',
    'PENDING': 'Chờ xác nhận',
    'NONE': 'Chưa ghi chép',
    'CANCELLED': 'Đã hủy',
    'UNKNOWN': 'Không xác định',

    // Data Integrity
    dataIntegrity: 'Tính toàn vẹn dữ liệu',
    integrityValid: 'Dữ liệu hợp lệ và không bị thay đổi',
    integrityAltered: 'Phát hiện dữ liệu đặt chỗ đã thay đổi trong database',
    integrityNoData: 'Chưa có dữ liệu kiểm tra toàn vẹn',

    // Info Sections
    whatIsBlockchain: 'Blockchain là gì?',
    blockchainExplanation: 'Blockchain là một công nghệ ghi chép dữ liệu phi tập trung. Trạng thái đặt chỗ của bạn được lưu trữ trên mạng Sepolia Testnet để đảm bảo tính bảo mật và minh bạch.',

    whatIsHash: 'Hash Blockchain là gì?',
    hashExplanation: 'Hash là một chuỗi ký tự duy nhất được tạo từ dữ liệu đặt chỗ. Nếu bất kỳ thông tin nào thay đổi, hash sẽ hoàn toàn khác, giúp phát hiện sự giả mạo.',

    // Quick guidance
    whereToFindBookingCode: 'Lấy mã đặt chỗ ở đâu?',
    findCodeStep1: 'Sau khi thanh toán thành công, mã đặt chỗ hiển thị ở trang xác nhận.',
    findCodeStep2: 'Bạn có thể xem lại trong mục Chuyến đi của tôi.',
    findCodeStep3: 'Mã thường có dạng SP2026 + dãy số.',

    // Shared Header/Footer Translations
    helpText: 'Trợ giúp',
    myTripsText: 'Chuyến đi của tôi',
    signInText: 'Đăng nhập',
    signUpText: 'Đăng ký',
    profileText: 'Hồ sơ cá nhân',
    verifyBookingMenuText: 'Kiểm tra đặt chỗ',
    myNftTicketsText: 'Vé NFT của tôi',
    mySkyTokensText: 'SKY Tokens của tôi',
    logoutText: 'Đăng xuất',
    // Footer shared
    footerDesc: 'Đối tác du lịch đáng tin cậy của bạn cho các ưu đãi vé máy bay tốt nhất và những hành trình khó quên.',
    quickLinksTitle: 'Liên kết nhanh',
    aboutUs: 'Về chúng tôi',
    contact: 'Liên hệ',
    privacyPolicy: 'Chính sách bảo mật',
    termsOfService: 'Điều khoản dịch vụ',
    supportTitle: 'Hỗ trợ',
    helpCenter: 'Trung tâm trợ giúp',
    blogLink: 'Blog',
    bookingHelp: 'Hỗ trợ đặt vé',
    faq: 'Câu hỏi thường gặp',
    promotion: 'Khuyến mãi',
    paymentMethodsTitle: 'Phương thức thanh toán',
    downloadAppTitle: 'Tải ứng dụng của chúng tôi',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    copyright: '© 2024 SkyPlan. Bảo lưu mọi quyền.'
  },

  en: {
    // Page Title and Headers
    verifyBookingTitle: 'Verify Booking',
    verifyBookingSubtitle: 'Enter your booking code to view the status on blockchain',

    // Form Labels
    bookingCodeLabel: 'Booking Code',
    bookingCodeHint: 'Enter the booking code provided when you completed your booking',
    bookingCodeRequired: 'Please enter a booking code',

    // Buttons
    verifyButton: 'Verify',
    verifyAnother: 'Verify Another',
    tryAgain: 'Try Again',
    myTrips: 'My Trips',

    // Loading
    loadingMessage: 'Verifying on blockchain...',

    // Success Messages
    verificationSuccess: 'Verification Successful',
    onChainStatus: 'On-chain Status',
    blockchainHash: 'Blockchain Hash (Keccak256)',
    walletAddress: 'Wallet Address',
    transactionHash: 'Transaction Hash',
    blockNumber: 'Block Number',
    confirmations: 'Confirmations',
    viewOnExplorer: 'View on Sepolia Etherscan',
    explorerLink: 'View on Explorer',

    // Error Messages
    verificationFailed: 'Verification Failed',
    verificationError: 'Verification Error',
    invalidBookingCode: 'Invalid booking code',
    bookingNotFound: 'Booking Not Found',
    bookingNotFoundMessage: 'The booking code does not exist. Please check your code again.',

    // Status Labels
    'RECORDED': 'Recorded',
    'CONFIRMED': 'Confirmed',
    'PENDING': 'Pending',
    'NONE': 'Not Recorded',
    'CANCELLED': 'Cancelled',
    'UNKNOWN': 'Unknown',

    // Data Integrity
    dataIntegrity: 'Data Integrity',
    integrityValid: 'Data is valid and unaltered',
    integrityAltered: 'Detected booking data alterations in the database',
    integrityNoData: 'No integrity data available',

    // Info Sections
    whatIsBlockchain: 'What is Blockchain?',
    blockchainExplanation: 'Blockchain is a decentralized data recording technology. Your booking status is stored on the Sepolia Testnet to ensure security and transparency.',

    whatIsHash: 'What is Blockchain Hash?',
    hashExplanation: 'A hash is a unique string of characters created from your booking data. If any information changes, the hash will be completely different, helping detect tampering.',

    // Quick guidance
    whereToFindBookingCode: 'Where can I find my booking code?',
    findCodeStep1: 'After successful payment, your booking code appears on the confirmation page.',
    findCodeStep2: 'You can also find it in My Trips.',
    findCodeStep3: 'The code usually looks like SP2026 followed by numbers.',

    // Shared Header/Footer Translations
    helpText: 'Help',
    myTripsText: 'My Trips',
    signInText: 'Sign In',
    signUpText: 'Sign Up',
    profileText: 'Profile',
    verifyBookingMenuText: 'Verify Booking',
    myNftTicketsText: 'My NFT Tickets',
    mySkyTokensText: 'My SKY Tokens',
    logoutText: 'Logout',
    // Footer shared
    footerDesc: 'Your trusted travel companion for the best flight deals and unforgettable journeys.',
    quickLinksTitle: 'Quick Links',
    aboutUs: 'About Us',
    contact: 'Contact',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    supportTitle: 'Support',
    helpCenter: 'Help Center',
    blogLink: 'Blog',
    bookingHelp: 'Booking Help',
    faq: 'FAQ',
    promotion: 'Promotions',
    paymentMethodsTitle: 'Payment Methods',
    downloadAppTitle: 'Download our app',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    copyright: '© 2024 SkyPlan. All rights reserved.'
  },
};

/**
 * Apply verify booking translations
 */
function applyVerifyBookingTranslations(language = 'vi') {
  const translations = verifyBookingTranslations[language] || verifyBookingTranslations['vi'];

  // Find all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translations[key];
      } else if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        // Preserve inner HTML for elements with icons
        const hasIcon = element.querySelector('i');
        if (hasIcon) {
          element.innerHTML = `${hasIcon.outerHTML}<span>${translations[key]}</span>`;
        } else {
          element.textContent = translations[key];
        }
      } else {
        element.textContent = translations[key];
      }
    }
  });
}

// Apply translations when DOM is ready if not already done
document.addEventListener('DOMContentLoaded', function () {
  if (document.querySelectorAll('[data-i18n]').length > 0) {
    const preferredLang = localStorage.getItem('preferredLanguage') || 'vi';
    if (typeof applyVerifyBookingTranslations === 'function') {
      setTimeout(() => applyVerifyBookingTranslations(preferredLang), 100);
    }
  }
});

// Export for use
window.applyVerifyBookingTranslations = applyVerifyBookingTranslations;
