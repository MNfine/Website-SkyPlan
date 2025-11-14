// Quiet mode: suppress non-essential console output unless debugging flag is enabled.
// Set window.SKYPLAN_DEBUG = true in the console to re-enable logs.
(function(){
  try {
    if (!window.SKYPLAN_DEBUG) {
      console._orig = console._orig || {};
      ['log','info','debug'].forEach(function(m){ if (!console._orig[m]) console._orig[m]=console[m]; console[m]=function(){}; });
    }
  } catch(e){}
})();

// Key lưu state extras
const STORAGE_KEY = "skyplan_extras_v2";
const DEFAULT_EXTRAS = {
  meals: [],
  baggage: { kg: 0 },
  services: [],
  total: 0,
};

// Extras state management for booking flow integration
const ExtrasState = {
  // Get current extras selection
  getSelection: function() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {...DEFAULT_EXTRAS};
    } catch {
      return {...DEFAULT_EXTRAS};
    }
  },
  
  // Save extras selection
  saveSelection: function(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save extras selection:', e);
    }
  },
  
  // Get formatted summary for other pages
  getSummary: function() {
    const state = this.getSelection();
    const summary = {
      meals: [],
      baggage: null,
      services: [],
      totalCost: state.total || 0
    };
    
    // Format meals
    const mealCatalog = MEALS.reduce((m, x) => ((m[x.id] = x), m), {});
    summary.meals = (state.meals || []).map(m => ({
      id: m.id,
      name: mealCatalog[m.id]?.name || 'Unknown meal',
      quantity: m.qty || 0,
      price: mealCatalog[m.id]?.price || 0
    }));
    
    // Format baggage
    if (state.baggage && state.baggage.kg > 0) {
      const pkg = BAGGAGE_PKGS.find(p => p.kg === state.baggage.kg);
      if (pkg) {
        summary.baggage = {
          kg: pkg.kg,
          label: pkg.label,
          price: pkg.price
        };
      }
    }
    
    // Format services
    summary.services = (state.services || []).map(serviceId => {
      const service = SERVICES.find(s => s.id === serviceId);
      return service ? {
        id: service.id,
        label: service.label,
        price: service.price
      } : null;
    }).filter(Boolean);
    
    return summary;
  },
  
  // Validate selection (optional - all extras are optional)
  isValid: function() {
    return true; // Extras are always optional
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderFooter().then(initializeLanguage);
  bindDetailsButtons();
  initDrawer();
  updateTotalsUI(getState());
  setupContinueButton();
});

// Setup continue button for navigation to overview/payment
function setupContinueButton() {
  // Wait a bit for DOM to be fully ready
  setTimeout(() => {
    const continueBtn = document.querySelector('#toPaymentBtn, .continue-btn, .btn-continue, a[href*="overview"], button[onclick*="overview"]');
    if (continueBtn) {
      // Update the href to include current URL parameters
      const currentParams = new URLSearchParams(window.location.search);
      if (continueBtn.href && continueBtn.href.includes('overview.html')) {
        continueBtn.href = 'overview.html?' + currentParams.toString();
      }
      
      // Override the onclick to ensure data is saved before navigation
      const originalOnclick = continueBtn.onclick;
      continueBtn.onclick = function(e) {
        // Ensure current state is saved
        const currentState = getState();
        ExtrasState.saveSelection(currentState);
        
        // Show confirmation toast if extras were selected
        if (currentState.total > 0) {
          const lang = localStorage.getItem('preferredLanguage') || 'vi';
          const message = lang === 'vi' 
            ? `Đã lưu dịch vụ bổ sung: ${formatVND(currentState.total)}` 
            : `Extras saved: ${formatVND(currentState.total)}`;
          
          if (typeof showToast === 'function') {
            showToast(message, { type: 'success', duration: 2000 });
          }
        }
        
        // Call original onclick if exists
        if (originalOnclick) {
          return originalOnclick.call(this, e);
        }
      };
    }
  }, 500);
}

function loadHeaderFooter() {
  return new Promise((resolve) => {
    // Header
    fetch("components/header.html")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        document.getElementById("header-container").innerHTML = html;
        if (typeof initializeMobileMenu === "function") initializeMobileMenu();
        resolve();
      })
      .catch(() => resolve());

    // Footer
    fetch("components/footer.html")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        document.getElementById("footer-container").innerHTML = html;
      })
      .catch(() => {});
  });
}

