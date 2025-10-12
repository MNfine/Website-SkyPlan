// search.js: Xử lý trang search.html, lấy dữ liệu chuyến bay thực tế từ backend

// ====== Global helpers & modal opener ======

// Global function to open the modal directly - available from anywhere
window.openFlightModal = function() {
    console.log('Opening flight modal directly...');
    const modal = document.getElementById('spModal');
    if (modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        console.log('Modal opened, status:', modal.classList.contains('is-open'));
    } else {
        console.error('Modal not found in DOM!');
    }
};

// Chuẩn hoá tên thành phố -> mã IATA để dùng chung
const CITY_TO_IATA = {
    'Hà Nội': 'HAN','HaNoi': 'HAN','Hanoi': 'HAN','HAN': 'HAN',
    'Hồ Chí Minh': 'SGN','HoChiMinh': 'SGN','TP.Hồ Chí Minh': 'SGN','TP Ho Chi Minh': 'SGN','Sài Gòn': 'SGN','Sai Gon': 'SGN','SGN': 'SGN',
    'Đà Nẵng': 'DAD','Da Nang': 'DAD','DaNang': 'DAD','DAD': 'DAD',
    'Phú Quốc': 'PQC','Phu Quoc': 'PQC','PQC': 'PQC',
    'Cần Thơ': 'VCA','Can Tho': 'VCA','VCA': 'VCA',
    'Lâm Đồng': 'DLI','Lam Dong': 'DLI','DLI': 'DLI',
    'Huế': 'HUI','Hue': 'HUI','HUI': 'HUI',
    'Điện Biên': 'DIN','Dien Bien': 'DIN','DIN': 'DIN',
    'Gia Lai': 'PXU','PXU': 'PXU',
    'An Giang': 'VKG','VKG': 'VKG',
    'Thanh Hóa': 'THD','Thanh Hoa': 'THD','THD': 'THD',
    'Nghệ An': 'VII','Nghe An': 'VII','VII': 'VII',
    'Quảng Ninh': 'VDO','Quang Ninh': 'VDO','VDO': 'VDO',
    'Sơn La': 'SQH','Son La': 'SQH','SQH': 'SQH',
    'Khánh Hòa': 'CXR','Khanh Hoa': 'CXR','CXR': 'CXR',
    'Đắk Lắk': 'BMV','Dak Lak': 'BMV','BMV': 'BMV',
    'Quảng Trị': 'VDH','Quang Tri': 'VDH','VDH': 'VDH',
    'Chu Lai': 'VCL','VCL': 'VCL',
    'Hải Phòng': 'HPH','Hai Phong': 'HPH','HPH': 'HPH',
    'Tuy Hòa': 'TBB','Tuy Hoa': 'TBB','TBB': 'TBB'
};

// Lấy tham số từ URL
function getQueryParams() {
    const params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(str,key,value) {
        params[key] = decodeURIComponent(value);
    });
    return params;
}

// Set lại input ngày đi/ngày về theo query hoặc ngày hiện tại
function setDateInputsFromQuery() {
    const params = getQueryParams();
    const depInput = document.getElementById('dep') || document.getElementById('departure');
    const retInput = document.getElementById('ret') || document.getElementById('return');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const today = new Date();
    function fmt(d) {
        return d.toISOString().slice(0, 10);
    }
    if (fromInput && params.from) {
        const normFromIata = CITY_TO_IATA[params.from] || params.from;
        if ([...fromInput.options].some(o => o.value === normFromIata)) {
            fromInput.value = normFromIata;
        } else if ([...fromInput.options].some(o => o.value === params.from)) {
            fromInput.value = params.from;
        }
    }
    if (toInput && params.to) {
        const normToIata = CITY_TO_IATA[params.to] || params.to;
        if ([...toInput.options].some(o => o.value === normToIata)) {
            toInput.value = normToIata;
        } else if ([...toInput.options].some(o => o.value === params.to)) {
            toInput.value = params.to;
        }
    }
    const depParam = params.dep || params.departure;
    const retParam = params.ret || params.return;
    if (depInput) depInput.value = depParam || fmt(today);
    if (retInput) retInput.value = retParam || fmt(today);
}

