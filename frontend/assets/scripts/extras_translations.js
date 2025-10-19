const extrasI18n = {
  en: {
    step1: "Search",
    step2: "Select flight",
    step3: "Select fare",
    step4: "Passenger info",
    step5: "Extras",
    step6: "Payment",
    mealTitle: "Meals",
    mealDesc: "Standard meal for your flight.",
    baggageTitle: "Baggage",
    baggageDesc: "Add more baggage allowance.",
    servicesTitle: "Passenger services",
    servicesDesc: "Wheelchair, infant, senior support.",
    viewDetails: "View details",
    panelTitle: "Details",
    totalLabel: "Total",
    confirmSelection: "Confirm",
    backToPassenger: "Back",
    baggageIncluded: "Includes 7kg cabin + 23kg checked (free)",
  },
  vi: {
    step1: "Tìm kiếm",
    step2: "Chọn chuyến bay",
    step3: "Chọn giá",
    step4: "Thông tin khách hàng",
    step5: "Dịch vụ thêm",
    step6: "Thanh toán",
    mealTitle: "Suất ăn",
    mealDesc: "Suất ăn tiêu chuẩn cho chuyến bay.",
    baggageTitle: "Chọn hành lý",
    baggageDesc: "Lựa chọn gói hành lý phù hợp",
    servicesTitle: "Dịch vụ theo hành khách",
    servicesDesc: "Hỗ trợ xe lăn, trẻ em, người cao tuổi, người bệnh.",
    viewDetails: "Xem chi tiết",
    panelTitle: "Chi tiết",
    totalLabel: "Tổng",
    confirmSelection: "Xác nhận",
    backToPassenger: "Quay lại",
    baggageIncluded: "Bao gồm 7kg xách tay + 23kg ký gửi (miễn phí)",
  },
};

function applyExtrasTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = extrasI18n?.[lang]?.[key];
    if (text) el.textContent = text;
  });
  document.title =
    lang === "vi" ? "SkyPlan - Dich vu them" : "SkyPlan - Extra Services";
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute(
      "content",
      lang === "vi"
        ? "Chon dich vu them cho chuyen bay voi SkyPlan."
        : "Choose extra services for your flight with SkyPlan."
    );
  }
}

(function () {
  const origChangeLanguage = window.changeLanguage;
  window.changeLanguage = function (lang) {
    try {
      if (typeof origChangeLanguage === "function") origChangeLanguage(lang);
    } catch (e) {}
    try {
      document.documentElement.lang = lang;
      if (typeof applyExtrasTranslations === "function")
        applyExtrasTranslations(lang);
      if (typeof initRouteTitle === "function") initRouteTitle();
    } catch (e) {}
  };
})();

// Expose translations to other scripts (e.g., extras.js)
try {
  if (typeof window !== 'undefined') {
    window.extrasI18n = extrasI18n;
  }
} catch (e) { /* noop */ }
