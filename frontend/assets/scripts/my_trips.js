let currentTab = 'all';
let tripsData = [];
let blockchainLoadingState = {
  visible: false,
  startedAt: 0,
  timer: null,
};

function ensureBlockchainLoadingOverlay() {
  let overlay = document.getElementById('blockchain-loading-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'blockchain-loading-overlay';
  overlay.className = 'blockchain-loading-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = [
    '<div class="blockchain-loading-card" role="status" aria-live="polite">',
    '  <div class="blockchain-chain">',
    '    <span></span><span></span><span></span>',
    '  </div>',
    '  <h3 class="blockchain-loading-title"></h3>',
    '  <p class="blockchain-loading-desc"></p>',
    '  <div class="blockchain-progress">',
    '    <div class="blockchain-progress-bar"></div>',
    '  </div>',
    '  <p class="blockchain-loading-hint"></p>',
    '</div>'
  ].join('');

  document.body.appendChild(overlay);
  return overlay;
}

function setBlockchainLoadingText() {
  const overlay = ensureBlockchainLoadingOverlay();
  const titleEl = overlay.querySelector('.blockchain-loading-title');
  const descEl = overlay.querySelector('.blockchain-loading-desc');
  const hintEl = overlay.querySelector('.blockchain-loading-hint');
  if (titleEl) titleEl.textContent = t('blockchainLoadingTitle');
  if (descEl) descEl.textContent = t('blockchainLoadingDesc');
  if (hintEl) hintEl.textContent = t('blockchainLoadingHint');
}

function showBlockchainLoading() {
  const overlay = ensureBlockchainLoadingOverlay();
  setBlockchainLoadingText();
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('blockchain-loading-open');
  blockchainLoadingState.visible = true;
  blockchainLoadingState.startedAt = Date.now();
}

function hideBlockchainLoading() {
  const overlay = document.getElementById('blockchain-loading-overlay');
  if (!overlay) return;

  if (blockchainLoadingState.timer) {
    clearTimeout(blockchainLoadingState.timer);
    blockchainLoadingState.timer = null;
  }

  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('blockchain-loading-open');
  blockchainLoadingState.visible = false;
}

function hideBlockchainLoadingSafely() {
  if (!blockchainLoadingState.visible) return;
  const elapsed = Date.now() - (blockchainLoadingState.startedAt || Date.now());
  const minVisibleMs = 900;
  if (elapsed >= minVisibleMs) {
    hideBlockchainLoading();
    return;
  }

  const remaining = minVisibleMs - elapsed;
  blockchainLoadingState.timer = setTimeout(hideBlockchainLoading, remaining);
}

function toFriendlyIntegrateError() {
  return t('integrateNftFailedFriendly');
}

function getMetaMaskWallet() {
  if (window.MetaMaskWallet) return window.MetaMaskWallet;
  try {
    if (typeof MetaMaskWallet !== 'undefined') return MetaMaskWallet;
  } catch (_) {}
  return null;
}

function getLang() {
  const raw = (localStorage.getItem('preferredLanguage') || localStorage.getItem('language') || 'vi').toLowerCase();
  return raw === 'en' ? 'en' : 'vi';
}

function t(key) {
  const lang = getLang();
  const dict = window.myTripsTranslations && window.myTripsTranslations[lang];
  if (!dict) return key;
  return dict[key] || key;
}

function formatVnd(amount) {
  return Number(amount || 0).toLocaleString('vi-VN') + ' VND';
}