function initializeLanguage() {
  const currentLang = localStorage.getItem("preferredLanguage") || "vi";
  document.documentElement.lang = currentLang;
  if (typeof applyTranslations === "function") {
    try {
      applyTranslations(currentLang);
    } catch (e) {}
  }
  if (typeof applyExtrasTranslations === "function")
    applyExtrasTranslations(currentLang);
  if (typeof initRouteTitle === "function") initRouteTitle(currentLang);
  document.addEventListener("languageChanged", (ev) => {
    const lang = ev?.detail?.lang || currentLang;
    applyExtrasTranslations?.(lang);
    initRouteTitle(lang);
  });

  if (typeof initializeLanguageSelector === "function")
    initializeLanguageSelector();
  document.addEventListener("languageChanged", (ev) => {
    const lang = (ev && ev.detail && ev.detail.lang) || currentLang;
    try {
      if (typeof applyTranslations === "function") applyTranslations(lang);
      if (typeof applyExtrasTranslations === "function")
        applyExtrasTranslations(lang);
      if (typeof initRouteTitle === "function") initRouteTitle(lang);
    } catch (e) {}
  });
}

function formatVND(val) {
  return new Intl.NumberFormat("vi-VN").format(val || 0) + " VND";
}

function resolveCityLabel(raw, lang) {
  if (!raw) return "";
  const CITY_MAP =
    typeof window !== "undefined" && window.SKYPLAN_CITY_TRANSLATIONS
      ? window.SKYPLAN_CITY_TRANSLATIONS
      : {};
  const dict = CITY_MAP[lang] || {};
  const viMap = CITY_MAP.vi || {};
  const enMap = CITY_MAP.en || {};
  const val = String(raw).trim();
  if (!val) return "";
  if (
    Object.prototype.hasOwnProperty.call(viMap, val) ||
    Object.prototype.hasOwnProperty.call(enMap, val) ||
    Object.prototype.hasOwnProperty.call(dict, val)
  ) {
    return dict[val] || val;
  }
  const mapsToCheck = [viMap, enMap];
  for (const m of mapsToCheck) {
    for (const code of Object.keys(m)) {
      const label = (m[code] || "").toString();
      if (label && label.toLowerCase() === val.toLowerCase()) {
        return dict[code] || m[code];
      }
    }
  }

  return val;
}

function readRouteParts() {
  const usp = new URLSearchParams(window.location.search || "");
  const fromParam = usp.get("from");
  const toParam = usp.get("to");
  const fromLS =
    localStorage.getItem("booking_from") || localStorage.getItem("route_from");
  const toLS =
    localStorage.getItem("booking_to") || localStorage.getItem("route_to");
  return { fromRaw: fromParam || fromLS || "", toRaw: toParam || toLS || "" };
}

function initRouteTitle(langOverride) {
  const lang =
    langOverride ||
    localStorage.getItem("preferredLanguage") ||
    document.documentElement.lang ||
    "vi";
  const { fromRaw, toRaw } = readRouteParts();
  const CITY_MAP =
    typeof window !== "undefined" && window.SKYPLAN_CITY_TRANSLATIONS
      ? window.SKYPLAN_CITY_TRANSLATIONS
      : {};
  const dict = CITY_MAP[lang] || {};

  // Fallback mặc định
  const defaultFromCode = "HaNoi";
  const defaultToCode = "HoChiMinh";
  const fallbackFrom =
    dict[defaultFromCode] || (lang === "vi" ? "Hà Nội" : "Ha Noi");
  const fallbackTo =
    dict[defaultToCode] || (lang === "vi" ? "Hồ Chí Minh" : "Ho Chi Minh");

  const from = resolveCityLabel(fromRaw, lang) || fallbackFrom;
  const to = resolveCityLabel(toRaw, lang) || fallbackTo;

  const el = document.getElementById("routeTitle");
  if (!el) return;
  const phrase =
    lang === "vi" ? { from: "Từ", to: "tới" } : { from: "From", to: "to" };
  el.textContent = `${phrase.from} ${from} ${phrase.to} ${to}`;
}

