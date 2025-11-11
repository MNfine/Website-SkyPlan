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
    servicesDesc: "Wheelchair, pet, senior support.",
    viewDetails: "View details",
    panelTitle: "Details",
    totalLabel: "Total",
    confirmSelection: "Confirm",
    backToPassenger: "Back",
    baggageIncluded: "Includes 7kg cabin + 23kg checked (free)",
    yourExtras: "Selected extras:",
    continuePayment: "Continue",
    meals: {
      meal_basic: "Basic combo",
      meal_standard: "Standard combo",
      meal_premium: "Premium combo",
    },
    mealItemDescs: {
      meal_basic: "Basic meal",
      meal_standard: "Standard meal",
      meal_premium: "Premium meal",
    },

    baggagePkgs: {
      0: "0kg",
      20: "20kg package",
      30: "30kg package",
      40: "40kg package",
    },
    baggageItemDescs: {
      0: "No additional checked baggage",
      20: "Add 20kg checked baggage",
      30: "Add 30kg checked baggage",
      40: "Add 40kg checked baggage",
    },
    services: {
      svc_wheelchair: "Wheelchair assist",
      svc_pet: "Pet support",
      svc_elderly: "Senior support",
    },
    serviceItemDescs: {
      svc_wheelchair: "Assistance for passengers with reduced mobility",
      svc_pet: "Support for traveling with pet",
      svc_elderly: "Care and assistance for seniors",
    },
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
    servicesDesc: "Hỗ trợ xe lăn, thú cưng, người cao tuổi.",
    viewDetails: "Xem chi tiết",
    panelTitle: "Chi tiết",
    totalLabel: "Tổng",
    confirmSelection: "Xác nhận",
    backToPassenger: "Quay lại",
    baggageIncluded: "Bao gồm 7kg xách tay + 23kg ký gửi (miễn phí)",
    yourExtras: "Dịch vụ đã chọn:",
    continuePayment: "Tiếp tục",
    meals: {
      meal_basic: "Suất ăn cơ bản",
      meal_standard: "Suất ăn tiêu chuẩn",
      meal_premium: "Suất ăn cao cấp",
    },
    mealItemDescs: {
      meal_basic: "Món ăn cơ bản",
      meal_standard: "Món ăn tiêu chuẩn",
      meal_premium: "Món ăn cao cấp",
    },

    baggagePkgs: {
      0: "0kg",
      20: "Gói 20kg",
      30: "Gói 30kg",
      40: "Gói 40kg",
    },
    baggageItemDescs: {
      0: "Không thêm hành lý ký gửi",
      20: "Thêm 20kg hành lý ký gửi",
      30: "Thêm 30kg hành lý ký gửi",
      40: "Thêm 40kg hành lý ký gửi",
    },

    services: {
      svc_wheelchair: "Hỗ trợ xe lăn",
      svc_pet: "Hỗ trợ thú cưng",
      svc_elderly: "Hỗ trợ người cao tuổi",
    },
    serviceItemDescs: {
      svc_wheelchair: "Hỗ trợ hành khách hạn chế di chuyển",
      svc_pet: "Hỗ trợ thú cưng",
      svc_elderly: "Chăm sóc và hỗ trợ người cao tuổi",
    },
  },
};

function applyExtrasTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = extrasI18n?.[lang]?.[key];
    if (text) el.textContent = text;
  });
  document.title =
    lang === "vi" ? "SkyPlan - Dịch vụ thêm" : "SkyPlan - Extra Services";
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute(
      "content",
      lang === "vi"
        ? "Chọn dịch vụ thêm cho chuyến bay với SkyPlan."
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
      if (typeof initRouteTitle === "function") initRouteTitle(lang);
    } catch (e) {}
  };
})();

try {
  if (typeof window !== "undefined") {
    window.extrasI18n = extrasI18n;
  }
} catch (e) {}
