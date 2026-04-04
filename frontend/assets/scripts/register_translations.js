// assets/scripts/register_translation.js
(function () {
  if (typeof window === "undefined") return;

  // Get translations from trans.js / index_translations.js
  var T;
  try {
    T = translations;
  } catch (e) {
    T = window.translations;
  }
  if (!T) {
    console.error("[register-i18n] Cannot find global `translations`");
    return;
  }

  // REGISTER TRANSLATIONS
  var regI18n = {
    en: {
      metaRegisterTitle: "SkyPlan - Sign Up",
      register: {
        backTitle: "Back to homepage",
        pageTitle: "Create a new account",
        pageSubtitle: "Register to start your journey",
        fullNameLabel: "Full name",
        fullNamePlaceholder: "Enter your full name",
        emailLabel: "Email",
        emailPlaceholder: "Enter your email",
        phoneLabel: "Phone number",
        phonePlaceholder: "Enter your phone number",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        confirmPasswordLabel: "Confirm password",
        confirmPasswordPlaceholder: "Re-enter your password",
        togglePasswordLabel: "Show/Hide password",
        agreeTextHTML:
          'I agree to the <a href="#" class="terms-link">Terms of Service</a> and <a href="#" class="terms-link">Privacy Policy</a>',
        registerBtn: "Sign Up",
        or: "or",
        google: "Sign up with Google",
        facebook: "Sign up with Facebook",
        haveAccount: "Already have an account? ",
        loginNow: "Sign in now",
        // Toast messages
        successToast: "Registration successful!",
        googleInfoToast: "Google sign up feature is under development",
        facebookInfoToast: "Facebook sign up feature is under development",
        // Error messages
        errorFullNameRequired: "Please enter your full name",
        errorFullNameInvalid: "Full name must have at least 2 words, each word at least 2 characters",
        errorEmailRequired: "Please enter your email",
        errorEmailInvalid: "Invalid email address",
        errorPhoneRequired: "Please enter your phone number",
        errorPhoneInvalid: "Invalid phone number (10-11 digits, starting with 0)",
        errorPasswordRequired: "Please enter your password",
        errorPasswordInvalid: "Password must be at least 8 characters, including uppercase, lowercase and number",
        errorConfirmPasswordRequired: "Please confirm your password",
        errorConfirmPasswordMismatch: "Passwords do not match",
        errorAgreeTerms: "Please agree to the terms and privacy policy",
      },
    },
    vi: {
      metaRegisterTitle: "SkyPlan - Đăng ký",
      register: {
        backTitle: "Quay về trang chủ",
        pageTitle: "Tạo tài khoản mới",
        pageSubtitle: "Đăng ký để bắt đầu hành trình của bạn",
        fullNameLabel: "Họ và tên",
        fullNamePlaceholder: "Nhập họ và tên",
        emailLabel: "Email",
        emailPlaceholder: "Nhập email",
        phoneLabel: "Số điện thoại",
        phonePlaceholder: "Nhập số điện thoại",
        passwordLabel: "Mật khẩu",
        passwordPlaceholder: "Nhập mật khẩu",
        confirmPasswordLabel: "Xác nhận mật khẩu",
        confirmPasswordPlaceholder: "Nhập lại mật khẩu",
        togglePasswordLabel: "Hiện/Ẩn mật khẩu",
        agreeTextHTML:
          'Tôi đồng ý với <a href="#" class="terms-link">Điều khoản sử dụng</a> và <a href="#" class="terms-link">Chính sách bảo mật</a>',
        registerBtn: "Đăng ký",
        or: "hoặc",
        google: "Đăng ký với Google",
        facebook: "Đăng ký với Facebook",
        haveAccount: "Đã có tài khoản? ",
        loginNow: "Đăng nhập ngay",
        // Toast messages
        successToast: "Đăng ký thành công!",
        googleInfoToast: "Tính năng đăng ký với Google đang được phát triển",
        facebookInfoToast: "Tính năng đăng ký với Facebook đang được phát triển",
        // Error messages
        errorFullNameRequired: "Vui lòng nhập họ và tên",
        errorFullNameInvalid: "Họ và tên phải có ít nhất 2 từ, mỗi từ ít nhất 2 ký tự",
        errorEmailRequired: "Vui lòng nhập email",
        errorEmailInvalid: "Email không hợp lệ",
        errorPhoneRequired: "Vui lòng nhập số điện thoại",
        errorPhoneInvalid: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)",
        errorPasswordRequired: "Vui lòng nhập mật khẩu",
        errorPasswordInvalid: "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
        errorConfirmPasswordRequired: "Vui lòng xác nhận mật khẩu",
        errorConfirmPasswordMismatch: "Mật khẩu không trùng khớp",
        errorAgreeTerms: "Vui lòng đồng ý với điều khoản và chính sách",
      },
    },
  };

  // Flatten helpers: create both nested and flat keys like "register.xxx"
  function ensureLang(lang) {
    if (!T[lang]) T[lang] = {};
  }

  function flatAssign(lang, prefix, obj) {
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];

      if (v && typeof v === "object" && !Array.isArray(v)) {
        flatAssign(lang, prefix ? prefix + "." + k : k, v);
      } else {
        // Write nested structure
        var parts = (prefix ? prefix + "." + k : k).split(".");
        var node = T[lang];
        for (var i = 0; i < parts.length - 1; i++) {
          node[parts[i]] = node[parts[i]] || {};
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = v;

        // Write flat key
        var flatKey = prefix ? prefix + "." + k : k;
        T[lang][flatKey] = v;
      }
    }
  }

  ["en", "vi"].forEach(function (lang) {
    ensureLang(lang);
    // Register
    T[lang].metaRegisterTitle = regI18n[lang].metaRegisterTitle;
    flatAssign(lang, "register", regI18n[lang].register);
  });

  // Read translation value
  function getVal(lang, key) {
    var dict = T[lang] || {};
    // Prefer flat keys
    if (dict[key] != null) return dict[key];
    // Fallback to nested traversal
    var parts = key.split(".");
    var node = dict;
    for (var i = 0; i < parts.length; i++) {
      if (node && typeof node === "object" && parts[i] in node) {
        node = node[parts[i]];
      } else {
        return "";
      }
    }
    return typeof node === "string" ? node : "";
  }

  // Apply all texts/placeholders for REGISTER
  function applyRegister(lang) {
    var R = function (k) {
      return getVal(lang, "register." + k);
    };

    // Title
    var title = getVal(lang, "metaRegisterTitle");
    if (title) document.title = title;

    // Back button title
    var backBtn = document.getElementById("backButton");
    if (backBtn) backBtn.setAttribute("title", R("backTitle"));

    // Header
    var pageTitle = document.querySelector(".page-title");
    if (pageTitle) pageTitle.textContent = R("pageTitle");

    var pageSubtitle = document.querySelector(".page-subtitle");
    if (pageSubtitle) pageSubtitle.textContent = R("pageSubtitle");

    // Labels
    var labels = document.querySelectorAll(".form-group .form-label");
    if (labels.length) {
      if (labels[0]) labels[0].textContent = R("fullNameLabel");
      if (labels[1]) labels[1].textContent = R("emailLabel");
      if (labels[2]) labels[2].textContent = R("phoneLabel");
      if (labels[3]) labels[3].textContent = R("passwordLabel");
      if (labels[4]) labels[4].textContent = R("confirmPasswordLabel");
    }

    // Placeholders
    var fullName = document.getElementById("fullName");
    if (fullName) fullName.placeholder = R("fullNamePlaceholder");

    var email = document.getElementById("email");
    if (email) email.placeholder = R("emailPlaceholder");

    var phone = document.getElementById("phone");
    if (phone) phone.placeholder = R("phonePlaceholder");

    var password = document.getElementById("password");
    if (password) password.placeholder = R("passwordPlaceholder");

    var confirmPassword = document.getElementById("confirmPassword");
    if (confirmPassword)
      confirmPassword.placeholder = R("confirmPasswordPlaceholder");

    // Toggle aria-labels
    var togglePassword = document.getElementById("togglePassword");
    if (togglePassword)
      togglePassword.setAttribute("aria-label", R("togglePasswordLabel"));

    var toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
    if (toggleConfirmPassword)
      toggleConfirmPassword.setAttribute(
        "aria-label",
        R("togglePasswordLabel")
      );

    // Terms (innerHTML, because it contains links)
    var agreeLabel = document.querySelector('label[for="agreeTerms"]');
    if (agreeLabel) agreeLabel.innerHTML = R("agreeTextHTML");

    // Submit button
    var btn = document.querySelector(".btn-primary[type='submit']");
    if (btn) btn.textContent = R("registerBtn");

    // Divider
    var dividerText = document.querySelector(".divider .divider-text");
    if (dividerText) dividerText.textContent = R("or");

    // Social buttons
    var googleSpan = document.querySelector("#btnGoogle span");
    if (googleSpan) googleSpan.textContent = R("google");

    var fbSpan = document.querySelector("#btnFacebook span");
    if (fbSpan) fbSpan.textContent = R("facebook");

    // Switch section
    var haveAccountSpan = document.querySelector(
      ".switch-page .switch-page-text"
    );
    if (haveAccountSpan) haveAccountSpan.textContent = R("haveAccount");

    var loginLink = document.querySelector(".switch-page .switch-page-link");
    if (loginLink) loginLink.textContent = R("loginNow");
  }

  // Toggle VI/EN state in the language switch
  function updateActive(lang) {
    document.querySelectorAll("#langToggle .lang-option").forEach(function (n) {
      n.classList.toggle("active", n.getAttribute("data-lang") === lang);
    });
  }

  function getSavedLang() {
    try {
      return localStorage.getItem("preferredLanguage") || "vi";
    } catch {
      return "vi";
    }
  }

  // Init: apply register translations
  function initRegisterLanguage() {
    var lang = getSavedLang();
    document.documentElement.lang = lang;

    // Apply data-i18n (if provided by base translation script)
    if (typeof window.applyTranslations === "function") {
      window.applyTranslations(lang);
    }

    var isRegister = !!document.getElementById("registerForm");

    if (isRegister) {
      applyRegister(lang);
      updateActive(lang);
    }

    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        var opt = e.target.closest(".lang-option");
        if (!opt) return;

        var newLang = opt.getAttribute("data-lang");

        if (typeof window.changeLanguage === "function") {
          // Delegate to global language changer
          window.changeLanguage(newLang);
        } else {
          // Minimal fallback
          try {
            localStorage.setItem("preferredLanguage", newLang);
          } catch {}
          document.documentElement.lang = newLang;
          if (typeof window.applyTranslations === "function") {
            window.applyTranslations(newLang);
          }
        }

        if (isRegister) applyRegister(newLang);

        updateActive(newLang);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", initRegisterLanguage);
})();
