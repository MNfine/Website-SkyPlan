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

// search.js: Xử lý trang search.html, lấy dữ liệu chuyến bay thực tế từ backend

// Global function to open the modal directly - available from anywhere
window.openFlightModal = function() {
    const modal = document.getElementById('spModal');
    if (modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
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
    const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
    const today = new Date();
    function fmt(d) {
        return d.toISOString().slice(0, 10);
    }
    
    // Set trip type from URL if available
    if (params.type) {
        tripTypeRadios.forEach(radio => {
            if (radio.value === params.type) {
                radio.checked = true;
            }
        });
        // Update return field visibility
        const returnField = retInput ? retInput.closest('.sp-field') : null;
        if (returnField) {
            returnField.style.display = params.type === 'one-way' ? 'none' : 'block';
        }
    }
    if (fromInput && params.from) {
        // Select hiển thị theo IATA hay slug đều được; nếu là slug, giữ nguyên; nếu là IATA, chuyển về slug tương ứng nếu có option
        const normFromIata = CITY_TO_IATA[params.from] || params.from;
        // Ưu tiên set theo IATA nếu option có value IATA; nếu không có, thử set theo slug từ URL
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
    // Set trip type from URL if available
    if (params.type) {
        tripTypeRadios.forEach(radio => {
            if (radio.value === params.type) {
                radio.checked = true;
            }
        });
        // Update return field visibility
        const returnField = retInput ? retInput.closest('.sp-field') : null;
        if (returnField) {
            returnField.style.display = params.type === 'one-way' ? 'none' : 'block';
        }
    }
    // Only set dates if they exist in URL params, don't force default dates
    if (depInput && params.dep) {
        depInput.value = params.dep;
        depInput.dataset.isoValue = params.dep;
    }
    if (retInput && params.ret) {
        retInput.value = params.ret;
        retInput.dataset.isoValue = params.ret;
    }
}



// Gọi API backend để lấy danh sách chuyến bay
async function fetchFlights() {
    // Wait a bit to ensure other scripts have finished their initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    setDateInputsFromQuery();
    const params = getQueryParams();
    // Get trip type from radio button (prioritize over URL param)
    const tripTypeRadio = document.querySelector('input[name="tripType"]:checked');
    const tripType = tripTypeRadio ? tripTypeRadio.value : (params.type || 'round-trip');
    
    // Normalize input (slug or IATA) -> IATA for backend query
    const fromCity = CITY_TO_IATA[params.from] || CITY_TO_IATA[params.from && params.from.toString()] || params.from || '';
    const toCity = CITY_TO_IATA[params.to] || CITY_TO_IATA[params.to && params.to.toString()] || params.to || '';
    const dep = params.dep || '';
    const ret = params.ret || '';
    
    // Nếu không có đủ thông tin tìm kiếm, render với dữ liệu rỗng
    if (!fromCity || !toCity || !dep) {
        renderFlights([], [], tripType);
        // Delay để đảm bảo filter script đã sẵn sàng
        setTimeout(() => {
            if (typeof window.applyFilters === 'function') window.applyFilters();
        }, 200);
        return;
    }
    
    try {
        // Luôn lấy dữ liệu chuyến đi
        const outboundUrl = `/api/flights?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${encodeURIComponent(dep)}`;
    const resOut = await fetch(outboundUrl);
        const dataOut = await resOut.json();
        
        let dataIn = { flights: [] };
        
        // Chỉ lấy dữ liệu chuyến về nếu là vé khứ hồi và có ngày về
        if (tripType === 'round-trip' && ret) {
            const returnUrl = `/api/flights?from=${encodeURIComponent(toCity)}&to=${encodeURIComponent(fromCity)}&date=${encodeURIComponent(ret)}`;
            const resIn = await fetch(returnUrl);
            dataIn = await resIn.json();
        }

    // Dùng dữ liệu từ dataset; không fallback sang mẫu nếu API trả về rỗng
    const outFlights = (dataOut && Array.isArray(dataOut.flights)) ? dataOut.flights : [];
    const inFlights = (tripType === 'round-trip') ? ((dataIn && Array.isArray(dataIn.flights)) ? dataIn.flights : []) : [];

    renderFlights(outFlights, inFlights, tripType);
        if (typeof window.applyFilters === 'function') window.applyFilters();
    } catch (e) {
        console.error('Error fetching flights:', e);
        // Render với dữ liệu rỗng để filter script xử lý
        renderFlights([], [], tripType);
        // Delay để đảm bảo filter script đã sẵn sàng
        setTimeout(() => {
            if (typeof window.applyFilters === 'function') window.applyFilters();
        }, 200);
    }
}

// Render danh sách chuyến bay ra giao diện
function renderFlights(outbounds, inbounds, tripType = 'round-trip') {
    const results = document.querySelector('.sp-results');
    if (!results) {
        console.error('Element .sp-results not found');
        return;
    }

    results.innerHTML = '';
    
    // Get current language for formatting airports and dates - use same key as search_translations.js
    let currentLang = localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
    
    let isOneWay = tripType === 'one-way';
    const hasOut = Array.isArray(outbounds) && outbounds.length > 0;
    const hasIn = Array.isArray(inbounds) && inbounds.length > 0;
    
    // Nếu tìm khứ hồi nhưng không có chuyến về, vẫn hiển thị chiều đi như một chiều
    if (!isOneWay && hasOut && !hasIn) {
        console.info('[search] No inbound flights; show outbound as one-way.');
        // Add a message about no return flights
        results.innerHTML = `<div class="sp-no-return-message" style="padding: 20px; text-align: center; color: #666; margin-bottom: 20px;">
            <i class="fa-solid fa-info-circle"></i> 
            <span data-i18n="noReturnFlights">Không tìm thấy chuyến về cho ngày đã chọn. Hiển thị chuyến đi:</span>
        </div>`;
        isOneWay = true;
    }
    
    // Không có dữ liệu phù hợp nào
    if (!hasOut && (!isOneWay ? !hasIn : true)) {
        results.innerHTML = '';
        console.warn('[search] No flights found: outbounds=', outbounds ? outbounds.length : 0, 'inbounds=', inbounds ? inbounds.length : 0, 'type=', tripType);
        return;
    }

    let htmlContent = '';
    
    if (isOneWay) {
        // Hiển thị chuyến một chiều - mỗi chuyến bay sẽ hiển thị riêng biệt
        for (let i = 0; i < outbounds.length; i++) {
            const out = outbounds[i];
            
            if (!out) continue;
            
            let outDepTime = '', outArrTime = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
            
            const depTime = out.departure_time ? new Date(out.departure_time) : null;
            const arrTime = out.arrival_time ? new Date(out.arrival_time) : null;
            outDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            outArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            
            outDepAirport = formatAirport(out.departure_airport, currentLang);
            outArrAirport = formatAirport(out.arrival_airport, currentLang);
            
            outDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
            outPrice = Number(out.price) || 0;
            
            if (depTime && arrTime) {
                const durationMs = arrTime - depTime;
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
            }
            
            htmlContent += `
            <article class="sp-card">
                <div class="sp-card-body">
                    <div class="sp-date">${outDateStr} <span data-i18n="dotDeparture">· Khởi hành</span></div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${outDepTime}</div>
                            <div class="sp-meta">${outDepAirport}</div>
                            <div class="sp-airport-name">${getAirportFullName(out.departure_airport, currentLang)}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${outDuration}</div>
                            <div class="sp-duration-detail" data-i18n="nonstop">${out.flight_type || 'Bay thẳng'}</div>
                        </div>
                        <div>
                            <div class="sp-time">${outArrTime}</div>
                            <div class="sp-meta">${outArrAirport}</div>
                            <div class="sp-airport-name">${getAirportFullName(out.arrival_airport, currentLang)}</div>
                        </div>
                    </div>
                </div>
                <aside class="sp-card-aside">
                    <div class="sp-price">${outPrice > 0 ? outPrice.toLocaleString('vi-VN') + ' VND' : 'Liên hệ'}</div>
                    <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-trip-type="one-way" data-i18n="selectFlight">Chọn chuyến bay</button>
                </aside>
            </article>`;
        }
    } else {
        // Hiển thị chuyến khứ hồi - ghép chuyến bay hợp lệ theo thời gian
        for (let outIdx = 0; outIdx < outbounds.length; outIdx++) {
            const out = outbounds[outIdx];
            if (!out) continue;
            
            const outArrTime = out.arrival_time ? new Date(out.arrival_time) : null;
            if (!outArrTime) continue;
            
            // Tìm chuyến về phù hợp: xuất phát sau khi chuyến đi kết thúc
            for (let inIdx = 0; inIdx < inbounds.length; inIdx++) {
                const inn = inbounds[inIdx];
                if (!inn) continue;
                
                const inDepTime = inn.departure_time ? new Date(inn.departure_time) : null;
                if (!inDepTime) continue;
                
                // Kiểm tra: chuyến về phải xuất phát ít nhất 1 giờ sau khi chuyến đi kết thúc
                const minLayoverTime = 60 * 60 * 1000; // 1 giờ tính bằng milliseconds
                if (inDepTime.getTime() >= (outArrTime.getTime() + minLayoverTime)) {
                    // Đây là cặp chuyến bay hợp lệ - xử lý thông tin hiển thị
                    
                    // Xử lý thông tin chuyến đi
                    let outDepTimeStr = '', outArrTimeStr = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
                    const outDepTimeParsed = out.departure_time ? new Date(out.departure_time) : null;
                    const outArrTimeParsed = out.arrival_time ? new Date(out.arrival_time) : null;
                    outDepTimeStr = outDepTimeParsed ? outDepTimeParsed.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    outArrTimeStr = outArrTimeParsed ? outArrTimeParsed.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    outDepAirport = formatAirport(out.departure_airport);
                    outArrAirport = formatAirport(out.arrival_airport);
                    outDateStr = outDepTimeParsed ? outDepTimeParsed.toLocaleDateString('vi-VN') : '';
                    outPrice = Number(out.price) || 0;
                    
                    if (outDepTimeParsed && outArrTimeParsed) {
                        const durationMs = outArrTimeParsed - outDepTimeParsed;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                    }
                    
                    // Xử lý thông tin chuyến về
                    let inDepTimeStr = '', inArrTimeStr = '', inDepAirport = '', inArrAirport = '', inDateStr = '', inPrice = 0, inDuration = '';
                    const inDepTimeParsed = inn.departure_time ? new Date(inn.departure_time) : null;
                    const inArrTimeParsed = inn.arrival_time ? new Date(inn.arrival_time) : null;
                    inDepTimeStr = inDepTimeParsed ? inDepTimeParsed.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    inArrTimeStr = inArrTimeParsed ? inArrTimeParsed.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    inDepAirport = formatAirport(inn.departure_airport, currentLang);
                    inArrAirport = formatAirport(inn.arrival_airport, currentLang);
                    inDateStr = inDepTimeParsed ? inDepTimeParsed.toLocaleDateString('vi-VN') : '';
                    inPrice = Number(inn.price) || 0;
                    
                    if (inDepTimeParsed && inArrTimeParsed) {
                        const durationMs = inArrTimeParsed - inDepTimeParsed;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        inDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                    }
                    
                    const totalPrice = outPrice + inPrice;
            
                    htmlContent += `
                    <article class="sp-card">
                        <div class="sp-card-body">
                            <div class="sp-date">${outDateStr} <span data-i18n="dotDeparture">· Khởi hành</span></div>
                            <div class="sp-itinerary">
                                <div>
                                    <div class="sp-time">${outDepTimeStr}</div>
                                    <div class="sp-meta">${outDepAirport}</div>
                                    <div class="sp-airport-name">${getAirportFullName(out.departure_airport, currentLang)}</div>
                                </div>
                                <div class="sp-mid">
                                    <i class="fa-solid fa-plane sp-plane"></i>
                                    <div class="sp-duration">${outDuration}</div>
                                    <div class="sp-duration-detail" data-i18n="nonstop">${out.flight_type || 'Bay thẳng'}</div>
                                </div>
                                <div>
                                    <div class="sp-time">${outArrTimeStr}</div>
                                    <div class="sp-meta">${outArrAirport}</div>
                                    <div class="sp-airport-name">${getAirportFullName(out.arrival_airport, currentLang)}</div>
                                </div>
                            </div>
                            <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
                            <div class="sp-date">${inDateStr} <span data-i18n="dotReturn">· Về</span></div>
                            <div class="sp-itinerary">
                                <div>
                                    <div class="sp-time">${inDepTimeStr}</div>
                                    <div class="sp-meta">${inDepAirport}</div>
                                    <div class="sp-airport-name">${getAirportFullName(inn.departure_airport, currentLang)}</div>
                                </div>
                                <div class="sp-mid">
                                    <i class="fa-solid fa-plane sp-plane"></i>
                                    <div class="sp-duration">${inDuration}</div>
                                    <div class="sp-duration-detail" data-i18n="nonstop">${inn.flight_type || 'Bay thẳng'}</div>
                                </div>
                                <div>
                                    <div class="sp-time">${inArrTimeStr}</div>
                                    <div class="sp-meta">${inArrAirport}</div>
                                    <div class="sp-airport-name">${getAirportFullName(inn.arrival_airport, currentLang)}</div>
                                </div>
                            </div>
                        </div>
                        <aside class="sp-card-aside">
                            <div class="sp-price">${totalPrice > 0 ? totalPrice.toLocaleString('vi-VN') + ' VND' : 'Liên hệ'}</div>
                            <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-in='${JSON.stringify(inn || {})}' data-trip-type="round-trip" data-i18n="selectFlight">Chọn chuyến bay</button>
                        </aside>
                    </article>`;
                    
                    // Chỉ lấy cặp đầu tiên tìm được cho mỗi chuyến đi
                    break;
                }
            }
        }
    }


    // If we have a no-return message, append to it, otherwise replace
    if (results.querySelector('.sp-no-return-message')) {
        results.innerHTML += htmlContent;
    } else {
        results.innerHTML = htmlContent;
    }
    // Khởi tạo lại modal cho các nút mới
    
    setTimeout(function() {

        const cardButtons = document.querySelectorAll('.sp-card .sp-btn.sp-btn-block');
        cardButtons.forEach(function(btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                try {
                    // Get flight data from data attributes
                    const outDataStr = newBtn.getAttribute('data-out');
                    const inDataStr = newBtn.getAttribute('data-in');
                    const tripType = newBtn.getAttribute('data-trip-type');
                    
                    if (outDataStr) {
                        const outData = JSON.parse(outDataStr);
                        const inData = inDataStr ? JSON.parse(inDataStr) : null;
                        
                        // Update modal content
                        updateModalContent(outData, inData);
                    }
                    
                    const modal = document.getElementById('spModal');
                    if (!modal) {
                        console.error('Modal not found in DOM!');
                        return;
                    }
                    
                    document.body.classList.add('modal-open');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                } catch(e) {
                    console.error('Error opening modal:', e);
                }
            });
        });
        
        if (typeof initModal === 'function') {
            initModal();
        }
        if (typeof window.applyFilters === 'function') {
            window.applyFilters();
        }
        
        // Apply translations to newly rendered flight cards
        if (typeof window.applySearchTranslations === 'function') {
            // Try multiple methods to get the current language
            let currentLang = localStorage.getItem('preferredLanguage');
            
            // Also check DOM elements for language indicators
            if (!currentLang) {
                const langSelector = document.querySelector('.sp-header__lang');
                if (langSelector && langSelector.textContent) {
                    currentLang = langSelector.textContent.toLowerCase().includes('eng') ? 'en' : 'vi';
                }
            }
            
            if (!currentLang) {
                // Check localStorage first, then URL parameter
                const urlParams = new URLSearchParams(window.location.search);
                currentLang = urlParams.get('lang') || localStorage.getItem('preferredLanguage') || 'vi';
            }
            
            window.applySearchTranslations(currentLang);
        }
    }, 100);
}

