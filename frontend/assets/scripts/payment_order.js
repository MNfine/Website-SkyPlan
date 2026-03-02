// Quiet mode: suppress non-essential console output unless debugging flag is enabled.
// Set window.SKYPLAN_DEBUG = true in the console to re-enable logs.
(function () {
    try {
        if (!window.SKYPLAN_DEBUG) {
            console._orig = console._orig || {};
            ['log','info','debug'].forEach(function(m){ if (!console._orig[m]) console._orig[m]=console[m]; console[m]=function(){}; });
        }
    } catch(e){}
  
  
    const TRIP_KEY = 'skyplan_trip_selection';
    const FARE_KEY = 'skyplan_fare_selection';
    const EXTRAS_KEY = 'skyplan_extras_v2';

    function getLang() { return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi'; }
    
    /**
     * Generate booking code from backend API, fallback to client-side generation
     * @returns {Promise<string>} Booking code
     */
    async function generateOrFetchBookingCode() {
        // Check if we already have a booking code
        const existingCode = localStorage.getItem('currentBookingCode') || localStorage.getItem('lastBookingCode');
        if (existingCode && existingCode.startsWith('SP')) {
            console.log('Using existing booking code:', existingCode);
            return existingCode;
        }

        // Build a pending booking payload and persist it to localStorage instead of creating booking now.
        try {
            const trip = readJSON(TRIP_KEY, null);
            const fare = readJSON(FARE_KEY, null);
            const passengerInfo = readJSON('passengerInfo', null);
            const extras = readJSON(EXTRAS_KEY, { total: 0 });

            // Calculate total amount locally (will be validated/recomputed on server)
            const ticketAmount = parseDigits((fare && fare.price) || '0');
            const extrasTotal = Number(extras.total) || 0;
            const tax = Math.round(ticketAmount * 0.1);
            const total = ticketAmount + extrasTotal + tax;

            // Prepare guest passenger data
            const guestPassenger = {
                full_name: passengerInfo?.fullName || passengerInfo?.full_name || 'Guest Passenger',
                email: passengerInfo?.email || 'guest@skyplan.com',
                phone: passengerInfo?.phone || passengerInfo?.phoneNumber || '0000000000',
                dob: passengerInfo?.dob || '1990-01-01',
                gender: passengerInfo?.gender || 'Khác',
                cccd: passengerInfo?.cccd || '000000000000',
                nationality: passengerInfo?.nationality || 'Việt Nam',
                address: passengerInfo?.address || '',
                city: passengerInfo?.city || '',
                notes: passengerInfo?.notes || ''
            };

            // Normalize trip_type & fare_class to the values backend expects
            const rawTripType = (trip?.tripType || 'one-way').toLowerCase();
            const tripTypeEnum = rawTripType === 'round-trip' ? 'round-trip' : 'one-way';
            let rawFareClass = (fare?.fareClass || 'economy').toLowerCase();
            let fareClassEnum = 'economy';
            if (rawFareClass.includes('business')) {
                fareClassEnum = 'business';
            } else if (rawFareClass.includes('premium')) {
                fareClassEnum = 'premium-economy';
            }

            const pendingPayload = {
                outbound_flight_id: trip?.outboundFlightId || trip?.selectedFlight?.id || 1,
                inbound_flight_id: trip?.inboundFlightId || null,
                trip_type: tripTypeEnum,
                fare_class: fareClassEnum,
                total_amount: total,
                extras_total: extrasTotal,
                guest_passenger: {
                    lastname: passengerInfo?.lastname || passengerInfo?.lastName || passengerInfo?.fullName || '',
                    firstname: passengerInfo?.firstname || passengerInfo?.firstName || '',
                    cccd: passengerInfo?.cccd || '',
                    dob: passengerInfo?.dob || '',
                    gender: passengerInfo?.gender || '',
                    phone_number: passengerInfo?.phone || passengerInfo?.phoneNumber || '',
                    email: passengerInfo?.email || '',
                    address: passengerInfo?.address || '',
                    city: passengerInfo?.city || '',
                    nationality: passengerInfo?.nationality || '',
                    notes: passengerInfo?.notes || ''
                }
            };

            // If user is logged in and we have a passenger id, use it instead of guest_passenger
            const storedPassengerId = localStorage.getItem('storedPassengerId') || localStorage.getItem('activePassengerId');
            if (storedPassengerId) {
                pendingPayload.passengers = [Number(storedPassengerId)];
                delete pendingPayload.guest_passenger;
            }

            // Persist pending payload for later (confirmation step will create booking)
            localStorage.setItem('pendingBookingPayload', JSON.stringify(pendingPayload));

            // Generate client-side booking code and persist (will be replaced if server creates booking earlier)
            const year = new Date().getFullYear();
            const timestamp = Date.now();
            const clientCode = `SP${year}${String(timestamp).slice(-5)}`;
            localStorage.setItem('currentBookingCode', clientCode);
            localStorage.setItem('lastBookingCode', clientCode);
            localStorage.setItem('bookingSource', 'client');

            return clientCode;
        } catch (error) {
            console.warn('Failed to build pending booking payload, falling back to client code:', error);
            const year = new Date().getFullYear();
            const timestamp = Date.now();
            const clientCode = `SP${year}${String(timestamp).slice(-5)}`;
            localStorage.setItem('currentBookingCode', clientCode);
            localStorage.setItem('lastBookingCode', clientCode);
            localStorage.setItem('bookingSource', 'client');
            return clientCode;
        }
    }
    // Format a value as VND with thousands separators. Round to nearest integer and
    // guard against non-numeric inputs. Use toLocaleString to respect Vietnamese format.
    function fmtVND(v) {
        const n = Number(v);
        const safe = (typeof n === 'number' && Number.isFinite(n)) ? Math.round(n) : 0;
        // Ensure we return a string like "11.065.609 VND"
        return safe.toLocaleString('vi-VN') + ' VND';
    }
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
        console.log('Payment order rendering...');
        const lang = getLang();
        const trip = readJSON(TRIP_KEY, null);
        const fare = readJSON(FARE_KEY, null);
        const extras = readJSON(EXTRAS_KEY, { total: 0 });

        console.log('Data loaded:', { trip, fare, extras });

        // Get dates from multiple sources
        const searchData = readJSON('searchData', {});
        const urlParams = new URLSearchParams(window.location.search);
        
        // Derive names
        const fromCode = (trip && (trip.fromCode || trip.from)) || 'HoChiMinh';
        const toCode = (trip && (trip.toCode || trip.to)) || 'HaNoi';
        console.log('City codes:', { fromCode, toCode });
        
        const fromName = resolveCity(fromCode, lang);
        const toName = resolveCity(toCode, lang);
        console.log('Resolved city names:', { fromName, toName });

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

        console.log('Flight info:', { fromName, toName, departDate, returnDate, segOut, segIn });

        // Update booking details (route titles and times)
        const route1 = document.querySelector('.booking-details .flight-summary:nth-of-type(1)');
        const route2 = document.querySelector('.booking-details .flight-summary:nth-of-type(2)');
        console.log('DOM elements:', { route1, route2 });
        
        if (route1) {
            const h4 = route1.querySelector('h4');
            const pTime = route1.querySelector('p:nth-of-type(1)');
            const pClass = route1.querySelector('p:nth-of-type(2)');
            if (h4) { 
                h4.textContent = `${fromName} → ${toName}`; 
                h4.removeAttribute('data-i18n');
                h4.classList.add('payment-order-updated'); // Mark as updated
            }
            const dateLabel = fmtDateISO(departDate, lang);
            if (pTime) { 
                pTime.textContent = `${dateLabel} - ${(segOut && segOut.departTime) || ''} → ${(segOut && segOut.arriveTime) || ''}`;
                pTime.removeAttribute('data-i18n');
                pTime.classList.add('payment-order-updated'); // Mark as updated
            }
            if (pClass) { 
                pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`;
                pClass.removeAttribute('data-i18n');
                pClass.classList.add('payment-order-updated'); // Mark as updated
            }
            console.log('Updated route1:', h4?.textContent, pTime?.textContent, pClass?.textContent);
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
                if (h4) { 
                    h4.textContent = `${toName} → ${fromName}`; 
                    h4.removeAttribute('data-i18n');
                    h4.classList.add('payment-order-updated');
                }
                const dateLabel = fmtDateISO(returnDate || departDate, lang);
                if (pTime) { 
                    pTime.textContent = `${dateLabel} - ${(segIn && segIn.departTime) || ''} → ${(segIn && segIn.arriveTime) || ''}`;
                    pTime.removeAttribute('data-i18n');
                    pTime.classList.add('payment-order-updated');
                }
                if (pClass) { 
                    pClass.textContent = `${fareClassLabel(fare && fare.fareClass, lang)} • 1 ${lang === 'vi' ? 'hành khách' : 'passenger'}`;
                    pClass.removeAttribute('data-i18n');
                    pClass.classList.add('payment-order-updated');
                }
            }
        } else {
            // Hide return block for one-way trips
            if (route2) route2.style.display = 'none';
        }

        // Price breakdown
    const fareVND = (fare && (Number(fare.priceVND) || parseDigits(fare.priceLabel))) || 0;
    const extrasTotal = Number(extras.total) || 0;
        // Derive base fare from multiple sources (selected fare, trip.selectedFlight.price or previously persisted values)
        const persistedBase = Number(localStorage.getItem('bookingBase')) || 0;
        const persistedTotal = Number(localStorage.getItem('bookingTotal')) || 0;
        const baseFare = fareVND || (trip && trip.selectedFlight && Number(trip.selectedFlight.price)) || persistedBase || 0;
        // Compute a fee/tax as 10% of base fare when available; fallback to 0 to avoid hard-coded demo fee
        const tax = baseFare ? Math.round(baseFare * 0.1) : 0;
        const ticketAmount = baseFare; // display base fare
        let total = baseFare + extrasTotal + tax;
        // If total computed is zero but we have a persisted total from earlier steps (e.g., saved by another script), use it
        if ((!total || total === 0) && persistedTotal > 0) {
            console.warn('[payment_order] computed total is 0, falling back to persisted bookingTotal:', persistedTotal);
            total = persistedTotal;
        }
        
        const tripTypeLabel = isRoundTrip ? 
            (lang === 'vi' ? 'Vé máy bay (2 chiều)' : 'Round-trip Flight Ticket') : 
            (lang === 'vi' ? 'Vé máy bay (1 chiều)' : 'One-way Flight Ticket');

        const breakdownEl = document.querySelector('.price-breakdown');
        
        // Generate or fetch booking code (async operation with backend fallback)
            generateOrFetchBookingCode().then(bookingCode => {
            console.log('Using booking code:', bookingCode);
            
            // Update booking code in price breakdown
            if (breakdownEl) {
                let bookingRow = breakdownEl.querySelector('.price-item.booking-code');
                if (!bookingRow) {
                    bookingRow = document.createElement('div');
                    bookingRow.className = 'price-item booking-code';
                    bookingRow.innerHTML = '<span class="booking-label"></span><span class="booking-code-text"></span>';
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
                
                // Show indicator if from backend
                const bookingSource = localStorage.getItem('bookingSource');
                if (bookingSource === 'backend' && bookingCodeEl) {
                    bookingCodeEl.title = '✓ Verified from backend';
                } else if (bookingCodeEl) {
                    bookingCodeEl.title = 'Generated client-side';
                }
            }

            // Update VNPay form booking code
            const vnpay = document.getElementById('vnpayForm');
            if (vnpay) {
                const codeEl = vnpay.querySelector('#bookingCode');
                if (codeEl) codeEl.textContent = bookingCode;
            }
        }).catch(error => {
            console.error('Error generating booking code:', error);
        });

    // Expose a helper to build/persist a pending booking payload so other pages (overview/payment)
    // can produce an identical payload shape. Returns the client booking code.
    window.buildPendingBookingPayload = function buildPendingBookingPayload() {
        try {
            const trip = readJSON(TRIP_KEY, null);
            const fare = readJSON(FARE_KEY, null);
            const passengerInfo = readJSON('passengerInfo', null);
            const extras = readJSON(EXTRAS_KEY, { total: 0 });

            const ticketAmount = parseDigits((fare && fare.price) || '0');
            const extrasTotal = Number(extras.total) || 0;
            const tax = Math.round(ticketAmount * 0.1);
            const total = ticketAmount + extrasTotal + tax;

            const guestPassenger = {
                lastname: passengerInfo?.lastname || passengerInfo?.lastName || '',
                firstname: passengerInfo?.firstname || passengerInfo?.firstName || passengerInfo?.fullName || '',
                cccd: passengerInfo?.cccd || '',
                dob: passengerInfo?.dob || '',
                gender: passengerInfo?.gender || '',
                phone_number: passengerInfo?.phone || passengerInfo?.phoneNumber || '',
                email: passengerInfo?.email || '',
                address: passengerInfo?.address || '',
                city: passengerInfo?.city || '',
                nationality: passengerInfo?.nationality || '',
                notes: passengerInfo?.notes || ''
            };

            const rawTripType = (trip?.tripType || 'one-way').toLowerCase();
            const tripTypeEnum = rawTripType === 'round-trip' ? 'ROUND_TRIP' : 'ONE_WAY';

            let rawFareClass = (fare?.fareClass || 'economy').toLowerCase();
            let fareClassEnum = 'ECONOMY';
            if (rawFareClass.includes('business')) {
                fareClassEnum = 'BUSINESS';
            } else if (rawFareClass.includes('premium')) {
                fareClassEnum = 'PREMIUM';
            }

            const pendingPayload = {
                outbound_flight_id: trip?.outboundFlightId || trip?.selectedFlight?.id || 1,
                inbound_flight_id: trip?.inboundFlightId || null,
                trip_type: tripTypeEnum,
                fare_class: fareClassEnum,
                total_amount: total,
                extras_total: extrasTotal,
                guest_passenger: guestPassenger
            };

            const storedPassengerId = localStorage.getItem('storedPassengerId') || localStorage.getItem('activePassengerId');
            if (storedPassengerId) {
                pendingPayload.passengers = [Number(storedPassengerId)];
                delete pendingPayload.guest_passenger;
            }

            localStorage.setItem('pendingBookingPayload', JSON.stringify(pendingPayload));

            // Ensure we have a display booking code
            const year = new Date().getFullYear();
            const timestamp = Date.now();
            const clientCode = `SP${year}${String(timestamp).slice(-5)}`;
            localStorage.setItem('currentBookingCode', clientCode);
            localStorage.setItem('lastBookingCode', clientCode);
            localStorage.setItem('bookingSource', 'client');

            return clientCode;
        } catch (e) {
            console.warn('buildPendingBookingPayload failed:', e);
            const clientCode = `SP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
            try { localStorage.setItem('currentBookingCode', clientCode); localStorage.setItem('lastBookingCode', clientCode); } catch(_){}
            return clientCode;
        }
    };

        // Update selectors after booking code is inserted
        // Find ticket row: first .price-item that has data-i18n="ticketLabel" or doesn't have special classes
        const allPriceItems = breakdownEl.querySelectorAll('.price-item');
        let ticketRow = null;
        let taxRow = null;
        
        for (let item of allPriceItems) {
            if (item.classList.contains('booking-code') || item.classList.contains('price-extras') || item.classList.contains('total')) {
                continue;
            }
            // First non-special row is ticket
            if (!ticketRow) {
                ticketRow = item;
            } else if (!taxRow) {
                // Second non-special row is tax
                taxRow = item;
                break;
            }
        }
        
        const ticketLabelEl = ticketRow ? ticketRow.querySelector('span:first-child') : null;
        const ticketAmountEl = ticketRow ? ticketRow.querySelector('span:last-child') : null;
        const taxAmountEl = taxRow ? taxRow.querySelector('span:last-child') : null;
        const totalAmountEl = document.querySelector('.price-breakdown .price-item.total span:last-child');

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
        if (breakdownEl && taxRow) {
            let extrasRow = breakdownEl.querySelector('.price-item.price-extras');
            if (!extrasRow) {
                extrasRow = document.createElement('div');
                extrasRow.className = 'price-item price-extras';
                extrasRow.innerHTML = '<span class="extras-label"></span><span class="extras-amount"></span>';
                breakdownEl.insertBefore(extrasRow, taxRow);
            }
            const extrasLabelEl = extrasRow.querySelector('.extras-label');
            const extrasAmountEl = extrasRow.querySelector('.extras-amount');
            const ot = getOT(lang) || {};
            if (extrasLabelEl) extrasLabelEl.textContent = ot.extrasLabel || (lang === 'vi' ? 'Dịch vụ thêm' : 'Extras');
            if (extrasAmountEl) extrasAmountEl.textContent = fmtVND(extrasTotal);
        }

        if (taxAmountEl) taxAmountEl.textContent = fmtVND(tax);
        if (totalAmountEl) {
            totalAmountEl.textContent = fmtVND(total);
            console.log('Updated totalAmount:', fmtVND(total));
        }

        // Save total amount and breakdown to localStorage for confirmation page and other scripts
        localStorage.setItem('bookingTotal', total.toString());
        // store base (ticket + extras) and extras separately so other scripts don't need to recalc
        try {
            localStorage.setItem('bookingBase', (fareVND + extrasTotal).toString());
            localStorage.setItem('bookingExtras', (extrasTotal).toString());
        } catch (_) {}
        console.log('Saved bookingTotal to localStorage:', total);

        // Prepare VNPay block (booking code will be set asynchronously above)
        const vnpay = document.getElementById('vnpayForm');
        if (vnpay) {
            const amountEl = vnpay.querySelector('.payment-details .detail-row:nth-of-type(1) strong');
            const contentEl = vnpay.querySelector('.payment-details .detail-row:nth-of-type(3) strong');
            if (amountEl) amountEl.textContent = fmtVND(total);
            if (contentEl) {
                const fromIATA = (segOut && segOut.departIATA) || (trip && trip.fromIATA) || 'XXX';
                const toIATA = (segOut && segOut.arriveIATA) || (trip && trip.toIATA) || 'YYY';
                contentEl.textContent = (lang === 'vi') ? `Ve may bay ${fromIATA}-${toIATA}` : `Flight ${fromIATA}-${toIATA}`;
            }
            // Expose for payment.js success storage
            try {
                window.lastAmount = total;
            } catch (_) { }
        }
    }

    // Make sure render is called after DOM and all scripts are loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        // DOM already loaded, call render with a small delay
        setTimeout(render, 100);
    }
    
    document.addEventListener('languageChanged', render);
    
    // Also expose render function globally for debugging
    window.renderPaymentOrder = render;
})();
