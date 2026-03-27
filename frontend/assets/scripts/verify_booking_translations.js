// Verify Booking Page Translations

const verifyBookingTranslations = {
  vi: {
    // Page Title and Headers
    verifyBookingTitle: 'Kiểm tra Đặt chỗ',
    verifyBookingSubtitle: 'Nhập mã đặt chỗ để xem trạng thái trên blockchain',

    // Form Labels
    bookingCodeLabel: 'Mã Đặt chỗ',
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

    // Info Sections
    whatIsBlockchain: 'Blockchain là gì?',
    blockchainExplanation: 'Blockchain là một công nghệ ghi chép dữ liệu phi tập trung. Trạng thái đặt chỗ của bạn được lưu trữ trên mạng Sepolia Testnet để đảm bảo tính bảo mật và minh bạch.',

    whatIsHash: 'Hash Blockchain là gì?',
    hashExplanation: 'Hash là một chuỗi ký tự duy nhất được tạo từ dữ liệu đặt chỗ. Nếu bất kỳ thông tin nào thay đổi, hash sẽ hoàn toàn khác, giúp phát hiện sự giả mạo.'
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

    // Info Sections
    whatIsBlockchain: 'What is Blockchain?',
    blockchainExplanation: 'Blockchain is a decentralized data recording technology. Your booking status is stored on the Sepolia Testnet to ensure security and transparency.',

    whatIsHash: 'What is Blockchain Hash?',
    hashExplanation: 'A hash is a unique string of characters created from your booking data. If any information changes, the hash will be completely different, helping detect tampering.'
  },

  zh: {
    // Page Title and Headers
    verifyBookingTitle: '查询预订',
    verifyBookingSubtitle: '输入您的预订代码以查看区块链上的状态',

    // Form Labels
    bookingCodeLabel: '预订代码',
    bookingCodeHint: '输入完成预订时提供的预订代码',
    bookingCodeRequired: '请输入预订代码',

    // Buttons
    verifyButton: '查询',
    verifyAnother: '查询其他',
    tryAgain: '重试',
    myTrips: '我的行程',

    // Loading
    loadingMessage: '正在区块链上验证...',

    // Success Messages
    verificationSuccess: '查询成功',
    onChainStatus: '链上状态',
    blockchainHash: '区块链哈希 (Keccak256)',
    walletAddress: '钱包地址',
    transactionHash: '交易哈希',
    blockNumber: '区块号',
    confirmations: '确认数',
    viewOnExplorer: '在 Sepolia Etherscan 查看',
    explorerLink: '在浏览器查看',

    // Error Messages
    verificationFailed: '查询失败',
    verificationError: '查询错误',
    invalidBookingCode: '无效的预订代码',
    bookingNotFound: '未找到预订',
    bookingNotFoundMessage: '预订代码不存在。请重新检查您的代码。',

    // Status Labels
    'RECORDED': '已记录',
    'CONFIRMED': '已确认',
    'PENDING': '待确认',
    'NONE': '未记录',
    'CANCELLED': '已取消',
    'UNKNOWN': '未知',

    // Info Sections
    whatIsBlockchain: '什么是区块链？',
    blockchainExplanation: '区块链是一种去中心化的数据记录技术。您的预订状态存储在Sepolia测试网上，以确保安全性和透明度。',

    whatIsHash: '什么是区块链哈希？',
    hashExplanation: '哈希是由您的预订数据生成的唯一字符串。如果任何信息更改，哈希将完全不同，有助于检测篡改。'
  },

  ja: {
    // Page Title and Headers
    verifyBookingTitle: '予約確認',
    verifyBookingSubtitle: '予約コードを入力してブロックチェーンのステータスを表示します',

    // Form Labels
    bookingCodeLabel: '予約コード',
    bookingCodeHint: '予約完了時に提供された予約コードを入力してください',
    bookingCodeRequired: '予約コードを入力してください',

    // Buttons
    verifyButton: '確認',
    verifyAnother: '別の予約を確認',
    tryAgain: 'もう一度試す',
    myTrips: '私の旅行',

    // Loading
    loadingMessage: 'ブロックチェーンで確認中...',

    // Success Messages
    verificationSuccess: '確認が完了しました',
    onChainStatus: 'オンチェーンステータス',
    blockchainHash: 'ブロックチェーンハッシュ（Keccak256）',
    walletAddress: 'ウォレットアドレス',
    transactionHash: 'トランザクションハッシュ',
    blockNumber: 'ブロック番号',
    confirmations: '確認数',
    viewOnExplorer: 'Sepolia Etherscanで表示',
    explorerLink: 'エクスプローラーで表示',

    // Error Messages
    verificationFailed: '確認に失敗しました',
    verificationError: '確認エラー',
    invalidBookingCode: '無効な予約コード',
    bookingNotFound: '予約が見つかりません',
    bookingNotFoundMessage: '予約コードは存在しません。コードを再度確認してください。',

    // Status Labels
    'RECORDED': '記録済み',
    'CONFIRMED': '確認済み',
    'PENDING': '保留中',
    'NONE': '記録なし',
    'CANCELLED': 'キャンセル済み',
    'UNKNOWN': '不明',

    // Info Sections
    whatIsBlockchain: 'ブロックチェーンとは？',
    blockchainExplanation: 'ブロックチェーンは分散型データ記録技術です。ご予約のステータスはセキュリティと透明性を確保するためにSepoliaテストネットに保存されます。',

    whatIsHash: 'ブロックチェーンハッシュとは？',
    hashExplanation: 'ハッシュは予約データから生成された一意の文字列です。情報が変更されると、ハッシュは完全に異なり、改ざんを検出するのに役立ちます。'
  }
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
