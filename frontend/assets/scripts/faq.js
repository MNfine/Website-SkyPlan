document.addEventListener("DOMContentLoaded", () => {
  loadHeaderFooter().then(initFaq);
});

function loadHeaderFooter() {
  return new Promise((resolve) => {
    // Header
    fetch("components/header.html")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        const hc = document.getElementById("header-container");
        if (hc) hc.innerHTML = html;
        if (typeof initializeMobileMenu === "function") initializeMobileMenu();
        if (typeof initializeLanguageSelector === "function")
          initializeLanguageSelector();
        resolve();
      })
      .catch(() => resolve());

    // Footer
    fetch("components/footer.html")
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((html) => {
        const fc = document.getElementById("footer-container");
        if (fc) fc.innerHTML = html;
      })
      .catch(() => {});
  });
}

function initFaq() {
  const currentLang = localStorage.getItem("preferredLanguage") || "vi";
  document.documentElement.lang = currentLang;

  try {
    if (typeof applyTranslations === "function") applyTranslations(currentLang);
  } catch (e) {}
  try {
    if (typeof applyFaqTranslations === "function")
      applyFaqTranslations(currentLang);
  } catch (e) {}

  renderAll(currentLang);
  bindSidebar();
  bindSearch();

  document.addEventListener("languageChanged", (ev) => {
    const lang = ev?.detail?.lang || currentLang;

    const activeCat = getActiveCategory();
    const searchVal = (
      document.getElementById("faqSearchInput")?.value || ""
    ).trim();
    renderAll(lang);
    setActiveCategory(activeCat);
    if (searchVal) applySearch(searchVal);
  });
}

function getNavCategories() {
  return Array.from(document.querySelectorAll(".faq-nav [data-category]")).map(
    (btn) => btn.getAttribute("data-category")
  );
}

function getActiveCategory() {
  const active =
    document.querySelector(".faq-nav [data-category].active") ||
    document.querySelector('.faq-nav [aria-current="true"]');
  return active ? active.getAttribute("data-category") : "popular";
}

function setActiveCategory(cat) {
  document.querySelectorAll(".faq-nav [data-category]").forEach((b) => {
    const isActive = b.getAttribute("data-category") === cat;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-expanded", isActive ? "true" : "false");
    if (isActive) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

function bindSidebar() {
  document.querySelectorAll(".faq-nav [data-category]").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = btn.getAttribute("data-category");
      clearSearch();
      showOnlySection(cat);
      setActiveCategory(cat);
    });
    btn.dataset.bound = "1";
  });
}

function renderAll(lang) {
  const container = document.querySelector(".faq-content");
  if (!container) return;

  const stateBar = document.getElementById("faqSearchState");
  const noResults = document.getElementById("faqNoResults");

  container.querySelectorAll(".faq-section").forEach((s) => s.remove());

  const content = (window.faqContent && window.faqContent[lang]) || {};
  const labels = (window.faqI18n && window.faqI18n[lang]) || {};
  const order = getNavCategories();

  order.forEach((cat) => {
    const items = content[cat] || [];
    const section = buildSection(cat, items, labels);
    container.insertBefore(section, noResults || null);
  });

  showOnlySection(getActiveCategory());
  bindAccordions();
}

function buildSection(cat, items, labels) {
  const section = document.createElement("div");
  section.className = "faq-section";
  section.dataset.section = cat;
  section.id = `section-${cat}`;

  const title = document.createElement("h2");
  title.className = "faq-section__title";
  const keyMap = {
    popular: "catPopular",
    schedule: "catSchedule",
    booking: "catBooking",
    payment: "catPayment",
    baggage: "catBaggage",
    changes: "catChanges",
  };
  title.textContent = labels[keyMap[cat]] || cat;
  section.appendChild(title);

  const list = document.createElement("div");
  list.className = "faq-accordion";
  section.appendChild(list);

  items.forEach((it, idx) => {
    const idQ = `q-${cat}-${idx + 1}`;
    const idA = `a-${cat}-${idx + 1}`;

    const item = document.createElement("article");
    item.className = "faq-item";
    item.dataset.category = cat;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faq-question";
    btn.id = idQ;
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", idA);
    btn.innerHTML = `
      <span>${it.q || ""}</span>
      <i class="fa-solid fa-plus" aria-hidden="true"></i>
    `;

    const ans = document.createElement("div");
    ans.id = idA;
    ans.className = "faq-answer";
    ans.setAttribute("role", "region");
    ans.setAttribute("aria-labelledby", idQ);
    ans.hidden = true;
    ans.innerHTML = `<p>${it.a || ""}</p>`;

    item.appendChild(btn);
    item.appendChild(ans);
    list.appendChild(item);
  });

  return section;
}

function bindAccordions() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const ans = item?.querySelector(".faq-answer");
      if (!item || !ans) return;
      const willOpen = btn.getAttribute("aria-expanded") !== "true";

      const section = item.closest(".faq-section");
      section?.querySelectorAll(".faq-item").forEach((it) => {
        const b = it.querySelector(".faq-question");
        const a = it.querySelector(".faq-answer");
        if (!b || !a) return;
        if (it !== item) {
          b.setAttribute("aria-expanded", "false");
          it.classList.remove("open");
          a.hidden = true;
        }
      });

      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
      item.classList.toggle("open", willOpen);
      ans.hidden = !willOpen;
    });
    btn.dataset.bound = "1";
  });
}

function showOnlySection(cat) {
  document.querySelectorAll(".faq-section").forEach((sec) => {
    sec.hidden = sec.dataset.section !== cat;
  });
}

function bindSearch() {
  const form = document.getElementById("faqSearchForm");
  const input = document.getElementById("faqSearchInput");
  const clearBtn = document.getElementById("faqSearchClear");
  const resetBtn = document.getElementById("faqSearchReset");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    applySearch(input?.value);
  });

  input?.addEventListener("input", () => {
    const val = (input.value || "").trim();
    clearBtn.hidden = !val;
    if (!val) clearSearch();
  });

  clearBtn?.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    clearSearch();
  });

  resetBtn?.addEventListener("click", clearSearch);
}

function applySearch(query) {
  const q = (query || "").trim().toLowerCase();
  const state = document.getElementById("faqSearchState");
  const countEl = document.getElementById("faqSearchCount");
  const noResults = document.getElementById("faqNoResults");

  if (!q) return clearSearch();

  document
    .querySelectorAll(".faq-section")
    .forEach((sec) => (sec.hidden = false));

  let matches = 0;
  document.querySelectorAll(".faq-item").forEach((item) => {
    const text = item.textContent?.toLowerCase() || "";
    const hit = text.includes(q);
    item.hidden = !hit;
    if (hit) matches++;
  });

  document.querySelectorAll(".faq-section").forEach((sec) => {
    const visibleCount = sec.querySelectorAll(".faq-item:not([hidden])").length;
    sec.hidden = visibleCount === 0;
  });

  if (state && countEl) {
    state.hidden = false;
    countEl.textContent = String(matches);
  }
  if (noResults) noResults.hidden = matches > 0;

  document.querySelectorAll(".faq-nav [data-category]").forEach((b) => {
    b.classList.remove("active");
    b.removeAttribute("aria-current");
    b.setAttribute("aria-expanded", "false");
  });
}

function clearSearch() {
  const state = document.getElementById("faqSearchState");
  const noResults = document.getElementById("faqNoResults");
  if (state) state.hidden = true;
  if (noResults) noResults.hidden = true;

  document
    .querySelectorAll(".faq-item")
    .forEach((item) => (item.hidden = false));
  showOnlySection(getActiveCategory());
}
qa;