// Dữ liệu chuyến bay mẫu để luôn hiển thị
const sampleFlights = {
    outbound: [
        {
            id: 'sample-out-1',
            flight_number: 'VJ123',
            departure_airport: 'HAN',
            arrival_airport: 'SGN',
            departure_time: '2025-10-10T08:00:00',
            arrival_time: '2025-10-10T10:00:00',
            price: 1200000,
            airline: 'VietJet Air'
        },
        {
            id: 'sample-out-2',
            flight_number: 'VN456',
            departure_airport: 'HAN',
            arrival_airport: 'SGN',
            departure_time: '2025-10-10T10:30:00',
            arrival_time: '2025-10-10T12:30:00',
            price: 1500000,
            airline: 'Vietnam Airlines'
        },
        {
            id: 'sample-out-3',
            flight_number: 'BL789',
            departure_airport: 'HAN',
            arrival_airport: 'SGN',
            departure_time: '2025-10-10T15:45:00',
            arrival_time: '2025-10-10T17:45:00',
            price: 1100000,
            airline: 'Jetstar Pacific'
        }
    ],
    inbound: [
        {
            id: 'sample-in-1',
            flight_number: 'VN321',
            departure_airport: 'SGN',
            arrival_airport: 'HAN',
            departure_time: '2025-10-12T09:15:00',
            arrival_time: '2025-10-12T11:15:00',
            price: 1300000,
            airline: 'Vietnam Airlines'
        },
        {
            id: 'sample-in-2',
            flight_number: 'VJ654',
            departure_airport: 'SGN',
            arrival_airport: 'HAN',
            departure_time: '2025-10-12T14:20:00',
            arrival_time: '2025-10-12T16:20:00',
            price: 1100000,
            airline: 'VietJet Air'
        },
        {
            id: 'sample-in-3',
            flight_number: 'BL987',
            departure_airport: 'SGN',
            arrival_airport: 'HAN',
            departure_time: '2025-10-12T18:30:00',
            arrival_time: '2025-10-12T20:30:00',
            price: 950000,
            airline: 'Jetstar Pacific'
        }
    ]
};

// ====== Fetch flights from backend (with samples fallback) ======
async function fetchFlights() {
    console.log("fetchFlights() called");
    setDateInputsFromQuery();
    const params = getQueryParams();
    const normFromIata = CITY_TO_IATA[params.from] || CITY_TO_IATA[params.from && params.from.toString()];
    const normToIata = CITY_TO_IATA[params.to] || CITY_TO_IATA[params.to && params.to.toString()];
    const fromCity = params.from || normFromIata || '';
    const toCity = params.to || normToIata || '';
    let dep = params.dep || params.departure || '';
    let ret = params.ret || params.return || '';
    const tripType = params.type || 'round-trip';

    if (!dep) {
        const depInput = document.getElementById('dep') || document.getElementById('departure');
        if (depInput && depInput.value) dep = depInput.value;
    }
    if (tripType === 'round-trip' && !ret) {
        const retInput = document.getElementById('ret') || document.getElementById('return');
        if (retInput && retInput.value) ret = retInput.value;
    }

    if (!fromCity || !toCity || !dep) {
        renderFlights(
            sampleFlights.outbound, 
            tripType === 'round-trip' ? sampleFlights.inbound : [], 
            tripType
        );
        if (typeof window.applyFilters === 'function') window.applyFilters();
        return;
    }

    try {
        let data = { flights: [] };
        if (tripType === 'round-trip') {
            const res = await fetch(`/api/flights/roundtrip?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${encodeURIComponent(dep)}&return_date=${encodeURIComponent(ret)}`);
            data = await res.json();
        } else {
            const resOut = await fetch(`/api/flights?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${encodeURIComponent(dep)}`);
            const dataOut = await resOut.json();
            data.flights = dataOut.flights || [];
        }

        const outFlights = data.flights.map(f => f.outbound || f);
        const inFlights = tripType === 'round-trip' ? data.flights.map(f => f.return).filter(Boolean) : [];

        renderFlights(outFlights, inFlights, tripType);
        if (typeof window.applyFilters === 'function') window.applyFilters();
    } catch (e) {
        console.error('Error fetching flights:', e);
        renderFlights(
            sampleFlights.outbound, 
            tripType === 'round-trip' ? sampleFlights.inbound : [], 
            tripType
        );
        if (typeof window.applyFilters === 'function') window.applyFilters();
    }
}

