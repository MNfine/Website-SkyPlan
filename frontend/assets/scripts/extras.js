// Key lưu state extras
const STORAGE_KEY = "skyplan_extras_v2";
const DEFAULT_EXTRAS = {
  meals: [],
  baggage: { kg: 0 },
  services: [],
  total: 0,
};

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderFooter().then(initializeLanguage);
  initRouteTitle();
  bindDetailsButtons();
  initDrawer();
  updateTotalsUI(getState());
});

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
  // Áp dụng bản dịch chung (header/footer) nếu có
  if (typeof applyTranslations === "function") {
    try { applyTranslations(currentLang); } catch (e) {}
  }
  // Áp dụng bản dịch riêng cho trang Extras
  if (typeof applyExtrasTranslations === "function") {
    try { applyExtrasTranslations(currentLang); } catch (e) {}
  }
  // Khởi tạo chọn ngôn ngữ trong header
  if (typeof initializeLanguageSelector === "function")
    initializeLanguageSelector();
  // Cập nhật khi đổi ngôn ngữ
  document.addEventListener("languageChanged", (ev) => {
    const lang = (ev && ev.detail && ev.detail.lang) || currentLang;
    try {
      if (typeof applyTranslations === "function") applyTranslations(lang);
      if (typeof applyExtrasTranslations === "function") applyExtrasTranslations(lang);
      initRouteTitle();
    } catch (e) {}
  });
}

function formatVND(val) {
  return new Intl.NumberFormat("vi-VN").format(val || 0) + " VND";
}

function initRouteTitle() {
  const lang =
    document.documentElement.lang ||
    localStorage.getItem("preferredLanguage") ||
    "vi";
  const from = localStorage.getItem("booking_from") || "Hồ Chí Minh";
  const to = localStorage.getItem("booking_to") || "Hà Nội";
  const el = document.getElementById("routeTitle");
  if (!el) return;
  el.textContent =
    lang === "vi" ? `Từ ${from} tới ${to}` : `From ${from} to ${to}`;
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
  { id: "meal_basic", name: "Basic combo", price: 120000 },
  { id: "meal_standard", name: "Standard combo", price: 150000 },
  { id: "meal_premium", name: "Premium combo", price: 200000 },
];
//Baggage packages
const BAGGAGE_PKGS = [
  { kg: 0, label: "+0kg", price: 0 },
  { kg: 20, label: "Goi 20kg", price: 200000 },
  { kg: 30, label: "Goi 30kg", price: 300000 },
  { kg: 40, label: "Goi 40kg", price: 400000 },
];
// Services
const SERVICES = [
  { id: "svc_wheelchair", label: "Wheelchair assist", price: 500000 },
  { id: "svc_infant", label: "Infant support", price: 500000 },
  { id: "svc_elderly", label: "Senior support", price: 500000 },
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
  // Lấy hàm dịch cho drawer; hỗ trợ cả window.extrasI18n và biến cục bộ extrasI18n
  const __extrasI18n = (typeof window !== 'undefined' && window.extrasI18n) ? window.extrasI18n
                       : (typeof extrasI18n !== 'undefined' ? extrasI18n : null);
  const t = (k) => (__extrasI18n && __extrasI18n[lang] && __extrasI18n[lang][k]) ? __extrasI18n[lang][k] : k;
  const state = getState();
  if (!wrap) return;

  title && (title.textContent = t("panelTitle"));

  if (type === "meal") {
    wrap.innerHTML = `
      <div class="meal-list">
        ${MEALS.map(
          (m) => `
          <div class="meal-row" data-id="${m.id}">
            <div class="meal-name">${m.name}</div>
            <div class="meal-price">${formatVND(m.price)}</div>
            <div class="meal-qty">
              <button class="qty-minus" aria-label="minus">-</button>
              <span class="qty-val">${
                state.meals.find((x) => x.id === m.id)?.qty || 0
              }</span>
              <button class="qty-plus" aria-label="plus">+</button>
            </div>
          </div>`
        ).join("")}
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
      <div class="baggage-options">
        ${BAGGAGE_PKGS.map(
          (b) => `
          <button class="baggage-opt ${
            b.kg === (state.baggage?.kg || 0) ? "active" : ""
          }" data-kg="${b.kg}">
            ${b.label} ${b.price ? "(" + formatVND(b.price) + ")" : ""}
          </button>`
        ).join("")}
      </div>
    `;
    wrap.querySelectorAll(".baggage-opt").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const kg = Number(e.currentTarget.getAttribute("data-kg"));
        const st = getState();
        st.baggage = { kg };
        setState(st);
        renderDrawerContent("baggage");
      });
    });
  } else if (type === "services") {
    wrap.innerHTML = `
      <div class="services-list">
        ${SERVICES.map(
          (s) => `
          <label class="service-row">
            <input type="checkbox" value="${s.id}" ${
            state.services.includes(s.id) ? "checked" : ""
          }/>
            <span>${s.label}</span>
          </label>`
        ).join("")}
      </div>
    `;
    wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.currentTarget.value;
        const st = getState();
        if (e.currentTarget.checked) {
          if (!st.services.includes(id)) st.services.push(id);
        } else {
          st.services = st.services.filter((x) => x !== id);
        }
        setState(st);
      });
    });
  }
  updateTotalsUI(getState());
}
