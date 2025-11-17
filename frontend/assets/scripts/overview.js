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

  function getAuthToken() {
    try {
      if (typeof window.AuthState !== 'undefined' && typeof window.AuthState.getToken === 'function') {
        const token = window.AuthState.getToken();
        if (token) return token;
      }
    } catch (err) {
      console.warn('getAuthToken: AuthState not available', err);
    }
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

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
        // Try both keys for passenger data
        let passenger = JSON.parse(localStorage.getItem('currentPassenger'));
        if (!passenger) {
          passenger = JSON.parse(localStorage.getItem('skyplan_passenger_data'));
        }
        return passenger || null;
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

      // 1. Seat costs (base ticket price from seat selection)
      let seatTotal = 0;
      if (data.seats && data.seats.seats) {
        seatTotal = data.seats.seats.reduce((sum, seat) => sum + (seat.price || 0), 0);
        total += seatTotal;
      }

      // 2. Extras costs (from extras page)
      let extrasTotal = 0;
      if (data.extras && data.extras.totalCost) {
        extrasTotal = data.extras.totalCost;
        total += extrasTotal;
      }

  // 3. Fixed fees (taxes and other charges)
  // Derive a base fare to compute fees (use seatTotal or flight data when available)
  const baseFare = seatTotal || ((data.flights && ((data.flights.selectedFlight && Number(data.flights.selectedFlight.price)) || Number(data.flights.price || 0))) || 0) || 0;
  const fixedFees = baseFare ? Math.round(baseFare * 0.1) : 0; // 10% fee if base fare present
  total += fixedFees;

      console.log('Calculate total cost (NEW LOGIC):', {
        seatTotal: seatTotal,
        extrasTotal: extrasTotal, 
        fixedFees: fixedFees,
        finalTotal: total,
        breakdown: {
          seats: data.seats,
          extras: data.extras
        }
      });

      return total;
    }
  };

  function readTrip() {
    try { return JSON.parse(localStorage.getItem(TRIP_KEY)) || null; } catch { return null; }
  }
  
  // Read selected seats and normalize structure for payment page
  function readSeats() {
    try {
      // Prefer OverviewState if available
      let seatData = null;
      if (typeof OverviewState !== 'undefined' && typeof OverviewState.getSeatData === 'function') {
        seatData = OverviewState.getSeatData();
      } else {
        seatData = { seats: JSON.parse(localStorage.getItem('selectedSeats') || '[]'), fareClass: localStorage.getItem('fareClass') || 'economy' };
      }

      // Normalize seats array to { price, seatNumber, type }
      const rawSeats = Array.isArray(seatData.seats) ? seatData.seats : (seatData.seats || []);
      const seats = rawSeats.map(s => {
        // Try a few common property names used in different parts of the app
        const price = Number(s.price || s.priceVND || s.amount || s.fare || 0);
        const seatNumber = s.seatNumber || s.seat_label || s.label || s.code || s.id || '';
        const type = s.type || s.fareClass || seatData.fareClass || 'economy';
        return { price: price, seatNumber: seatNumber, type: type };
      });

      // Compute totalCost for seats
      const totalCost = seats.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

      return { seats: seats, fareClass: seatData.fareClass || 'economy', totalCost: totalCost };
    } catch (e) {
      console.error('Error in readSeats():', e);
      return { seats: [], fareClass: 'economy', totalCost: 0 };
    }
  }

  // Read passenger info and normalize
  function readPassenger() {
    try {
      // Prefer OverviewState getter
      let p = null;
      if (typeof OverviewState !== 'undefined' && typeof OverviewState.getPassengerData === 'function') {
        p = OverviewState.getPassengerData();
      } else {
        p = JSON.parse(localStorage.getItem('currentPassenger') || 'null') || JSON.parse(localStorage.getItem('skyplan_passenger_data') || 'null');
      }
      if (!p) return null;

      // Normalize common fields
      return {
        firstname: p.firstname || p.firstName || p.givenName || p.given_name || '',
        lastname: p.lastname || p.lastName || p.familyName || p.family_name || '',
        email: p.email || p.emailAddress || p.email_address || '',
        phone_number: p.phoneNumber || p.phone || p.phone_number || ''
      };
    } catch (e) {
      console.error('Error in readPassenger():', e);
      return null;
    }
  }

  // Read extras summary and normalize for payment page
  function readExtras() {
    try {
      let ex = null;
      if (typeof OverviewState !== 'undefined' && typeof OverviewState.getExtrasData === 'function') {
        ex = OverviewState.getExtrasData();
      } else {
        ex = JSON.parse(localStorage.getItem('skyplan_extras_v2') || 'null') || { meals: [], baggage: null, services: [], totalCost: 0 };
      }

      // Normalize keys: extras.totalCost may be totalCost or total
      const totalCost = Number(ex.totalCost || ex.total || ex.total_cost || 0);
      const meals = Array.isArray(ex.meals) ? ex.meals.map(m => ({ name: m.name || m.label || '', price: Number(m.price || m.amount || 0), qty: m.quantity || m.qty || 1 })) : [];
      const baggage = ex.baggage || ex.baggageInfo || null;
      const services = Array.isArray(ex.services) ? ex.services : [];

      return { totalCost: totalCost, meals: meals, baggage: baggage, services: services };
    } catch (e) {
      console.error('Error in readExtras():', e);
      return { totalCost: 0, meals: [], baggage: null, services: [] };
    }
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
    }, 300);
  }

  function syncDatesFromURL() {
    // Check URL parameters for booking code (tripId or booking_code) and load booking data if exists
    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('tripId') || urlParams.get('booking_code');
    if (tripId) {
      localStorage.setItem('currentBookingCode', tripId);
      localStorage.setItem('overviewMode', 'existing-trip');
      console.log('🔍 Overview: Found tripId/booking_code in URL, saved to currentBookingCode:', tripId);
      // Load booking data from backend
      loadBookingData(tripId);
    } else {
      // New booking flow - clear stale booking codes so confirm button stays visible
      localStorage.setItem('overviewMode', 'new-trip');
      localStorage.removeItem('currentBookingCode');
    }
    
    // Check URL parameters and save to localStorage if found
    const departDate = urlParams.get('depart_date');
    const returnDate = urlParams.get('return_date');
    
    if (departDate || returnDate) {
      let searchData = JSON.parse(localStorage.getItem('searchData') || '{}');
      if (departDate) searchData.depart_date = departDate;
      if (returnDate) searchData.return_date = returnDate;
      localStorage.setItem('searchData', JSON.stringify(searchData));
      console.log('Synced dates to localStorage:', searchData);
    }
  }

  function renderFlightDetails(trip, lang, fromName, toName) {
    console.log('renderFlightDetails debug:');
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

    // Update booking data for payment - save complete data structure
    try {
      localStorage.setItem('bookingTotal', totalCost.toString());
      
      // Save complete booking data for payment page
      const trip = readTrip();
      const passenger = readPassenger();
      const seats = readSeats();
      const extras = readExtras();
      
      const completeBookingData = {
        totalCost: totalCost,
        trip: trip,
        passenger: passenger,
        seats: seats,
        extras: extras,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('completeBookingData', JSON.stringify(completeBookingData));
      console.log('💾 Saved complete booking data for payment:', completeBookingData);
    } catch (error) {
      console.error('Error saving booking data:', error);
    }
  }

  // Load booking data from backend and populate overview page
  async function loadBookingData(bookingCode) {
    if (!bookingCode) {
      console.log('No booking code provided for loading booking data');
      return;
    }

    const token = getAuthToken();
    console.log(`🔍 Loading booking data for: ${bookingCode}, Token: ${token ? 'Present' : 'None'}`);

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/bookings/${bookingCode}`, { headers });
      if (!response.ok) {
        console.warn(`Failed to load booking: ${response.status}`);
        return;
      }

      const result = await response.json();
      const booking = result.booking;
      console.log('🔍 Loaded booking data:', booking);

      // Populate overview page with booking data
      if (booking && booking.booking_code) {
        console.log('🔍 Populating overview with booking:', booking);
        
        // Build complete trip data from booking
        const tripData = {
          outbound_flight_id: booking.outbound_flight_id,
          flightId: booking.outbound_flight_id,
          inbound_flight_id: booking.inbound_flight_id,
          returnFlightId: booking.inbound_flight_id,
          fromCode: booking.outbound_flight?.departure_airport || booking.outbound_flight?.origin_code,
          toCode: booking.outbound_flight?.arrival_airport || booking.outbound_flight?.destination_code,
          departDateISO: booking.outbound_flight?.departure_time,
          returnDateISO: booking.inbound_flight?.departure_time,
          selectedFlight: booking.outbound_flight,
          returnFlight: booking.inbound_flight,
          tripType: booking.trip_type,
          fareClass: booking.fare_class
        };
        localStorage.setItem('skyplan_trip_selection', JSON.stringify(tripData));
        localStorage.setItem('fareClass', booking.fare_class || 'economy');
        
        // Save passenger data
        if (booking.passengers && booking.passengers.length > 0) {
          const passenger = booking.passengers[0];
          localStorage.setItem('currentPassenger', JSON.stringify(passenger));
        }
        
        // Save seat data
        if (booking.passengers) {
          const seats = booking.passengers.map(p => ({
            seatNumber: p.seat_number || p.seatNumber || '',
            price: 0,
            type: booking.fare_class || 'economy'
          })).filter(s => s.seatNumber);
          if (seats.length > 0) {
            localStorage.setItem('selectedSeats', JSON.stringify(seats));
          }
        }
        
        // Calculate extras from total_amount
        // Since extras are not stored in booking, we estimate from total - (flight cost + tax)
        const flightCost = (booking.outbound_flight?.price || 0) + (booking.inbound_flight?.price || 0);
        const tax = Math.round(flightCost * 0.1);
        const estimatedExtras = Math.max(0, (booking.total_amount || 0) - flightCost - tax);
        
        // Save extras data (estimated since not stored in booking)
        const extrasData = {
          meals: [],
          baggage: estimatedExtras > 0 ? { kg: 30, price: estimatedExtras } : null,
          services: [],
          totalCost: estimatedExtras
        };
        localStorage.setItem('skyplan_extras_v2', JSON.stringify(extrasData));
        
        // Save complete booking data
        const completeData = {
          totalCost: booking.total_amount || 0,
          trip: tripData,
          passenger: booking.passengers && booking.passengers.length > 0 ? booking.passengers[0] : null,
          seats: { seats: booking.passengers ? booking.passengers.map(p => ({
            seatNumber: p.seat_number || p.seatNumber || '',
            price: 0,
            type: booking.fare_class || 'economy'
          })).filter(s => s.seatNumber) : [], fareClass: booking.fare_class || 'economy' },
          extras: extrasData,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('completeBookingData', JSON.stringify(completeData));

        // Re-render overview page with loaded data
        setTimeout(() => {
          if (typeof render === 'function') {
            render();
          }
        }, 100);
        setTimeout(() => {
          updatePaymentButton();
        }, 200);
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    }
  }

  // Check booking status from backend
  async function checkBookingStatus(bookingCode) {
    const token = getAuthToken(); // Optional
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
    const token = getAuthToken();
    if (!token) {
      console.log('💳 No auth token - guest checkout, assuming booking is not paid yet');
      return false;
    }

    console.log(`💳 Checking if booking ${bookingCode} is already paid`);
    try {
      const booking = await checkBookingStatus(bookingCode);
      const isPaid = booking && (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED');
      
      console.log(`💳 Booking payment status: ${isPaid ? 'PAID' : 'UNPAID/NEW'} (status: ${booking?.status || 'none'})`);
      return isPaid;
    } catch (error) {
      console.error('💳 Error checking booking status:', error);
      return false;
    }
  }



  // Create booking API call
  async function createBooking() {
    console.log('🔍 createBooking function called!');
    const token = getAuthToken();
    console.log('🔑 Token used for booking:', token ? `${token.substring(0,20)}...` : null);

    const bookingData = OverviewState.getBookingData();
    const trip = bookingData.flights;
    const passenger = bookingData.passenger;
    const seats = bookingData.seats;

    // If the payment_order helper is available, use it to build/persist a pendingBookingPayload
    // so overview and payment pages share the same payload shape.
    try {
      if (typeof window.buildPendingBookingPayload === 'function') {
        const code = window.buildPendingBookingPayload();
        console.log('Pending booking payload built by shared helper, clientCode:', code);
      }
    } catch (e) { console.warn('buildPendingBookingPayload invocation failed:', e); }
    
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
    const fareClass = fareClassMap[seats.fareClass] || 'economy';
    // Get flight IDs - DO NOT use stale hardcoded fallbacks (was 3803)
    // Prefer explicit outbound_flight_id, then flightId; otherwise null so validation fails early
    const outboundFlightId = trip.outbound_flight_id || trip.flightId || null;
    const inboundFlightId = trip.returnDateISO && tripType === 'round-trip' ?
      (trip.inbound_flight_id || trip.returnFlightId) : null;

    // Validate flight IDs
    if (!outboundFlightId) {
      alert(getLang() === 'vi' ? 'Không tìm thấy thông tin chuyến bay' : 'Flight information not found');
      return null;
    }

    // Helper to format dob to MM/DD/YYYY
    function formatDobMMDDYYYY(dob) {
      if (!dob) return '';
      // If already MM/DD/YYYY, return as is
      // If format looks like DD/MM/YYYY or MM/DD/YYYY (both are \d{2}/\d{2}/\d{4}),
      // assume user-entered is DD/MM/YYYY (common for our locale) and convert to MM/DD/YYYY.
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        const parts = dob.split('/');
        // parts[0] = day, parts[1] = month, parts[2] = year (user locale assumed)
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${month}/${day}/${year}`;
      }
      // If YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        const [y, m, d] = dob.split('-');
        return `${m}/${d}/${y}`;
      }
      // If other common separators like D-M-YYYY or D.M.YYYY
      const parts = dob.split(/[\/\-.]/);
      if (parts.length === 3) {
        let [a, b, c] = parts;
        if (c && c.length === 4) {
          // If a looks like YYYY (start with 4 digits), it's YYYY-MM-DD
          if (/^\d{4}$/.test(a)) {
            return `${b.padStart(2,'0')}/${(a.length===4? a.split('-')[2]: a)}/${c}`; // fallback
          }
          // Otherwise assume a=day, b=month
          return `${b.padStart(2, '0')}/${a.padStart(2, '0')}/${c}`;
        }
      }
      // For any remaining 3-part formats (separated by /, -, .), we already attempted
      // the YYYY-MM-DD and D-M-YYYY/D.M.YYYY cases above. If still ambiguous, leave as-is.
      return dob; // fallback
    }

    // Helper to format dob to YYYY-MM-DD (ISO) for guest booking endpoint
    function formatDobISO(dob) {
      if (!dob) return '';
      // If already ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
      // If common dd/mm/yyyy or mm/dd/yyyy -> try to parse and normalize as YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
        const parts = dob.split('/');
        // Assume user-entered is DD/MM/YYYY (locale)
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      // If YYYY/MM/DD or other separators
      const parts = dob.split(/[\/\-.]/);
      if (parts.length === 3) {
        // If first part is year
        if (/^\d{4}$/.test(parts[0])) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
        // Otherwise assume D M Y
        return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      }
      // Last resort: try Date parsing
      const dt = new Date(dob);
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return dob; // fallback
    }

    let requestData;
    if (token) {
      // Authenticated booking
      // Ensure we have a passenger ID (try bookingData passenger.id or fallback to storedPassengerId)
      const passengerIdFromStorage = localStorage.getItem('storedPassengerId') || localStorage.getItem('activePassengerId');
      const pid = passenger && passenger.id ? Number(passenger.id) : (passengerIdFromStorage ? Number(passengerIdFromStorage) : null);
      if (!pid) {
        console.warn('No passenger ID found for authenticated user; falling back to guest payload');
        // Fallback to guest booking if we can't find a passenger id
        requestData = {
          outbound_flight_id: parseInt(outboundFlightId),
          inbound_flight_id: inboundFlightId ? parseInt(inboundFlightId) : undefined,
          trip_type: tripType,
          fare_class: fareClass,
          guest_passenger: {
            lastname: passenger.lastname,
            firstname: passenger.firstname,
            cccd: passenger.cccd,
            dob: formatDobISO(passenger.dob),
            gender: passenger.gender,
            phone_number: passenger.phone_number,
            email: passenger.email,
            address: passenger.address,
            city: passenger.city,
            nationality: passenger.nationality,
            notes: passenger.notes || '',
            // Include seat information if available
            seatNumber: (seats && seats.seats && seats.seats.length > 0) ? (seats.seats[0].seatNumber || seats.seats[0].seat_number || seats.seats[0].seat || null) : null,
            seat_id: (seats && seats.seats && seats.seats.length > 0) ? (seats.seats[0].seat_id || null) : null
          },
          seats: seats, // Also send seats separately for backend to extract
          total_amount: bookingData.totalCost.toString()
        };
      } else {
        // Include seat information if available
        const selectedSeats = seats && seats.seats ? seats.seats : [];
        // BUG FIX: Only 1 passenger, so only take first seat (if any)
        const firstSeat = selectedSeats.length > 0 ? selectedSeats[0] : null;
        const passengerWithSeat = firstSeat ? {
          id: pid,
          seatNumber: firstSeat.seatNumber || firstSeat.seat_number || firstSeat.seat || null,
          seat_id: firstSeat.seat_id || null
        } : { id: pid };
        
        requestData = {
          outbound_flight_id: parseInt(outboundFlightId),
          inbound_flight_id: inboundFlightId ? parseInt(inboundFlightId) : undefined,
          trip_type: tripType,
          fare_class: fareClass,
          passengers: [passengerWithSeat], // Always send as array with 1 passenger
          seats: seats, // Also send seats separately for backend to extract
          total_amount: bookingData.totalCost.toString()
        };
      }
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
          dob: formatDobISO(passenger.dob),
          gender: passenger.gender,
          phone_number: passenger.phone_number,
          email: passenger.email,
          address: passenger.address,
          city: passenger.city,
          nationality: passenger.nationality,
          notes: passenger.notes || '',
          // Include seat information if available
          seatNumber: (seats && seats.seats && seats.seats.length > 0) ? (seats.seats[0].seatNumber || seats.seats[0].seat_number || seats.seats[0].seat || null) : null,
          seat_id: (seats && seats.seats && seats.seats.length > 0) ? (seats.seats[0].seat_id || null) : null
        },
        seats: seats, // Also send seats separately for backend to extract
        total_amount: bookingData.totalCost.toString()
      };
    }

    console.log('🔍 Creating booking with data:', requestData);
    console.log('🔍 Trip data:', trip);
    console.log('🔍 Passenger data:', passenger);
    console.log('🔍 Seats data:', seats);
    console.log('🔍 Debug enum mapping:', {
      originalFareClass: seats.fareClass,
      mappedFareClass: fareClass,
      originalTripType: trip.returnDateISO ? 'has return' : 'one-way',
      mappedTripType: tripType
    });
    console.log('🔍 Debug flight IDs:', {
      'trip.outbound_flight_id': trip.outbound_flight_id,
      'trip.flightId': trip.flightId,
      'trip.inbound_flight_id': trip.inbound_flight_id,
      'trip.returnFlightId': trip.returnFlightId,
      'outboundFlightIdResolved': outboundFlightId
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

      // TODO: Replace with actual API call when backend is ready
      // For now, simulate successful booking creation
      try {
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
          localStorage.setItem('overviewMode', 'new-trip');
          return result.booking_code;
        } else {
          throw new Error(`API Error: ${result.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('❌ API Error:', error);
        throw new Error(error.message || 'Failed to create booking');
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

    // 1) Ghi dữ liệu để payment dùng, kể cả khi BE hỏng
    const data = OverviewState.getBookingData();
    try {
      localStorage.setItem('completeBookingData', JSON.stringify(data));
      localStorage.setItem('bookingTimestamp', Date.now().toString());
    } catch (_) { /* ignore */ }

    // Helper build URL có/không có booking_code
    const buildPaymentURL = (code) => {
      const params = new URLSearchParams(window.location.search);
      if (code) params.set('booking_code', code);
      return `payment.html?${params.toString()}`;
    };

    // 2) Do 'safe' flow: persist booking data as pending payload and navigate to payment.
    // The actual booking will be created on confirmation (payment page) to avoid premature PENDING bookings.
    try {
      // Persist a payload that payment.js can use to create booking on confirmation
      try { localStorage.setItem('pendingBookingPayload', JSON.stringify(data)); } catch(_) {}
      window.location.href = buildPaymentURL(null);
    } catch (err) {
      const tmp = `TMP${new Date().getFullYear()}${String(Date.now()).slice(-5)}`;
      try { localStorage.setItem('currentBookingCode', tmp); } catch (_) {}
      window.location.href = buildPaymentURL(tmp);
    }
  }

  // Update payment button based on booking status
  async function updatePaymentButton() {
    const payBtn = document.getElementById('confirmBookingBtn') || document.querySelector('.pay-btn');
    if (!payBtn) {
      console.warn('Payment button not found in DOM');
      return;
    }

    try {
      const bookingCode = localStorage.getItem('currentBookingCode');
      const mode = localStorage.getItem('overviewMode') || 'new-trip';
      const shouldCheckPaid = bookingCode && mode === 'existing-trip';
      const alreadyPaid = shouldCheckPaid ? await isBookingAlreadyPaid() : false;
      const lang = getLang();

      if (alreadyPaid) {
        // Booking is paid - hide payment button or show view button
        payBtn.style.display = 'none';
        console.log('🔍 Booking already paid, hiding confirm button');
      } else {
        // Booking not paid or doesn't exist - show payment button
        const btnText = payBtn.querySelector('span');
        if (btnText) {
          btnText.textContent = lang === 'vi' ? 'Xác nhận đặt vé' : 'Confirm Booking';
        }
        payBtn.style.display = 'flex';
        payBtn.style.visibility = 'visible';
        payBtn.classList.remove('paid');
        payBtn.style.background = '';
        console.log('🔍 Booking not paid, showing confirm button');
      }
    } catch (error) {
      console.error('Error updating payment button:', error);
      // Default to showing payment button if status check fails (guest checkout)
      const btnText = payBtn.querySelector('span');
      const lang = getLang();
      if (btnText) {
        btnText.textContent = lang === 'vi' ? 'Xác nhận đặt vé' : 'Confirm Booking';
      }
      payBtn.style.display = 'flex';
      payBtn.style.visibility = 'visible';
      payBtn.classList.remove('paid');
      payBtn.style.background = '';
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
    const authToken = getAuthToken();
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
