// My Trips FE-only implementation with wallet-booking mapping, NFT ticket display,
// and SKY token summary. Designed so backend can replace MOCK_TRIPS later.

let currentTab = 'all';
let selectedWallet = 'all';

const WALLET_SKY_BALANCE = {
  '0x2fD9B72e8dD5C8aA4f9E2402D8cD0f36C1A4A91f': 845,
  '0xA1B2c3D4e5F60718293aB4Cd5E6F708192A3B4C5': 120,
  '0x7D10f6e95A9fA1a4f66d0f4a2B76bA2fA4A0f991': 450
};

const MOCK_TRIPS = [
  {
    id: 'TR001',
    bookingCode: 'VJ123456',
    status: 'upcoming',
    route: 'Ha Noi -> Ho Chi Minh',
    airline: 'VietJet Air - VJ165',
    departureTime: '07:30',
    arrivalTime: '09:45',
    duration: '2h 15m',
    flightDate: '15/11/2025',
    passengerName: 'Nguyen Van A',
    seat: '12A',
    amountVnd: 2150000,
    walletAddress: '0x2fD9B72e8dD5C8aA4f9E2402D8cD0f36C1A4A91f',
    isVerified: true,
    nft: {
      minted: true,
      tokenId: '1123',
      contract: '0xTicketNFTSepolia000000000000000000000001'
    },
    rewardSky: 120
  },
  {
    id: 'TR002',
    bookingCode: 'VN789012',
    status: 'upcoming',
    route: 'Da Nang -> Ha Noi',
    airline: 'Vietnam Airlines - VN1317',
    departureTime: '14:25',
    arrivalTime: '15:50',
    duration: '1h 25m',
    flightDate: '20/11/2025',
    passengerName: 'Tran Van C',
    seat: '8A',
    amountVnd: 1850000,
    walletAddress: '0x2fD9B72e8dD5C8aA4f9E2402D8cD0f36C1A4A91f',
    isVerified: false,
    nft: {
      minted: false,
      tokenId: null,
      contract: '0xTicketNFTSepolia000000000000000000000001'
    },
    rewardSky: 0
  },
  {
    id: 'TR003',
    bookingCode: 'BB345678',
    status: 'completed',
    route: 'Ho Chi Minh -> Da Nang',
    airline: 'Bamboo Airways - QH1234',
    departureTime: '10:15',
    arrivalTime: '11:35',
    duration: '1h 20m',
    flightDate: '28/10/2025',
    passengerName: 'Le Thi D',
    seat: '15C',
    amountVnd: 1650000,
    walletAddress: '0xA1B2c3D4e5F60718293aB4Cd5E6F708192A3B4C5',
    isVerified: true,
    nft: {
      minted: true,
      tokenId: '2078',
      contract: '0xTicketNFTSepolia000000000000000000000001'
    },
    rewardSky: 95
  },
  {
    id: 'TR004',
    bookingCode: 'VJ987654',
    status: 'cancelled',
    route: 'Nha Trang -> Ha Noi',
    airline: 'VietJet Air - VJ1567',
    departureTime: '16:45',
    arrivalTime: '18:55',
    duration: '2h 10m',
    flightDate: '10/11/2025',
    passengerName: 'Pham Van F',
    seat: '20A',
    amountVnd: 1950000,
    walletAddress: '0x7D10f6e95A9fA1a4f66d0f4a2B76bA2fA4A0f991',
    isVerified: false,
    nft: {
      minted: false,
      tokenId: null,
      contract: '0xTicketNFTSepolia000000000000000000000001'
    },
    rewardSky: 0
  }
];

