(function () {
    const TRIP_KEY = 'skyplan_trip_selection';
    const FARE_KEY = 'skyplan_fare_selection';
    const EXTRAS_KEY = 'skyplan_extras_v2';

    function getLang() { return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi'; }
    function resolveCity(val, lang) {
        if (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function') return window.resolveCityLabel(val, lang);
        const MAP = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) || {};
        const dict = MAP[lang] || MAP.vi || {};
        return dict[val] || val || '';
    }
    function fmtVND(v) { return new Intl.NumberFormat('vi-VN').format(Number(v) || 0) + ' VND'; }
    function readJSON(key, fb) { try { return JSON.parse(localStorage.getItem(key)) || fb; } catch { return fb; } }
    function parseDigits(text) { const n = String(text || '').replace(/[^0-9]/g, ''); return Number(n) || 0; }

    function fmtDateISO(iso, lang) {
        if (!iso) return '';
        try {
            const d = new Date(iso + 'T00:00:00');
            if (lang === 'vi') {
                // e.g., "Ngày 23 thg 10, 2025"
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                return `Ngày ${day} thg ${month}, ${year}`;
            } else {
                // e.g., "Oct 23, 2025"
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        } catch { return iso; }
    }
            function getOT(lang){
                try {
                    const OVT = (typeof window !== 'undefined' && window.overviewTranslations) || (typeof overviewTranslations !== 'undefined' ? overviewTranslations : null);
                    return (OVT && OVT[lang]) ? OVT[lang] : null;
                } catch(_) { return null; }
            }

    function fareClassLabel(fareClass, lang) {
        const vi = { 'economy': 'Phổ thông', 'premium-economy': 'Phổ thông đặc biệt', 'business': 'Thương gia' };
        const en = { 'economy': 'Economy', 'premium-economy': 'Premium Economy', 'business': 'Business' };
        const dict = (lang === 'vi') ? vi : en;
        return dict[fareClass || 'economy'] || dict['economy'];
    }

    function render() {
        const lang = getLang();
        const trip = readJSON(TRIP_KEY, null);
        const fare = readJSON(FARE_KEY, null);
        const extras = readJSON(EXTRAS_KEY, { total: 0 });

        // Derive names
        const fromCode = (trip && (trip.fromCode || trip.from)) || 'HoChiMinh';
        const toCode = (trip && (trip.toCode || trip.to)) || 'HaNoi';
        const fromName = resolveCity(fromCode, lang);
        const toName = resolveCity(toCode, lang);
        const segOut = trip && Array.isArray(trip.segments) ? trip.segments.find(s => s.direction === 'outbound') : null;
        const segIn = trip && Array.isArray(trip.segments) ? trip.segments.find(s => s.direction === 'inbound') : null;

        // Update booking details (route titles and times)
        const route1 = document.querySelector('.booking-details .flight-summary:nth-of-type(1)');
        const route2 = document.querySelector('.booking-details .flight-summary:nth-of-type(2)');
        if (route1) {
            const h4 = route1.querySelector('h4');
            const pTime = route1.querySelector('p:nth-of-type(1)');
            const pClass = route1.querySelector('p:nth-of-type(2)');
            if (h4) { h4.textContent = `${fromName} → ${toName}`; h4.removeAttribute('data-i18n'); }
            const dateLabel = fmtDateISO(trip && trip.departDateISO, lang);
            if (pTime) { pTime.textContent = `${dateLabel} - ${(segOut && segOut.departTime) || ''} → ${(segOut && segOut.arriveTime) || ''}`; pTime.removeAttribute('data-i18n'); }
            if (pClass) { pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`; pClass.removeAttribute('data-i18n'); }
        }
        if (segIn) {
            if (route2) {
                const h4 = route2.querySelector('h4');
                const pTime = route2.querySelector('p:nth-of-type(1)');
                const pClass = route2.querySelector('p:nth-of-type(2)');
                if (h4) { h4.textContent = `${toName} → ${fromName}`; h4.removeAttribute('data-i18n'); }
                const dateLabel = fmtDateISO(trip && (trip.returnDateISO || trip.departDateISO), lang);
                if (pTime) { pTime.textContent = `${dateLabel} - ${(segIn && segIn.departTime) || ''} → ${(segIn && segIn.arriveTime) || ''}`; pTime.removeAttribute('data-i18n'); }
                if (pClass) { pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`; pClass.removeAttribute('data-i18n'); }
            }
        } else {
            // Hide return block if one-way
            if (route2) route2.style.display = 'none';
        }

        // Price breakdown
        const fareVND = (fare && (Number(fare.priceVND) || parseDigits(fare.priceLabel))) || 0;
        const extrasTotal = Number(extras.total) || 0;
        const tax = 200000; // demo flat tax/fees
        const ticketAmount = fareVND; // chỉ hiển thị giá vé thuần không cộng dịch vụ thêm
        const total = fareVND + extrasTotal + tax;

        const breakdownEl = document.querySelector('.price-breakdown');
        const ticketLabelEl = document.querySelector('.price-breakdown .price-item:nth-of-type(1) span:first-child');
        const ticketAmountEl = document.querySelector('.price-breakdown .price-item:nth-of-type(1) span:last-child');
        const taxItemEl = document.querySelector('.price-breakdown .price-item:nth-of-type(2)');
        const taxAmountEl = taxItemEl ? taxItemEl.querySelector('span:last-child') : null;
        const totalAmountEl = document.querySelector('.price-breakdown .price-item.total span:last-child');

        if (ticketLabelEl) {
        const ot = getOT(lang) || {};
        const legs = segIn ? (ot.ticketRoundTripSuffix || (lang === 'vi' ? '(2 chiều)' : '(round trip)')) : (ot.ticketOneWaySuffix || (lang === 'vi' ? '(1 chiều)' : '(one way)'));
        // always own the label and prevent future overrides
        ticketLabelEl.removeAttribute('data-i18n');
        const base = ot.ticketLabelBase || (lang === 'vi' ? 'Vé máy bay' : 'Ticket');
        ticketLabelEl.textContent = `${base} ${legs}`;
        }
        if (ticketAmountEl) ticketAmountEl.textContent = fmtVND(ticketAmount);

        // Insert/Update extras row after ticket and before tax
        if (breakdownEl) {
            let extrasRow = breakdownEl.querySelector('.price-item.price-extras');
            if (!extrasRow) {
                extrasRow = document.createElement('div');
                extrasRow.className = 'price-item price-extras';
                extrasRow.innerHTML = '<span class="extras-label"></span><span class="extras-amount"></span>';
                if (taxItemEl) breakdownEl.insertBefore(extrasRow, taxItemEl); else breakdownEl.appendChild(extrasRow);
            }
            const extrasLabelEl = extrasRow.querySelector('.extras-label');
            const extrasAmountEl = extrasRow.querySelector('.extras-amount');
        const ot = getOT(lang) || {};
        if (extrasLabelEl) extrasLabelEl.textContent = ot.extrasLabel || (lang === 'vi' ? 'Dịch vụ thêm' : 'Extras');
            if (extrasAmountEl) extrasAmountEl.textContent = fmtVND(extrasTotal);
        }

        if (taxAmountEl) taxAmountEl.textContent = fmtVND(tax);
        if (totalAmountEl) totalAmountEl.textContent = fmtVND(total);

        // Prepare VNPay block
        const vnpay = document.getElementById('vnpayForm');
        if (vnpay) {
            const amountEl = vnpay.querySelector('.payment-details .detail-row:nth-of-type(1) strong');
            const codeEl = vnpay.querySelector('#bookingCode');
            const contentEl = vnpay.querySelector('.payment-details .detail-row:nth-of-type(3) strong');
            if (amountEl) amountEl.textContent = fmtVND(total);
            // Generate a simple booking code if missing
            const code = (codeEl && codeEl.textContent && codeEl.textContent.trim()) || `SP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
            if (codeEl) codeEl.textContent = code;
            if (contentEl) {
                const fromIATA = (segOut && segOut.departIATA) || (trip && trip.fromIATA) || 'XXX';
                const toIATA = (segOut && segOut.arriveIATA) || (trip && trip.toIATA) || 'YYY';
                contentEl.textContent = (lang === 'vi') ? `Ve may bay ${fromIATA}-${toIATA}` : `Flight ${fromIATA}-${toIATA}`;
            }
            // Expose for payment.js success storage
            try {
                window.lastAmount = total;
                window.lastTxnRef = codeEl ? codeEl.textContent : undefined;
            } catch (_) { }
        }
    }

    document.addEventListener('DOMContentLoaded', render);
    document.addEventListener('languageChanged', render);
})();