function getState() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || { ...DEFAULT_EXTRAS }
    );
  } catch {
    return { ...DEFAULT_EXTRAS };
  }
}
function setState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  updateTotalsUI(next);
}
function calcTotal(state) {
  const mealCatalog = MEALS.reduce((m, x) => ((m[x.id] = x), m), {});
  const mealTotal = (state.meals || []).reduce(
    (s, m) => s + (mealCatalog[m.id]?.price || 0) * (m.qty || 0),
    0
  );
  const pkg = BAGGAGE_PKGS.find((p) => p.kg === (state.baggage?.kg || 0));
  const bagTotal = pkg ? pkg.price : 0;
  const servicesTotal = (state.services || []).reduce(
    (s, id) => s + (SERVICES.find((x) => x.id === id)?.price || 0),
    0
  );
  return mealTotal + bagTotal + servicesTotal;
}
function updateTotalsUI(state) {
  const total = calcTotal(state);
  state.total = total;
  const a = document.getElementById("extrasTotal");
  const b = document.getElementById("drawerTotal");
  if (a) a.textContent = formatVND(total);
  if (b) b.textContent = formatVND(total);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
// Meal
const MEALS = [
  {
    id: "meal_basic",
    name: "Basic combo",
    price: 120000,
    img: "assets/images/basic_meal.svg",
    desc: "Basic meal",
  },
  {
    id: "meal_standard",
    name: "Standard combo",
    price: 150000,
    img: "assets/images/standard_meal.svg",
    desc: "Standard meal",
  },
  {
    id: "meal_premium",
    name: "Premium combo",
    price: 200000,
    img: "assets/images/premium_meal.svg",
    desc: "Premium meal",
  },
];

//Baggage packages
const BAGGAGE_PKGS = [
  {
    kg: 0,
    label: "0kg",
    price: 0,
    img: "assets/images/baggage_add.svg",
    desc: "No additional checked baggage",
  },
  {
    kg: 20,
    label: "20kg",
    price: 200000,
    img: "assets/images/baggage_add.svg",
    desc: "Add 20kg checked baggage",
  },
  {
    kg: 30,
    label: "30kg",
    price: 300000,
    img: "assets/images/baggage_add.svg",
    desc: "Add 30kg checked baggage",
  },
  {
    kg: 40,
    label: "40kg",
    price: 400000,
    img: "assets/images/baggage_add.svg",
    desc: "Add 40kg checked baggage",
  },
];

// Services
const SERVICES = [
  {
    id: "svc_wheelchair",
    label: "Wheelchair assist",
    price: 200000,
    img: "assets/images/service_wheelchair.svg",
    desc: "Assist for reduced mobility",
  },
  {
    id: "svc_pet",
    label: "Pet support",
    price: 300000,
    img: "assets/images/service_pet.svg",
    desc: "Support for your pet",
  },
  {
    id: "svc_elderly",
    label: "Senior support",
    price: 400000,
    img: "assets/images/service_elderly.svg",
    desc: "Assistance for seniors",
  },
];

function bindDetailsButtons() {
  document
    .querySelectorAll('.extra-card__btn[data-action="details"]')
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".extra-card");
        const type = card?.dataset.type; // meal | baggage | services
        if (type) openDrawer(type);
      });
    });
}

function updateTotalUI(total) {
  const el = document.getElementById("extrasTotal");
  if (el) el.textContent = formatVND(total || 0);
}

/* --- Drawer Panel Logic --*/
function initDrawer() {
  const panel = document.getElementById("extras-panel");
  const backdrop = document.getElementById("extras-backdrop");
  const closeBtn = document.getElementById("drawerClose");
  const confirmBtn = document.getElementById("drawerConfirm");
  if (!panel || !backdrop || !closeBtn) return;

  window.openDrawer = function (type) {
    renderDrawerContent(type);
    backdrop.hidden = false;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    (closeBtn || panel).focus();
  };
  window.closeDrawer = function () {
    backdrop.hidden = true;
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
  };
  closeBtn.addEventListener("click", window.closeDrawer);
  backdrop.addEventListener("click", window.closeDrawer);
  if (confirmBtn) confirmBtn.addEventListener("click", window.closeDrawer);
}

