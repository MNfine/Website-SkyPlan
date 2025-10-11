// assets/scripts/fare.js
// Main logic for fare selection page
(function () {
  'use strict';

  // ===== Helpers =====
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) result[key] = value;
    return result;
  }

  function formatAirportName(code) {
    const airportNames = {
      HAN: 'Hà Nội',
      SGN: 'Hồ Chí Minh',
      DAD: 'Đà Nẵng',
      PQC: 'Phú Quốc',
      VCA: 'Cần Thơ',
      DLI: 'Lâm Đồng',
      HUI: 'Huế',
      DIN: 'Điện Biên',
      PXU: 'Gia Lai',
      VKG: 'An Giang',
      THD: 'Thanh Hóa',
      VII: 'Nghệ An',
      VDO: 'Quảng Ninh',
      SQH: 'Sơn La',
      CXR: 'Khánh Hòa',
      BMV: 'Đắk Lắk',
      VDH: 'Quảng Trị',
      VCL: 'Chu Lai',
      HPH: 'Hải Phòng'
    };
    return airportNames[code] || code || '';
  }

  function getAirlineName(flightNumber) {
    if (!flightNumber) return '';
    const airlineMap = {
      VJ: 'VietJet Air',
      VN: 'Vietnam Airlines',
      BL: 'Jetstar Pacific',
      QH: 'Bamboo Airways',
      VU: 'Vietravel Airlines'
    };
    const prefix = flightNumber.substring(0, 2);
    return airlineMap[prefix] || 'Hãng hàng không';
  }

  function getLangAndLocale() {
    const lang = localStorage.getItem('preferredLanguage') || 'vi';
    return { lang, locale: lang === 'en' ? 'en-US' : 'vi-VN' };
  }

  function localizedCity(code) {
    const { lang } = getLangAndLocale();
    if (typeof window.getLocalizedAirportName === 'function') {
      return window.getLocalizedAirportName(code, lang);
    }
    return formatAirportName(code);
  }

  function localizedAirline(flightNumber) {
    const { lang } = getLangAndLocale();
    if (!flightNumber) return '';
    if (typeof window.getLocalizedAirlineName === 'function') {
      return window.getLocalizedAirlineName(flightNumber, lang);
    }
    return getAirlineName(flightNumber);
  }

  function updatePriceDisplay(elementId, price) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = Number(price).toLocaleString('vi-VN') + '₫';
  }

  function updateSelectButtons(params, economyPrice, premiumPrice, businessPrice) {
    const fareClasses = [
      { id: 'economySelect', class: 'economy', price: economyPrice },
      { id: 'premiumSelect', class: 'premium-economy', price: premiumPrice },
      { id: 'businessSelect', class: 'business', price: businessPrice }
    ];

    fareClasses.forEach(f => {
      const btn = document.getElementById(f.id);
      if (!btn) return;
      const seatParams = new URLSearchParams();

      // copy current params
      Object.keys(params).forEach(k => seatParams.append(k, params[k]));
      // add selection
      seatParams.set('selected_class', f.class);
      seatParams.set('selected_price', f.price);

      btn.href = `seat.html?${seatParams.toString()}`;
    });
  }

  // ===== Flight details (tolerant & no delay) =====
  function displayFlightDetails(params) {
    const flightDetailsSection = document.getElementById('flightDetails');
    const inboundSection = document.getElementById('inboundFlight');
    if (!flightDetailsSection) return;

    const { locale } = getLangAndLocale();

    // --- Outbound ---
    const haveOutboundRoute = params.outbound_departure_airport && params.outbound_arrival_airport;
    const haveOutboundTime = params.outbound_departure_time && params.outbound_arrival_time;
    const haveOutboundAny = haveOutboundRoute || haveOutboundTime || params.outbound_flight_number;

    if (haveOutboundAny) {
      const numEl = document.getElementById('outboundFlightNumber');
      const airEl = document.getElementById('outboundAirline');
      const routeEl = document.getElementById('outboundRoute');
      const timeEl = document.getElementById('outboundDateTime');

      if (numEl) numEl.textContent = params.outbound_flight_number || '';
      if (airEl)
        airEl.textContent = params.outbound_flight_number
          ? '- ' + (localizedAirline(params.outbound_flight_number) || '')
          : '';

      if (haveOutboundRoute && routeEl) {
        const fromCity = localizedCity(params.outbound_departure_airport);
        const toCity = localizedCity(params.outbound_arrival_airport);
        routeEl.innerHTML = `<i class="fas fa-arrow-right"></i> ${fromCity} → ${toCity}`;
      }

      if (haveOutboundTime && timeEl) {
        const dep = new Date(params.outbound_departure_time);
        const arr = new Date(params.outbound_arrival_time);
        timeEl.innerHTML = `<i class="far fa-clock"></i> ${dep.toLocaleDateString(locale)} ${dep.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit'
        })} - ${arr.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
      }

      flightDetailsSection.style.display = 'block';
    }

    // --- Inbound (round-trip) ---
    if (params.trip_type === 'round-trip') {
      const haveInboundRoute = params.inbound_departure_airport && params.inbound_arrival_airport;
      const haveInboundTime = params.inbound_departure_time && params.inbound_arrival_time;
      const haveInboundAny = haveInboundRoute || haveInboundTime || params.inbound_flight_number;

      if (haveInboundAny && inboundSection) {
        const numEl = document.getElementById('inboundFlightNumber');
        const airEl = document.getElementById('inboundAirline');
        const routeEl = document.getElementById('inboundRoute');
        const timeEl = document.getElementById('inboundDateTime');

        if (numEl) numEl.textContent = params.inbound_flight_number || '';
        if (airEl)
          airEl.textContent = params.inbound_flight_number
            ? '- ' + (localizedAirline(params.inbound_flight_number) || '')
            : '';

        if (haveInboundRoute && routeEl) {
          const fromCity = localizedCity(params.inbound_departure_airport);
          const toCity = localizedCity(params.inbound_arrival_airport);
          routeEl.innerHTML = `<i class="fas fa-arrow-right"></i> ${fromCity} → ${toCity}`;
        }

        if (haveInboundTime && timeEl) {
          const dep = new Date(params.inbound_departure_time);
          const arr = new Date(params.inbound_arrival_time);
          timeEl.innerHTML = `<i class="far fa-clock"></i> ${dep.toLocaleDateString(locale)} ${dep.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
          })} - ${arr.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
        }

        inboundSection.style.display = 'block';
      }
    }
  }

  // ===== Language =====
  function initializeLanguage() {
    // Use saved language, default to 'vi' on first load
    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    localStorage.setItem('preferredLanguage', currentLang);
    document.documentElement.lang = currentLang;

    if (typeof applyFareTranslations === 'function') {
      applyFareTranslations(currentLang);
    } else {
      console.error('Fare page - applyFareTranslations function not found');
    }

    if (typeof initializeLanguageSelector === 'function') {
      initializeLanguageSelector();
    }
  }

  // ===== Main init =====
  function initializeFarePage() {
    if (window.__fare_initialized) {
      document.body.style.visibility = 'visible';
      return;
    }
    window.__fare_initialized = true;

    const params = getUrlParams();
    const routeTitle = document.getElementById('routeTitle');

    const hasFlightData = params.outbound_departure_airport && params.outbound_arrival_airport;

    if (hasFlightData) {
      const fromCity = localizedCity(params.outbound_departure_airport);
      const toCity = localizedCity(params.outbound_arrival_airport);
      routeTitle.textContent = params.trip_type === 'round-trip' ? `${fromCity} ⇄ ${toCity}` : `${fromCity} → ${toCity}`;

      // details
      displayFlightDetails(params);

      // pricing
      let basePrice = 0;
      if (params.outbound_price) basePrice = parseInt(params.outbound_price, 10) || 0;
      if (params.trip_type === 'round-trip' && params.inbound_price) {
        basePrice += parseInt(params.inbound_price, 10) || 0;
      }
      if (!basePrice) basePrice = 1_200_000;

      const economyPrice = basePrice;
      const premiumPrice = Math.round(basePrice * 1.4);
      const businessPrice = Math.round(basePrice * 2.5);

      updatePriceDisplay('economyPrice', economyPrice);
      updatePriceDisplay('premiumPrice', premiumPrice);
      updatePriceDisplay('businessPrice', businessPrice);

      updateSelectButtons(params, economyPrice, premiumPrice, businessPrice);
    } else {
      // keep default title
      console.log('No flight data found; keep default title.');
    }

    // important: show body after render to avoid flash of initial state
    document.body.style.visibility = 'visible';
  }

  // Re-render dynamic pieces (called after language change)
  function refreshFareDynamicContent() {
    const params = getUrlParams();

    if (params.outbound_departure_airport && params.outbound_arrival_airport) {
      const routeTitle = document.getElementById('routeTitle');
      const fromCity = localizedCity(params.outbound_departure_airport);
      const toCity = localizedCity(params.outbound_arrival_airport);
      if (routeTitle) {
        routeTitle.textContent = params.trip_type === 'round-trip' ? `${fromCity} ⇄ ${toCity}` : `${fromCity} → ${toCity}`;
      }
    }
    displayFlightDetails(params); // will use current locale
  }

  // ===== Export to global for HTML / translations to call =====
  window.initializeFarePage = initializeFarePage;
  window.initializeLanguage = initializeLanguage;
  window.refreshFareDynamicContent = refreshFareDynamicContent;

  // ===== Manual/auto init coordination =====
  let isManuallyInitialized = false;
  window.setManualInit = function () {
    isManuallyInitialized = true;
  };

  // Fallback auto-init only for language (fare init is called from HTML after header loads)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (!isManuallyInitialized && !window.__fare_lang_initialized) {
        initializeLanguage();
        window.__fare_lang_initialized = true;
      }
    });
  } else {
    if (!isManuallyInitialized && !window.__fare_lang_initialized) {
      initializeLanguage();
      window.__fare_lang_initialized = true;
    }
  }
})();