// Expose fetchFlights for use by other scripts
window.fetchFlights = fetchFlights;

// ====== Render result cards ======
function renderFlights(outbounds, inbounds, tripType = 'round-trip') {
    const results = document.querySelector('.sp-results');
    if (!results) {
        console.error('Element .sp-results not found');
        return;
    }
    
    // Get language and translations dictionary
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    
    // Ensure we have a valid dictionary
    let dict = {};
    try {
        if (typeof _t === 'function') {
            dict = _t(lang);
        } else if (typeof searchTranslations !== 'undefined') {
            dict = searchTranslations[lang] || searchTranslations.vi;
        }
        
        // Add debugging info
        console.log('Language:', lang);
        console.log('Translation dict available:', dict ? 'Yes' : 'No');
    } catch(e) {
        console.error('Error loading translations:', e);
    }

    results.innerHTML = '';
    
    let isOneWay = tripType === 'one-way';
    const hasOut = Array.isArray(outbounds) && outbounds.length > 0;
    const hasIn = Array.isArray(inbounds) && inbounds.length > 0;
    if (!isOneWay && hasOut && !hasIn) {
        console.info('[search] No inbound flights; show outbound as one-way.');
        isOneWay = true;
    }
    if (!hasOut && (!isOneWay ? !hasIn : true)) {
        results.innerHTML = '';
        console.warn('[search] No flights found: outbounds=', outbounds ? outbounds.length : 0, 'inbounds=', inbounds ? inbounds.length : 0, 'type=', tripType);
        return;
    }

    let htmlContent = '';
    
    if (isOneWay) {
        for (let i = 0; i < outbounds.length; i++) {
            const out = outbounds[i];
            const inn = null;

            let outDepTime = '', outArrTime = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
            if (out) {
                const depTime = out.departure_time ? new Date(out.departure_time) : null;
                const arrTime = out.arrival_time ? new Date(out.arrival_time) : null;
                outDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                outArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                outDepAirport = displayAirport(out.departure_city, out.departure_airport);
                outArrAirport = displayAirport(out.arrival_city, out.arrival_airport);
                outDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
                outPrice = Number(out.price) || 0;
                if (outPrice === 0 && depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    outPrice = Math.round(500000 + durationHours * 300000);
                } 
                if (outPrice < 500000) outPrice = 500000 + Math.round(Math.random() * 200000);
                if (outPrice > 2000000) outPrice = 2000000 - Math.round(Math.random() * 200000);
                if (depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                }
            }

            // Derive stops for filters (0 = nonstop, 1 = one stop)
            const outStops = outDuration && outDuration.includes('2h') ? 0 : (Math.random() > 0.7 ? 1 : 0);

            htmlContent += `
            <article class="sp-card" data-stops="${outStops}" data-price="${outPrice}">
                <div class="sp-card-body">
                    <div class="sp-date">${outDateStr} · ${dict.dotDeparture || 'Khởi hành'}</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${outDepTime}</div>
                            <div class="sp-meta">${outDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${outDuration}</div>
                            <div class="sp-duration-detail">${outDuration.includes('2h') ? (dict.nonstop || 'Bay thẳng') : (Math.random() > 0.7 ? (dict.oneStop || '1 điểm dừng') : (dict.nonstop || 'Bay thẳng'))}</div>
                        </div>
                        <div>
                            <div class="sp-time">${outArrTime}</div>
                            <div class="sp-meta">${outArrAirport}</div>
                        </div>
                    </div>
                </div>
                <aside class="sp-card-aside">
                    <div class="sp-price">${outPrice.toLocaleString('vi-VN')} VND</div>
                    <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-trip-type="one-way">${dict.selectFlight || 'Chọn chuyến bay'}</button>
                </aside>
            </article>`;
        }
    } else {
        const pairCount = Math.min(outbounds.length, inbounds.length || 0);
        for (let i = 0; i < pairCount; i++) {
            const out = outbounds[i] || null;
            const inn = inbounds[i] || null;
            if (!(out && inn)) continue;

            let outDepTime = '', outArrTime = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
            let inDepTime = '', inArrTime = '', inDepAirport = '', inArrAirport = '', inDateStr = '', inPrice = 0, inDuration = '';
            
            if (out) {
                const depTime = out.departure_time ? new Date(out.departure_time) : null;
                const arrTime = out.arrival_time ? new Date(out.arrival_time) : null;
                outDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                outArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                outDepAirport = displayAirport(out.departure_city, out.departure_airport);
                outArrAirport = displayAirport(out.arrival_city, out.arrival_airport);
                outDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
                outPrice = Number(out.price) || 0;
                if (outPrice === 0 && depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    outPrice = Math.round(500000 + durationHours * 300000);
                }
                if (outPrice < 500000) outPrice = 500000 + Math.round(Math.random() * 200000);
                if (outPrice > 2000000) outPrice = 2000000 - Math.round(Math.random() * 200000);
                if (depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                }
            }
            if (inn) {
                const depTime = inn.departure_time ? new Date(inn.departure_time) : null;
                const arrTime = inn.arrival_time ? new Date(inn.arrival_time) : null;
                inDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                inArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                inDepAirport = displayAirport(inn.departure_city, inn.departure_airport);
                inArrAirport = displayAirport(inn.arrival_city, inn.arrival_airport);
                inDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
                inPrice = Number(inn.price) || 0;
                if (inPrice === 0 && depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    inPrice = Math.round(500000 + durationHours * 300000);
                }
                if (inPrice < 500000) inPrice = 500000 + Math.round(Math.random() * 200000);
                if (inPrice > 2000000) inPrice = 2000000 - Math.round(Math.random() * 200000);
                if (depTime && arrTime) {
                    const durationMs = arrTime - depTime;
                    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                    inDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                }
            }
            const totalPrice = outPrice + inPrice;
            const outStops2 = outDuration && outDuration.includes('2h') ? 0 : (Math.random() > 0.7 ? 1 : 0);
            const inStops2 = inDuration && inDuration.includes('2h') ? 0 : (Math.random() > 0.7 ? 1 : 0);
            const cardStops = Math.max(outStops2, inStops2);
            htmlContent += `
            <article class="sp-card" data-stops="${cardStops}" data-price="${totalPrice}">
                <div class="sp-card-body">
                    <div class="sp-date">${outDateStr} · ${dict.dotDeparture || 'Khởi hành'}</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${outDepTime}</div>
                            <div class="sp-meta">${outDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${outDuration}</div>
                            <div class="sp-duration-detail">${outDuration.includes('2h') ? (dict.nonstop || 'Bay thẳng') : (Math.random() > 0.7 ? (dict.oneStop || '1 điểm dừng') : (dict.nonstop || 'Bay thẳng'))}</div>
                        </div>
                        <div>
                            <div class="sp-time">${outArrTime}</div>
                            <div class="sp-meta">${outArrAirport}</div>
                        </div>
                    </div>
                    <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
                    <div class="sp-date">${inDateStr} · ${dict.dotReturn || 'Về'}</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${inDepTime}</div>
                            <div class="sp-meta">${inDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${inDuration}</div>
                            <div class="sp-duration-detail">${inDuration.includes('2h') ? (dict.nonstop || 'Bay thẳng') : (Math.random() > 0.7 ? (dict.oneStop || '1 điểm dừng') : (dict.nonstop || 'Bay thẳng'))}</div>
                        </div>
                        <div>
                            <div class="sp-time">${inArrTime}</div>
                            <div class="sp-meta">${inArrAirport}</div>
                        </div>
                    </div>
                </div>
                <aside class="sp-card-aside">
                    <div class="sp-price">${totalPrice.toLocaleString('vi-VN')} VND</div>
                    <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-in='${JSON.stringify(inn || {})}' data-trip-type="round-trip">${dict.selectFlight || 'Chọn chuyến bay'}</button>
                </aside>
            </article>`;
        }
    }

    results.innerHTML = htmlContent;

    // After rendering, re-bind modal listeners and filters
    setTimeout(function() {
        if (typeof initModal === 'function') initModal();
        if (typeof window.applyFilters === 'function') window.applyFilters();
    }, 100);
}

