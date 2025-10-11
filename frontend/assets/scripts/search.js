// search.js: Xử lý trang search.html, lấy dữ liệu chuyến bay thực tế từ backend

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
    if (depInput) depInput.value = params.dep || fmt(today);
    if (retInput) retInput.value = params.ret || fmt(today);
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

// Gọi API backend để lấy danh sách chuyến bay
async function fetchFlights() {
    setDateInputsFromQuery();
    const params = getQueryParams();
    // Normalize input (slug or IATA) -> IATA for backend query
    const fromCity = CITY_TO_IATA[params.from] || CITY_TO_IATA[params.from && params.from.toString()] || params.from || '';
    const toCity = CITY_TO_IATA[params.to] || CITY_TO_IATA[params.to && params.to.toString()] || params.to || '';
    const dep = params.dep || '';
    const ret = params.ret || '';
    const tripType = params.type || 'round-trip';
    
    // Nếu không có đủ thông tin tìm kiếm, hiển thị dữ liệu mẫu
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
        // Luôn lấy dữ liệu chuyến đi
    const resOut = await fetch(`/api/flights?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${encodeURIComponent(dep)}`);
        const dataOut = await resOut.json();
        
        let dataIn = { flights: [] };
        
        // Chỉ lấy dữ liệu chuyến về nếu là vé khứ hồi và có ngày về
        if (tripType === 'round-trip' && ret) {
            const resIn = await fetch(`/api/flights?from=${encodeURIComponent(toCity)}&to=${encodeURIComponent(fromCity)}&date=${encodeURIComponent(ret)}`);
            dataIn = await resIn.json();
        }

    // Dùng dữ liệu từ dataset; không fallback sang mẫu nếu API trả về rỗng
    const outFlights = (dataOut && Array.isArray(dataOut.flights)) ? dataOut.flights : [];
    const inFlights = (tripType === 'round-trip') ? ((dataIn && Array.isArray(dataIn.flights)) ? dataIn.flights : []) : [];

    renderFlights(outFlights, inFlights, tripType);
        if (typeof window.applyFilters === 'function') window.applyFilters();
    } catch (e) {
        console.error('Error fetching flights:', e);
        // Khi có lỗi, sử dụng dữ liệu mẫu
        renderFlights(
            sampleFlights.outbound, 
            tripType === 'round-trip' ? sampleFlights.inbound : [], 
            tripType
        );
        if (typeof window.applyFilters === 'function') window.applyFilters();
    }
}

