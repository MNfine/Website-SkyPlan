/* SkyPlane Filters — ORDER: PRICE -> TIME, scroll to top after ~1s */
(function() {
    // ---------- Shorthands ----------
    const $ = (sel, ctx) => (ctx || document).querySelector(sel);
    const $all = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    const txt = (el) => (el && el.textContent ? el.textContent.trim() : "");

    // ---------- Helpers ----------
    const toNumber = (v) => Number(String(v || "").replace(/\D/g, "")) || 0;
    const hhmmToMin = (hhmm) => {
        const [h, m] = String(hhmm || "00:00").split(":").map((x) => +x || 0);
        return h * 60 + m;
    };

    const priceOfCard = (card) => {
        const n = card.querySelector(".sp-price");
        return toNumber(n ? n.textContent : 0);
    };

    // lấy giờ khởi hành chiều đi (cột đầu tiên trong .sp-itinerary)
    const timeOfCard = (card) => {
        const itin = card.querySelector(".sp-itinerary");
        const t = itin ? txt(itin.querySelectorAll(".sp-time")[0]) : "00:00";
        return hhmmToMin(t);
    };

    // ---------- Elements ----------
    const results = $(".sp-results");
    if (!results) return;

    const priceSlider = $("#priceRange");
    const timeRadios = $all('input[name="time"]');

    // ---------- Current selections ----------
    function getTimeRange() {
        // Ưu tiên data-start/data-end trên radio (định dạng "HH:MM")
        const r = timeRadios.find((x) => x.checked);
        if (r) {
            const ds = r.dataset.start,
                de = r.dataset.end;
            if (ds && de) return [hhmmToMin(ds), hhmmToMin(de)];
            // fallback đọc text hiển thị
            // lấy text trong .sp-choice hoặc text node kế bên
            let label = "";
            const wrap = r.closest(".sp-choice");
            if (wrap) label = txt(wrap).replace(/\s+/g, " ");
            if (!label && r.nextSibling && r.nextSibling.nodeValue) {
                label = r.nextSibling.nodeValue.trim();
            }
            const m = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(label);
            if (m) return [hhmmToMin(m[1]), hhmmToMin(m[2])];
        }
        // mặc định: 00:00–23:59 (không giới hạn)
        return [0, hhmmToMin("23:59")];
    }

    function getPriceMax() {
        return priceSlider ? Number(priceSlider.value || Infinity) : Infinity;
    }

    // ---------- Apply filters: PRICE -> TIME ----------
    function applyFilters() {
        const [tMin, tMax] = getTimeRange();
        const priceMax = getPriceMax();

        let anyVisible = false;
        // lấy lại danh sách card mỗi lần (phòng khi render động)
        const cards = $all(".sp-results .sp-card");

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];

            // 1) PRICE
            if (priceOfCard(card) > priceMax) {
                card.classList.add("is-hidden");
                continue;
            }

            // 2) TIME
            const t = timeOfCard(card);
            if (!(t >= tMin && t <= tMax)) {
                card.classList.add("is-hidden");
                continue;
            }

            // passed all
            card.classList.remove("is-hidden");
            anyVisible = true;
        }

        // empty state
        // helper nhỏ để lấy chuỗi theo ngôn ngữ hiện tại
        function t(key, fallbackVi, fallbackEn) {
            const lang = document.documentElement.lang === 'vi' ? 'vi' : 'en';
            try { return _t(lang)[key] || (lang === 'vi' ? (fallbackEn || '') : (fallbackVi || '')); } catch (_) { return (lang === 'vi' ? (fallbackEn || '') : (fallbackVi || '')); }
        }

        // Empty state
        var emptyId = "sp-empty";
        var empty = $("#" + emptyId);
        if (!anyVisible) {
            if (!empty) {
                empty = document.createElement("div");
                empty.id = emptyId;
                empty.style.padding = "16px";
                empty.style.border = "1px dashed var(--sp-line)";
                empty.style.borderRadius = "12px";
                empty.style.textAlign = "center";
                empty.style.color = "var(--sp-muted)";
                empty.textContent = "Không có chuyến bay phù hợp với bộ lọc.";
                results.appendChild(empty);
            }
        } else if (empty) {
            empty.parentNode.removeChild(empty);
        }
    }

    function onFilterChange() {
        applyFilters();
        scheduleScrollTop();
    }

    // ---------- Wiring ----------
    // TIME radios
    timeRadios.forEach((r) => r.addEventListener("change", onFilterChange));

    // PRICE slider
    if (priceSlider) {
        const priceOut = $("#priceOut");
        const paintRange = () => {
            const min = Number(priceSlider.min || 0);
            const max = Number(priceSlider.max || 5000000);
            const val = Number(priceSlider.value || 0);
            const pct = ((val - min) / (max - min)) * 100;
            priceSlider.style.setProperty("--sp-range-pct", pct + "%");
            priceSlider.style.background =
                "linear-gradient(to right, var(--sp-primary) " + pct + "%, #e5e7eb " + pct + "%)";
            if (priceOut) priceOut.textContent = val.toLocaleString("vi-VN") + " VND";
        };
        priceSlider.addEventListener("input", () => {
            paintRange();
            onFilterChange();
        });
        priceSlider.addEventListener("change", () => {
            paintRange();
            onFilterChange();
        });
        paintRange();
    }

    document.addEventListener('languageChanged', () => {
        const lang = localStorage.getItem('preferredLanguage') || 'vi';
        const t = MODAL_I18N[lang] || MODAL_I18N.vi;

        const shareBtn = document.querySelector('.sp-modal__footer .sp-btn--ghost');
        const bookBtn = document.getElementById('spBookBtn');
        const titleEl = document.querySelector('.sp-modal__header h2');

        if (shareBtn) shareBtn.textContent = t.share;
        if (bookBtn) {
            const price = bookBtn.dataset.price || '';
            bookBtn.textContent = t.bookPrefix + price;
        }
        if (titleEl) titleEl.textContent = t.title;
    });

    applyFilters();
})();