// ====== Airport format & helpers ======


// Mapping mã sân bay -> tên đầy đủ theo ngôn ngữ
;

// Mapping mã -> tên thành phố theo ngôn ngữ
;
// Helper ưu tiên tên thành phố từ API để khớp dataset; fallback sang map tĩnh nếu thiếu


// ====== UI set-ups (slider, modal, dates, trip-type, search button) ======
function setupDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatDate = (date) => date.toISOString().split('T')[0];
    const depInput = document.getElementById('dep');
    const retInput = document.getElementById('ret');
    if (depInput && !depInput.value) depInput.value = formatDate(today);
    if (retInput && !retInput.value) retInput.value = formatDate(tomorrow);
}

function setupTripTypeToggle() {
    const tripTypeRadios = document.querySelectorAll('input[name="trip-type"]');
    const returnDateField = document.getElementById('return-date-field');
    const urlParams = new URLSearchParams(window.location.search);
    const tripType = urlParams.get('type') || 'round-trip';
    const activeRadio = document.querySelector(`input[name="trip-type"][value="${tripType}"]`);
    if (activeRadio) activeRadio.checked = true;
    if (returnDateField) returnDateField.style.display = tripType === 'one-way' ? 'none' : 'block';
    tripTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (returnDateField) returnDateField.style.display = this.value === 'one-way' ? 'none' : 'block';
        });
    });
    
    // Cập nhật nhãn khứ hồi/một chiều theo ngôn ngữ hiện tại
    window.updateTripTypeLabels();
}

