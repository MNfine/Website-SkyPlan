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

        // Get dates from multiple sources
        const searchData = readJSON('searchData', {});
        const urlParams = new URLSearchParams(window.location.search);
        
        // Derive names
        const fromCode = (trip && (trip.fromCode || trip.from)) || 'HoChiMinh';
        const toCode = (trip && (trip.toCode || trip.to)) || 'HaNoi';
        const fromName = resolveCity(fromCode, lang);
        const toName = resolveCity(toCode, lang);

        // Get dates with fallback chain
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const departDate = (trip && trip.departDateISO) || 
                          searchData.depart_date || 
                          urlParams.get('depart_date') || 
                          urlParams.get('outbound_departure_date') ||
                          today; // Fallback to today
        
        const returnDate = (trip && trip.returnDateISO) || 
                          searchData.return_date || 
                          urlParams.get('return_date') || 
                          urlParams.get('inbound_departure_date') ||
                          departDate; // Fallback to depart date

        // Debug logs disabled
        // console.log('Payment dates debug:', departDate, returnDate);
        // Handle flight segments - try multiple data sources
        let segOut = null;
        let segIn = null;
        
        if (trip) {
            // Try to get from segments array first
            if (Array.isArray(trip.segments)) {
                segOut = trip.segments.find(s => s && s.direction === 'outbound');
                segIn = trip.segments.find(s => s && s.direction === 'inbound');
            }
            
            // If no segments, create from main trip object properties
            if (!segOut) {
                segOut = {
                    departTime: trip.outboundDepartTime || trip.departTime,
                    arriveTime: trip.outboundArriveTime || trip.arriveTime
                };
            }
            
            // Check if this is a round-trip and create inbound segment
            const tripTypeFromURL = urlParams.get('trip_type');
            if (!segIn && returnDate && returnDate !== departDate && tripTypeFromURL === 'round-trip') {
                segIn = {
                    departTime: trip.inboundDepartTime || trip.returnDepartTime,
                    arriveTime: trip.inboundArriveTime || trip.returnArriveTime
                };
            }
        }

        // Update booking details (route titles and times)
        const route1 = document.querySelector('.booking-details .flight-summary:nth-of-type(1)');
        const route2 = document.querySelector('.booking-details .flight-summary:nth-of-type(2)');
        if (route1) {
            const h4 = route1.querySelector('h4');
            const pTime = route1.querySelector('p:nth-of-type(1)');
            const pClass = route1.querySelector('p:nth-of-type(2)');
            if (h4) { h4.textContent = `${fromName} → ${toName}`; h4.removeAttribute('data-i18n'); }
            const dateLabel = fmtDateISO(departDate, lang);
            if (pTime) { pTime.textContent = `${dateLabel} - ${(segOut && segOut.departTime) || ''} → ${(segOut && segOut.arriveTime) || ''}`; pTime.removeAttribute('data-i18n'); }
            if (pClass) { pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`; pClass.removeAttribute('data-i18n'); }
        }

        // Determine trip type for ticket label based on multiple factors - MOVE THIS UP
        const hasValidReturnDate = returnDate && returnDate !== departDate && returnDate.trim() !== '';
        const hasValidInboundSegment = segIn && (segIn.departTime && segIn.departTime !== '—' && segIn.departTime.trim() !== '');
        const tripTypeFromURL = urlParams.get('trip_type');
        
        // Check trip type from multiple sources
        const tripTypeFromTrip = trip && trip.tripType;
        const tripTypeFromSearchData = searchData.trip_type || searchData.tripType;
        
        // Determine if round-trip based on explicit trip type indicators
        let isRoundTrip = (tripTypeFromURL === 'round-trip') || 
                         (tripTypeFromTrip === 'round-trip') || 
                         (tripTypeFromSearchData === 'round-trip') ||
                         (hasValidInboundSegment && returnDate); // fallback: has inbound data
        
        // If no trip type found anywhere, default to one-way
        if (!tripTypeFromURL && !tripTypeFromTrip && !tripTypeFromSearchData) {
            isRoundTrip = false; // Default to one-way when no trip type specified
        }
        
        // Debug logs disabled  
        // console.log('Trip type detection:', isRoundTrip);

        // Show/hide inbound segment based on trip type - NOW USE isRoundTrip
        if (isRoundTrip && segIn) {
            if (route2) {
                route2.style.display = 'block';
                const h4 = route2.querySelector('h4');
                const pTime = route2.querySelector('p:nth-of-type(1)');
                const pClass = route2.querySelector('p:nth-of-type(2)');
                if (h4) { h4.textContent = `${toName} → ${fromName}`; h4.removeAttribute('data-i18n'); }
                const dateLabel = fmtDateISO(returnDate || departDate, lang);
                if (pTime) { pTime.textContent = `${dateLabel} - ${(segIn && segIn.departTime) || ''} → ${(segIn && segIn.arriveTime) || ''}`; pTime.removeAttribute('data-i18n'); }
                if (pClass) { pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`; pClass.removeAttribute('data-i18n'); }
            }
        } else {
            // Hide return block for one-way trips
            if (route2) route2.style.display = 'none';
        }

        // Price breakdown
        const fareVND = (fare && (Number(fare.priceVND) || parseDigits(fare.priceLabel))) || 0;
        const extrasTotal = Number(extras.total) || 0;
        const tax = 200000; // demo flat tax/fees
        const ticketAmount = fareVND; // chỉ hiển thị giá vé thuần không cộng dịch vụ thêm
        const total = fareVND + extrasTotal + tax;
        
        const tripTypeLabel = isRoundTrip ? 
            (lang === 'vi' ? 'Vé máy bay (2 chiều)' : 'Round-trip Flight Ticket') : 
            (lang === 'vi' ? 'Vé máy bay (1 chiều)' : 'One-way Flight Ticket');

        const breakdownEl = document.querySelector('.price-breakdown');
        const ticketLabelEl = document.querySelector('.price-breakdown .price-item:nth-of-type(1) span:first-child');
        const ticketAmountEl = document.querySelector('.price-breakdown .price-item:nth-of-type(1) span:last-child');
        const taxItemEl = document.querySelector('.price-breakdown .price-item:nth-of-type(2)');
        const taxAmountEl = taxItemEl ? taxItemEl.querySelector('span:last-child') : null;
        const totalAmountEl = document.querySelector('.price-breakdown .price-item.total span:last-child');

        // Get booking code from URL or generate one
        const bookingCode = urlParams.get('booking_code') || localStorage.getItem('currentBookingCode') || `SP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;

        // Insert/Update booking code row at the top of price breakdown
        if (breakdownEl) {
            let bookingRow = breakdownEl.querySelector('.price-item.booking-code');
            if (!bookingRow) {
                bookingRow = document.createElement('div');
                bookingRow.className = 'price-item booking-code';
                bookingRow.innerHTML = '<span class="booking-label"></span><span class="booking-code-text"></span>';
                // Insert at the top (before the first child)
                breakdownEl.insertBefore(bookingRow, breakdownEl.firstElementChild);
            }
            const bookingLabelEl = bookingRow.querySelector('.booking-label');
            const bookingCodeEl = bookingRow.querySelector('.booking-code-text');
            const ot = getOT(lang) || {};
            if (bookingLabelEl) bookingLabelEl.textContent = ot.bookingCodeLabel || (lang === 'vi' ? 'Mã đặt vé' : 'Booking Code');
            if (bookingCodeEl) {
                bookingCodeEl.textContent = bookingCode;
                bookingCodeEl.style.fontWeight = 'bold';
                bookingCodeEl.style.color = '#1976d2';
            }
        }

        // Update ticket type label
        if (ticketLabelEl) {
            const ot = getOT(lang) || {};
            const legs = isRoundTrip ? (ot.ticketRoundTripSuffix || (lang === 'vi' ? '(2 chiều)' : '(round trip)')) : (ot.ticketOneWaySuffix || (lang === 'vi' ? '(1 chiều)' : '(one way)'));
            const base = ot.ticketLabelBase || (lang === 'vi' ? 'Vé máy bay' : 'Ticket');
            ticketLabelEl.textContent = `${base} ${legs}`;
            ticketLabelEl.removeAttribute('data-i18n');
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

        // Save total amount to localStorage for confirmation page
        localStorage.setItem('bookingTotal', total.toString());

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
