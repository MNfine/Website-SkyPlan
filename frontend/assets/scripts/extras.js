// Key lưu state extras
const STORAGE_KEY = "skyplan_extras";
const DEFAULT_EXTRAS = { meal: false, baggageXL: false, taxi: false, total: 0 };

document.addEventListener("DOMContentLoaded", () => {
  loadHeaderFooter().then(initializeLanguage);
  initRouteTitle();
  hydrateButtonPrices();
  initExtrasState();
  bindCardEvents();
});

function loadHeaderFooter() {
  return new Promise((resolve) => {
    // Header
    fetch("components/header.html")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        document.getElementById("header-container").innerHTML = html;
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
  if (typeof applyExtrasTranslations === "function")
    applyExtrasTranslations(currentLang);
  if (typeof initializeLanguageSelector === "function")
    initializeLanguageSelector();
}

function formatVND(val) {
  return Number(val || 0).toLocaleString("vi-VN") + " VNĐ";
}

function initRouteTitle() {
  const from = localStorage.getItem("booking_from") || "Hồ Chí Minh";
  const to = localStorage.getItem("booking_to") || "Hà Nội";
  const el = document.getElementById("routeTitle");
  if (el)
    el.textContent =
      document.documentElement.lang === "vi"
        ? `Từ ${from} tới ${to}`
        : `${from} to ${to}`;
}

function getExtras() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || { ...DEFAULT_EXTRAS }
    );
  } catch {
    return { ...DEFAULT_EXTRAS };
  }
}
function setExtras(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateTotalUI(state.total);
}

// function applyIncludedMealIfAny(){
//   const included = localStorage.getItem('fare_includes_meal') === 'true';
//   const mealCard = document.querySelector('.extra-card[data-key="meal"]');
//   if (!mealCard) return;
//   const badge = mealCard.querySelector('.extra-card__badge.chosen');
//   const btn   = mealCard.querySelector('.extra-card__btn');

//   if (included){
//     badge.hidden = false;
//     btn.disabled = true;
//     btn.classList.add('added');
//     btn.innerHTML = `<span class="btn-text">${label('included')}</span>`;
//   }
// }

function hydrateButtonPrices() {
  document.querySelectorAll(".extra-card").forEach((card) => {
    const price = Number(card.dataset.price || 0);
    const btn = card.querySelector(".extra-card__btn");
    if (btn)
      btn.innerHTML = `<span class="btn-text">${label(
        "addFor"
      )}</span> ${formatVND(price)}`;
  });
}
/* --- Áp state vào UI --- */
function initExtrasState() {
  const state = getExtras();
  document.querySelectorAll(".extra-card").forEach((card) => {
    const key = card.dataset.key;
    const price = Number(card.dataset.price || 0);
    const btn = card.querySelector(".extra-card__btn");

    if (state[key]) {
      card.classList.add("selected");
      btn.classList.add("added");
      btn.innerHTML = `<span class="btn-text">${label(
        "remove"
      )}</span> ${formatVND(price)}`;
    }
  });
  updateTotalUI(state.total);
  //   applyIncludedMealIfAny();
  //
}

/* --- Click Add/Remove --- */
function bindCardEvents() {
  document
    .querySelectorAll('.extra-card__btn[data-action="toggle"]')
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = e.currentTarget.closest(".extra-card");
        const key = card.dataset.key;
        const price = Number(card.dataset.price || 0);
        toggleExtra(card, key, price);
      });
    });
}

function toggleExtra(card, key, price) {
  const btn = card.querySelector(".extra-card__btn");
  const state = getExtras();

  if (state[key]) {
    state[key] = false;
    state.total = Math.max(0, state.total - price);
    card.classList.remove("selected");
    btn.classList.remove("added");
    btn.innerHTML = `<span class="btn-text">${label(
      "addFor"
    )}</span> ${formatVND(price)}`;
  } else {
    state[key] = true;
    state.total += price;
    card.classList.add("selected");
    btn.classList.add("added");
    btn.innerHTML = `<span class="btn-text">${label(
      "remove"
    )}</span> ${formatVND(price)}`;
  }
  setExtras(state);
}

function updateTotalUI(total) {
  const el = document.getElementById("extrasTotal");
  if (el) el.textContent = formatVND(total || 0);
}

function label(key) {
  const lang = document.documentElement.lang || "vi";
  const map = {
    vi: { addFor: "Thêm với giá", remove: "Bỏ chọn", included: "Đã bao gồm" },
    en: { addFor: "Add for", remove: "Remove", included: "Included" },
  };
  return (map[lang] && map[lang][key]) || key;
}
