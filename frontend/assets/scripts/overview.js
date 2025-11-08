(function(){
  const TRIP_KEY = 'skyplan_trip_selection';
  
  // Booking overview state management
  const OverviewState = {
    getBookingData: function() {
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
    
    getFlightData: function() {
      try {
        return JSON.parse(localStorage.getItem(TRIP_KEY)) || null;
      } catch {
        return null;
      }
    },
    
    getPassengerData: function() {
      try {
        return JSON.parse(localStorage.getItem('currentPassenger')) || null;
      } catch {
        return null;
      }
    },
    
    getSeatData: function() {
      try {
        const seats = JSON.parse(localStorage.getItem('selectedSeats')) || [];
        const fareClass = localStorage.getItem('fareClass') || 'economy';
        return { seats, fareClass };
      } catch {
        return { seats: [], fareClass: 'economy' };
      }
    },
    
    getExtrasData: function() {
      if (typeof window.ExtrasState !== 'undefined') {
        return window.ExtrasState.getSummary();
      }
      try {
        return JSON.parse(localStorage.getItem('skyplan_extras_v2')) || { meals: [], baggage: null, services: [], totalCost: 0 };
      } catch {
        return { meals: [], baggage: null, services: [], totalCost: 0 };
      }
    },
    
    calculateTotalCost: function(data) {
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

  function readTrip(){
    try { return JSON.parse(localStorage.getItem(TRIP_KEY)) || null; } catch { return null; }
  }
  function getLang(){
    return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
  }
  function cityLabel(raw, lang){
    if (typeof window !== 'undefined' && typeof window.resolveCityLabel === 'function') {
      return window.resolveCityLabel(raw, lang);
    }
    const MAP = (typeof window !== 'undefined' && window.SKYPLAN_CITY_TRANSLATIONS) || {};
    const dict = MAP[lang] || MAP.vi || {};
    return (dict && dict[raw]) || raw || '';
  }
  function fmtDateISO(iso, lang){
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const s = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
    return (lang === 'vi' ? 'Ngày ' + s : s);
  }
  function fmtDuration(min){
    if (typeof min !== 'number' || isNaN(min) || min <= 0) return '';
    const h = Math.floor(min/60); const m = min%60; return `${h}h ${String(m).padStart(2,'0')}m`;
  }
  function parseMin(hhmm){
    const m = /^([0-2]?\d):([0-5]\d)$/.exec(String(hhmm||''));
    return m ? (parseInt(m[1],10)*60 + parseInt(m[2],10)) : null;
  }
  function diffMin(a,b){
    const A=parseMin(a), B=parseMin(b); if (A==null||B==null) return null; let d=B-A; if (d<0) d+=1440; return d;
  }

  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' VND';
  }

  function render(){
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
    if (routeEl){
      routeEl.textContent = lang === 'vi' ? `${fromName} đến ${toName}` : `${fromName} to ${toName}`;
    }
    
    renderFlightDetails(trip, lang, fromName, toName);
    renderPassengerDetails(bookingData.passenger, lang);
    renderSeatDetails(bookingData.seats, lang);
    renderExtrasDetails(bookingData.extras, lang);
    renderTotalCost(bookingData.totalCost, lang);
  }

  function renderFlightDetails(trip, lang, fromName, toName) {

    // Outbound segment
    const outDateEl = document.querySelector('.flight-segment:nth-of-type(1) .flight-date .date-text');
    if (outDateEl){
      if (trip.departDateISO) outDateEl.setAttribute('data-iso', trip.departDateISO);
      outDateEl.textContent = fmtDateISO(trip.departDateISO, lang);
    }
    const outDepTimeEl = document.querySelector('.flight-segment:nth-of-type(1) .departure .time');
    const outDepLocEl  = document.querySelector('.flight-segment:nth-of-type(1) .departure .location');
    const outDepCityEl = document.querySelector('.flight-segment:nth-of-type(1) .departure .city');
    const outArrTimeEl = document.querySelector('.flight-segment:nth-of-type(1) .arrival .time');
    const outArrLocEl  = document.querySelector('.flight-segment:nth-of-type(1) .arrival .location');
    const outArrCityEl = document.querySelector('.flight-segment:nth-of-type(1) .arrival .city');
    const outDurEl     = document.querySelector('.flight-segment:nth-of-type(1) .flight-path .duration');

    const out = Array.isArray(trip.segments) ? trip.segments.find(s=>s && s.direction==='outbound') : null;
    if (out){
      if (outDepTimeEl) outDepTimeEl.textContent = out.departTime || '';
      if (outDepLocEl)  outDepLocEl.textContent  = out.departIATA || trip.fromIATA || '';
      if (outDepCityEl) outDepCityEl.textContent = fromName;
      if (outArrTimeEl) outArrTimeEl.textContent = out.arriveTime || '';
      if (outArrLocEl)  outArrLocEl.textContent  = out.arriveIATA || trip.toIATA || '';
      if (outArrCityEl) outArrCityEl.textContent = toName;
      const dmin = (typeof out.durationMin==='number' && out.durationMin>0) ? out.durationMin : diffMin(out.departTime, out.arriveTime);
      if (outDurEl && dmin) outDurEl.textContent = fmtDuration(dmin);
    }

    // Inbound segment
    const inDateEl = document.querySelector('.flight-segment:nth-of-type(2) .flight-date .date-text');
    if (inDateEl){
      const iso = trip.returnDateISO || trip.departDateISO || '';
      if (iso) inDateEl.setAttribute('data-iso', iso);
      inDateEl.textContent = fmtDateISO(iso, lang);
    }
    const inDepTimeEl = document.querySelector('.flight-segment:nth-of-type(2) .departure .time');
    const inDepLocEl  = document.querySelector('.flight-segment:nth-of-type(2) .departure .location');
    const inDepCityEl = document.querySelector('.flight-segment:nth-of-type(2) .departure .city');
    const inArrTimeEl = document.querySelector('.flight-segment:nth-of-type(2) .arrival .time');
    const inArrLocEl  = document.querySelector('.flight-segment:nth-of-type(2) .arrival .location');
    const inArrCityEl = document.querySelector('.flight-segment:nth-of-type(2) .arrival .city');
    const inDurEl     = document.querySelector('.flight-segment:nth-of-type(2) .flight-path .duration');

    const ret = Array.isArray(trip.segments) ? trip.segments.find(s=>s && s.direction==='inbound') : null;
    if (ret){
      if (inDepTimeEl) inDepTimeEl.textContent = ret.departTime || '';
      if (inDepLocEl)  inDepLocEl.textContent  = ret.departIATA || trip.toIATA || '';
      if (inDepCityEl) inDepCityEl.textContent = toName;
      if (inArrTimeEl) inArrTimeEl.textContent = ret.arriveTime || '';
      if (inArrLocEl)  inArrLocEl.textContent  = ret.arriveIATA || trip.fromIATA || '';
      if (inArrCityEl) inArrCityEl.textContent = fromName;
      const dmin = (typeof ret.durationMin==='number' && ret.durationMin>0) ? ret.durationMin : diffMin(ret.departTime, ret.arriveTime);
      if (inDurEl && dmin) inDurEl.textContent = fmtDuration(dmin);
    } else {
      // hide inbound block if no return
      const inbound = document.querySelector('.flight-segment:nth-of-type(2)');
      if (inbound) inbound.style.display = 'none';
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
    } catch {}
  }

  // Make OverviewState available globally
  window.OverviewState = OverviewState;

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('languageChanged', render);
})();