// Hàm chuyển đổi mã sân bay sang tên đầy đủ với đa ngôn ngữ
function formatAirport(code, lang = 'vi', includeAirportName = false) {
    const airportData = {
        'HAN': {
            city: { vi: 'Hà Nội', en: 'Hanoi' },
            airport: { vi: 'Sân bay Nội Bài', en: 'Noi Bai Airport' }
        },
        'SGN': {
            city: { vi: 'Hồ Chí Minh', en: 'Ho Chi Minh' },
            airport: { vi: 'Sân bay Tân Sơn Nhất', en: 'Tan Son Nhat Airport' }
        },
        'DAD': {
            city: { vi: 'Đà Nẵng', en: 'Da Nang' },
            airport: { vi: 'Sân bay Đà Nẵng', en: 'Da Nang Airport' }
        },
        'CXR': {
            city: { vi: 'Nha Trang', en: 'Nha Trang' },
            airport: { vi: 'Sân bay Cam Ranh', en: 'Cam Ranh Airport' }
        },
        'PQC': {
            city: { vi: 'Phú Quốc', en: 'Phu Quoc' },
            airport: { vi: 'Sân bay Phú Quốc', en: 'Phu Quoc Airport' }
        },
        'VCA': {
            city: { vi: 'Cần Thơ', en: 'Can Tho' },
            airport: { vi: 'Sân bay Cần Thơ', en: 'Can Tho Airport' }
        },
        'HUI': {
            city: { vi: 'Huế', en: 'Hue' },
            airport: { vi: 'Sân bay Phú Bài', en: 'Phu Bai Airport' }
        },
        'VII': {
            city: { vi: 'Vinh', en: 'Vinh' },
            airport: { vi: 'Sân bay Vinh', en: 'Vinh Airport' }
        }
    };
    
    const data = airportData[code];
    if (!data) {
        return code;
    }
    
    const cityName = data.city[lang] || data.city.vi;
    const airportName = data.airport[lang] || data.airport.vi;
    
    if (includeAirportName) {
        return `${cityName} (${code})`;
    } else {
        return `${cityName} (${code})`;
    }
}

