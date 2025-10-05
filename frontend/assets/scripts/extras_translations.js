const extrasI18n = {
  en: {
    step1: "Search",
    step2: "Select flight",
    step3: "Select fare",
    step4: "Passenger info",
    step5: "Extras",
    step6: "Payment",
    mealTitle: "Meal",
    mealDesc: "Standard meal for your flight.",
    baggageTitle: "Extra Large Baggage",
    baggageDesc: "Add more baggage allowance.",
    taxiTitle: "Airport Taxi",
    taxiDesc: "Pre-book your airport transfer.",
    addFor: "Add for",
    chosen: "Meal chosen",
    yourExtras: "Your extras:",
    continuePayment: "Continue to Payment",
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
    baggageTitle: "Hành lý cỡ lớn",
    baggageDesc: "Tăng giới hạn hành lý.",
    taxiTitle: "Taxi sân bay",
    taxiDesc: "Đặt xe đưa đón sân bay trước.",
    addFor: "Thêm với giá",
    chosen: "Đã chọn suất ăn",
    yourExtras: "Dịch vụ đã chọn:",
    continuePayment: "Tiếp tục thanh toán",
  },
};

function applyExtrasTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = extrasI18n?.[lang]?.[key];
    if (text) el.textContent = text;
  });
  document.title =
    lang === "vi" ? "SkyPlan – Dịch vụ thêm" : "SkyPlan – Extra Services";
  const meta = document.querySelector('meta[name="description"]');
  if (meta)
    meta.setAttribute(
      "content",
      lang === "vi"
        ? "Chọn dịch vụ thêm cho chuyến bay của bạn với SkyPlan."
        : "Choose extra services for your flight with SkyPlan."
    );
}