function statusLabel(status) {
  if (status === 'upcoming') return t('statusUpcoming');
  if (status === 'completed') return t('statusCompleted');
  return t('statusCancelled');
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTime(value) {
  const d = toDate(value);
  if (!d) return '--:--';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(value) {
  const d = toDate(value);
  if (!d) return '--/--/----';
  return d.toLocaleDateString('vi-VN');
}

function formatDuration(start, end) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return '--';
  const diffMs = to.getTime() - from.getTime();
  if (diffMs <= 0) return '--';
  const totalMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return hours + 'h ' + mins + 'm';
}

function mapStatus(rawStatus, departureIso) {
  const status = String(rawStatus || '').toUpperCase();
  if (status === 'CANCELLED' || status === 'EXPIRED' || status === 'PAYMENT_FAILED') {
    return 'cancelled';
  }
  if (status === 'COMPLETED') {
    return 'completed';
  }

  const departureDate = toDate(departureIso);
  if (departureDate && departureDate.getTime() < Date.now()) {
    return 'completed';
  }

  return 'upcoming';
}

function mapBookingToTrip(booking) {
  const outbound = booking && booking.outbound_flight ? booking.outbound_flight : {};
  const passengers = Array.isArray(booking && booking.passengers) ? booking.passengers : [];
  const firstPassenger = passengers[0] || {};

  const origin = outbound.origin_code || outbound.departure_airport || '---';
  const destination = outbound.destination_code || outbound.arrival_airport || '---';
  const departureIso = outbound.departure_time;
  const arrivalIso = outbound.arrival_time;

  const nftInfo = booking && booking.nft ? booking.nft : null;
  const nftMintedFlag = !!(
    (nftInfo && nftInfo.minted) ||
    booking.nft_minted ||
    booking.nft_mint_tx_hash
  );

  return {
    id: booking.booking_code || String(booking.id || ''),
    bookingCode: booking.booking_code || '',
    status: mapStatus(booking.status, departureIso),
    route: origin + ' -> ' + destination,
    airline: [outbound.airline_name || outbound.airline || 'SkyPlan', outbound.flight_number].filter(Boolean).join(' - '),
    departureTime: formatTime(departureIso),
    arrivalTime: formatTime(arrivalIso),
    duration: formatDuration(departureIso, arrivalIso),
    flightDate: formatDate(departureIso),
    passengerName: firstPassenger.full_name || firstPassenger.fullName || [firstPassenger.firstname, firstPassenger.lastname].filter(Boolean).join(' ') || '-',
    seat: firstPassenger.seat_number || firstPassenger.seatNumber || '-',
    amountVnd: Number(booking.total_amount || 0),
    isVerified: !!(booking.isVerified || booking.onchain_recorded),
    nft: {
      minted: nftMintedFlag,
      tokenId: (nftInfo && nftInfo.tokenId) || booking.nft_token_id || null,
      contract: (nftInfo && nftInfo.contract) || booking.nft_contract || null,
      txHash: booking.nft_mint_tx_hash || null
    },
    rewardSky: Number(booking.rewardSky || booking.sky_reward_amount || 0)
  };
}

async function loadUserTrips() {
  if (!window.AuthState || !AuthState.isAuthenticated()) {
    tripsData = [];
    if (window.AuthState && typeof AuthState.requireAuth === 'function') {
      AuthState.requireAuth(window.location.pathname + window.location.search);
    }
    return;
  }

  try {
    const params = new URLSearchParams(window.location.search || '');
    const codeFromUrl = (params.get('booking_code') || '').trim();
    const codeFromStorage = String(localStorage.getItem('lastBookingCode') || localStorage.getItem('currentBookingCode') || '').trim();
    const bookingCode = codeFromUrl || codeFromStorage;
    const endpoint = bookingCode
      ? '/api/bookings/my-trips?booking_code=' + encodeURIComponent(bookingCode)
      : '/api/bookings/my-trips';

    const resp = await AuthState.fetchWithAuth(endpoint, { method: 'GET' });
    const payload = await resp.json().catch(function () { return {}; });

    if (!resp.ok || !payload.success) {
      throw new Error(payload.message || 'Failed to load trips');
    }

    const bookings = Array.isArray(payload.bookings) ? payload.bookings : [];
    tripsData = bookings.map(mapBookingToTrip);

    // Fallback: if redirected with booking_code and list doesn't contain it yet,
    // fetch that booking directly so users can see immediate result.
    if (bookingCode && !tripsData.some(function (t) { return t.bookingCode === bookingCode; })) {
      try {
        const directResp = await AuthState.fetchWithAuth('/api/bookings/status/' + encodeURIComponent(bookingCode), { method: 'GET' });
        const directPayload = await directResp.json().catch(function () { return {}; });
        if (directResp.ok && directPayload && directPayload.success && directPayload.booking) {
          tripsData.unshift(mapBookingToTrip(directPayload.booking));
        } else if (directResp.status === 404) {
          try {
            showNotification(t('bookingNotInAccount').replace('{code}', bookingCode), 'warning', 3800);
          } catch (e) {
            showNotification('Booking ' + bookingCode + ' khong thuoc tai khoan dang dang nhap.', 'warning', 3800);
          }
        }
      } catch (_) {
        // no-op
      }
    }

    renderTrips();
    } catch (error) {
    console.error('Failed to load real my-trips data:', error);
    tripsData = [];
    renderTrips();
    const defaultMsg = t('failedToLoadTrips') || 'Khong the tai danh sach chuyen di';
    showNotification(error && error.message ? error.message : defaultMsg, 'error', 2800);
  }
}

async function claimBookingFromContextIfNeeded() {
  if (!window.AuthState || !AuthState.isAuthenticated()) return;

  const params = new URLSearchParams(window.location.search || '');
  const fromUrl = (params.get('booking_code') || '').trim();
  const fromStorage = String(localStorage.getItem('lastBookingCode') || localStorage.getItem('currentBookingCode') || '').trim();
  const bookingCode = fromUrl || fromStorage;

  if (!bookingCode) return;

  try {
    await AuthState.fetchWithAuth('/api/bookings/' + encodeURIComponent(bookingCode) + '/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (_) {
    // Ignore claim errors (already claimed / not found) and continue loading trips.
  }
}

async function autoIntegrateFromRedirectIfNeeded() {
  if (!window.AuthState || !AuthState.isAuthenticated()) return;

  const params = new URLSearchParams(window.location.search || '');
  const action = String(params.get('action') || '').trim().toLowerCase();
  const codeFromUrl = String(params.get('booking_code') || '').trim();
  if (action !== 'integrate' || !codeFromUrl) return;

  const onceKey = 'autoIntegrateDone:' + codeFromUrl;
  if (sessionStorage.getItem(onceKey) === '1') return;
  sessionStorage.setItem(onceKey, '1');

  const target = tripsData.find(function (trip) { return trip.bookingCode === codeFromUrl; });
  if (!target) {
    try {
      showNotification(t('bookingNotFoundInAccount').replace('{code}', codeFromUrl), 'warning', 3200);
    } catch (e) {
      showNotification('Khong tim thay booking ' + codeFromUrl + ' trong tai khoan hien tai.', 'warning', 3200);
    }
    return;
  }

  if (target.nft && target.nft.minted) {
    showNotification(getLang() === 'vi' ? 'Booking nay da duoc integrate truoc do.' : 'This booking is already integrated.', 'success', 2500);
    return;
  }

  showNotification('Dang xu ly integrate cho booking ' + codeFromUrl + '...', 'info', 2200);
  await integrateNftTicket(codeFromUrl);
}

function buildTripCard(trip) {
  const nftMinted = !!(trip.nft && trip.nft.minted);
  const routeText = escapeHtml(trip.route || '--- -> ---');
  const bookingCode = escapeHtml(trip.bookingCode || '-');
  const airlineText = escapeHtml(trip.airline || 'SkyPlan');
  const departureTime = escapeHtml(trip.departureTime || '--:--');
  const arrivalTime = escapeHtml(trip.arrivalTime || '--:--');
  const flightDate = escapeHtml(trip.flightDate || '--/--/----');
  const passengerName = escapeHtml(trip.passengerName || '-');
  const seatText = escapeHtml(trip.seat || '-');
  const statusClass = escapeHtml(trip.status || 'upcoming');
  const safeId = escapeHtml(trip.id || trip.bookingCode || '');

  const nftAction = nftMinted
    ? '<button class="btn btn-outline" onclick="event.stopPropagation(); viewNftTicket(\'' + safeId + '\')"><i class="fas fa-ticket"></i><span>' + t('viewNftTicket') + '</span></button>'
    : '<button class="btn btn-outline" onclick="event.stopPropagation(); integrateNftTicket(\'' + bookingCode + '\')"><i class="fas fa-link"></i><span>' + t('integrateNft') + '</span></button>';

  return [
    '<div class="trip-card" data-trip-id="' + safeId + '" onclick="goToOverview(\'' + bookingCode + '\')">',
    '  <div class="trip-status ' + statusClass + '"><span>' + statusLabel(trip.status) + '</span></div>',
    '  <div class="trip-header">',
    '    <div class="route-info">',
    '      <div class="route-title"><h3><span class="route-text">' + routeText + '</span></h3></div>',
    '      <p class="booking-ref">' + t('bookingCode') + ' <strong>' + bookingCode + '</strong></p>',
    '    </div>',
    '    <div class="trip-price">',
    '      <span class="price">' + formatVnd(trip.amountVnd) + '</span>',
    '      <span class="passengers">1 ' + t('passenger') + '</span>',
    '    </div>',
    '  </div>',
    '  <div class="trip-details">',
    '    <div class="flight-segment">',
    '      <div class="flight-info">',
    '        <div class="airline"><i class="fas fa-plane"></i><span>' + airlineText + '</span></div>',
    '        <div class="flight-time">',
    '          <span class="departure"><strong>' + departureTime + '</strong><small>' + t('flightDate') + ' ' + flightDate + '</small></span>',
    '          <div class="duration"><div class="line"></div><span>' + trip.duration + '</span></div>',
    '          <span class="arrival"><strong>' + arrivalTime + '</strong><small>' + t('passengerLabel') + ' ' + passengerName + '</small></span>',
    '        </div>',
    '      </div>',
    '    </div>',
    '    <div class="booking-details">',
    '      <div class="detail-item"><i class="fas fa-chair"></i><span>' + t('seat') + ' <strong>' + seatText + '</strong></span></div>',
    '    </div>',
    '  </div>',
    '  <div class="trip-actions">',
    '    <div class="trip-buttons">',
    '      <button class="btn btn-outline" onclick="event.stopPropagation(); viewTicket(\'' + bookingCode + '\')"><i class="fas fa-ticket-alt"></i><span>' + t('viewTicket') + '</span></button>',
    '      ' + nftAction,
    '      <button class="btn btn-primary" onclick="event.stopPropagation(); goToOverview(\'' + bookingCode + '\')"><i class="fas fa-eye"></i><span>' + t('tripDetails') + '</span></button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
}

const _integratingBookings = new Set();

async function integrateNftTicket(bookingCode) {
  const code = String(bookingCode || '').trim();
  if (!code) return;

  // Unified UX: always confirm integration intent first.
  if (typeof window.showBlockchainIntegrationPopup === 'function') {
    const choice = await window.showBlockchainIntegrationPopup();
    if (choice === 'guide') {
      window.location.href = 'support.html#blockchain-ticket-guide';
      return;
    }
    if (choice !== 'integrate') return;
  }

  if (!window.AuthState || !AuthState.isAuthenticated()) {
    if (window.AuthState && typeof AuthState.requireAuth === 'function') {
      AuthState.requireAuth('my_trips.html');
    }
    return;
  }

  if (_integratingBookings.has(code)) {
    showNotification(t('integratingNft'), 'info', 2000);
    return;
  }

  const walletApi = getMetaMaskWallet();
  if (!walletApi) {
    showNotification(t('walletUnavailable'), 'error', 3000);
    return;
  }

  try {
    _integratingBookings.add(code);

    // Ensure wallet connected (no on-chain tx required)
    if (!walletApi.isConnected) {
      showNotification(t('connectWalletFirst'), 'info', 2500);
      const ok = await walletApi.connect();
      if (!ok) return;
    }

    const wallet = walletApi.account;
    if (!wallet) {
      showNotification(t('walletUnavailable'), 'error', 3000);
      return;
    }

    showBlockchainLoading();
    showNotification(t('integratingNft'), 'info', 2000);

    const resp = await AuthState.fetchWithAuth('/api/bookings/blockchain/integrate-nft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_code: code, wallet_address: wallet })
    });

    const payload = await resp.json().catch(function () { return {}; });
    if (!resp.ok || !payload.success) {
      throw new Error(payload && payload.message ? payload.message : 'Integrate failed');
    }

    showNotification(t('integrateNftSuccess'), 'success', 3000);
    await loadUserTrips();
  } catch (err) {
    console.warn('Integrate ticket failed:', err && err.message ? err.message : err);
    showNotification(toFriendlyIntegrateError(), 'error', 3200);
  } finally {
    hideBlockchainLoadingSafely();
    _integratingBookings.delete(code);
  }
}

function renderTrips() {
  const tabs = ['all', 'upcoming', 'completed', 'cancelled'];

  tabs.forEach(function (tab) {
    const list = document.querySelector('#' + tab + '-content .trips-list');
    if (!list) return;

    let trips = tripsData.slice();
    if (tab !== 'all') {
      trips = trips.filter(function (trip) { return trip.status === tab; });
    }

    list.innerHTML = trips.map(buildTripCard).join('');
  });

  checkEmptyState();
}

function switchTab(status) {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.classList.remove('active');
  });
  const selectedBtn = document.querySelector('[data-status="' + status + '"]');
  if (selectedBtn) selectedBtn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(function (content) {
    content.classList.remove('active');
  });
  const activeContent = document.getElementById(status + '-content');
  if (activeContent) activeContent.classList.add('active');

  currentTab = status;
  checkEmptyState();
}