// Render danh sách chuyến bay ra giao diện
function renderFlights(outbounds, inbounds, tripType = 'round-trip') {
    const results = document.querySelector('.sp-results');
    if (!results) {
        console.error('Element .sp-results not found');
        return;
    }

    console.log('Element .sp-results before update:', results);
    results.innerHTML = '';
    
    let isOneWay = tripType === 'one-way';
    const hasOut = Array.isArray(outbounds) && outbounds.length > 0;
    const hasIn = Array.isArray(inbounds) && inbounds.length > 0;
    // Nếu tìm khứ hồi nhưng không có chuyến về, vẫn hiển thị chiều đi như một chiều
    if (!isOneWay && hasOut && !hasIn) {
        console.info('[search] No inbound flights; show outbound as one-way.');
        isOneWay = true;
    }
    // Không có dữ liệu phù hợp nào
    if (!hasOut && (!isOneWay ? !hasIn : true)) {
        // Để trống; filter script sẽ hiển thị empty-state của riêng nó
        results.innerHTML = '';
        console.warn('[search] No flights found: outbounds=', outbounds ? outbounds.length : 0, 'inbounds=', inbounds ? inbounds.length : 0, 'type=', tripType);
        return;
    }

    // Xác định số lượng card sẽ hiển thị
    let htmlContent = '';
    
    // Hiển thị từng chuyến bay
    if (isOneWay) {
        // Nếu là một chiều, chỉ hiển thị các chuyến đi
        for (let i = 0; i < outbounds.length; i++) {
            const out = outbounds[i];
            const inn = null; // Không có chuyến về

        let outDepTime = '', outArrTime = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
        if (out) {
            const depTime = out.departure_time ? new Date(out.departure_time) : null;
            const arrTime = out.arrival_time ? new Date(out.arrival_time) : null;
            outDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            outArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            
            // Định dạng sân bay theo kiểu "Hà Nội (HAN)"
            outDepAirport = formatAirport(out.departure_airport);
            outArrAirport = formatAirport(out.arrival_airport);
            
            outDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
            
            // Tính giá dựa trên dữ liệu thực tế hoặc dựa vào thời gian bay nếu không có giá
            outPrice = Number(out.price) || 0;
            if (outPrice === 0 && depTime && arrTime) {
                const durationMs = arrTime - depTime;
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                // Tính giá dựa vào thời gian bay: Khoảng 300,000 VND mỗi giờ bay + cơ bản 500,000 VND
                outPrice = Math.round(500000 + durationHours * 300000);
            } 
            // Đảm bảo giá không quá thấp và không quá cao
            if (outPrice < 500000) outPrice = 500000 + Math.round(Math.random() * 200000);
            if (outPrice > 2000000) outPrice = 2000000 - Math.round(Math.random() * 200000);
            
            // Tính thời gian bay nếu có cả giờ đi và đến
            if (depTime && arrTime) {
                const durationMs = arrTime - depTime;
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
            }
        }

        let inDepTime = '', inArrTime = '', inDepAirport = '', inArrAirport = '', inDateStr = '', inPrice = 0, inDuration = '';
        if (inn) {
            const depTime = inn.departure_time ? new Date(inn.departure_time) : null;
            const arrTime = inn.arrival_time ? new Date(inn.arrival_time) : null;
            inDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            inArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
            
            // Định dạng sân bay theo kiểu "Hà Nội (HAN)"
            inDepAirport = formatAirport(inn.departure_airport);
            inArrAirport = formatAirport(inn.arrival_airport);
            
            inDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
            
            // Tính giá dựa trên dữ liệu thực tế hoặc dựa vào thời gian bay nếu không có giá
            inPrice = Number(inn.price) || 0;
            if (inPrice === 0 && depTime && arrTime) {
                const durationMs = arrTime - depTime;
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                // Tính giá dựa vào thời gian bay: Khoảng 300,000 VND mỗi giờ bay + cơ bản 500,000 VND
                inPrice = Math.round(500000 + durationHours * 300000);
            }
            // Đảm bảo giá không quá thấp và không quá cao
            if (inPrice < 500000) inPrice = 500000 + Math.round(Math.random() * 200000);
            if (inPrice > 2000000) inPrice = 2000000 - Math.round(Math.random() * 200000);
            
            // Tính thời gian bay nếu có cả giờ đi và đến
            if (depTime && arrTime) {
                const durationMs = arrTime - depTime;
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                inDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
            }
        }

        if (isOneWay) {
            // Card cho chuyến bay một chiều
            htmlContent += `
            <article class="sp-card">
                <div class="sp-card-body">
                    <div class="sp-date">${outDateStr} · Khởi hành</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${outDepTime}</div>
                            <div class="sp-meta">${outDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${outDuration}</div>
                            <div class="sp-duration-detail">${outDuration.includes('2h') ? 'Bay thẳng' : (Math.random() > 0.7 ? '1 điểm dừng' : 'Bay thẳng')}</div>
                        </div>
                        <div>
                            <div class="sp-time">${outArrTime}</div>
                            <div class="sp-meta">${outArrAirport}</div>
                        </div>
                    </div>
                </div>
                <aside class="sp-card-aside">
                    <div class="sp-price">${outPrice.toLocaleString('vi-VN')} VND</div>
                    <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-trip-type="one-way">Chọn chuyến bay</button>
                </aside>
            </article>`;
        } else {
            // Card cho chuyến bay khứ hồi
            const totalPrice = outPrice + inPrice;
            htmlContent += `
            <article class="sp-card">
                <div class="sp-card-body">
                    <div class="sp-date">${outDateStr} · Khởi hành</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${outDepTime}</div>
                            <div class="sp-meta">${outDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${outDuration}</div>
                            <div class="sp-duration-detail">${outDuration.includes('2h') ? 'Bay thẳng' : (Math.random() > 0.7 ? '1 điểm dừng' : 'Bay thẳng')}</div>
                        </div>
                        <div>
                            <div class="sp-time">${outArrTime}</div>
                            <div class="sp-meta">${outArrAirport}</div>
                        </div>
                    </div>
                    <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
                    <div class="sp-date">${inDateStr} · Về</div>
                    <div class="sp-itinerary">
                        <div>
                            <div class="sp-time">${inDepTime}</div>
                            <div class="sp-meta">${inDepAirport}</div>
                        </div>
                        <div class="sp-mid">
                            <i class="fa-solid fa-plane sp-plane"></i>
                            <div class="sp-duration">${inDuration}</div>
                            <div class="sp-duration-detail">${inDuration.includes('2h') ? 'Bay thẳng' : (Math.random() > 0.7 ? '1 điểm dừng' : 'Bay thẳng')}</div>
                        </div>
                        <div>
                            <div class="sp-time">${inArrTime}</div>
                            <div class="sp-meta">${inArrAirport}</div>
                        </div>
                    </div>
                </div>
                <aside class="sp-card-aside">
                    <div class="sp-price">${totalPrice.toLocaleString('vi-VN')} VND</div>
                    <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-in='${JSON.stringify(inn || {})}' data-trip-type="round-trip">Chọn chuyến bay</button>
                </aside>
            </article>`;
        }
        }
    } else {
        // Hiển thị chuyến bay khứ hồi
        const pairCount = Math.min(outbounds.length, inbounds.length || 0);
        for (let i = 0; i < pairCount; i++) {
            const out = outbounds[i] || null;
            const inn = inbounds[i] || null;
            
            if (out && inn) {
                // Xử lý logic hiển thị cho khứ hồi (đã được triển khai trong if-else ở trên)
                
                let outDepTime = '', outArrTime = '', outDepAirport = '', outArrAirport = '', outDateStr = '', outPrice = 0, outDuration = '';
                let inDepTime = '', inArrTime = '', inDepAirport = '', inArrAirport = '', inDateStr = '', inPrice = 0, inDuration = '';
                
                // Logic xử lý cho chuyến đi
                if (out) {
                    // Code đã được triển khai ở trên cho chiều đi
                    const depTime = out.departure_time ? new Date(out.departure_time) : null;
                    const arrTime = out.arrival_time ? new Date(out.arrival_time) : null;
                    outDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    outArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    
                    outDepAirport = formatAirport(out.departure_airport);
                    outArrAirport = formatAirport(out.arrival_airport);
                    
                    outDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
                    
                    // Tính giá dựa vào dữ liệu
                    outPrice = Number(out.price) || 0;
                    if (outPrice === 0 && depTime && arrTime) {
                        const durationMs = arrTime - depTime;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        outPrice = Math.round(500000 + durationHours * 300000);
                    }
                    if (outPrice < 500000) outPrice = 500000 + Math.round(Math.random() * 200000);
                    if (outPrice > 2000000) outPrice = 2000000 - Math.round(Math.random() * 200000);
                    
                    // Tính thời gian bay
                    if (depTime && arrTime) {
                        const durationMs = arrTime - depTime;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        outDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                    }
                }
                
                // Logic xử lý cho chuyến về
                if (inn) {
                    // Code đã được triển khai ở trên cho chiều về
                    const depTime = inn.departure_time ? new Date(inn.departure_time) : null;
                    const arrTime = inn.arrival_time ? new Date(inn.arrival_time) : null;
                    inDepTime = depTime ? depTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    inArrTime = arrTime ? arrTime.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '';
                    
                    inDepAirport = formatAirport(inn.departure_airport);
                    inArrAirport = formatAirport(inn.arrival_airport);
                    
                    inDateStr = depTime ? depTime.toLocaleDateString('vi-VN') : '';
                    
                    // Tính giá dựa vào dữ liệu
                    inPrice = Number(inn.price) || 0;
                    if (inPrice === 0 && depTime && arrTime) {
                        const durationMs = arrTime - depTime;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        inPrice = Math.round(500000 + durationHours * 300000);
                    }
                    if (inPrice < 500000) inPrice = 500000 + Math.round(Math.random() * 200000);
                    if (inPrice > 2000000) inPrice = 2000000 - Math.round(Math.random() * 200000);
                    
                    // Tính thời gian bay
                    if (depTime && arrTime) {
                        const durationMs = arrTime - depTime;
                        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        inDuration = `${durationHours}h${durationMinutes.toString().padStart(2, '0')}m`;
                    }
                }
                
                // Render the round-trip card
                const totalPrice = outPrice + inPrice;
                htmlContent += `
                <article class="sp-card">
                    <div class="sp-card-body">
                        <div class="sp-date">${outDateStr} · Khởi hành</div>
                        <div class="sp-itinerary">
                            <div>
                                <div class="sp-time">${outDepTime}</div>
                                <div class="sp-meta">${outDepAirport}</div>
                            </div>
                            <div class="sp-mid">
                                <i class="fa-solid fa-plane sp-plane"></i>
                                <div class="sp-duration">${outDuration}</div>
                                <div class="sp-duration-detail">${outDuration.includes('2h') ? 'Bay thẳng' : (Math.random() > 0.7 ? '1 điểm dừng' : 'Bay thẳng')}</div>
                            </div>
                            <div>
                                <div class="sp-time">${outArrTime}</div>
                                <div class="sp-meta">${outArrAirport}</div>
                            </div>
                        </div>
                        <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />
                        <div class="sp-date">${inDateStr} · Về</div>
                        <div class="sp-itinerary">
                            <div>
                                <div class="sp-time">${inDepTime}</div>
                                <div class="sp-meta">${inDepAirport}</div>
                            </div>
                            <div class="sp-mid">
                                <i class="fa-solid fa-plane sp-plane"></i>
                                <div class="sp-duration">${inDuration}</div>
                                <div class="sp-duration-detail">${inDuration.includes('2h') ? 'Bay thẳng' : (Math.random() > 0.7 ? '1 điểm dừng' : 'Bay thẳng')}</div>
                            </div>
                            <div>
                                <div class="sp-time">${inArrTime}</div>
                                <div class="sp-meta">${inArrAirport}</div>
                            </div>
                        </div>
                    </div>
                    <aside class="sp-card-aside">
                        <div class="sp-price">${totalPrice.toLocaleString('vi-VN')} VND</div>
                        <button class="sp-btn sp-btn-block sp-modal-trigger" data-out='${JSON.stringify(out || {})}' data-in='${JSON.stringify(inn || {})}' data-trip-type="round-trip">Chọn chuyến bay</button>
                    </aside>
                </article>`;
            }
        }
    }

    console.log('Generated HTML:', htmlContent);
    results.innerHTML = htmlContent;
    console.log('Element .sp-results after update:', results);    // Khởi tạo lại modal cho các nút mới
    console.log('Initializing modal and filters after rendering...');
    
    // Đảm bảo gọi setupCardButtons sau khi DOM đã được cập nhật
    setTimeout(function() {
        console.log('Timeout triggered for setting up card buttons');
        // Direct setup of card button listeners without using the function
        const cardButtons = document.querySelectorAll('.sp-card .sp-btn.sp-btn-block');
        console.log('Found card buttons (direct):', cardButtons.length);
        
        cardButtons.forEach(function(btn) {
            console.log('Setting up button:', btn);
            // Remove existing event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add new event listener
            newBtn.addEventListener('click', function(e) {
                console.log('Flight card button clicked directly!');
                e.preventDefault();
                
                try {
                    const modal = document.getElementById('spModal');
                    if (!modal) {
                        console.error('Modal not found in DOM!');
                        return;
                    }
                    
                    // Force modal to open
                    document.body.classList.add('modal-open');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                    console.log('Modal forced open, status:', modal.classList.contains('is-open'));
                } catch(e) {
                    console.error('Error opening modal:', e);
                }
            });
        });
        if (typeof initModal === 'function') {
            console.log('Calling initModal...');
            initModal();
        }
        if (typeof window.applyFilters === 'function') {
            console.log('Applying filters...');
            window.applyFilters();
        }
    }, 100);
}// Hàm chuyển đổi mã sân bay sang tên đầy đủ
function formatAirport(code) {
    const airportMap = {
        'HAN': 'Hà Nội (HAN)',
        'SGN': 'Hồ Chí Minh (SGN)',
        'DAD': 'Đà Nẵng (DAD)',
        'CXR': 'Nha Trang (CXR)',
        'PQC': 'Phú Quốc (PQC)',
        'VCA': 'Cần Thơ (VCA)',
        'VCS': 'Côn Đảo (VCS)',
        'UIH': 'Quy Nhơn (UIH)',
        'BMV': 'Buôn Ma Thuột (BMV)',
        'VDH': 'Đồng Hới (VDH)',
        'HPH': 'Hải Phòng (HPH)',
        'HUI': 'Huế (HUI)',
        'VII': 'Vinh (VII)',
        'VDO': 'Vân Đồn (VDO)',
        'THD': 'Thanh Hóa (THD)',
        'DLI': 'Lâm Đồng (DLI)',
        'DIN': 'Điện Biên (DIN)',
        'PXU': 'Pleiku (PXU)',
        'VKG': 'Rạch Giá (VKG)',
        'SQH': 'Sơn La (SQH)',
        'VCL': 'Chu Lai (VCL)'
    };
    
    return airportMap[code] || code;
}

