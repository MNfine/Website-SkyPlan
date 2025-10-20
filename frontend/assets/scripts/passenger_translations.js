// assets/scripts/passenger_translations.js
(function () {
  if (typeof window === "undefined") return;

  // Passenger-specific i18n dictionary (independent from index translations)
  const P = {
    en: {
      title: "SkyPlan - Passenger Information",
      // Header button text 
      signInText: "Sign In",
      signUpText: "Sign Up",
      steps: [
        "Search",
        "Select flight",
        "Select fare",
        "Passenger info",
        "Extras",
        "Payment",
      ],
      passengerHeader: "PASSENGER INFORMATION",
      lbl: {
        lastname: "Last Name",
        firstname: "First Name",
        cccd: "National ID (CCCD/CMND)",
        dob: "Date of Birth",
        gender: "Gender",
        phone: "Phone Number",
        email: "Email",
        address: "Permanent Address",
        city: "City/Province",
        customCity: "Enter city/province",
        nationality: "Nationality",
        customNationality: "Enter your nationality",
        notes: "Notes",
      },
      ph: {
        lastname: "Enter last name",
        firstname: "Enter first name",
        cccd: "Enter ID number",
        dob: "DD/MM/YYYY",
        phone: "Enter phone number",
        email: "Enter email",
        address: "Enter your permanent address",
        city: "Select or enter city/province",
        customCity: "Enter your city/province",
        nationality: "Select or enter nationality",
        customNationality: "Enter your nationality",
        notes: "Enter notes (if any)",
      },
      gender: ["Select gender", "Male", "Female", "Other"],
      cityDefault: "Select city/province",
      cityOther: "Other",
      nationalityOther: "Other",
      other: "Other",
      notesCounter: "Up to 500 characters",
      terms: "I agree to the terms",
      submit: "Confirm information",
      successMessage: "Information verified successfully!",
      successDetail: "Data has been saved to Console.",
      cities: {
        "Hà Nội": "Hanoi",
        "Hồ Chí Minh": "Ho Chi Minh",
        "Đà Nẵng": "Da Nang",
        "Hải Phòng": "Hai Phong",
        "Cần Thơ": "Can Tho",
        "An Giang": "An Giang",
        "Bà Rịa - Vũng Tàu": "Ba Ria - Vung Tau",
        "Bắc Giang": "Bac Giang",
        "Bắc Kạn": "Bac Kan",
        "Bạc Liêu": "Bac Lieu",
        "Bắc Ninh": "Bac Ninh",
        "Bến Tre": "Ben Tre",
        "Bình Định": "Binh Dinh",
        "Bình Dương": "Binh Duong",
        "Bình Phước": "Binh Phuoc",
        "Bình Thuận": "Binh Thuan",
        "Cà Mau": "Ca Mau",
        "Cao Bằng": "Cao Bang",
        "Đắk Lắk": "Dak Lak",
        "Đắk Nông": "Dak Nong",
        "Điện Biên": "Dien Bien",
        "Đồng Nai": "Dong Nai",
        "Đồng Tháp": "Dong Thap",
        "Gia Lai": "Gia Lai",
        "Hà Giang": "Ha Giang",
        "Hà Nam": "Ha Nam",
        "Hà Tĩnh": "Ha Tinh",
        "Hải Dương": "Hai Duong",
        "Hậu Giang": "Hau Giang",
        "Hòa Bình": "Hoa Binh",
        "Hưng Yên": "Hung Yen",
        "Khánh Hòa": "Khanh Hoa",
        "Kiên Giang": "Kien Giang",
        "Kon Tum": "Kon Tum",
        "Lai Châu": "Lai Chau",
        "Lâm Đồng": "Lam Dong",
        "Lạng Sơn": "Lang Son",
        "Lào Cai": "Lao Cai",
        "Long An": "Long An",
        "Nam Định": "Nam Dinh",
        "Nghệ An": "Nghe An",
        "Ninh Bình": "Ninh Binh",
        "Ninh Thuận": "Ninh Thuan",
        "Phú Thọ": "Phu Tho",
        "Phú Yên": "Phu Yen",
        "Quảng Bình": "Quang Binh",
        "Quảng Nam": "Quang Nam",
        "Quảng Ngãi": "Quang Ngai",
        "Quảng Ninh": "Quang Ninh",
        "Quảng Trị": "Quang Tri",
        "Sóc Trăng": "Soc Trang",
        "Sơn La": "Son La",
        "Tây Ninh": "Tay Ninh",
        "Thái Bình": "Thai Binh",
        "Thái Nguyên": "Thai Nguyen",
        "Thanh Hóa": "Thanh Hoa",
        "Thừa Thiên Huế": "Thua Thien Hue",
        "Tiền Giang": "Tien Giang",
        "Trà Vinh": "Tra Vinh",
        "Tuyên Quang": "Tuyen Quang",
        "Vĩnh Long": "Vinh Long",
        "Vĩnh Phúc": "Vinh Phuc",
        "Yên Bái": "Yen Bai",
      },
      nationalities: {
        "Việt Nam": "Vietnam",
        "Lào": "Laos",
        "Campuchia": "Cambodia",
        "Thái Lan": "Thailand",
        "Singapore": "Singapore",
        "Malaysia": "Malaysia",
        "Indonesia": "Indonesia",
        "Philippines": "Philippines",
        "Myanmar": "Myanmar",
        "Brunei": "Brunei",
        "Hàn Quốc": "South Korea",
        "Nhật Bản": "Japan",
        "Trung Quốc": "China",
        "Hoa Kỳ": "United States",
        "Anh": "United Kingdom",
        "Pháp": "France",
        "Đức": "Germany",
        "Úc": "Australia",
        "Canada": "Canada",
        "Ấn Độ": "India",
        "Nga": "Russia",
        "Hà Lan": "Netherlands",
        "Ý": "Italy",
        "Tây Ban Nha": "Spain",
      },
      err: {
        required: "Please enter",
        cccdRequired: "Please enter National ID (CCCD/CMND)",
        cccdInvalid: "National ID must be 9 or 12 digits",
        dobRequired: "Please enter date of birth",
        dobFormat: "Date format: DD/MM/YYYY",
        dobParts: "Date format: DD/MM/YYYY",
        dobDay: "Invalid day (1-31)",
        dobMonth: "Invalid month (1-12)",
        dobYear: "Invalid year",
        dobAge: "Passenger must be at least 1 year old",
        genderRequired: "Please select gender",
        phoneRequired: "Please enter phone number",
        phoneInvalid: "Phone number must be 10 digits and start with 0",
        emailRequired: "Please enter email",
        emailInvalid: "Email format is incorrect",
        addressRequired: "Please enter permanent address",
        cityRequired: "Please select or enter city/province",
        nationalityRequired: "Please select or enter nationality",
        confirmRequired: "Please confirm information",
        nameNoSpecialChars: "cannot contain numbers or special characters",
        nameMinLength: "must be at least 2 characters",
        charCounter: "{count}/500 characters",
      },
    },
    vi: {
      title: "SkyPlan - Thông Tin Hành Khách",
      // Header button text 
      signInText: "Đăng nhập",
      signUpText: "Đăng ký",
      steps: [
        "Tìm kiếm",
        "Chọn chuyến bay",
        "Chọn giá",
        "Thông tin khách hàng",
        "Dịch vụ thêm",
        "Thanh toán",
      ],
      passengerHeader: "THÔNG TIN HÀNH KHÁCH",
      lbl: {
        lastname: "Họ",
        firstname: "Tên",
        cccd: "Số CCCD/CMND",
        dob: "Ngày sinh",
        gender: "Giới tính",
        phone: "Số điện thoại",
        email: "Email",
        address: "Địa chỉ thường trú",
        city: "Tỉnh/Thành phố",
        customCity: "Nhập tỉnh/thành phố",
        nationality: "Quốc tịch",
        customNationality: "Nhập quốc tịch của bạn",
        notes: "Ghi chú",
      },
      ph: {
        lastname: "Nhập họ",
        firstname: "Nhập tên",
        cccd: "Nhập số CCCD/CMND",
        dob: "DD/MM/YYYY",
        phone: "Nhập số điện thoại",
        email: "Nhập email",
        address: "Nhập địa chỉ thường trú",
        city: "Chọn hoặc nhập tỉnh/thành phố",
        customCity: "Nhập tỉnh/thành phố của bạn",
        nationality: "Chọn hoặc nhập quốc tịch",
        customNationality: "Nhập quốc tịch của bạn",
        notes: "Nhập ghi chú (nếu có)",
      },
      gender: ["Chọn giới tính", "Nam", "Nữ", "Khác"],
      cityDefault: "Chọn tỉnh/thành phố",
      cityOther: "Khác",
      nationalityOther: "Khác",
      other: "Khác",
      notesCounter: "Tối đa 500 ký tự",
      terms: "Tôi đồng ý với điều khoản",
      submit: "Xác nhận thông tin",
      successMessage: "Thông tin đã được xác nhận thành công!",
      successDetail: "Dữ liệu đã được ghi vào Console.",
      err: {
        required: "Vui lòng nhập",
        cccdRequired: "Vui lòng nhập số CCCD/CMND",
        cccdInvalid: "Số CCCD/CMND phải có 9 hoặc 12 số",
        dobRequired: "Vui lòng nhập ngày sinh",
        dobFormat: "Định dạng ngày sinh: DD/MM/YYYY",
        dobParts: "Định dạng ngày sinh: DD/MM/YYYY",
        dobDay: "Ngày không hợp lệ (1-31)",
        dobMonth: "Tháng không hợp lệ (1-12)",
        dobYear: "Năm không hợp lệ",
        dobAge: "Hành khách phải từ 1 tuổi trở lên",
        genderRequired: "Vui lòng chọn giới tính",
        phoneRequired: "Vui lòng nhập số điện thoại",
        phoneInvalid: "Số điện thoại phải có 10 số và bắt đầu bằng 0",
        emailRequired: "Vui lòng nhập email",
        emailInvalid: "Email không đúng định dạng",
        addressRequired: "Vui lòng nhập địa chỉ thường trú",
        cityRequired: "Vui lòng chọn hoặc nhập tỉnh/thành phố",
        nationalityRequired: "Vui lòng chọn hoặc nhập quốc tịch",
        confirmRequired: "Vui lòng xác nhận thông tin",
        nameNoSpecialChars: "không được chứa số hoặc ký tự đặc biệt",
        nameMinLength: "phải có ít nhất 2 ký tự",
        charCounter: "{count}/500 ký tự",
      },
    },
  };

  const q = (s) => document.querySelector(s);
  const get = (obj, key) =>
    key
      .split(".")
      .reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);

  // Replace the label's leading text while preserving the required asterisk element
  function setLabelKeepStar(el, text) {
    if (!el) return;
    let n = el.firstChild;
    while (n && n.nodeType === Node.TEXT_NODE && !n.nodeValue.trim())
      n = n.nextSibling;
    if (n && n.nodeType === Node.TEXT_NODE) n.nodeValue = text + " ";
    else
      el.insertBefore(
        document.createTextNode(text + " "),
        el.firstChild || null,
      );
  }

  // Apply translations to passenger page elements
  function applyPassengerDataI18N(lang) {
    const L = P[lang] || P.vi;

    // Update page title
    document.title = L.title;

    // Select elements within main content only
    const mainContent = document.querySelector("main.main-content");
    if (!mainContent) return;

    mainContent.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = get(L, key);
      if (val == null) return;

      // Labels: preserve required asterisk
      if (el.tagName === "LABEL") {
        setLabelKeepStar(el, String(val));
        return;
      }

      // Inputs/textarea: update placeholder or value
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.hasAttribute("placeholder")) {
          el.setAttribute("placeholder", String(val));
        } else {
          el.value = String(val);
        }
        return;
      }

      // Generic text nodes
      el.textContent = String(val);
    });

    // Progress steps
    const steps = document.querySelectorAll(".progress-step .step-label");
    steps.forEach((el, i) => {
      if (L.steps && L.steps[i] != null) el.textContent = L.steps[i];
    });

    // Notes character counter
    const notes = q("#notes"),
      counter = q(".char-counter");
    if (notes && counter) {
      const limit = 500;
      const update = () => {
        counter.textContent = `${notes.value ? notes.value.length : 0}/${limit}`;
      };
      notes.removeEventListener("input", update);
      notes.addEventListener("input", update);
      update();
    } else if (counter && L.notesCounter) {
      counter.textContent = L.notesCounter;
    }
    // Terms & submit button
    const terms = q(".checkbox-text");
    if (terms && L.terms) terms.textContent = L.terms;
    const btn = q(".btn-submit");
    if (btn && L.submit) btn.textContent = L.submit;
    if (btn && L.submit) btn.textContent = L.submit;

    // Update city dropdown options
    updateCityDropdown(lang);
    // Update nationality dropdown options
    updateNationalityDropdown(lang);
  }

  // Update city dropdown options based on language
  function updateCityDropdown(lang) {
    const citySelect = document.getElementById("city");
    if (!citySelect) return;

    const L = P[lang] || P.vi;

    // Update city options
    const options = citySelect.querySelectorAll("option");
    options.forEach((option) => {
      const viValue = option.value;
      if (viValue === "" || viValue === "other") return;

      if (lang === "en" && L.cities && L.cities[viValue]) {
        option.textContent = L.cities[viValue];
      } else {
        option.textContent = viValue;
      }
    });
  }

  // Update nationality dropdown options based on language
  function updateNationalityDropdown(lang) {
    const nationalitySelect = document.getElementById("nationality");
    if (!nationalitySelect) return;

    const L = P[lang] || P.vi;

    // Update nationality options
    const options = nationalitySelect.querySelectorAll("option");
    options.forEach((option) => {
      const viValue = option.value;
      if (viValue === "other") return;

      if (lang === "en" && L.nationalities && L.nationalities[viValue]) {
        option.textContent = L.nationalities[viValue];
      } else {
        option.textContent = viValue;
      }
    });
  }

  // Apply all translations
  function applyAll(lang) {
    document.documentElement.lang = lang;

    // Header/footer translations
    if (typeof window.applyTranslations === "function") {
      window.applyTranslations(lang);
    }

    // Passenger-specific translations
    applyPassengerDataI18N(lang);

    // Override header button text
    const L = P[lang] || P.vi;
    const signInBtn = document.querySelector('a[href="/login"]');
    const signUpBtn = document.querySelector('a[href="/register"]');

    if (signInBtn && L.signInText) signInBtn.textContent = L.signInText;
    if (signUpBtn && L.signUpText) signUpBtn.textContent = L.signUpText;

    // Update page title
    document.title = L.title;
  }

  // Initialize on page load
  function init() {
    // Set Vietnamese as default language
    try {
      localStorage.setItem("preferredLanguage", "vi");
    } catch {}

    const currentLang = "vi";
    applyAll(currentLang);

    // Re-apply translations when header/footer components load
    const debounce = (fn, ms = 70) => {
      let t;
      return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
      };
    };
    const rerender = debounce(() =>
      applyAll(localStorage.getItem("preferredLanguage") || "vi"),
    );

    const head = document.getElementById("header-container");
    const foot = document.getElementById("footer-container");
    if (head)
      new MutationObserver(rerender).observe(head, {
        childList: true,
        subtree: true,
      });
    if (foot)
      new MutationObserver(rerender).observe(foot, {
        childList: true,
        subtree: true,
      });
  }

  document.addEventListener("DOMContentLoaded", init);

  // Language switch handler
  document.addEventListener("click", (e) => {
    const opt = e.target.closest(".lang-option");
    if (!opt) return;
    const lang = opt.getAttribute("data-lang");
    if (!lang) return;

    try {
      localStorage.setItem("preferredLanguage", lang);
    } catch {}

    applyAll(lang);
    updateSelectedFlag(lang, opt);
  });

  // Update selected language flag and text in header dropdown
  function updateSelectedFlag(lang, srcOpt) {
    const selected = document.querySelector(".selected-lang");
    if (!selected) return;

    const src =
      srcOpt || document.querySelector(`.lang-option[data-lang="${lang}"]`);
    if (!src) return;

    // Update language code text (VI/EN)
    const langText = selected.querySelector("span:not([class*='flag'])");
    if (langText) {
      langText.textContent = lang.toUpperCase();
    }

    // Copy flag icon
    const srcFlag = src.querySelector('.flag, .lang-flag, [class*="flag"]');
    let dstIcon = selected.querySelector('.flag, .lang-flag, [class*="flag"]');

    if (srcFlag && dstIcon) {
      dstIcon.className = srcFlag.className;
    }

    // Highlight active language in dropdown
    document.querySelectorAll(".lang-option").forEach((el) =>
      el.classList.toggle("active", el.getAttribute("data-lang") === lang),
    );
  }

  // Export global functions
  window.applyPassengerLang = applyAll;
  window.passengerTranslations = P;
  window.getCurrentLang = () =>
    localStorage.getItem("preferredLanguage") || "vi";
})();