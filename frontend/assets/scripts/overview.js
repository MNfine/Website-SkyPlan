(function () {
  const TRIP_KEY = 'skyplan_trip_selection';

  // Booking overview state management
  const OverviewState = {
    getBookingData: function () {
      const data = {
        flights: this.getFlightData(),
        passenger: this.getPassengerData(),
        seats: this.getSeatData(),
        extras: this.getExtrasData(),
        totalCost: 0
      };

      // Calculate total cost
      data.totalCost = this.calculateTotalCost(data);
      return data;
    },

    getFlightData: function () {
      try {
        return JSON.parse(localStorage.getItem(TRIP_KEY)) || null;
      } catch {
        return null;
      }
    },

    getPassengerData: function () {
      try {
        return JSON.parse(localStorage.getItem('currentPassenger')) || null;
      } catch {
        return null;
      }
    },

    getSeatData: function () {
      try {
        const seats = JSON.parse(localStorage.getItem('selectedSeats')) || [];
        const fareClass = localStorage.getItem('fareClass') || 'economy';
        return { seats, fareClass };
      } catch {
        return { seats: [], fareClass: 'economy' };
      }
    },

    getExtrasData: function () {
      if (typeof window.ExtrasState !== 'undefined') {
        return window.ExtrasState.getSummary();
      }
      try {
        return JSON.parse(localStorage.getItem('skyplan_extras_v2')) || { meals: [], baggage: null, services: [], totalCost: 0 };
      } catch {
        return { meals: [], baggage: null, services: [], totalCost: 0 };
      }
    },

    calculateTotalCost: function (data) {
      let total = 0;

      // Flight costs
      if (data.flights && data.flights.priceVND) {
        total += data.flights.priceVND;
      }

      // Seat costs
      if (data.seats && data.seats.seats) {
        total += data.seats.seats.reduce((sum, seat) => sum + (seat.price || 0), 0);
      }

      // Extras costs
      if (data.extras && data.extras.totalCost) {
        total += data.extras.totalCost;
      }

      return total;
    }
  };

  function readTrip() {
    try { return JSON.parse(localStorage.getItem(TRIP_KEY)) || null; } catch { return null; }
  }
  function getLang() {
    return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
  }
  function cityLabel(raw, lang) {
    if (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function') {
      return window.resolveCityLabel(raw, lang);
    }
    const MAP = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) || {};
    const dict = MAP[lang] || MAP.vi || {};
    return (dict && dict[raw]) || raw || '';
  }
  function fmtDateISO(iso, lang) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const s = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    return (lang === 'vi' ? 'Ngày ' + s : s);
  }
  function fmtDuration(min) {
    if (typeof min !== 'number' || isNaN(min) || min <= 0) return '';
    const h = Math.floor(min / 60); const m = min % 60; return `${h}h ${String(m).padStart(2, '0')}m`;
  }
  function parseMin(hhmm) {
    const m = /^([0-2]?\d):([0-5]\d)$/.exec(String(hhmm || ''));
    return m ? (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) : null;
  }
  function diffMin(a, b) {
    const A = parseMin(a), B = parseMin(b); if (A == null || B == null) return null; let d = B - A; if (d < 0) d += 1440; return d;
  }

  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' VND';
  }

  function render() {
    // First, try to sync dates from URL parameters to localStorage
    syncDatesFromURL();
    
    const bookingData = OverviewState.getBookingData();
    const trip = bookingData.flights;

    if (!trip) {
      console.warn('No flight data found for overview');
      return;
    }

    const lang = getLang();
    const fromName = cityLabel(trip.fromCode, lang);
    const toName = cityLabel(trip.toCode, lang);

    // Route heading
    const routeEl = document.getElementById('route-heading');
    if (routeEl) {
      routeEl.textContent = lang === 'vi' ? `${fromName} đến ${toName}` : `${fromName} to ${toName}`;
    }

    renderFlightDetails(trip, lang, fromName, toName);
    renderPassengerDetails(bookingData.passenger, lang);
    renderSeatDetails(bookingData.seats, lang);
    renderExtrasDetails(bookingData.extras, lang);
    renderTotalCost(bookingData.totalCost, lang);
    
    // Ensure payment button is visible and properly configured
    setTimeout(() => {
      updatePaymentButton();
    }, 100);
  }

  function syncDatesFromURL() {
    // Check URL parameters and save to localStorage if found
    const urlParams = new URLSearchParams(window.location.search);
    const departDate = urlParams.get('depart_date');
    const returnDate = urlParams.get('return_date');
    
    if (departDate || returnDate) {
      let searchData = JSON.parse(localStorage.getItem('searchData') || '{}');
      if (departDate) searchData.depart_date = departDate;
      if (returnDate) searchData.return_date = returnDate;
      localStorage.setItem('searchData', JSON.stringify(searchData));
      console.log('💾 Synced dates to localStorage:', searchData);
    }
  }

  function renderFlightDetails(trip, lang, fromName, toName) {
    console.log('🔍 renderFlightDetails debug:');
    console.log('trip:', trip);
    console.log('trip.departDateISO:', trip.departDateISO);
    console.log('trip.returnDateISO:', trip.returnDateISO);
    
    // Check both localStorage and URL parameters for date data
    const searchData = JSON.parse(localStorage.getItem('searchData') || '{}');
    const urlParams = new URLSearchParams(window.location.search);
    
    console.log('searchData from localStorage:', searchData);
    console.log('URL parameters:');
    console.log('  depart_date:', urlParams.get('depart_date'));
    console.log('  return_date:', urlParams.get('return_date'));
    console.log('  outbound_departure_date:', urlParams.get('outbound_departure_date'));
    console.log('  inbound_departure_date:', urlParams.get('inbound_departure_date'));
    
    // If no dates found, try to use current date as fallback  
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    console.log('Today fallback:', today);
    
    // Determine if this is a round-trip or one-way
    const isRoundTrip = trip.returnDateISO && trip.returnDateISO !== trip.departDateISO && trip.returnDateISO.trim() !== '';

    // Check if inbound segment has valid data (not placeholder data)
    const hasValidInboundSegment = Array.isArray(trip.segments) && trip.segments.some(s =>
      s && s.direction === 'inbound' &&
      s.departTime && s.departTime !== '—' && s.departTime.trim() !== '' &&
      s.arriveTime && s.arriveTime !== '—' && s.arriveTime.trim() !== ''
    );



    // Show/hide inbound segment based on trip type
    const inboundSegment = document.querySelector('.flight-segment:nth-of-type(2)');
    if (inboundSegment) {
      if (isRoundTrip || hasValidInboundSegment) {
        inboundSegment.style.display = 'block';
      } else {
        inboundSegment.style.display = 'none';
      }
    }

    // Outbound segment
    const outDateEl = document.querySelector('.flight-segment:nth-of-type(1) .flight-date .date-text');
    if (outDateEl) {
      // Try multiple sources for departure date
      const departDate = trip.departDateISO || 
                        searchData.depart_date || 
                        urlParams.get('depart_date') || 
                        urlParams.get('outbound_departure_date') ||
                        today; // Fallback to today
      console.log('Using departDate:', departDate);
      
      if (departDate) {
        outDateEl.setAttribute('data-iso', departDate);
        outDateEl.textContent = fmtDateISO(departDate, lang);
      }
    }
    const outDepTimeEl = document.querySelector('.flight-segment:nth-of-type(1) .departure .time');
    const outDepLocEl = document.querySelector('.flight-segment:nth-of-type(1) .departure .location');
    const outDepCityEl = document.querySelector('.flight-segment:nth-of-type(1) .departure .city');
    const outArrTimeEl = document.querySelector('.flight-segment:nth-of-type(1) .arrival .time');
    const outArrLocEl = document.querySelector('.flight-segment:nth-of-type(1) .arrival .location');
    const outArrCityEl = document.querySelector('.flight-segment:nth-of-type(1) .arrival .city');
    const outDurEl = document.querySelector('.flight-segment:nth-of-type(1) .flight-path .duration');

    // Handle outbound flight data - try multiple data sources
    let outboundData = null;
    
    // Try to get from segments array first
    if (Array.isArray(trip.segments)) {
      outboundData = trip.segments.find(s => s && s.direction === 'outbound');
    }
    
    // If no segments, try to get from main trip object properties
    if (!outboundData && trip) {
      outboundData = {
        departTime: trip.outboundDepartTime || trip.departTime,
        arriveTime: trip.outboundArriveTime || trip.arriveTime,
        departIATA: trip.fromIATA || trip.fromCode,
        arriveIATA: trip.toIATA || trip.toCode,
        durationMin: trip.outboundDurationMin || trip.durationMin
      };
    }
    
    if (outboundData) {
      if (outDepTimeEl) outDepTimeEl.textContent = outboundData.departTime || '';
      if (outDepLocEl) outDepLocEl.textContent = outboundData.departIATA || trip.fromIATA || trip.fromCode || '';
      if (outDepCityEl) outDepCityEl.textContent = fromName;
      if (outArrTimeEl) outArrTimeEl.textContent = outboundData.arriveTime || '';
      if (outArrLocEl) outArrLocEl.textContent = outboundData.arriveIATA || trip.toIATA || trip.toCode || '';
      if (outArrCityEl) outArrCityEl.textContent = toName;
      const dmin = (typeof outboundData.durationMin === 'number' && outboundData.durationMin > 0) ? 
        outboundData.durationMin : 
        diffMin(outboundData.departTime, outboundData.arriveTime);
      if (outDurEl && dmin) outDurEl.textContent = fmtDuration(dmin);
    }

    // Inbound segment
    const inDateEl = document.querySelector('.flight-segment:nth-of-type(2) .flight-date .date-text');
    if (inDateEl) {
      // Try multiple sources for return date  
      const returnDate = trip.returnDateISO || 
                        searchData.return_date || 
                        urlParams.get('return_date') || 
                        urlParams.get('inbound_departure_date') ||
                        trip.departDateISO || 
                        searchData.depart_date ||
                        today; // Fallback to today
      console.log('Using returnDate:', returnDate);
      
      if (returnDate) {
        inDateEl.setAttribute('data-iso', returnDate);
        inDateEl.textContent = fmtDateISO(returnDate, lang);
      }
    }
    const inDepTimeEl = document.querySelector('.flight-segment:nth-of-type(2) .departure .time');
    const inDepLocEl = document.querySelector('.flight-segment:nth-of-type(2) .departure .location');
    const inDepCityEl = document.querySelector('.flight-segment:nth-of-type(2) .departure .city');
    const inArrTimeEl = document.querySelector('.flight-segment:nth-of-type(2) .arrival .time');
    const inArrLocEl = document.querySelector('.flight-segment:nth-of-type(2) .arrival .location');
    const inArrCityEl = document.querySelector('.flight-segment:nth-of-type(2) .arrival .city');
    const inDurEl = document.querySelector('.flight-segment:nth-of-type(2) .flight-path .duration');

    // Handle inbound flight data - only for round-trip
    let inboundData = null;
    
    // Only process inbound if this is a round-trip
    if (isRoundTrip || hasValidInboundSegment) {
      // Try to get from segments array first
      if (Array.isArray(trip.segments)) {
        inboundData = trip.segments.find(s => s && s.direction === 'inbound');
      }
      
      // If no segments, try to get from main trip object properties for return flight
      if (!inboundData && trip) {
        inboundData = {
          departTime: trip.inboundDepartTime || trip.returnDepartTime,
          arriveTime: trip.inboundArriveTime || trip.returnArriveTime,
          departIATA: trip.toIATA || trip.toCode, // Return flight departs from arrival city
          arriveIATA: trip.fromIATA || trip.fromCode, // Return flight arrives at departure city
          durationMin: trip.inboundDurationMin || trip.returnDurationMin
        };
      }
      
      if (inboundData && (inboundData.departTime || inboundData.arriveTime)) {
        if (inDepTimeEl) inDepTimeEl.textContent = inboundData.departTime || '';
        if (inDepLocEl) inDepLocEl.textContent = inboundData.departIATA || trip.toIATA || trip.toCode || '';
        if (inDepCityEl) inDepCityEl.textContent = toName; // Departs from destination city
        if (inArrTimeEl) inArrTimeEl.textContent = inboundData.arriveTime || '';
        if (inArrLocEl) inArrLocEl.textContent = inboundData.arriveIATA || trip.fromIATA || trip.fromCode || '';
        if (inArrCityEl) inArrCityEl.textContent = fromName; // Arrives at origin city
        const dmin = (typeof inboundData.durationMin === 'number' && inboundData.durationMin > 0) ? 
          inboundData.durationMin : 
          diffMin(inboundData.departTime, inboundData.arriveTime);
        if (inDurEl && dmin) inDurEl.textContent = fmtDuration(dmin);
      }
    }
  }

  function renderPassengerDetails(passenger, lang) {
    if (!passenger) return;

    const passengerNameEl = document.querySelector('.passenger-name, .booking-passenger-name');
    const passengerEmailEl = document.querySelector('.passenger-email, .booking-passenger-email');
    const passengerPhoneEl = document.querySelector('.passenger-phone, .booking-passenger-phone');

    if (passengerNameEl) {
      passengerNameEl.textContent = `${passenger.firstname || ''} ${passenger.lastname || ''}`.trim();
    }
    if (passengerEmailEl) {
      passengerEmailEl.textContent = passenger.email || '';
    }
    if (passengerPhoneEl) {
      passengerPhoneEl.textContent = passenger.phone_number || passenger.phoneNumber || '';
    }
  }

  function renderSeatDetails(seatData, lang) {
    if (!seatData || !seatData.seats || seatData.seats.length === 0) return;

    const seatInfoEl = document.querySelector('.seat-selection, .booking-seats');
    if (seatInfoEl) {
      const seatCodes = seatData.seats.map(seat => seat.code).join(', ');
      const seatCost = seatData.seats.reduce((sum, seat) => sum + (seat.price || 0), 0);

      const text = lang === 'vi'
        ? `Ghế: ${seatCodes} (${formatVND(seatCost)})`
        : `Seats: ${seatCodes} (${formatVND(seatCost)})`;

      seatInfoEl.textContent = text;
    }
  }

  function renderExtrasDetails(extras, lang) {
    if (!extras) return;

    const extrasInfoEl = document.querySelector('.extras-summary, .booking-extras');
    if (extrasInfoEl && extras.totalCost > 0) {
      let summary = [];

      if (extras.meals && extras.meals.length > 0) {
        const mealCount = extras.meals.reduce((sum, meal) => sum + meal.quantity, 0);
        const mealText = lang === 'vi' ? `${mealCount} suất ăn` : `${mealCount} meals`;
        summary.push(mealText);
      }

      if (extras.baggage && extras.baggage.kg > 0) {
        const baggageText = lang === 'vi'
          ? `Hành lý: ${extras.baggage.kg}kg`
          : `Baggage: ${extras.baggage.kg}kg`;
        summary.push(baggageText);
      }

      if (extras.services && extras.services.length > 0) {
        const serviceText = lang === 'vi'
          ? `${extras.services.length} dịch vụ`
          : `${extras.services.length} services`;
        summary.push(serviceText);
      }

      const text = lang === 'vi'
        ? `Dịch vụ bổ sung: ${summary.join(', ')} (${formatVND(extras.totalCost)})`
        : `Extras: ${summary.join(', ')} (${formatVND(extras.totalCost)})`;

      extrasInfoEl.textContent = text;
    }
  }

  function renderTotalCost(totalCost, lang) {
    const totalEl = document.querySelector('.total-price .price-amount, .booking-total');
    if (totalEl) {
      totalEl.textContent = formatVND(totalCost);
    }

    // Update any booking data for payment
    try {
      localStorage.setItem('bookingTotal', totalCost.toString());
    } catch { }
  }

  // Check booking status from backend
  async function checkBookingStatus(bookingCode) {
    const token = localStorage.getItem('authToken'); // Optional
    if (!bookingCode) {
      console.log('No booking code provided for status check');
      return null;
    }

    console.log(`🔍 Checking booking status for: ${bookingCode}, Token: ${token ? 'Present' : 'None'}`);

    try {
      // Prepare headers - only add Authorization if token exists
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/bookings/${bookingCode}`, {
        method: 'GET',
        headers: headers
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      // If 401 Unauthorized, this could mean:
      // 1. Backend requires authentication for booking checks
      // 2. Invalid token
      // 3. Booking doesn't belong to current user
      if (response.status === 401) {
        console.warn(`🔐 401 Unauthorized for booking ${bookingCode} - Backend may require auth for booking status checks`);
        return null;
      }

      // If 404, booking doesn't exist
      if (response.status === 404) {
        console.log(`📝 Booking ${bookingCode} not found (404) - treating as new booking`);
        return null;
      }

      const result = await response.json();
      if (response.ok && result.success) {
        console.log(`✅ Booking status retrieved: ${result.booking?.status || 'unknown'}`);
        return result.booking;
      } else {
        console.warn(`⚠️  API returned error: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('💥 Error checking booking status:', error);
    }
    return null;
  }

  // Check if booking is already paid based on backend status
  async function isBookingAlreadyPaid() {
    const bookingCode = localStorage.getItem('currentBookingCode');
    if (!bookingCode) {
      console.log('💳 No booking code in localStorage - treating as new booking');
      return false;
    }

    // Check if this is a guest checkout (no auth token)
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('💳 No auth token - guest checkout, assuming booking is not paid yet');
      return false;
    }

    console.log(`💳 Checking if booking ${bookingCode} is already paid`);
    const booking = await checkBookingStatus(bookingCode);
    const isPaid = booking && booking.status === 'CONFIRMED';
    
    console.log(`💳 Booking payment status: ${isPaid ? 'PAID' : 'UNPAID/NEW'} (status: ${booking?.status || 'none'})`);
    return isPaid;
  }



  // Create booking API call
  async function createBooking() {
    console.log('🔍 createBooking function called!');
    let token = localStorage.getItem('authToken'); // Optional - can be null for guest checkout

    const bookingData = OverviewState.getBookingData();
    const trip = bookingData.flights;
    const passenger = bookingData.passenger;
    const seats = bookingData.seats;
    
    console.log('🔍 Booking data:', { trip, passenger, seats, token });

    if (!trip || !passenger) {
      alert(getLang() === 'vi' ? 'Thiếu thông tin chuyến bay hoặc hành khách' : 'Missing flight or passenger information');
      return null;
    }

    // Determine trip type - match backend enum values
    const tripType = trip.returnDateISO ? 'round-trip' : 'one-way';

    // Map fare class - match backend enum values  
    const fareClassMap = {
      'economy': 'economy',
      'premium': 'premium-economy', 
      'premium-economy': 'premium-economy',
      'business': 'business'
    };
    const fareClass = fareClassMap[seats.fareClass] || 'economy';    // Get flight IDs - use fallback if not available
    const outboundFlightId = trip.outbound_flight_id || trip.flightId || 3803; // Fallback to known flight
    const inboundFlightId = trip.returnDateISO && tripType === 'round-trip' ?
      (trip.inbound_flight_id || trip.returnFlightId) : null;

    // Validate flight IDs
    if (!outboundFlightId) {
      alert(getLang() === 'vi' ? 'Không tìm thấy thông tin chuyến bay' : 'Flight information not found');
      return null;
    }

    let requestData;
    if (token) {
      // Authenticated booking
      requestData = {
        outbound_flight_id: parseInt(outboundFlightId),
        inbound_flight_id: inboundFlightId ? parseInt(inboundFlightId) : undefined,
        trip_type: tripType,
        fare_class: fareClass,
        passengers: [passenger.id],
        total_amount: bookingData.totalCost.toString()
      };
    } else {
      // Guest booking - send passenger data directly
      requestData = {
        outbound_flight_id: parseInt(outboundFlightId),
        inbound_flight_id: inboundFlightId ? parseInt(inboundFlightId) : undefined,
        trip_type: tripType,
        fare_class: fareClass,
        guest_passenger: {
          lastname: passenger.lastname,
          firstname: passenger.firstname,
          cccd: passenger.cccd,
          dob: passenger.dob,
          gender: passenger.gender,
          phone_number: passenger.phone_number,
          email: passenger.email,
          address: passenger.address,
          city: passenger.city,
          nationality: passenger.nationality,
          notes: passenger.notes || ''
        },
        total_amount: bookingData.totalCost.toString()
      };
    }

    console.log('🔍 Creating booking with data:', requestData);
    console.log('🔍 Trip data:', trip);
    console.log('🔍 Passenger data:', passenger);
    console.log('🔍 Debug flight IDs:', {
      'trip.outbound_flight_id': trip.outbound_flight_id,
      'trip.flightId': trip.flightId,
      'trip.inbound_flight_id': trip.inbound_flight_id,
      'trip.returnFlightId': trip.returnFlightId
    });

    try {
      showLoading();

      // Prepare headers - only add Authorization if token exists
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🔍 Sending booking request:', requestData);

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestData)
      });

      const result = await response.json();
      hideLoading();

      console.log('🔍 Booking API response:', { status: response.status, result });

      if (response.ok && result.success) {
        // Store booking code for payment page
        localStorage.setItem('currentBookingCode', result.booking_code);
        return result.booking_code;
      } else {
        console.error('❌ Booking creation failed:', result);
        throw new Error(result.message || 'Failed to create booking');
      }
    } catch (error) {
      hideLoading();
      console.error('Error creating booking:', error);
      alert(getLang() === 'vi' ?
        'Không thể tạo booking. Vui lòng thử lại.' :
        'Could not create booking. Please try again.');
      return null;
    }
  }

  function showLoading() {
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
      payBtn.style.pointerEvents = 'none';
      payBtn.style.opacity = '0.7';
      const text = payBtn.querySelector('span');
      if (text) {
        text.setAttribute('data-original', text.textContent);
        text.textContent = getLang() === 'vi' ? 'Đang xử lý...' : 'Processing...';
      }
    }
  }

  function hideLoading() {
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
      payBtn.style.pointerEvents = '';
      payBtn.style.opacity = '';
      const text = payBtn.querySelector('span');
      if (text && text.hasAttribute('data-original')) {
        text.textContent = text.getAttribute('data-original');
        text.removeAttribute('data-original');
      }
    }
  }

  // Handle proceed to payment
  async function handleProceedToPayment(event) {
    event.preventDefault();

    // Check if booking is already paid
    const alreadyPaid = await isBookingAlreadyPaid();
    if (alreadyPaid) {
      const message = getLang() === 'vi'
        ? 'Booking này đã được thanh toán. Bạn có thể xem trong "Chuyến đi của tôi".'
        : 'This booking has already been paid. You can view it in "My Trips".';
      alert(message);
      window.location.href = 'my_trips.html';
      return;
    }

    // Prepare URL with current parameters for payment page
    function buildPaymentURL(bookingCode) {
      const params = new URLSearchParams(window.location.search);
      params.set('booking_code', bookingCode);
      return `payment.html?${params.toString()}`;
    }

    // Check if booking already exists
    const existingBookingCode = localStorage.getItem('currentBookingCode');
    if (existingBookingCode) {
      const existingBooking = await checkBookingStatus(existingBookingCode);
      if (existingBooking && existingBooking.status === 'PENDING') {
        // Use existing booking
        window.location.href = buildPaymentURL(existingBookingCode);
        return;
      }
    }

    // Create new booking
    createBooking().then(bookingCode => {
      if (bookingCode) {
        window.location.href = buildPaymentURL(bookingCode);
      }
    });
  }

  // Update payment button based on booking status
  async function updatePaymentButton() {
    const payBtn = document.querySelector('.pay-btn');
    if (!payBtn) {
      console.warn('Payment button not found in DOM');
      return;
    }

    try {
      const alreadyPaid = await isBookingAlreadyPaid();
      const lang = getLang();

      if (alreadyPaid) {
        // Booking is paid - hide payment button and show trip view button
        const btnText = payBtn.querySelector('span');
        if (btnText) {
          btnText.textContent = lang === 'vi' ? 'Xem chuyến đi' : 'View Trip';
        }
        payBtn.classList.add('paid');
        payBtn.style.background = '#28a745';
        payBtn.style.display = 'flex';
        payBtn.style.visibility = 'visible';
      } else {
        // Booking not paid or doesn't exist - show payment button
        const btnText = payBtn.querySelector('span');
        if (btnText) {
          btnText.textContent = lang === 'vi' ? 'Xác nhận thanh toán' : 'Confirm Payment';
        }
        payBtn.classList.remove('paid');
        payBtn.style.background = '';
        payBtn.style.display = 'flex';
        payBtn.style.visibility = 'visible';
      }
    } catch (error) {
      console.error('Error updating payment button:', error);
      // Default to showing payment button if status check fails (guest checkout)
      const btnText = payBtn.querySelector('span');
      const lang = getLang();
      if (btnText) {
        btnText.textContent = lang === 'vi' ? 'Xác nhận thanh toán' : 'Confirm Payment';
      }
      payBtn.classList.remove('paid');
      payBtn.style.background = '';
      payBtn.style.display = 'flex';
      payBtn.style.visibility = 'visible';
    }
  }

  // Initialize event handlers
  function initializeEventHandlers() {
    const payBtn = document.querySelector('.pay-btn');
    if (payBtn) {
      // Ensure button is visible and clickable
      payBtn.style.display = 'flex';
      payBtn.style.visibility = 'visible';
      payBtn.addEventListener('click', handleProceedToPayment);
    } else {
      console.warn('Payment button not found during initialization');
    }
  }



  // Make OverviewState available globally
  window.OverviewState = OverviewState;

  document.addEventListener('DOMContentLoaded', function () {
    // Debug: Check localStorage state
    const bookingCode = localStorage.getItem('currentBookingCode');
    const authToken = localStorage.getItem('authToken');
    console.log('🔍 Overview page loaded:', {
      bookingCode,
      hasAuthToken: !!authToken,
      authTokenPreview: authToken ? `${authToken.substring(0, 10)}...` : 'none'
    });

    // Debug: Test API accessibility
    if (bookingCode && authToken) {
      console.log('🔍 Will attempt to check booking status - this might cause the 401 error you see');
    } else if (bookingCode && !authToken) {
      console.log('🔍 Have booking code but no auth token - this is guest checkout, API call may fail with 401');
    }

    render();
    initializeEventHandlers();
    updatePaymentButton(); // Check and update payment button based on backend status
  });
  document.addEventListener('languageChanged', render);
})();