function renderDrawerContent(type) {
  const wrap = document.getElementById("drawerContent");
  const title = document.getElementById("drawerTitle");
  const lang = document.documentElement.lang || "vi";
  const __extrasI18n =
    typeof window !== "undefined" && window.extrasI18n
      ? window.extrasI18n
      : typeof extrasI18n !== "undefined"
      ? extrasI18n
      : null;
  const t = (k) =>
    __extrasI18n && __extrasI18n[lang] && __extrasI18n[lang][k]
      ? __extrasI18n[lang][k]
      : k;
  const state = getState();
  if (!wrap) return;

  title && (title.textContent = t("panelTitle"));

  if (type === "meal") {
    wrap.innerHTML = `
  <div class="meal-list">
    ${MEALS.map((m) => {
      const name = window.extrasI18n?.[lang]?.meals?.[m.id] || m.name;
      const desc =
        window.extrasI18n?.[lang]?.mealItemDescs?.[m.id] || m.desc || "";
      const img = m.img || "assets/images/meal.png"; // fallback
      return `
        <div class="meal-row" data-id="${m.id}">
          <img class="meal-thumb" src="${img}" alt="${name}" />
          <div class="meal-info">
            <div class="meal-name">${name}</div>
            <div class="meal-desc">${desc}</div>
          </div>
          <div class="meal-price">${formatVND(m.price)}</div>
          <div class="meal-qty">
            <button class="qty-minus" aria-label="minus">-</button>
            <span class="qty-val">${
              state.meals.find((x) => x.id === m.id)?.qty || 0
            }</span>
            <button class="qty-plus" aria-label="plus">+</button>
          </div>
        </div>`;
    }).join("")}
  </div>
`;

    wrap.querySelectorAll(".meal-row").forEach((row) => {
      const id = row.getAttribute("data-id");
      row.querySelector(".qty-minus").addEventListener("click", () => {
        const st = getState();
        const cur = st.meals.find((x) => x.id === id) || { id, qty: 0 };
        cur.qty = Math.max(0, (cur.qty || 0) - 1);
        if (cur.qty === 0) st.meals = st.meals.filter((x) => x.id !== id);
        else {
          const i = st.meals.findIndex((x) => x.id === id);
          if (i >= 0) st.meals[i] = cur;
          else st.meals.push(cur);
        }
        setState(st);
        renderDrawerContent("meal");
      });
      row.querySelector(".qty-plus").addEventListener("click", () => {
        const st = getState();
        const cur = st.meals.find((x) => x.id === id) || { id, qty: 0 };
        cur.qty = (cur.qty || 0) + 1;
        const i = st.meals.findIndex((x) => x.id === id);
        if (i >= 0) st.meals[i] = cur;
        else st.meals.push(cur);
        setState(st);
        renderDrawerContent("meal");
      });
    });
  } else if (type === "baggage") {
    wrap.innerHTML = `
    <div class="baggage-included">${t("baggageIncluded")}</div>
    <div class="baggage-list">
      ${BAGGAGE_PKGS.map((b) => {
        const isActive = b.kg === (state.baggage?.kg || 0);
        const title =
          window.extrasI18n?.[lang]?.baggagePkgs?.[String(b.kg)] || b.label;
        const desc =
          window.extrasI18n?.[lang]?.baggageItemDescs?.[String(b.kg)] ||
          b.desc ||
          "";
        const img = b.img || "assets/images/baggage_add.svg";
        const btnText = isActive
          ? lang === "vi"
            ? "Đã thêm"
            : "Added"
          : lang === "vi"
          ? "Thêm"
          : "Add";
        const priceText = b.price
          ? formatVND(b.price)
          : lang === "vi"
          ? "Miễn phí"
          : "Free";
        return `
          <div class="baggage-card ${isActive ? "active" : ""}" data-kg="${
          b.kg
        }">
            <img class="baggage-thumb" src="${img}" alt="${title}" />
            <div class="baggage-info">
              <div class="baggage-title">${title}</div>
              <div class="baggage-desc">${desc}</div>
            </div>
            <div class="baggage-price">${priceText}</div>
            <button class="baggage-choose ${
              isActive ? "on" : ""
            }" aria-pressed="${isActive}">${btnText}</button>
          </div>`;
      }).join("")}
    </div>
  `;
    wrap.querySelectorAll(".baggage-choose").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".baggage-card");
        const kg = Number(card?.dataset.kg || 0);
        const st = getState();
        st.baggage = { kg };
        setState(st);
        renderDrawerContent("baggage");
      });
    });
  } else if (type === "services") {
    wrap.innerHTML = `
    <div class="services-list">
      ${SERVICES.map((s) => {
        const title = window.extrasI18n?.[lang]?.services?.[s.id] || s.label;
        const desc =
          window.extrasI18n?.[lang]?.serviceItemDescs?.[s.id] || s.desc || "";
        const img = s.img || "assets/images/service.svg";
        const isOn = (getState().services || []).includes(s.id);
        const btn = isOn
          ? lang === "vi"
            ? "Đã thêm"
            : "Added"
          : lang === "vi"
          ? "Thêm"
          : "Add";
        return `
          <div class="service-card ${isOn ? "selected" : ""}" data-id="${s.id}">
            <img class="service-thumb" src="${img}" alt="${title}" />
            <div class="service-info">
              <div class="service-title">${title}</div>
              <div class="service-desc">${desc}</div>
            </div>
            <div class="service-price">${formatVND(s.price)}</div>
            <button class="service-add ${
              isOn ? "on" : ""
            }" aria-pressed="${isOn}">${btn}</button>
          </div>`;
      }).join("")}
    </div>
  `;
    wrap.querySelectorAll(".service-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".service-card");
        const id = card?.dataset.id;
        const st = getState();
        const on = st.services.includes(id);
        if (on) {
          st.services = st.services.filter((x) => x !== id);
        } else {
          st.services.push(id);
        }
        setState(st);
        renderDrawerContent("services");
      });
    });
  }
  updateTotalUI(state.total);
}

// Make ExtrasState available globally for other pages
window.ExtrasState = ExtrasState;