// Hàm lấy tên sân bay đầy đủ
function getAirportFullName(code, lang = 'vi') {
    const airportData = {
        'HAN': { vi: 'Sân bay Nội Bài', en: 'Noi Bai Airport' },
        'SGN': { vi: 'Sân bay Tân Sơn Nhất', en: 'Tan Son Nhat Airport' },
        'DAD': { vi: 'Sân bay Đà Nẵng', en: 'Da Nang Airport' },
        'CXR': { vi: 'Sân bay Cam Ranh', en: 'Cam Ranh Airport' },
        'PQC': { vi: 'Sân bay Phú Quốc', en: 'Phu Quoc Airport' },
        'VCA': { vi: 'Sân bay Cần Thơ', en: 'Can Tho Airport' },
        'HUI': { vi: 'Sân bay Phú Bài', en: 'Phu Bai Airport' },
        'VII': { vi: 'Sân bay Vinh', en: 'Vinh Airport' }
    };
    
    const result = airportData[code] ? airportData[code][lang] || airportData[code].vi : code;
    return result;
}

// Hàm trực tiếp để mở modal từ bên ngoài
function openFlightModal(outData, inData) {
    if (typeof window.openFlightDetailModal === 'function') {
        window.openFlightDetailModal(outData, inData);
    } else {
        console.error('Modal opening function not available');
    }
}