function getLang() {
  return localStorage.getItem('preferredLanguage') || 'vi';
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

function shortAddress(address) {
  if (!address || address.length < 12) return address || '-';
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function statusLabel(status) {
  if (status === 'upcoming') return t('statusUpcoming');
  if (status === 'completed') return t('statusCompleted');
  return t('statusCancelled');
}

function getWallets() {
  const map = new Map();
  MOCK_TRIPS.forEach(function (trip) {
    if (trip.walletAddress) map.set(trip.walletAddress, true);
  });
  return Array.from(map.keys());
}

function getFilteredTrips() {
  return MOCK_TRIPS.filter(function (trip) {
    if (selectedWallet !== 'all' && trip.walletAddress !== selectedWallet) {
      return false;
    }
    if (currentTab !== 'all' && trip.status !== currentTab) {
      return false;
    }
    return true;
  });
}

function updateSummaryPanel() {
  const scopeTrips = selectedWallet === 'all'
    ? MOCK_TRIPS
    : MOCK_TRIPS.filter(function (trip) { return trip.walletAddress === selectedWallet; });

  const verifiedCount = scopeTrips.filter(function (trip) { return trip.isVerified; }).length;
  const nftCount = scopeTrips.filter(function (trip) { return trip.nft && trip.nft.minted; }).length;
  const rewardSum = scopeTrips.reduce(function (sum, trip) { return sum + Number(trip.rewardSky || 0); }, 0);
  const balance = selectedWallet === 'all'
    ? Object.values(WALLET_SKY_BALANCE).reduce(function (sum, value) { return sum + Number(value || 0); }, 0)
    : Number(WALLET_SKY_BALANCE[selectedWallet] || 0);

  const walletValue = document.getElementById('summaryWalletAddressValue');
  const verifiedValue = document.getElementById('summaryVerifiedBookingsValue');
  const nftValue = document.getElementById('summaryNftTicketsValue');
  const skyValue = document.getElementById('summarySkyBalanceValue');
  const rewardValue = document.getElementById('summarySkyRewardValue');

  if (walletValue) walletValue.textContent = selectedWallet === 'all' ? t('allWallets') : shortAddress(selectedWallet);
  if (verifiedValue) verifiedValue.textContent = String(verifiedCount);
  if (nftValue) nftValue.textContent = String(nftCount);
  if (skyValue) skyValue.textContent = String(balance) + ' SKY';
  if (rewardValue) rewardValue.textContent = String(rewardSum) + ' SKY';
}

function renderWalletFilterOptions() {
  const select = document.getElementById('walletFilterSelect');
  if (!select) return;

  const wallets = getWallets();
  const options = ['<option value="all">' + t('allWallets') + '</option>'];
  wallets.forEach(function (wallet) {
    options.push('<option value="' + wallet + '">' + shortAddress(wallet) + '</option>');
  });

  select.innerHTML = options.join('');
  select.value = selectedWallet;
}

function buildTripCard(trip) {
  const verifiedClass = trip.isVerified ? 'verified-yes' : 'verified-no';
  const verifiedText = trip.isVerified ? t('verifiedYes') : t('verifiedNo');
  const nftMinted = !!(trip.nft && trip.nft.minted);
  const nftText = nftMinted
    ? t('nftMinted') + ' #' + trip.nft.tokenId
    : t('nftNotMinted');

  const nftAction = nftMinted
    ? '<button class="btn btn-outline" onclick="event.stopPropagation(); viewNftTicket(\'' + trip.id + '\')"><i class="fas fa-ticket"></i><span>' + t('viewNftTicket') + '</span></button>'
    : '';

  return [
    '<div class="trip-card" data-trip-id="' + trip.id + '" onclick="goToOverview(\'' + trip.id + '\')">',
    '  <div class="trip-status ' + trip.status + '"><span>' + statusLabel(trip.status) + '</span></div>',
    '  <div class="trip-header">',
    '    <div class="route-info">',
    '      <div class="route-title"><h3><span class="route-text">' + trip.route + '</span></h3></div>',
    '      <p class="booking-ref">' + t('bookingCode') + ' <strong>' + trip.bookingCode + '</strong></p>',
    '    </div>',
    '    <div class="trip-price">',
    '      <span class="price">' + formatVnd(trip.amountVnd) + '</span>',
    '      <span class="passengers">1 ' + t('passenger') + '</span>',
    '    </div>',
    '  </div>',
    '  <div class="trip-details">',
    '    <div class="flight-segment">',
    '      <div class="flight-info">',
    '        <div class="airline"><i class="fas fa-plane"></i><span>' + trip.airline + '</span></div>',
    '        <div class="flight-time">',
    '          <span class="departure"><strong>' + trip.departureTime + '</strong><small>' + t('flightDate') + ' ' + trip.flightDate + '</small></span>',
    '          <div class="duration"><div class="line"></div><span>' + trip.duration + '</span></div>',
    '          <span class="arrival"><strong>' + trip.arrivalTime + '</strong><small>' + t('passengerLabel') + ' ' + trip.passengerName + '</small></span>',
    '        </div>',
    '      </div>',
    '    </div>',
    '    <div class="booking-details">',
    '      <div class="detail-item"><i class="fas fa-chair"></i><span>' + t('seat') + ' <strong>' + trip.seat + '</strong></span></div>',
    '      <div class="detail-item"><i class="fas fa-link"></i><span>' + t('walletLinkedLabel') + ' <strong>' + shortAddress(trip.walletAddress) + '</strong></span></div>',
    '      <div class="detail-item ' + verifiedClass + '"><i class="fas fa-check-double"></i><span>' + t('bookingVerifyLabel') + ' <strong>' + verifiedText + '</strong></span></div>',
    '      <div class="detail-item"><i class="fas fa-receipt"></i><span>' + t('nftTicketLabel') + ' <strong>' + nftText + '</strong></span></div>',
    '      <div class="detail-item"><i class="fas fa-coins"></i><span>' + t('tokenRewardLabel') + ' <strong>' + String(trip.rewardSky || 0) + ' SKY</strong></span></div>',
    '    </div>',
    '  </div>',
    '  <div class="trip-actions">',
    '    <div class="trip-buttons">',
    '      <button class="btn btn-outline" onclick="event.stopPropagation(); viewTicket(\'' + trip.id + '\')"><i class="fas fa-ticket-alt"></i><span>' + t('viewTicket') + '</span></button>',
    '      ' + nftAction,
    '      <button class="btn btn-primary" onclick="event.stopPropagation(); goToOverview(\'' + trip.id + '\')"><i class="fas fa-eye"></i><span>' + t('tripDetails') + '</span></button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('');
}

function renderTrips() {
  const tabs = ['all', 'upcoming', 'completed', 'cancelled'];

  tabs.forEach(function (tab) {
    const list = document.querySelector('#' + tab + '-content .trips-list');
    if (!list) return;

    let trips = MOCK_TRIPS;
    if (selectedWallet !== 'all') {
      trips = trips.filter(function (trip) { return trip.walletAddress === selectedWallet; });
    }
    if (tab !== 'all') {
      trips = trips.filter(function (trip) { return trip.status === tab; });
    }

    list.innerHTML = trips.map(buildTripCard).join('');
  });

  checkEmptyState();
  updateSummaryPanel();
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

function initializeWalletFilter() {
  const select = document.getElementById('walletFilterSelect');
  if (!select) return;

  select.addEventListener('change', function () {
    selectedWallet = this.value;
    renderTrips();
  });
}

function applyMyTripsTranslations(lang) {
  if (lang) {
    localStorage.setItem('preferredLanguage', lang);
  }

  const currentLang = getLang();
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

  renderWalletFilterOptions();
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
    window.location.href = 'overview.html?tripId=' + encodeURIComponent(tripId || '');
  }, 700);
}

function viewTicket(tripId) {
  showNotification(t('openingTicket'), 'info', 2200);
}

function viewNftTicket(tripId) {
  const trip = MOCK_TRIPS.find(function (item) { return item.id === tripId; });
  if (!trip || !trip.nft || !trip.nft.minted) {
    showNotification(t('nftNotMinted'), 'warning', 2500);
    return;
  }
  showNotification(t('nftOpenExplorerHint'), 'success', 2500);
  window.open('https://sepolia.etherscan.io/token/' + trip.nft.contract + '?a=' + trip.nft.tokenId, '_blank');
}

function initializeLanguage() {
  applyMyTripsTranslations(getLang());
}

window.applyMyTripsTranslations = applyMyTripsTranslations;
window.initializeLanguage = initializeLanguage;
window.goToOverview = goToOverview;
window.viewTicket = viewTicket;
window.viewNftTicket = viewNftTicket;

// Keep old handlers as no-op compatible functions for existing inline attributes.
window.downloadTicket = viewTicket;
window.modifyTrip = function () { showNotification(t('modifyFeatureDev'), 'info', 2500); };
window.cancelTrip = function () { showNotification(t('cancelFeatureDev'), 'info', 2500); };
window.downloadInvoice = function () { showNotification(t('downloadingInvoice'), 'info', 2200); };
window.rebookTrip = function () { window.location.href = 'search.html'; };
window.rebookSimilarTrip = function () { window.location.href = 'search.html'; };
window.viewCancellationDetails = function () { showNotification(t('cancellationFeatureDev'), 'info', 2500); };
window.closeCancelModal = function () {};
window.confirmCancelTrip = function () {};

// Initialize page
window.addEventListener('DOMContentLoaded', function () {
  initializeTabs();
  initializeWalletFilter();
  renderWalletFilterOptions();
  applyMyTripsTranslations(getLang());
});
