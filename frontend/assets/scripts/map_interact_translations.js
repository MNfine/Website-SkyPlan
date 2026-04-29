(function () {
  const translations = {
    vi: {
      pageTitle: "SkyPlan - Khám phá sân bay",
      backHome: "Quay lại trang chủ",
      backHomeAria: "Quay về trang chủ",
      languageLabel: "Ngôn ngữ",
      languageVietnamese: "Việt",
      languageEnglish: "Anh",
      departureDateFilterAria: "Lọc theo ngày khởi hành",
      sidebarInitialTitle: "Chuyến bay từ SGN",
      allDepartureTimes: "mọi thời điểm khởi hành",
      flightsFrom: "Chuyến bay từ {origin}",
      flightsFromTo: "Chuyến bay từ {origin} đến {destination}",
      flightsOn: " vào {date}",
      flightsCount: "{count} chuyến bay",
      flightsCountOne: "1 chuyến bay",
      noRouteFlights: "Không tìm thấy chuyến bay cho chặng này.",
      noAirportDateFlights: "Không tìm thấy chuyến bay cho sân bay/ngày đã chọn.",
      noAirportFlights: "Không tìm thấy chuyến bay cho sân bay này.",
      unknownAirline: "Hãng bay không xác định",
      openFareAria: "Mở trang giá vé cho chuyến bay {flightNumber}",
      airportLabel: "Sân bay",
      provinceLabel: "Tỉnh/Thành phố",
      airportCodeLabel: "Mã sân bay"
    },
    en: {
      pageTitle: "SkyPlan Airport Explorer",
      backHome: "Back to home",
      backHomeAria: "Back to home page",
      languageLabel: "Language",
      languageVietnamese: "Vietnamese",
      languageEnglish: "English",
      departureDateFilterAria: "Filter by departure date",
      sidebarInitialTitle: "Flights from SGN",
      allDepartureTimes: "all departure times",
      flightsFrom: "Flights from {origin}",
      flightsFromTo: "Flights from {origin} to {destination}",
      flightsOn: " on {date}",
      flightsCount: "{count} flights",
      flightsCountOne: "1 flight",
      noRouteFlights: "No flights found for this route.",
      noAirportDateFlights: "No flights found for this airport/date.",
      noAirportFlights: "No flights found for this airport.",
      unknownAirline: "Unknown airline",
      openFareAria: "Open fare for flight {flightNumber}",
      airportLabel: "Airport",
      provinceLabel: "Province/City",
      airportCodeLabel: "Airport code"
    }
  };

  function resolveLanguage(lang) {
    return String(lang || "").toLowerCase() === "en" ? "en" : "vi";
  }

  function getStoredLanguage() {
    return resolveLanguage(localStorage.getItem("preferredLanguage") || localStorage.getItem("language") || "vi");
  }

  function persistLanguage(lang) {
    localStorage.setItem("preferredLanguage", lang);
    localStorage.setItem("language", lang);
  }

  function translate(lang, key, params = {}) {
    const dictionary = translations[resolveLanguage(lang)] || translations.vi;
    let text = dictionary[key] || translations.vi[key] || key;
    Object.entries(params).forEach(([token, value]) => {
      text = text.replace(new RegExp(`\\{${token}\\}`, "g"), String(value ?? ""));
    });
    return text;
  }

  function initMapInteractLanguage(options = {}) {
    const state = {
      language: getStoredLanguage(),
    };

    const backButton = options.backButton || null;
    const sidebarTitle = options.sidebarTitle || null;
    const dateFilter = options.dateFilter || null;
    const languageSwitcher = options.languageSwitcher || null;
    const languageLabel = options.languageLabel || null;
    const languageSelect = options.languageSelect || null;
    const languageOptionVi = options.languageOptionVi || null;
    const languageOptionEn = options.languageOptionEn || null;
    const onLanguageChange = typeof options.onLanguageChange === "function" ? options.onLanguageChange : null;

    function t(key, params = {}) {
      return translate(state.language, key, params);
    }

    function applyStaticTranslations() {
      document.title = t("pageTitle");
      document.documentElement.lang = state.language;

      if (backButton) {
        backButton.innerHTML = `<span aria-hidden="true">←</span> ${t("backHome")}`;
        backButton.setAttribute("aria-label", t("backHomeAria"));
      }

      if (languageLabel) {
        languageLabel.textContent = t("languageLabel");
      }

      if (languageOptionVi) {
        languageOptionVi.textContent = t("languageVietnamese");
      }

      if (languageOptionEn) {
        languageOptionEn.textContent = t("languageEnglish");
      }

      if (languageSelect) {
        languageSelect.value = state.language;
        languageSelect.setAttribute("aria-label", t("languageLabel"));
      }

      if (dateFilter) {
        dateFilter.setAttribute("aria-label", t("departureDateFilterAria"));
      }

      if (sidebarTitle) {
        sidebarTitle.textContent = t("sidebarInitialTitle");
      }
    }

    function commitLanguage(nextLang, options = {}) {
      const normalized = resolveLanguage(nextLang);
      const previous = state.language;
      if (normalized === previous && options.force !== true) {
        return state.language;
      }

      state.language = normalized;

      if (options.persist !== false) {
        persistLanguage(normalized);
      }

      applyStaticTranslations();

      if (onLanguageChange) {
        onLanguageChange(state.language, previous);
      }

      if (options.broadcast !== false) {
        try {
          document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang: state.language } }));
        } catch (_) {
          // ignore
        }
      }

      return state.language;
    }

    if (options.hideInEmbed) {
      if (backButton) {
        backButton.style.display = "none";
      }

      if (languageSwitcher) {
        languageSwitcher.style.display = "none";
      }
    }

    if (languageSelect) {
      languageSelect.addEventListener("change", (event) => {
        commitLanguage(event.target.value, { persist: true, broadcast: true });
      });
    }

    document.addEventListener("languageChanged", (event) => {
      const nextLang = event?.detail?.lang || event?.detail?.language;
      if (!nextLang) return;
      commitLanguage(nextLang, { persist: false, broadcast: false });
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== "preferredLanguage" && event.key !== "language") return;
      commitLanguage(event.newValue, { persist: false, broadcast: false });
    });

    applyStaticTranslations();

    return {
      getLanguage: () => state.language,
      setLanguage: (nextLang, options = {}) => commitLanguage(nextLang, options),
      t,
      applyStaticTranslations,
    };
  }

  window.SkyPlanMapI18n = {
    translations,
    resolveLanguage,
    getStoredLanguage,
    persistLanguage,
    translate,
    initMapInteractLanguage,
  };
})();
