(function(){
  const TRIP_KEY = 'skyplan_trip_selection';

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

  function render(){
    const trip = readTrip();
    if (!trip) return;
    const lang = getLang();

    const fromName = cityLabel(trip.fromCode, lang);
    const toName = cityLabel(trip.toCode, lang);

    // Route heading
    const routeEl = document.getElementById('route-heading');
    if (routeEl){
      routeEl.textContent = lang === 'vi' ? `${fromName} đến ${toName}` : `${fromName} to ${toName}`;
    }

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

    // Also update total price label if not set by fare script
    const totalEl = document.querySelector('.total-price .price-amount');
    if (totalEl && (!totalEl.textContent || /VND/.test(totalEl.textContent) === false)){
      if (trip.priceVND) totalEl.textContent = new Intl.NumberFormat('vi-VN').format(trip.priceVND) + ' VND';
      else if (trip.priceLabel) totalEl.textContent = trip.priceLabel;
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('languageChanged', render);
})();
