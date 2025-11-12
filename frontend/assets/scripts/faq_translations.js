const faqI18n = {
  vi: {
    metaTitle: "SkyPlan - Câu hỏi thường gặp",
    metaDescription:
      "Giải đáp nhanh về đặt vé, thanh toán, hành lý, đổi và hoàn vé.",
    // Heading
    faqTitle: "Câu hỏi thường gặp",
    searchLabel: "Tìm kiếm",
    searchPlaceholder: "Nhập từ khóa cần tìm...",
    searchBtn: "Tìm kiếm",
    clearSearch: "Xóa tìm kiếm",
    searchResults: "kết quả",
    noResults: "Không tìm thấy kết quả phù hợp.",
    // Categories
    catPopular: "Các câu hỏi thường gặp",
    catSchedule: "Lịch trình",
    catBooking: "Đặt vé",
    catPayment: "Thanh toán",
    catBaggage: "Hành lý",
    catChanges: "Đổi vé và Hoàn tiền",
  },
  en: {
    metaTitle: "SkyPlan - Frequently Asked Questions",
    metaDescription:
      "Quick answers about booking, payments, baggage, changes and refunds.",
    // Headings
    faqTitle: "Frequently Asked Questions",
    searchLabel: "Search",
    searchPlaceholder: "Enter Keywords to Search...",
    searchBtn: "Search",
    clearSearch: "Clear search",
    searchResults: "results",
    noResults: "No matching results found.",
    // Categories
    catPopular: "Most Popular Questions",
    catSchedule: "Schedules",
    catBooking: "Booking",
    catPayment: "Payment",
    catBaggage: "Baggage",
    catChanges: "Changes & Refunds",
  },
};

// Content
const faqContent = {
  vi: {
    popular: [
      {
        q: "Tôi có thể đổi chuyến bay như thế nào?",
        a: "Liên hệ hỗ trợ",
      },
      {
        q: "SkyPlan chấp nhận phương thức thanh toán nào?",
        a: "Hỗ trợ thanh toán VNPay, Visa, MasterCard,...",
      },
    ],
    schedule: [
      {
        q: "Tôi có thể xem các chuyến bay ở đâu?",
        a: "Tra cứu chuyến bay ở Trang chủ theo ngày và chặng.",
      },
    ],
    booking: [
      {
        q: "Làm sao đặt vé trên SkyPlan?",
        a: "Chọn hành trình, nhập thông tin, chọn hạng vé, dịch vụ thêm(nếu cần) và hoàn tất thanh toán.",
      },
      {
        q: "Tôi có thể đặt vé đi nước ngoài không?",
        a: "Không. Hiện tại SkyPlan chỉ hỗ trợ bay các chuyến nội địa.",
      },
    ],
    payment: [
      {
        q: "Thanh toán thất bại phải làm gì?",
        a: "Kiểm tra số dư hoặc kết nối, thử phương thức khác hoặc liên hệ hỗ trợ.",
      },
      {
        q: "SkyPlan chấp nhận phương thức thanh toán nào?",
        a: "Hỗ trợ thanh toán VNPay, Visa, MasterCard,...",
      },
    ],
    baggage: [
      {
        q: "Hành lý miễn cước gồm gì?",
        a: "Các hạng vé đều đã bao gồm 7kg hành lý xách tay và 23kg hành lý ký gửi. Có thể mua thêm trong “Dịch vụ thêm”.",
      },
      {
        q: "Có thể mua thêm hành lý không?",
        a: "Có, mua tại trang “Dịch vụ thêm” trong quá trình đặt vé.",
      },
    ],
    changes: [
      {
        q: "Làm sao đổi ngày hoặc giờ bay?",
        a: "Liên hệ hỗ trợ",
      },
      {
        q: "Chính sách hoàn tiền?",
        a: "Phụ thuộc điều kiện hạng vé. Xem chi tiết trong đặt chỗ hoặc liên hệ hỗ trợ để được tư vấn.",
      },
    ],
  },
  en: {
    popular: [
      {
        q: "How can I change my flight?",
        a: "Please contact support.",
      },
      {
        q: "What payment methods does SkyPlan accept?",
        a: "We support payment via VNPay, Visa, MasterCard, and more",
      },
    ],
    schedule: [
      {
        q: "Where can I see the flight schedule?",
        a: "You can search for flights on the Homepage by date and route.",
      },
    ],
    booking: [
      {
        q: "How do I book a ticket on SkyPlan?",
        a: "Select your itinerary, enter your information, choose a fare class, add extra services (if needed), and complete the payment.",
      },
      {
        q: "Can I book international flights?",
        a: "No. Currently, SkyPlan only supports domestic flights.",
      },
    ],
    payment: [
      {
        q: "What should I do if payment fails?",
        a: "Check your balance or connection, try another payment method, or contact support.",
      },
      {
        q: "What payment methods does SkyPlan accept?",
        a: "We support payment via VNPay, Visa, MasterCard, and more",
      },
    ],
    baggage: [
      {
        q: "What does the free baggage allowance include?",
        a: "All fare classes include 7kg of carry-on baggage and 23kg of checked baggage. You can purchase additional baggage in 'Extra Services'.",
      },
      {
        q: "Can I purchase additional baggage?",
        a: "Yes, you can purchase it on the 'Extra Services' page during the booking process.",
      },
    ],
    changes: [
      {
        q: "How do I change my flight date or time?",
        a: "Please contact support.",
      },
      {
        q: "What is the refund policy?",
        a: "Depends on fare conditions. See your booking details or contact support.",
      },
    ],
  },
};

// Apply labels
function applyFaqTranslations(lang) {
  // text nodes
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = faqI18n?.[lang]?.[key];
    if (typeof text === "string") el.textContent = text;
  });
  // placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = faqI18n?.[lang]?.[key];
    if (typeof text === "string") el.setAttribute("placeholder", text);
  });
  // title + meta
  document.title = faqI18n?.[lang]?.metaTitle || "SkyPlan - FAQ";
  const meta = document.querySelector('meta[name="description"]');
  if (meta)
    meta.setAttribute("content", faqI18n?.[lang]?.metaDescription || "");
}

(function () {
  const orig = window.changeLanguage;
  window.changeLanguage = function (lang) {
    try {
      if (typeof orig === "function") orig(lang);
    } catch (e) {}
    try {
      document.documentElement.lang = lang;
    } catch (e) {}
    try {
      applyFaqTranslations(lang);
    } catch (e) {}
    try {
      document.dispatchEvent(
        new CustomEvent("languageChanged", { detail: { lang } })
      );
    } catch (e) {}
  };
})();

try {
  if (typeof window !== "undefined") {
    window.faqI18n = faqI18n;
    window.faqContent = faqContent;
  }
} catch (e) {}