function checkEmptyState() {
  const activeContent = document.querySelector('.tab-content.active');
  const emptyState = document.getElementById('empty-state');
  if (!activeContent || !emptyState) return;

  const list = activeContent.querySelector('.trips-list');
  const hasTrips = !!(list && list.children.length > 0);

  if (list) list.style.display = hasTrips ? 'flex' : 'none';
  emptyState.style.display = hasTrips ? 'none' : 'block';
}

function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      switchTab(this.dataset.status || 'all');
    });
  });
}

function applyMyTripsTranslations(lang) {
  const normalized = (lang || getLang()).toLowerCase() === 'en' ? 'en' : 'vi';
  // DON'T write to localStorage here - this function should only APPLY translations, not SAVE language preference
  // Language should only be saved via initializeLanguage() or window.broadcastLanguageChange()

  const currentLang = normalized;
  const translations = (window.myTripsTranslations && window.myTripsTranslations[currentLang]) || {};

  if (translations.myTripsTitle) {
    document.title = translations.myTripsTitle;
  }

  document.querySelectorAll('[data-i18n]').forEach(function (element) {
    const key = element.getAttribute('data-i18n');
    if (translations[key]) {
      element.textContent = translations[key];
    }
  });

  setBlockchainLoadingText();

  renderTrips();
}