// Flag to prevent multiple initializations
let searchInitialized = false;

// Khi trang load, chỉ khởi tạo handlers, không tự động fetch
document.addEventListener('DOMContentLoaded', function() {
    if (!searchInitialized) {
        initializeTripTypeHandlers();
        // Remove automatic flight fetching - only search when button is clicked
        // fetchFlights();
        searchInitialized = true;
    }
});

// Initialize trip type radio button handlers
function initializeTripTypeHandlers() {
    const tripTypeRadios = document.querySelectorAll('input[name="tripType"]');
    const returnField = document.querySelector('#ret');
    const returnFieldContainer = returnField ? returnField.closest('.sp-field') : null;
    const form = document.getElementById('spSearchForm');
    
    function updateReturnFieldVisibility() {
        const selectedTripType = document.querySelector('input[name="tripType"]:checked');
        
        if (selectedTripType && selectedTripType.value === 'one-way') {
            if (returnFieldContainer) returnFieldContainer.style.display = 'none';
            if (returnField) returnField.value = ''; // Clear return date
        } else {
            if (returnFieldContainer) returnFieldContainer.style.display = 'block';
        }
    }
    
    // Set initial state
    updateReturnFieldVisibility();
    
    // Add event listeners - both on radio and label
    tripTypeRadios.forEach(radio => {
        
        // Add change listener to radio input
        radio.addEventListener('change', handleTripTypeChange);
        
        // Also add click listener to the parent label
        const label = radio.closest('.sp-trip-option');
        if (label) {
            label.addEventListener('click', function(e) {

                // Manually check the radio if it's not already checked
                if (!radio.checked) {
                    radio.checked = true;
                    setTimeout(handleTripTypeChange, 10);
                }
            });
        }
        
        // Direct click on radio as backup
        radio.addEventListener('click', function(e) {

            setTimeout(handleTripTypeChange, 10);
        });
    });
    
    function handleTripTypeChange() {

        const selectedTripType = document.querySelector('input[name="tripType"]:checked');

        
        // Update URL immediately to prevent override
        if (selectedTripType) {
            const url = new URL(window.location);
            url.searchParams.set('type', selectedTripType.value);
            window.history.pushState({}, '', url.toString());

        }
        
        updateReturnFieldVisibility();
        // Remove automatic search - only search when button is clicked
        // fetchFlights();
    }
    
    // Handle search button click
    const searchButton = document.getElementById('searchButton');
    if (searchButton && !searchButton.hasAttribute('data-listener-added')) {
        searchButton.addEventListener('click', function(e) {

            e.preventDefault();
            e.stopPropagation();
            handleSearchSubmit();
            return false;
        });
        
        searchButton.setAttribute('data-listener-added', 'true');
    }
    
    // Also handle form submit for Enter key
    if (form && !form.hasAttribute('data-listener-added')) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleSearchSubmit();
            return false;
        });
        
        form.setAttribute('data-listener-added', 'true');
    }
    
    function handleSearchSubmit() {
        const fromCity = document.getElementById('fromCity').value;
        const toCity = document.getElementById('toCity').value;
        const depDate = document.getElementById('dep').value;
        const retDate = document.getElementById('ret').value;
        const tripType = document.querySelector('input[name="tripType"]:checked')?.value || 'round-trip';
        

        
        // Build URL with all parameters
        const params = new URLSearchParams();
        if (fromCity) params.set('from', fromCity);
        if (toCity) params.set('to', toCity);
        if (depDate) params.set('dep', depDate);
        if (retDate && tripType === 'round-trip') params.set('ret', retDate);
        params.set('type', tripType);
        
        // Update URL and fetch flights
        const newUrl = window.location.pathname + '?' + params.toString();
        window.history.pushState({}, '', newUrl);

        fetchFlights();
    }
}