// Cập nhật nhãn khứ hồi/một chiều theo ngôn ngữ


function setupSearchButton() {
    const btn = document.querySelector('.sp-btn-secondary');
    if (!btn) return;
    btn.addEventListener('click', function() {
        const from = document.getElementById('from').value.trim();
        const to = document.getElementById('to').value.trim();
        const dep = document.getElementById('dep').value;
        const tripType = document.querySelector('input[name="trip-type"]:checked').value;
        let params = [
            'from=' + encodeURIComponent(from),
            'to=' + encodeURIComponent(to),
            'dep=' + encodeURIComponent(dep),
            'type=' + encodeURIComponent(tripType)
        ];
        if (tripType === 'round-trip') {
            const ret = document.getElementById('ret').value;
            params.push('ret=' + encodeURIComponent(ret));
        }
        window.location.search = '?' + params.join('&');
    });
}

// Slider UI
function initSlider() {
    var slider = document.getElementById('priceRange');
    var out = document.getElementById('priceOut');
    if (!slider || !out) return;
    function fmt(v) {
        return Number(v).toLocaleString('vi-VN') + ' VND';
    }
    function paintRange() {
        var min = Number(slider.min || 0);
        var max = Number(slider.max || 100);
        var val = Number(slider.value || 0);
        var pct = ((val - min) / (max - min)) * 100;
        try { slider.style.setProperty('--sp-range-pct', pct + '%'); } catch (e) {}
        slider.style.background = 'linear-gradient(to right, var(--sp-primary) ' + pct + '%, #e5e7eb ' + pct + '%)';
        out.textContent = fmt(val);
    }
    paintRange();
    slider.addEventListener('input', paintRange);
    slider.addEventListener('change', paintRange);
}