function showNotification(message, type, duration) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, { type: type || 'info', duration: duration || 2500 });
    return;
  }
  if (typeof window.notify === 'function') {
    window.notify(message, type || 'info', duration || 2500);
    return;
  }
}

function goToOverview(tripId) {
  showNotification(t('goingToOverview'), 'info', 1500);
  setTimeout(function () {
    window.location.href = 'overview.html?booking_code=' + encodeURIComponent(tripId || '');
  }, 700);
}

function viewTicket(tripId) {
  showNotification(t('openingTicket'), 'info', 1200);
  setTimeout(function () {
    window.location.href = 'overview.html?booking_code=' + encodeURIComponent(tripId || '');
  }, 500);
}

function viewNftTicket(tripId) {
  const trip = tripsData.find(function (item) { return item.id === tripId; });
  if (!trip || !trip.nft || !trip.nft.minted) {
    showNotification(t('nftNotMinted'), 'warning', 2500);
    return;
  }
  if (trip.nft.contract && trip.nft.tokenId) {
    showNotification(t('nftOpenExplorerHint'), 'success', 2500);
    window.open('https://sepolia.etherscan.io/token/' + trip.nft.contract + '?a=' + trip.nft.tokenId, '_blank');
    return;
  }

  if (trip.nft.txHash) {
    showNotification(t('nftOpenTxHint'), 'info', 2600);
    window.open('https://sepolia.etherscan.io/tx/' + trip.nft.txHash, '_blank');
    return;
  }

  if (trip.nft.contract) {
    showNotification(t('nftOpenContractHint'), 'info', 2600);
    window.open('https://sepolia.etherscan.io/token/' + trip.nft.contract, '_blank');
    return;
  }

  showNotification(t('nftDataPendingHint'), 'info', 2600);
}

