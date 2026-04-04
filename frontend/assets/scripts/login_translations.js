// assets/scripts/login_translations.js
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
    console.error("[login-i18n] Cannot find global `translations`");
    return;
  }

  // LOGIN TRANSLATIONS
  var loginI18n = {
    en: {
      metaLoginTitle: "SkyPlan - Sign In",
      login: {
        backTitle: "Back to homepage",
        pageTitle: "Welcome back",
        pageSubtitle: "Sign in to continue your journey",
        emailLabel: "Email",
        emailPlaceholder: "Enter your email",
        passwordLabel: "Password",
        passwordPlaceholder: "Enter your password",
        togglePasswordLabel: "Show/Hide password",
        remember: "Remember me",
        forgot: "Forgot password?",
        loginBtn: "Sign In",
        or: "or",
        google: "Sign in with Google",
        facebook: "Sign in with Facebook",
        noAccount: "Don't have an account? ",
        signupNow: "Sign up now",
        successToast: "Login successful!",
        googleInfoToast: "Google sign in feature is under development",
        facebookInfoToast: "Facebook sign in feature is under development",
      },
    },
    vi: {
      metaLoginTitle: "SkyPlan - Đăng nhập",
      login: {
        backTitle: "Quay về trang chủ",
        pageTitle: "Chào mừng trở lại",
        pageSubtitle: "Đăng nhập để tiếp tục hành trình của bạn",
        emailLabel: "Email",
        emailPlaceholder: "Nhập email",
        passwordLabel: "Mật khẩu",
        passwordPlaceholder: "Nhập mật khẩu",
        togglePasswordLabel: "Hiện/Ẩn mật khẩu",
        remember: "Ghi nhớ đăng nhập",
        forgot: "Quên mật khẩu?",
        loginBtn: "Đăng nhập",
        or: "hoặc",
        google: "Đăng nhập với Google",
        facebook: "Đăng nhập với Facebook",
        noAccount: "Chưa có tài khoản? ",
        signupNow: "Đăng ký ngay",
        successToast: "Đăng nhập thành công!",
        googleInfoToast: "Tính năng đăng nhập với Google đang được phát triển",
        facebookInfoToast:
          "Tính năng đăng nhập với Facebook đang được phát triển",
      },
    },
  };

  // Flatten helpers: create both nested and flat keys like "login.xxx"
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
    // Login
    T[lang].metaLoginTitle = loginI18n[lang].metaLoginTitle;
    flatAssign(lang, "login", loginI18n[lang].login);
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

  // Apply placeholders/titles/aria + document.title for LOGIN
  function applyLoginExtras(lang) {
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      var val = getVal(lang, key);
      if (val) el.setAttribute("placeholder", val);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      var val = getVal(lang, key);
      if (val) el.setAttribute("title", val);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria-label");
      var val = getVal(lang, key);
      if (val) el.setAttribute("aria-label", val);
    });

    var metaLoginTitle = getVal(lang, "metaLoginTitle");
    if (metaLoginTitle) document.title = metaLoginTitle;
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

  // Init: apply translations for LOGIN page
  function initLoginLanguage() {
    var lang = getSavedLang();
    document.documentElement.lang = lang;

    // Apply data-i18n (if provided by base translation script)
    if (typeof window.applyTranslations === "function") {
      window.applyTranslations(lang);
    }

    applyLoginExtras(lang);
    updateActive(lang);

    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function (e) {
        var opt = e.target.closest(".lang-option");
        if (!opt) return;

        var newLang = opt.getAttribute("data-lang");

        if (typeof window.changeLanguage === "function") {
          // Delegate to global language changer (handles localStorage + applyTranslations)
          window.changeLanguage(newLang);
        } else {
          // Minimal fallback if changeLanguage() is not available
          try {
            localStorage.setItem("preferredLanguage", newLang);
          } catch {}
          document.documentElement.lang = newLang;
          if (typeof window.applyTranslations === "function") {
            window.applyTranslations(newLang);
          }
        }

        applyLoginExtras(newLang);
        updateActive(newLang);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", initLoginLanguage);
})();
