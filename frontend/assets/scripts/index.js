// Index page-specific logic (no global init duplication)

(function () {
  let VI_DATE_MODE = false; // track if current language is Vietnamese for date display
  let TODAY_ISO = null;
  // City dictionary is provided by index_translations.js
  const CITY_LABELS = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) ? window.SKYPLAN_CITY_TRANSLATIONS : null;
  const CITY_CODES = CITY_LABELS ? Object.keys(CITY_LABELS.vi) : [];

  function buildOptions(selectEl, lang, defaultCode) {
    if (!selectEl) return;
    const prev = selectEl.value;
    if (!CITY_LABELS) return;
    const labels = CITY_LABELS[lang] || CITY_LABELS['vi'];
    const sorted = CITY_CODES
      .map(code => ({ code, label: labels[code] }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === 'vi' ? 'vi' : 'en', { sensitivity: 'base' }));
    selectEl.innerHTML = '';
    for (const c of sorted) {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.label;
      if (prev) {
        if (c.code === prev) opt.selected = true;
      } else if (defaultCode && c.code === defaultCode) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    }
  }

  function updateCityDropdowns(lang) {
    const fromEl = document.getElementById('from');
    const toEl = document.getElementById('to');
    buildOptions(fromEl, lang, 'HaNoi');
    buildOptions(toEl, lang, 'HoChiMinh');
  }

  function setDateMinAndDefaults() {
    const dep = document.getElementById('departure');
    const ret = document.getElementById('return');
    if (!dep || !ret) return;
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const todayISO = toISO(today);
    TODAY_ISO = todayISO;
    dep.min = todayISO;
    ret.min = todayISO;
    // Set sensible defaults if empty/old
    if (!dep.value || dep.value < todayISO) dep.value = todayISO;
    const retDefault = new Date(today);
    retDefault.setDate(retDefault.getDate() + 7);
    const retISO = toISO(retDefault);
    if (!ret.value || ret.value < dep.value) ret.value = retISO;

    // store iso values for localization display
    dep.dataset.isoValue = dep.value;
    ret.dataset.isoValue = ret.value;

    // keep return >= departure
    dep.addEventListener('change', () => {
      const d = (VI_DATE_MODE ? (dep.dataset.isoValue || dep.value) : dep.value);
      if (!d) return;
      ret.min = d;
      const retISO = VI_DATE_MODE ? (ret.dataset.isoValue || '') : ret.value;
      if (!retISO || retISO < d) {
        if (VI_DATE_MODE) {
          ret.dataset.isoValue = d;
          switchToTextDisplay(ret);
        } else {
          ret.value = d;
        }
      }
      dep.dataset.isoValue = d;
      if (!VI_DATE_MODE) {
        ret.dataset.isoValue = ret.value;
      }
    });
  }

  function setDateInputsLang(lang) {
    const dep = document.getElementById('departure');
    const ret = document.getElementById('return');
    if (dep) dep.setAttribute('lang', lang);
    if (ret) ret.setAttribute('lang', lang);
    applyDateLocalization(lang);
  }

  function applyDateLocalization(lang) {
    VI_DATE_MODE = (lang === 'vi');
    const dep = document.getElementById('departure');
    const ret = document.getElementById('return');
    if (!dep || !ret) return;

    bindDateLocalizationHandlers(dep);
    bindDateLocalizationHandlers(ret);

    // initial display based on current mode
    if (VI_DATE_MODE) {
      switchToTextDisplay(dep);
      switchToTextDisplay(ret);
    } else {
      switchToDateInput(dep);
      switchToDateInput(ret);
    }
  }

  function formatDDMMYYYY(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }

  function switchToTextDisplay(input) {
    if (!input) return;
    const iso = input.dataset.isoValue || input.value;
    if (iso) input.dataset.isoValue = iso;
    try { input.type = 'text'; } catch (e) {}
    input.value = formatDDMMYYYY(input.dataset.isoValue);
    input.placeholder = 'dd/mm/yyyy';
  }

  function switchToDateInput(input) {
    if (!input) return;
    const iso = input.dataset.isoValue || input.value;
    if (iso) input.dataset.isoValue = iso;
    try { input.type = 'date'; } catch (e) {}
    input.value = input.dataset.isoValue || '';
    input.placeholder = '';
  }

  function bindDateLocalizationHandlers(input) {
    if (!input || input.dataset.dateLocalizedBound === '1') return;
    // Vietnamese mode: show native date picker on focus, display DD/MM/YYYY on blur
    input.addEventListener('focus', () => {
      if (!VI_DATE_MODE) return;
      // switch to date to use native picker
      switchToDateInput(input);
      // re-apply min constraints when switching
      if (input.id === 'return') {
        const depISO = document.getElementById('departure')?.dataset.isoValue || TODAY_ISO;
        if (depISO) input.min = depISO;
      } else {
        if (TODAY_ISO) input.min = TODAY_ISO;
      }
      // Try open the picker where supported
      try { if (typeof input.showPicker === 'function') input.showPicker(); } catch (e) {}
    });
    input.addEventListener('input', () => {
      if (!VI_DATE_MODE) return;
      // when using native date picker, keep dataset in sync as user picks
      if (input.type === 'date') {
        input.dataset.isoValue = input.value;
      }
    });
    input.addEventListener('blur', () => {
      if (!VI_DATE_MODE) return;
      // persist iso value from the date input before switching
      if (input.type === 'date') {
        input.dataset.isoValue = input.value || input.dataset.isoValue || '';
      }
      sanitizeTextDate(input);
      // if departure blurred, update return min and clamp if needed
      const dep = document.getElementById('departure');
      const ret = document.getElementById('return');
      if (input === dep) {
        if (dep && dep.dataset.isoValue) {
          ret.min = dep.dataset.isoValue;
          // clamp return
          const retISO = ret.dataset.isoValue || ret.value;
          if (retISO && retISO < dep.dataset.isoValue) {
            ret.dataset.isoValue = dep.dataset.isoValue;
            switchToTextDisplay(ret);
          }
        }
      } else if (input === ret) {
        // ensure ret >= dep
        const depISO = dep && dep.dataset.isoValue ? dep.dataset.isoValue : TODAY_ISO;
        const retISO = ret.dataset.isoValue || '';
        if (depISO && retISO && retISO < depISO) {
          ret.dataset.isoValue = depISO;
          switchToTextDisplay(ret);
        }
      }
    });
    input.addEventListener('change', () => {
      if (!VI_DATE_MODE) return;
      // keep iso synced and normalize view
      if (input.type === 'date') input.dataset.isoValue = input.value;
      sanitizeTextDate(input);
    });
    input.dataset.dateLocalizedBound = '1';
  }

  function maskDDMMYYYY(input) {
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 8);
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    let out = dd;
    if (mm) out += '/' + mm;
    if (yyyy) out += '/' + yyyy;
    input.value = out;
  }

  function sanitizeTextDate(input) {
    const val = (input.value || '').trim();
    const iso = parseDDMMToISO(val) || input.dataset.isoValue || TODAY_ISO;
    // clamp to today if earlier
    const minISO = (input.id === 'return')
      ? (document.getElementById('departure')?.dataset.isoValue || TODAY_ISO)
      : TODAY_ISO;
    const finalISO = (!minISO || iso >= minISO) ? iso : minISO;
    input.dataset.isoValue = finalISO;
    switchToTextDisplay(input);
  }

  function parseDDMMToISO(text) {
    const m = (text || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 1000 || mo < 1 || mo > 12 || d < 1) return '';
    const daysInMonth = new Date(y, mo, 0).getDate();
    if (d > daysInMonth) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(mo)}-${pad(d)}`;
  }

  function setupPopularRoutesHover() {
    // purely CSS driven; nothing needed here for now
  }

  function setupAppPromoToast(lang) {
    const btn = document.querySelector('.app-btn');
    if (!btn) return;
    if (btn.dataset.toastBound === '1') return; // avoid duplicate listeners
    let lastShown = 0;
    const show = () => {
      const now = Date.now();
      if (now - lastShown < 1500) return; // throttle
      lastShown = now;
      // resolve language at the moment of hover/click to reflect latest selection
      const currentLang = (localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi');
      const message = (window.translations && window.translations[currentLang] && window.translations[currentLang].appComingSoon)
        ? window.translations[currentLang].appComingSoon
        : (currentLang === 'vi' ? 'Sắp ra mắt' : 'Coming soon');
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: 'info', duration: 2000 });
      } else {
        // fallback
        try { console.info(message); } catch (e) {}
      }
    };
    // Hover and click
    btn.addEventListener('mouseenter', show);
    btn.addEventListener('click', function (e) { e.preventDefault(); show(); });
    btn.dataset.toastBound = '1';
  }

  function initPageOnce() {
    const lang = (localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi');
    updateCityDropdowns(lang);
    setDateMinAndDefaults();
    setDateInputsLang(lang);
    initializeSearch();
    enableSmoothScrolling();
    setupPopularRoutesHover();
    setupAppPromoToast(lang);

    // ensure on submit we convert back to ISO/date type for proper values
    const form = document.querySelector('.search-box');
    if (form && !form.dataset.dateSubmitBound) {
      form.addEventListener('submit', () => {
        const dep = document.getElementById('departure');
        const ret = document.getElementById('return');
        if (dep) {
          if (VI_DATE_MODE) sanitizeTextDate(dep);
          dep.dataset.isoValue = dep.dataset.isoValue || dep.value;
          try { dep.type = 'date'; } catch (e) {}
          dep.value = dep.dataset.isoValue || dep.value;
        }
        if (ret) {
          if (VI_DATE_MODE) sanitizeTextDate(ret);
          ret.dataset.isoValue = ret.dataset.isoValue || ret.value;
          try { ret.type = 'date'; } catch (e) {}
          ret.value = ret.dataset.isoValue || ret.value;
        }
      });
      form.dataset.dateSubmitBound = '1';
    }
  }

  // Update UI on language change
  document.addEventListener('languageChanged', (e) => {
    const lang = e && e.detail && e.detail.lang ? e.detail.lang : (document.documentElement.lang || 'vi');
    updateCityDropdowns(lang);
    setDateInputsLang(lang);
    setupAppPromoToast(lang);
  });

  // DOM ready
  document.addEventListener('DOMContentLoaded', initPageOnce);
})();