// Modal (init + bindings + public open function)
function initModal() {
    var modal = document.getElementById('spModal');
    var bookBtn = document.getElementById('spBookBtn');
    if (!modal || !bookBtn) {
        console.error('Modal or book button not found in DOM');
        return;
    }

    // Global to open modal with populated data
    window.openFlightDetailModal = function(outData, inData) {
        updateModalContent(outData, inData);
        openModal();
    };

    function setText(root, sel, val) {
        var el = root.querySelector(sel);
        if (el) {
            if (val && typeof val === 'string' && val.includes('<div')) {
                el.innerHTML = val || '—';
            } else {
                el.textContent = (val && String(val).trim()) || '—';
            }
        }
    }

    function updateModalContent(outData, inData) {
    // Normalize language strictly to 'en' or 'vi' (prefer <html lang>)
    const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase().trim();
    const lsLang = (localStorage.getItem('preferredLanguage') || '').toLowerCase().trim();
    const lang = (htmlLang === 'en' || lsLang === 'en') ? 'en' : 'vi';
        // Load translations with robust fallback
        let dict = {};
        try {
            if (typeof _t === 'function') {
                dict = _t(lang) || {};
            } else if (window.searchTranslations) {
                dict = searchTranslations[lang] || searchTranslations.vi || {};
            }
        } catch (_) {
            dict = {};
        }
        const outArrCity = (window.CITY_NAMES && window.CITY_NAMES[lang] && window.CITY_NAMES[lang][outData.arrival_airport]) || (outData.arrival_city || '').toString();
        const inArrCity  = (window.CITY_NAMES && window.CITY_NAMES[lang] && window.CITY_NAMES[lang][inData.arrival_airport])  || (inData.arrival_city || '').toString();
        setText(modal, '[data-to-city]', outArrCity || '—');
        setText(modal, '[data-from-city]', inArrCity || '—');
        setText(modal, '[data-out-date]', outData.departure_time ? new Date(outData.departure_time).toLocaleDateString('vi-VN') : '—');
        setText(modal, '[data-out-dep-time]', outData.departure_time ? new Date(outData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-out-dep-airport]', displayAirport(outData.departure_city, outData.departure_airport) || '—');
        setText(modal, '[data-out-arr-time]', outData.arrival_time ? new Date(outData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-out-arr-airport]', displayAirport(outData.arrival_city, outData.arrival_airport) || '—');
        setText(modal, '[data-in-date]', inData.departure_time ? new Date(inData.departure_time).toLocaleDateString('vi-VN') : '—');
        setText(modal, '[data-in-dep-time]', inData.departure_time ? new Date(inData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-in-dep-airport]', displayAirport(inData.departure_city, inData.departure_airport) || '—');
        setText(modal, '[data-in-arr-time]', inData.arrival_time ? new Date(inData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-in-arr-airport]', displayAirport(inData.arrival_city, inData.arrival_airport) || '—');

    const totalPrice = (Number(outData.price)||0) + (Number(inData.price)||0);
        const shareBtn = modal.querySelector('.sp-modal__footer .sp-btn.sp-btn--ghost');
        if (shareBtn) {
            const shareTxt = (dict && dict.shareTrip) ? dict.shareTrip : (lang === 'en' ? 'Share trip' : 'Chia sẻ chuyến đi');
            shareBtn.textContent = shareTxt;
            shareBtn.setAttribute('aria-label', shareTxt);
        }
        if (bookBtn) {
            const priceText = totalPrice > 0 ? `${totalPrice.toLocaleString('vi-VN')} VND` : '';
            const prefix = (dict && dict.bookNowFor) ? dict.bookNowFor : (lang === 'en' ? 'Book now for' : 'Đặt ngay với giá');
            bookBtn.textContent = priceText ? `${prefix} ${priceText}` : (dict.bookNowFor || (lang === 'en' ? 'Book now for' : 'Đặt ngay'));
            bookBtn.setAttribute('aria-label', bookBtn.textContent);
            // expose numeric price so translations can rebuild label on language change
            bookBtn.setAttribute('data-total-price', String((Number(outData.price)||0) + (Number(inData.price)||0)));
        }
    }

    function openModal() {
        document.body.classList.add('modal-open');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.addEventListener('keydown', onEsc);
    }
    function closeModal() {
        document.body.classList.remove('modal-open');
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', onEsc);
    }
    function onEsc(e) { if (e.key === 'Escape') closeModal(); }

    // Close buttons
    const closeButtons = modal.querySelectorAll('[data-close]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            closeModal();
            e.preventDefault();
        });
    });
    // Backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('sp-modal__backdrop')) {
            closeModal();
        }
    });

    // Card buttons -> open modal
    function setupCardButtons() {
        const cardButtons = document.querySelectorAll('.sp-card .sp-btn.sp-btn-block');
        cardButtons.forEach(function(btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                let out = {};
                let inn = {};
                try {
                    out = JSON.parse(newBtn.getAttribute('data-out') || '{}');
                    inn = JSON.parse(newBtn.getAttribute('data-in') || '{}');
                    updateModalContent(out, inn);
                    openModal();
                } catch(e) {
                    console.error('Error parsing flight data:', e);
                }
            });
        });
    }
    setupCardButtons();
    window.setupFlightCardButtons = setupCardButtons;
}

