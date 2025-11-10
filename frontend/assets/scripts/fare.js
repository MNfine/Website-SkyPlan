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

  function formatAirportName(code, lang = 'vi') {
    // Fallback function - prefer using getLocalizedAirportName from fare_translations.js
    if (typeof window.getLocalizedAirportName === 'function') {
      return window.getLocalizedAirportName(code, lang);
    }
    
    // Simple fallback
    const basicNames = {
      HAN: 'Hà Nội',
      SGN: 'Hồ Chí Minh', 
      DAD: 'Đà Nẵng'
    };
    return basicNames[code] || code || '';
  }

  function getAirlineName(flightNumber, lang = 'vi') {
    // Fallback function - prefer using getLocalizedAirlineName from fare_translations.js  
    if (typeof window.getLocalizedAirlineName === 'function') {
      return window.getLocalizedAirlineName(flightNumber, lang);
    }
    
    // Simple fallback
    if (!flightNumber) return '';
    const prefix = flightNumber.substring(0, 2);
    const basicNames = {
      VJ: 'VietJet Air',
      VN: 'Vietnam Airlines'
    };
    return basicNames[prefix] || (lang === 'en' ? 'Airline' : 'Hãng hàng không');
  }

  function getLangAndLocale() {
    // Ưu tiên: URL parameter > localStorage > document lang > fallback 'vi'
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    let lang = urlLang || localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
    
    // Validate language (chỉ chấp nhận 'vi' hoặc 'en')
    if (lang !== 'en' && lang !== 'vi') {
      lang = 'vi';
    }
    
    return { lang, locale: lang === 'en' ? 'en-US' : 'vi-VN' };
  }

  function localizedCity(code) {
    const { lang } = getLangAndLocale();
    
    // Ưu tiên sử dụng function từ translations nếu có
    if (typeof window.getLocalizedAirportName === 'function') {
      try {
        return window.getLocalizedAirportName(code, lang);
      } catch (e) {
        console.warn('Error calling getLocalizedAirportName:', e);
      }
    }
    
    // Fallback về logic tích hợp sẵn
    return formatAirportName(code, lang);
  }

  function localizedAirline(flightNumber) {
    const { lang } = getLangAndLocale();
    if (!flightNumber) return '';
    
    // Ưu tiên sử dụng function từ translations nếu có
    if (typeof window.getLocalizedAirlineName === 'function') {
      try {
        return window.getLocalizedAirlineName(flightNumber, lang);
      } catch (e) {
        console.warn('Error calling getLocalizedAirlineName:', e);
      }
    }
    
    // Fallback về logic tích hợp sẵn
    return getAirlineName(flightNumber, lang);
  }

  function updatePriceDisplay(fareClass, price) {
    // Tìm fare card theo class và cập nhật giá
    const fareCards = document.querySelectorAll('.fare-card');
    let targetCard;
    
    if (fareClass === 'economy') {
      targetCard = fareCards[0]; // First card is Economy
    } else if (fareClass === 'premium') {
      targetCard = fareCards[1]; // Second card is Premium Economy  
    } else if (fareClass === 'business') {
      targetCard = fareCards[2]; // Third card is Business
    }
    
    if (targetCard) {
      const priceEl = targetCard.querySelector('.price');
      if (priceEl) {
        const formattedPrice = Number(price).toLocaleString('vi-VN') + ' VND';
        priceEl.textContent = formattedPrice;
        priceEl.setAttribute('data-price-vnd', price);
      }
    }
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

      btn.href = `/seat?${seatParams.toString()}`;
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
    
    // Đảm bảo DOM đã sẵn sàng
    setTimeout(function() {

    const params = getUrlParams();
    const routeTitle = document.querySelector('.route-title');

    const hasFlightData = params.outbound_departure_airport && params.outbound_arrival_airport;

    if (hasFlightData) {
      const fromCity = localizedCity(params.outbound_departure_airport);
      const toCity = localizedCity(params.outbound_arrival_airport);
      if (routeTitle) {
        const { lang } = getLangAndLocale();
        if (params.trip_type === 'round-trip') {
          routeTitle.textContent = lang === 'en' 
            ? `${fromCity} ⇄ ${toCity}` 
            : `${fromCity} ⇄ ${toCity}`;
        } else {
          routeTitle.textContent = lang === 'en' 
            ? `From ${fromCity} to ${toCity}` 
            : `Từ ${fromCity} đến ${toCity}`;
        }
      }

      // details
      displayFlightDetails(params);

      // Update seat links with current parameters
      updateSeatLinks(params);

      // pricing - Giá hạng Phổ thông chính xác từ trang search
      let economyPrice = 0;
      if (params.outbound_price) economyPrice = parseInt(params.outbound_price, 10) || 0;
      if (params.trip_type === 'round-trip' && params.inbound_price) {
        economyPrice += parseInt(params.inbound_price, 10) || 0;
      }
      
      // Fallback price nếu không có giá từ search
      if (!economyPrice) economyPrice = 1_200_000;

      // Tính giá các hạng ghế khác dựa trên hạng Phổ thông
      const premiumPrice = Math.round(economyPrice * 1.35); // Tăng 35% cho Premium Economy
      const businessPrice = Math.round(economyPrice * 2.2);  // Tăng 120% cho Business Class

      updatePriceDisplay('economy', economyPrice);
      updatePriceDisplay('premium', premiumPrice);
      updatePriceDisplay('business', businessPrice);

      updateSelectButtons(params, economyPrice, premiumPrice, businessPrice);
    } else {
      // keep default title
      console.log('No flight data found; keep default title.');
    }

    // important: show body after render to avoid flash of initial state
    document.body.style.visibility = 'visible';
    }, 100); // Đợi 100ms để DOM sẵn sàng
  }

  // Re-render dynamic pieces (called after language change)
  function refreshFareDynamicContent() {
    const params = getUrlParams();

    if (params.outbound_departure_airport && params.outbound_arrival_airport) {
      const routeTitle = document.querySelector('.route-title');
      const fromCity = localizedCity(params.outbound_departure_airport);
      const toCity = localizedCity(params.outbound_arrival_airport);
      if (routeTitle) {
        const { lang } = getLangAndLocale();
        if (params.trip_type === 'round-trip') {
          routeTitle.textContent = lang === 'en' 
            ? `${fromCity} ⇄ ${toCity}` 
            : `${fromCity} ⇄ ${toCity}`;
        } else {
          routeTitle.textContent = lang === 'en' 
            ? `From ${fromCity} to ${toCity}` 
            : `Từ ${fromCity} đến ${toCity}`;
        }
      }
    }
    displayFlightDetails(params); // will use current locale
    updateSeatLinks(params); // Update seat links with current parameters
  }

  function updateSeatLinks(params) {
    // Update all seat.html links to include current parameters
    const seatLinks = document.querySelectorAll('a[href*="seat.html"]');
    seatLinks.forEach(link => {
      const url = new URL(link.href, window.location.origin);
      
      // Add all current parameters except class (which is already in the link)
      Object.entries(params).forEach(([key, value]) => {
        if (key !== 'class' && value) {
          url.searchParams.set(key, value);
        }
      });
      
      link.href = url.toString();
    });
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
