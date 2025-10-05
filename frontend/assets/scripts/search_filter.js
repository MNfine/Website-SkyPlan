/* SkyPlane filters – Order: STOPS -> BAGS -> TIME -> PRICE, then scroll-to-top after ~1s */
(function() {
    // ---------- Shorthands ----------
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }

    function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    function txt(el) { return el && el.textContent ? el.textContent.trim() : ""; }

    // ---------- Parse helpers ----------
    function toNumber(v) { v = String(v || "").replace(/\D/g, ""); return v ? Number(v) : 0; }

    function hhmmToMin(hhmm) {
        var p = String(hhmm || "00:00").split(":"),
            h = +p[0] || 0,
            m = +p[1] || 0;
        return h * 60 + m;
    }

    function priceOfCard(card) {
        var node = card.querySelector(".sp-price");
        return toNumber(node ? node.textContent : "0");
    }

    function timeOfCard(card) {
        // dùng giờ khởi hành chiều đi
        var outItin = card.querySelector(".sp-itinerary");
        var t = outItin ? txt(outItin.querySelectorAll(".sp-time")[0]) : "00:00";
        return hhmmToMin(t);
    }

    function stopsOfCard(card) {
        var s = (card.textContent || "").toLowerCase();
        if (/bay thẳng/.test(s)) return 0;
        var m = s.match(/(\d+)\s*(điểm\s*dừng|chặng)/i);
        return m ? Number(m[1]) : 0; // không thấy thì xem như 0
    }

    // ---------- Controls ----------
    var results = $(".sp-results");
    if (!results) return;

    var cards = $all(".sp-results .sp-card");
    var priceSlider = $("#priceRange");
    var stopsRadios = $all('input[name="stops"]');
    var timeRadios = $all('input[name="time"]');
    var cabinValueEl = $('[data-counter="cabin"] [data-value]');
    var checkedValueEl = $('[data-counter="checked"] [data-value]');

    // Map radio index -> 0/1/2/3 chặng
    stopsRadios.forEach(function(r, i) { r.dataset.stops = String(i); });

    // ---------- Read current selections ----------
    function getStopsWanted() {
        var sel = stopsRadios.find(function(r) { return r.checked; });
        return sel ? Number(sel.dataset.stops || 0) : 0;
    }

    function getBagsWanted() {
        return {
            cabin: cabinValueEl ? Number(txt(cabinValueEl)) : 0,
            checked: checkedValueEl ? Number(txt(checkedValueEl)) : 0
        };
    }
    // Morning 00:00–12:00 | Mid-day 12:00–12:00 | Evening 18:00–23:59 | Night 00:00–05:59
    function getTimeRange() {
        var label = "";
        for (var i = 0; i < timeRadios.length; i++)
            if (timeRadios[i].checked) {
                var n = timeRadios[i].nextSibling;
                label = n && n.nodeValue ? n.nodeValue.trim() : "";
                break;
            }
        var m = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(label);
        if (m) return [hhmmToMin(m[1]), hhmmToMin(m[2])];
        label = (label || "").toLowerCase();
        if (/mid-?day/.test(label)) return [hhmmToMin("12:00"), hhmmToMin("12:00")];
        if (/evening/.test(label)) return [hhmmToMin("18:00"), hhmmToMin("23:59")];
        if (/night/.test(label)) return [hhmmToMin("00:00"), hhmmToMin("05:59")];
        return [hhmmToMin("00:00"), hhmmToMin("12:00")]; // morning default
    }

    function getPriceMax() {
        return priceSlider ? Number(priceSlider.value || 9e12) : 9e12;
    }

    // ---------- Bag rules (demo, tùy chỉnh nếu có dữ liệu thật) ----------
    function bagsOk(card, wantCabin, wantChecked) {
        // Có thể đọc từ DOM mỗi card nếu bạn render quota; ở đây demo cố định
        var cabinAllowed = 2;
        var checkedAllowed = 1;
        return wantCabin <= cabinAllowed && wantChecked <= checkedAllowed;
    }

    // ---------- Apply filters in ORDER: STOPS -> BAGS -> TIME -> PRICE ----------
    function applyFilters() {
        var wantStops = getStopsWanted();
        var bags = getBagsWanted();
        var timeRange = getTimeRange();
        var priceMax = getPriceMax();

        var anyVisible = false;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];

            // 1) STOPS
            var passStops = (stopsOfCard(card) === wantStops);
            if (!passStops) { card.classList.add("is-hidden"); continue; }

            // 2) BAGS
            var passBags = bagsOk(card, bags.cabin, bags.checked);
            if (!passBags) { card.classList.add("is-hidden"); continue; }

            // 3) TIME
            var t = timeOfCard(card);
            var passTime = (t >= timeRange[0] && t <= timeRange[1]);
            if (!passTime) { card.classList.add("is-hidden"); continue; }

            // 4) PRICE
            var passPrice = (priceOfCard(card) <= priceMax);
            if (!passPrice) { card.classList.add("is-hidden"); continue; }

            // Show if passed all
            card.classList.remove("is-hidden");
            anyVisible = true;
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

    // ---------- Scroll after all filtering (debounced ~1s) ----------
    var scrollTimer = null;

    function scheduleScrollTop() {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(function() {
            try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) { window.scrollTo(0, 0); }
        }, 1000);
    }

    // ---------- UI wiring ----------
    function onFilterChange() {
        applyFilters();
        scheduleScrollTop();
    }

    // Stops
    stopsRadios.forEach(function(r) { r.addEventListener("change", onFilterChange); });

    // Bags counters
    $all(".sp-counter [data-plus], .sp-counter [data-minus]").forEach(function(btn) {
        btn.addEventListener("click", function() {
            var wrap = btn.closest(".sp-counter");
            var valEl = wrap ? wrap.querySelector("[data-value]") : null;
            if (!valEl) return;
            var v = Number(txt(valEl) || 0);
            v = btn.hasAttribute("data-plus") ? v + 1 : Math.max(0, v - 1);
            valEl.textContent = String(v);
            onFilterChange();
        });
    });

    // Time radios
    timeRadios.forEach(function(r) { r.addEventListener("change", onFilterChange); });

    // Price slider
    if (priceSlider) {
        var priceOut = $("#priceOut");

        function paintRange() {
            var min = Number(priceSlider.min || 0),
                max = Number(priceSlider.max || 5000000),
                val = Number(priceSlider.value || 0);
            var pct = ((val - min) / (max - min)) * 100;
            try { priceSlider.style.setProperty("--sp-range-pct", pct + "%"); } catch (e) {}
            priceSlider.style.background =
                "linear-gradient(to right, var(--sp-primary) " + pct + "%, #e5e7eb " + pct + "%)";
            if (priceOut) priceOut.textContent = val.toLocaleString("vi-VN") + " VNĐ";
        }
        priceSlider.addEventListener("input", function() {
            paintRange();
            onFilterChange();
        });
        priceSlider.addEventListener("change", function() {
            paintRange();
            onFilterChange();
        });
        paintRange();
    }

    // First render (no auto-scroll on load)
    applyFilters();
})();