// Hàm trực tiếp để mở modal từ bên ngoài
function openFlightModal(outData, inData) {
    if (typeof window.openFlightDetailModal === 'function') {
        window.openFlightDetailModal(outData, inData);
    } else {
        console.error('Modal opening function not available');
    }
}

// Khi trang load, tự động fetch chuyến bay
document.addEventListener('DOMContentLoaded', fetchFlights);

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
        
        console.log('Initializing modal:', modal);
        console.log('Book button:', bookBtn);
        
        if (!modal || !bookBtn) {
            console.error('Modal or book button not found in DOM');
            return;
        }
        
        // Khởi tạo một global function để mở modal từ bất kỳ đâu
        window.openFlightDetailModal = function(outData, inData) {
            updateModalContent(outData, inData);
            openModal();
        };
        
        function updateModalContent(outData, inData) {
            console.log('Updating modal content with:', outData, inData);
            
            // Lấy tên thành phố từ sân bay
            let outArrCity = formatAirport(outData.arrival_airport || '').split('(')[0].trim();
            let inArrCity = formatAirport(inData.arrival_airport || '').split('(')[0].trim();
            
            // Set modal cho chiều đi và về
            setText(modal, '[data-to-city]', outArrCity || '—');
            setText(modal, '[data-from-city]', inArrCity || '—');
            
            // Outbound
            setText(modal, '[data-out-date]', outData.departure_time ? new Date(outData.departure_time).toLocaleDateString('vi-VN') : '—');
            setText(modal, '[data-out-dep-time]', outData.departure_time ? new Date(outData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
            setText(modal, '[data-out-dep-airport]', formatAirport(outData.departure_airport) || '—');
            setText(modal, '[data-out-arr-time]', outData.arrival_time ? new Date(outData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
            setText(modal, '[data-out-arr-airport]', formatAirport(outData.arrival_airport) || '—');
            
            // Inbound
            setText(modal, '[data-in-date]', inData.departure_time ? new Date(inData.departure_time).toLocaleDateString('vi-VN') : '—');
            setText(modal, '[data-in-dep-time]', inData.departure_time ? new Date(inData.departure_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
            setText(modal, '[data-in-dep-airport]', formatAirport(inData.departure_airport) || '—');
            setText(modal, '[data-in-arr-time]', inData.arrival_time ? new Date(inData.arrival_time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}) : '—');
            setText(modal, '[data-in-arr-airport]', formatAirport(inData.arrival_airport) || '—');
            
            // Giá tổng
            const totalPrice = (Number(outData.price)||0) + (Number(inData.price)||0);
            if (totalPrice > 0) {
                bookBtn.textContent = 'Đặt ngay với giá ' + totalPrice.toLocaleString('vi-VN') + ' VND';
            } else {
                bookBtn.textContent = 'Đặt ngay';
            }
        }
        
        function openModal() {
            console.log('Opening modal...');
            document.body.classList.add('modal-open');
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            document.addEventListener('keydown', onEsc);
            console.log('Modal open status:', modal.classList.contains('is-open'));
        }
        
        function closeModal() {
            console.log('Closing modal...');
            document.body.classList.remove('modal-open');
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
            document.removeEventListener('keydown', onEsc);
        }
        
        function onEsc(e) {
            if (e.key === 'Escape') closeModal();
        }
        
        // Close button handler
        const closeButtons = modal.querySelectorAll('[data-close]');
        console.log('Found close buttons:', closeButtons.length);
        closeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                console.log('Close button clicked');
                closeModal();
                e.preventDefault();
            });
        });
        
        // Backdrop click handler
        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.classList.contains('sp-modal__backdrop')) {
                console.log('Backdrop clicked');
                closeModal();
            }
        });
        
        // Bind click events to all card buttons
        function setupCardButtons() {
            console.log('Setting up modal buttons...');
            const cardButtons = document.querySelectorAll('.sp-card .sp-btn.sp-btn-block');
            console.log('Found card buttons:', cardButtons.length);
            
            cardButtons.forEach(function(btn) {
                // Remove existing event listeners
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Add new event listener
                newBtn.addEventListener('click', function(e) {
                    console.log('Flight card button clicked!');
                    e.preventDefault();
                    
                    // Lấy dữ liệu 2 chiều từ data attribute
                    let out = {};
                    let inn = {};
                    try {
                        out = JSON.parse(newBtn.getAttribute('data-out') || '{}');
                        inn = JSON.parse(newBtn.getAttribute('data-in') || '{}');
                        console.log('Parsed flight data:', out, inn);
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
                console.log('Debug button clicked!');
                const modal = document.getElementById('spModal');
                if (modal) {
                    console.log('Modal found, opening...');
                    document.body.classList.add('modal-open');
                    modal.classList.add('is-open');
                    modal.setAttribute('aria-hidden', 'false');
                    console.log('Modal open status:', modal.classList.contains('is-open'));
                } else {
                    console.error('Modal element not found!');
                }
            });
        }
    }
})();