window.applyMyTripsTranslations = applyMyTripsTranslations;
window.goToOverview = goToOverview;
window.viewTicket = viewTicket;
window.viewNftTicket = viewNftTicket;
window.integrateNftTicket = integrateNftTicket;

// Keep old handlers as no-op compatible functions for existing inline attributes.
window.downloadTicket = viewTicket;
window.modifyTrip = function () { showNotification(t('modifyFeatureDev'), 'info', 2500); };
window.cancelTrip = function (bookingCode) {
  showNotification(t('cancelFeatureDev'), 'info', 1200);
  setTimeout(function () {
    if (bookingCode) {
      window.location.href = 'overview.html?booking_code=' + encodeURIComponent(bookingCode);
      return;
    }
    window.location.href = 'overview.html';
  }, 500);
};
window.downloadInvoice = function () { showNotification(t('downloadingInvoice'), 'info', 2200); };
window.rebookTrip = function () { window.location.href = 'search.html'; };
window.rebookSimilarTrip = function () { window.location.href = 'search.html'; };
window.viewCancellationDetails = function () { showNotification(t('cancellationFeatureDev'), 'info', 2500); };
window.closeCancelModal = function () {};
window.confirmCancelTrip = function () {};

// Initialize page
window.addEventListener('DOMContentLoaded', function () {
  ensureBlockchainLoadingOverlay();
  initializeTabs();
  claimBookingFromContextIfNeeded().finally(function () {
    loadUserTrips().finally(function () {
      autoIntegrateFromRedirectIfNeeded();
    });
  });
});