// ====== Event delegation for modal triggers & close/esc ======
document.addEventListener('click', function(event) {
    if (event.target.matches('.sp-modal-trigger') || event.target.closest('.sp-modal-trigger')) {
        event.preventDefault();
        const btn = event.target.matches('.sp-modal-trigger') ? event.target : event.target.closest('.sp-modal-trigger');
        try {
            const modal = document.getElementById('spModal');
            if (!modal) { console.error('Modal not found in DOM!'); return; }
            const out = JSON.parse(btn.getAttribute('data-out') || '{}');
            const inn = JSON.parse(btn.getAttribute('data-in') || '{}');
            const tripType = btn.getAttribute('data-trip-type') || 'round-trip';
            modal.setAttribute('data-trip-type', tripType);
            document.querySelectorAll('.sp-modal-trigger').forEach(trigger => trigger.setAttribute('data-selected', 'false'));
            btn.setAttribute('data-selected', 'true');
            const inboundSection = modal.querySelector('.sp-leg:nth-child(2)');
            if (inboundSection) inboundSection.style.display = tripType === 'one-way' ? 'none' : 'block';
            // Reuse the localized modal builder if available
            if (typeof window.openFlightDetailModal === 'function') {
                window.openFlightDetailModal(out, inn);
            } else {
                // Fallback: minimally set localized book button and open modal
                const bookBtn = document.getElementById('spBookBtn');
                const htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase().trim();
                const lsLang = (localStorage.getItem('preferredLanguage') || '').toLowerCase().trim();
                const lang = (htmlLang === 'en' || lsLang === 'en') ? 'en' : 'vi';
                let dict = {};
                try {
                    if (typeof _t === 'function') dict = _t(lang) || {};
                    else if (window.searchTranslations) dict = searchTranslations[lang] || searchTranslations.vi || {};
                } catch(_) { dict = {}; }
                const outPrice = Number(out.price) || 0;
                const inPrice = (tripType === 'one-way') ? 0 : (Number(inn.price) || 0);
                const total = (tripType === 'one-way') ? outPrice : (outPrice + inPrice);
                if (bookBtn) {
                    const prefix = (dict.bookNowFor) ? dict.bookNowFor : (lang === 'en' ? 'Book now for' : 'Đặt ngay với giá');
                    const priceText = total ? `${total.toLocaleString('vi-VN')} VND` : '';
                    bookBtn.textContent = priceText ? `${prefix} ${priceText}` : prefix;
                    bookBtn.setAttribute('aria-label', bookBtn.textContent);
                    bookBtn.setAttribute('data-total-price', String(total));
                }
                document.body.classList.add('modal-open');
                modal.classList.add('is-open');
                modal.setAttribute('aria-hidden', 'false');
            }
        } catch(e) {
            console.error('Error opening modal:', e);
        }
    }
});