// ...existing code chuyển từ script cũ (slider, modal, language, ...)
(function() {
    function $(sel, ctx) {
        return (ctx || document).querySelector(sel);
    }
    function $all(sel, ctx) {
        return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
    }
    function text(el) {
        return el && el.textContent ? el.textContent.trim() : '';
    }
    function setText(root, sel, val) {
        var el = root.querySelector(sel);
        if (el) el.textContent = (val && String(val).trim()) || '—';
    }

    // Global function to update modal content
    function updateModalContent(outData, inData) {

        
        const modal = document.getElementById('spModal');
        const bookBtn = document.getElementById('spBookBtn');
        
        if (!modal || !bookBtn || !outData) {
            console.error('Modal elements not found or no flight data');
            return;
        }
        
        // Store flight data globally for booking
        window.currentFlightSelection = {
            outbound: outData,
            inbound: inData,
            tripType: inData ? 'round-trip' : 'one-way'
        };
        
        // Get current language
        const currentLang = localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
        
        // Lấy tên thành phố từ sân bay
        let outArrCity = formatAirport(outData.arrival_airport || '', currentLang).split('(')[0].trim();
        let outDepCity = formatAirport(outData.departure_airport || '', currentLang).split('(')[0].trim();
        
        // Set modal cho chiều đi
        setText(modal, '[data-to-city]', outArrCity || '—');
        const locale = currentLang === 'en' ? 'en-US' : 'vi-VN';
        const dateOptions = currentLang === 'en' ? { year: 'numeric', month: 'short', day: 'numeric' } : {};
        setText(modal, '[data-out-date]', outData.departure_time ? new Date(outData.departure_time).toLocaleDateString(locale, dateOptions) : '—');
        setText(modal, '[data-out-dep-time]', outData.departure_time ? new Date(outData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-out-dep-airport]', formatAirport(outData.departure_airport, currentLang) || '—');
        setText(modal, '[data-out-arr-time]', outData.arrival_time ? new Date(outData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
        setText(modal, '[data-out-arr-airport]', formatAirport(outData.arrival_airport, currentLang) || '—');
        
        // Xử lý chuyến về (nếu có)
        if (inData && inData.departure_time) {
            let inArrCity = formatAirport(inData.arrival_airport || '', currentLang).split('(')[0].trim();
            
            // Show inbound section
            const inboundSection = modal.querySelector('.sp-leg:last-child');
            if (inboundSection) {
                inboundSection.style.display = 'block';
            }
            
            setText(modal, '[data-from-city]', inArrCity || outDepCity || '—');
            setText(modal, '[data-in-date]', new Date(inData.departure_time).toLocaleDateString(locale, dateOptions));
            setText(modal, '[data-in-dep-time]', new Date(inData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}));
            setText(modal, '[data-in-dep-airport]', formatAirport(inData.departure_airport, currentLang) || '—');
            setText(modal, '[data-in-arr-time]', inData.arrival_time ? new Date(inData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
            setText(modal, '[data-in-arr-airport]', formatAirport(inData.arrival_airport, currentLang) || '—');
            
            // Giá tổng cho khứ hồi
            const totalPrice = (Number(outData.price)||0) + (Number(inData.price)||0);
            const bookText = currentLang === 'en' ? 'Book now for' : 'Đặt ngay với giá';
            if (totalPrice > 0) {
                const priceText = totalPrice.toLocaleString('vi-VN') + ' VND';
                bookBtn.textContent = `${bookText} ${priceText}`;
                bookBtn.dataset.price = priceText; // Store for translation
            } else {
                bookBtn.textContent = currentLang === 'en' ? 'Book now' : 'Đặt ngay';
            }
        } else {
            // Hide inbound section for one-way
            const inboundSection = modal.querySelector('.sp-leg:last-child');
            if (inboundSection) {
                inboundSection.style.display = 'none';
            }
            
            setText(modal, '[data-from-city]', outDepCity || '—');
            
            // Giá cho một chiều
            const price = Number(outData.price) || 0;
            const bookText = currentLang === 'en' ? 'Book now for' : 'Đặt ngay với giá';
            if (price > 0) {
                const priceText = price.toLocaleString('vi-VN') + ' VND';
                bookBtn.textContent = `${bookText} ${priceText}`;
                bookBtn.dataset.price = priceText; // Store for translation
            } else {
                bookBtn.textContent = currentLang === 'en' ? 'Book now' : 'Đặt ngay';
            }
        }
    }

    // Make updateModalContent globally available
    window.updateModalContent = updateModalContent;
    function initSlider() {
        var slider = document.getElementById('priceRange');
        var out = document.getElementById('priceOut');
        if (!slider || !out) return;
        function fmt(v) {
            return v > 0 ? Number(v).toLocaleString('vi-VN') + ' VND' : 'Liên hệ';
        }
        function paintRange() {
            var min = Number(slider.min || 0);
            var max = Number(slider.max || 100);
            var val = Number(slider.value || 0);
            var pct = ((val - min) / (max - min)) * 100;
            try {
                slider.style.setProperty('--sp-range-pct', pct + '%');
            } catch (e) {}
            slider.style.background = 'linear-gradient(to right, var(--sp-primary) ' + pct + '%, #e5e7eb ' + pct + '%)';
            out.textContent = fmt(val);
        }
        paintRange();
        slider.addEventListener('input', paintRange);
        slider.addEventListener('change', paintRange);
    }
    function initModal() {
        var modal = document.getElementById('spModal');
        var bookBtn = document.getElementById('spBookBtn');
        


        
        if (!modal || !bookBtn) {
            console.error('Modal or book button not found in DOM');
            return;
        }
        
        // Khởi tạo một global function để mở modal từ bất kỳ đâu
        window.openFlightDetailModal = function(outData, inData) {
            updateModalContent(outData, inData);
            openModal();
        };
        

        
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
        
        function onEsc(e) {
            if (e.key === 'Escape') closeModal();
        }
        
        // Book button handler
        bookBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (!window.currentFlightSelection) {
                console.error('No flight selection found');
                return;
            }

            const selection = window.currentFlightSelection;
            const params = new URLSearchParams();

            // Add trip type
            params.set('trip_type', selection.tripType);

            // Add dates from search form
            const depDate = document.getElementById('dep')?.value;
            const retDate = document.getElementById('ret')?.value;
            if (depDate) params.set('depart_date', depDate);
            if (retDate && selection.tripType === 'round-trip') params.set('return_date', retDate);

            // Helper to read common id/property names from API objects
            function readField(obj, ...keys) {
                if (!obj) return '';
                for (let k of keys) {
                    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
                }
                return '';
            }

            // Add outbound flight data
            if (selection.outbound) {
                const out = selection.outbound;
                const outId = readField(out, 'id', 'flight_id', 'flightId', '_id');
                params.set('outbound_flight_id', outId || '');
                params.set('outbound_flight_number', readField(out, 'flight_number', 'flightNumber') || '');
                params.set('outbound_departure_airport', readField(out, 'departure_airport') || '');
                params.set('outbound_arrival_airport', readField(out, 'arrival_airport') || '');
                params.set('outbound_departure_time', readField(out, 'departure_time') || '');
                params.set('outbound_arrival_time', readField(out, 'arrival_time') || '');
                params.set('outbound_price', readField(out, 'price') || '');
            }

            // Add inbound flight data for round-trip
            if (selection.inbound) {
                const inn = selection.inbound;
                const inId = readField(inn, 'id', 'flight_id', 'flightId', '_id');
                params.set('inbound_flight_id', inId || '');
                params.set('inbound_flight_number', readField(inn, 'flight_number', 'flightNumber') || '');
                params.set('inbound_departure_airport', readField(inn, 'departure_airport') || '');
                params.set('inbound_arrival_airport', readField(inn, 'arrival_airport') || '');
                params.set('inbound_departure_time', readField(inn, 'departure_time') || '');
                params.set('inbound_arrival_time', readField(inn, 'arrival_time') || '');
                params.set('inbound_price', readField(inn, 'price') || '');
            }

            // Persist a compact trip object into localStorage so later pages (overview/payment) have flight IDs
            try {
                const tripObj = {
                    trip_type: selection.tripType,
                    departDateISO: depDate || '',
                    returnDateISO: selection.tripType === 'round-trip' ? (retDate || '') : '',
                    outbound_flight_id: params.get('outbound_flight_id') || '',
                    outbound_flight_number: params.get('outbound_flight_number') || '',
                    outbound_departure_airport: params.get('outbound_departure_airport') || '',
                    outbound_arrival_airport: params.get('outbound_arrival_airport') || '',
                    outbound_departure_time: params.get('outbound_departure_time') || '',
                    outbound_arrival_time: params.get('outbound_arrival_time') || '',
                    outbound_price: params.get('outbound_price') ? Number(params.get('outbound_price')) : 0
                };

                if (selection.inbound) {
                    tripObj.inbound_flight_id = params.get('inbound_flight_id') || '';
                    tripObj.inbound_flight_number = params.get('inbound_flight_number') || '';
                    tripObj.inbound_departure_airport = params.get('inbound_departure_airport') || '';
                    tripObj.inbound_arrival_airport = params.get('inbound_arrival_airport') || '';
                    tripObj.inbound_departure_time = params.get('inbound_departure_time') || '';
                    tripObj.inbound_arrival_time = params.get('inbound_arrival_time') || '';
                    tripObj.inbound_price = params.get('inbound_price') ? Number(params.get('inbound_price')) : 0;
                }

                localStorage.setItem('skyplan_trip_selection', JSON.stringify(tripObj));
                console.log('[search] Saved skyplan_trip_selection to localStorage:', tripObj);
            } catch (err) {
                console.warn('[search] Failed to persist skyplan_trip_selection:', err);
            }

            // Navigate to fare page
            window.location.href = `/fare.html?${params.toString()}`;
        });
        
        // Close button handler
        const closeButtons = modal.querySelectorAll('[data-close]');
        closeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                closeModal();
                e.preventDefault();
            });
        });
        
        // Backdrop click handler
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.classList.contains('sp-modal__backdrop')) {
                closeModal();
            }
        });
        
        // Bind click events to all card buttons
        function setupCardButtons() {
            const cardButtons = document.querySelectorAll('.sp-card .sp-btn.sp-btn-block');
            
            cardButtons.forEach(function(btn) {
                // Remove existing event listeners
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Add new event listener
                newBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Lấy dữ liệu 2 chiều từ data attribute
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
        
        // Initial setup
        setupCardButtons();
        
        // Export for later use
        window.setupFlightCardButtons = setupCardButtons;
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initSlider();
            initModal();
            setupDebugButton();
        });
    } else {
        initSlider();
        initModal();
        setupDebugButton();
    }
    
    // Debug function for modal testing
    function setupDebugButton() {
        const debugBtn = document.getElementById('debugModalBtn');
        if (debugBtn) {
            debugBtn.addEventListener('click', function() {

                const modal = document.getElementById('spModal');
                if (modal) {

                    document.body.classList.add('modal-open');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');

                } else {
                    console.error('Modal element not found!');
                }
            });
        }
    }
})();