document.addEventListener('click', function(event) {
    if (event.target.hasAttribute('data-close') || event.target.classList.contains('sp-modal__backdrop')) {
        const modal = document.getElementById('spModal');
        if (modal) {
            document.body.classList.remove('modal-open');
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
});
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('spModal');
        if (modal && modal.classList.contains('is-open')) {
            document.body.classList.remove('modal-open');
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
});

// ====== Booking button: build /fare URL with selected data ======
document.addEventListener('DOMContentLoaded', function() {
    const bookBtn = document.getElementById('spBookBtn');
    if (!bookBtn) return;
    bookBtn.addEventListener('click', function() {
        const modal = document.getElementById('spModal');
        const tripType = modal.getAttribute('data-trip-type') || 'round-trip';
        const triggerButton = document.querySelector('.sp-modal-trigger[data-selected="true"]');
        if (!triggerButton) { console.error('No selected flight found'); return; }
        const out = JSON.parse(triggerButton.getAttribute('data-out') || '{}');
        const inn = JSON.parse(triggerButton.getAttribute('data-in') || '{}');

        const searchParams = new URLSearchParams(window.location.search);
        const numAdults = searchParams.get('adults') || 1;
        const numChildren = searchParams.get('children') || 0;
        const numInfants = searchParams.get('infants') || 0;

        let outPrice = Number(out.price) || 0;
        let inPrice = tripType === 'one-way' ? 0 : Number(inn.price) || 0;
        if (outPrice === 0 && out.departure_time && out.arrival_time) {
            const depTime = new Date(out.departure_time);
            const arrTime = new Date(out.arrival_time);
            const durationHours = Math.floor((arrTime - depTime) / (1000 * 60 * 60));
            outPrice = Math.round(500000 + durationHours * 300000);
        }
        if (tripType === 'round-trip' && inPrice === 0 && inn && inn.departure_time && inn.arrival_time) {
            const depTime = new Date(inn.departure_time);
            const arrTime = new Date(inn.arrival_time);
            const durationHours = Math.floor((arrTime - depTime) / (1000 * 60 * 60));
            inPrice = Math.round(500000 + durationHours * 300000);
        }
        if (outPrice < 500000) outPrice = 500000 + Math.round(Math.random() * 200000);
        if (tripType === 'round-trip' && inPrice < 500000) inPrice = 500000 + Math.round(Math.random() * 200000);
        if (outPrice > 2000000) outPrice = 2000000 - Math.round(Math.random() * 200000);
        if (tripType === 'round-trip' && inPrice > 2000000) inPrice = 2000000 - Math.round(Math.random() * 200000);

        const totalPrice = tripType === 'one-way' ? outPrice : outPrice + inPrice;

        const params = new URLSearchParams();
        params.append('outbound_id', out.id);
        if (tripType === 'round-trip' && inn) params.append('inbound_id', inn.id);
        params.append('outbound_flight_number', out.flight_number);
        params.append('outbound_departure_airport', out.departure_airport);
        params.append('outbound_arrival_airport', out.arrival_airport);
        params.append('outbound_departure_time', out.departure_time);
        params.append('outbound_arrival_time', out.arrival_time);
        params.append('outbound_price', outPrice);
        if (tripType === 'round-trip' && inn) {
            params.append('inbound_flight_number', inn.flight_number);
            params.append('inbound_departure_airport', inn.departure_airport);
            params.append('inbound_arrival_airport', inn.arrival_airport);
            params.append('inbound_departure_time', inn.departure_time);
            params.append('inbound_arrival_time', inn.arrival_time);
            params.append('inbound_price', inPrice);
        }
        params.append('trip_type', tripType);
        params.append('adults', numAdults);
        params.append('children', numChildren);
        params.append('infants', numInfants);
        params.append('total_price', totalPrice);
        window.location.href = `/fare?${params.toString()}`;
    });
});

// ====== Language + header/footer loader (moved from inline) ======
function handleComponentError(componentName) {
    console.error(`Failed to load ${componentName} component`);
}

function initializeLanguage() {
    let currentLang = localStorage.getItem('preferredLanguage');
    if (!currentLang) {
        currentLang = 'vi';
        localStorage.setItem('preferredLanguage', 'vi');
    }
    document.documentElement.lang = currentLang;
    setTimeout(() => {
        if (typeof initializeMobileMenu === 'function') initializeMobileMenu();
        if (typeof initializeLanguageSelector === 'function') initializeLanguageSelector();
        if (typeof initializeSearchFilter === 'function') initializeSearchFilter();
        if (typeof initSearchTranslations === 'function') initSearchTranslations();
        if (typeof changeSearchLanguage === 'function') changeSearchLanguage(currentLang);
        if (typeof updateSelectedLanguage === 'function') updateSelectedLanguage(currentLang);
    }, 200);
}

function initializeApp() {
    // Load header
    fetch('components/header.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(data => {
            document.getElementById('header-container').innerHTML = data;
            initializeLanguage();
            if (typeof handleHeaderLoaded === 'function') handleHeaderLoaded();
        })
        .catch(error => {
            handleComponentError('header');
            console.error('Error loading header:', error);
            initializeLanguage();
        });

    // Load footer
    fetch('components/footer.html')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(data => {
            document.getElementById('footer-container').innerHTML = data;
        })
        .catch(error => {
            handleComponentError('footer');
            console.error('Error loading footer:', error);
        });
}

// ====== Boot ======
document.addEventListener('DOMContentLoaded', function() {
    // Basic UI setups
    setupDefaultDates();
    setupTripTypeToggle();
    setupSearchButton();
    initSlider();
    initModal();

    // Load header/footer + language, then fetch flights shortly after
    initializeApp();
    setTimeout(function() {
        if (typeof fetchFlights === 'function') fetchFlights();
    }, 500);
});
