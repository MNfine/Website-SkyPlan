/**
 * NFT Dashboard Module
 * Displays user's minted flight ticket NFTs
 */

(function() {
  'use strict';

  // State
  let nftData = {
    nfts: [],
    stats: {
      total: 0,
      minted: 0,
      pending: 0
    }
  };
  let activeModalNFT = null;
  let currentLanguage = 'vi';

  const NFT_TRANSLATIONS = {
    vi: {
      metaMyNFTsTitle: 'SkyPlan - Vé NFT của tôi',
      myNFTs: {
        pageTitle: 'Vé NFT của tôi',
        pageSubtitle: 'Những vé máy bay NFT đã được mint trên blockchain',
        totalNFTs: 'Tổng NFT',
        mintedTickets: 'Đã mint',
        pendingMint: 'Chờ mint',
        noNFTs: 'Chưa có vé NFT',
        noNFTsDesc: 'Khi bạn hoàn tất thanh toán, các vé sẽ được tự động mint thành NFT trên blockchain.',
        bookFlight: 'Đặt chuyến bay ngay',
        mintedBadge: 'Đã mint',
        tokenIdLabel: 'Token ID:',
        passengersLabel: 'Hành khách:',
        viewDetails: 'Xem chi tiết',
        modalTitle: 'Thông tin vé NFT',
        modalTitleWithCode: '{code} - Thông tin vé NFT',
        notAssignedYet: 'Chưa cấp',
        statusMinted: 'Đã mint ✓',
        viewOnEtherscan: 'Xem trên Etherscan',
        mintNow: 'Mint NFT ngay',
        bookingCodeLabel: 'Mã đặt chỗ:',
        contractLabel: 'Contract:',
        statusLabel: 'Trạng thái:',
        mintTxHashLabel: 'Hash giao dịch mint:',
        flightInfoLabel: 'Thông tin chuyến bay:',
        na: 'N/A',
        initError: 'Không thể khởi tạo trang vé NFT',
        loadError: 'Không thể tải dữ liệu vé NFT'
      }
    },
    en: {
      metaMyNFTsTitle: 'SkyPlan - My NFT Tickets',
      myNFTs: {
        pageTitle: 'My NFT Tickets',
        pageSubtitle: 'Flight tickets minted as NFTs on blockchain',
        totalNFTs: 'Total NFTs',
        mintedTickets: 'Minted',
        pendingMint: 'Pending Mint',
        noNFTs: 'No NFT Tickets Yet',
        noNFTsDesc: 'After your payment is completed, tickets will be automatically minted as NFTs on blockchain.',
        bookFlight: 'Book a Flight',
        mintedBadge: 'Minted',
        tokenIdLabel: 'Token ID:',
        passengersLabel: 'Passengers:',
        viewDetails: 'View Details',
        modalTitle: 'NFT Ticket Details',
        modalTitleWithCode: '{code} - NFT Details',
        notAssignedYet: 'Not assigned yet',
        statusMinted: 'Minted ✓',
        viewOnEtherscan: 'View on Etherscan',
        mintNow: 'Mint NFT now',
        bookingCodeLabel: 'Booking Code:',
        contractLabel: 'Contract:',
        statusLabel: 'Status:',
        mintTxHashLabel: 'Mint Tx Hash:',
        flightInfoLabel: 'Flight Info:',
        na: 'N/A',
        initError: 'Failed to initialize NFT Dashboard',
        loadError: 'Failed to load NFT data'
      }
    }
  };

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async function() {
    await initializeNFTDashboard();
  });

  /**
   * Initialize NFT Dashboard
   */
  async function initializeNFTDashboard() {
    console.log('[NFTDashboard] Initializing...');

    try {
      // Load common components
      await loadCommonComponents();

      // Check authentication
      const token = getAuthToken();
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      // Load NFT data
      await loadNFTData();

      // Setup UI event listeners
      setupEventListeners();

      // Apply initial translations
      applyInitialTranslations();

      // Listen for language changes
      window.addEventListener('storage', function(e) {
        if (e.key === 'preferredLanguage' || e.key === 'language') {
          applyDashboardLanguage(e.newValue || getCurrentLanguage());
          renderNFTCards();
        }
      });

      window.addEventListener('languageChanged', function(e) {
        const nextLang = e && e.detail && (e.detail.lang || e.detail.language);
        applyDashboardLanguage(nextLang || getCurrentLanguage());
        renderNFTCards();
      });

      document.addEventListener('languageChanged', function(e) {
        const nextLang = e && e.detail && (e.detail.lang || e.detail.language);
        applyDashboardLanguage(nextLang || getCurrentLanguage());
        renderNFTCards();
      });

    } catch (error) {
      console.error('[NFTDashboard]  initialization error:', error);
      showErrorToast(t('myNFTs.initError', 'Failed to initialize NFT Dashboard'));
    }
  }

  /**
   * Load NFT data from backend
   */
  async function loadNFTData() {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Show loading state
      document.getElementById('loadingState').style.display = 'grid';
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('nftsList').innerHTML = '';

      // Fetch user's bookings
      const response = await fetch('/api/bookings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.bookings) {
        throw new Error(result.message || 'Failed to fetch bookings');
      }

      // Filter bookings that have NFTs
      const bookingsWithNFTs = result.bookings.filter(booking => booking.nft_minted);

      console.log(`[NFTDashboard] Found ${bookingsWithNFTs.length} bookings with NFTs`);

      // Process NFT data
      nftData.nfts = bookingsWithNFTs.map(booking => ({
        id: booking.id,
        bookingCode: booking.booking_code,
        tokenId: booking.nft_token_id || booking.nft?.tokenId || null,
        contractAddress: booking.nft_contract || booking.nft?.contract || null,
        txHash: booking.nft_mint_tx_hash,
        status: 'MINTED',
        flight: {
          airline: booking.outbound_flight?.airline || '-',
          from: booking.outbound_flight?.departure_airport || '-',
          to: booking.outbound_flight?.arrival_airport || '-',
          departureTime: booking.outbound_flight?.departure_time || '-',
          flightNumber: booking.outbound_flight?.flight_number || '-'
        },
        passengers: booking.passengers || []
      }));

      // Calculate stats
      nftData.stats.total = result.bookings.length;
      nftData.stats.minted = bookingsWithNFTs.length;
      nftData.stats.pending = result.bookings.filter(b => !b.nft_minted && b.status === 'CONFIRMED').length;

      // Update UI
      updateNFTStats();
      renderNFTCards();

      // Hide loading state
      document.getElementById('loadingState').style.display = 'none';

      if (nftData.nfts.length === 0) {
        document.getElementById('emptyState').style.display = 'flex';
      }

    } catch (error) {
      console.error('[NFTDashboard] Failed to load NFT data:', error);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      showErrorToast(t('myNFTs.loadError', 'Failed to load NFT data'));
    }
  }

  /**
   * Update NFT statistics cards
   */
  function updateNFTStats() {
    document.getElementById('nftCount').textContent = nftData.stats.total;
    document.getElementById('mintedCount').textContent = nftData.stats.minted;
    document.getElementById('pendingCount').textContent = nftData.stats.pending;
  }

  /**
   * Render NFT cards
   */
  function renderNFTCards() {
    const container = document.getElementById('nftsList');
    container.innerHTML = '';

    nftData.nfts.forEach(nft => {
      const card = createNFTCard(nft);
      container.appendChild(card);
    });

    if (activeModalNFT) {
      showNFTModal(activeModalNFT);
    }
  }

  /**
   * Create NFT card element
   */
  function createNFTCard(nft) {
    const card = document.createElement('div');
    card.className = 'nft-card';
    card.innerHTML = `
      <div class="nft-card-header">
        <div class="nft-icon">
          <i class="fas fa-ticket-alt"></i>
        </div>
        <div class="nft-status">
          <span class="status-badge status-minted">
            <i class="fas fa-check-circle"></i>
            ${t('myNFTs.mintedBadge', 'Minted')}
          </span>
        </div>
      </div>

      <div class="nft-card-body">
        <h3 class="nft-booking-code">${nft.bookingCode}</h3>
        
        <div class="nft-flight-info">
          <div class="flight-route">
            <span class="airport-code">${nft.flight.from}</span>
            <span class="flight-arrow">→</span>
            <span class="airport-code">${nft.flight.to}</span>
          </div>
          <div class="flight-details">
            <span class="flight-number">${nft.flight.flightNumber}</span>
            <span class="flight-airline">${nft.flight.airline}</span>
          </div>
        </div>

        <div class="nft-metadata">
          <div class="meta-item">
            <label>${t('myNFTs.tokenIdLabel', 'Token ID:')}</label>
            <value>${nft.tokenId || t('myNFTs.na', 'N/A')}</value>
          </div>
          <div class="meta-item">
            <label>${t('myNFTs.passengersLabel', 'Passengers:')}</label>
            <value>${nft.passengers.length}</value>
          </div>
        </div>
      </div>

      <div class="nft-card-footer">
        <button class="btn-view-details" data-booking-code="${nft.bookingCode}">
          <i class="fas fa-eye"></i>
          ${t('myNFTs.viewDetails', 'View Details')}
        </button>
      </div>
    `;

    // Add click listener for details button
    card.querySelector('.btn-view-details').addEventListener('click', () => {
      showNFTModal(nft);
    });

    return card;
  }

  /**
   * Show NFT details modal
   */
  function showNFTModal(nft) {
    activeModalNFT = nft;
    document.getElementById('modalTitle').textContent = t('myNFTs.modalTitleWithCode', '{code} - NFT Details').replace('{code}', nft.bookingCode);
    document.getElementById('detailBookingCode').textContent = nft.bookingCode;
    document.getElementById('detailTokenId').textContent = nft.tokenId || t('myNFTs.notAssignedYet', 'Not assigned yet');
    document.getElementById('detailContract').textContent = truncateAddress(nft.contractAddress || '0x...');
    document.getElementById('detailContract').title = nft.contractAddress;
    document.getElementById('detailStatus').textContent = t('myNFTs.statusMinted', 'Minted ✓');

    // TX Hash
    if (nft.txHash) {
      document.getElementById('detailTxHash').textContent = truncateHash(nft.txHash);
      document.getElementById('detailTxHash').title = nft.txHash;
      
      const explorerLink = document.getElementById('explorerLink');
      explorerLink.href = `https://sepolia.etherscan.io/tx/${nft.txHash}`;
      explorerLink.style.display = 'inline';
    } else {
      document.getElementById('detailTxHash').textContent = t('myNFTs.na', 'N/A');
      document.getElementById('explorerLink').style.display = 'none';
    }

    // Flight info
    const flightInfo = document.getElementById('flightInfo');
    flightInfo.innerHTML = `
      <div class="flight-detail">
        <strong>${nft.flight.flightNumber}</strong> ${nft.flight.airline}
      </div>
      <div class="flight-detail">
        ${nft.flight.from} → ${nft.flight.to}
      </div>
      <div class="flight-detail">
        ${formatDateTime(nft.flight.departureTime)}
      </div>
    `;

    // Hide mint button (already minted)
    document.getElementById('mintNFTBtn').style.display = 'none';

    // Show modal
    document.getElementById('nftModal').style.display = 'flex';
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Close modal
    document.querySelector('.modal-close').addEventListener('click', () => {
      document.getElementById('nftModal').style.display = 'none';
      activeModalNFT = null;
    });

    // Click outside modal to close
    document.getElementById('nftModal').addEventListener('click', (e) => {
      if (e.target.id === 'nftModal') {
        document.getElementById('nftModal').style.display = 'none';
        activeModalNFT = null;
      }
    });

    // Refresh button
    const refreshBtn = document.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadNFTData();
      });
    }
  }

  /**
   * Format date and time
   */
  function formatDateTime(dateString) {
    if (!dateString) return t('myNFTs.na', 'N/A');
    try {
      const date = new Date(dateString);
      return date.toLocaleString(currentLanguage === 'en' ? 'en-US' : 'vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Truncate Ethereum address for display
   */
  function truncateAddress(address) {
    if (!address || address.length < 10) return address;
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
  }

  /**
   * Truncate transaction hash for display
   */
  function truncateHash(hash) {
    if (!hash || hash.length < 20) return hash;
    return hash.substring(0, 10) + '...' + hash.substring(hash.length - 8);
  }

  /**
   * Get authentication token
   */
  function getAuthToken() {
    try {
      if (window.AuthState && typeof window.AuthState.getToken === 'function') {
        return window.AuthState.getToken() || '';
      }
    } catch (_) {}

    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }

  /**
   * Show error toast notification
   */
  function showErrorToast(message) {
    if (window.Toast && typeof window.Toast.error === 'function') {
      window.Toast.error(message);
    } else {
      console.error(message);
    }
  }

  function getCurrentLanguage() {
    const raw = (localStorage.getItem('language') || localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi').toLowerCase();
    return raw === 'en' ? 'en' : 'vi';
  }

  function getNestedValue(source, path) {
    return String(path || '').split('.').reduce((obj, segment) => (obj && obj[segment] !== undefined ? obj[segment] : undefined), source);
  }

  function t(key, fallback) {
    const dict = NFT_TRANSLATIONS[currentLanguage] || NFT_TRANSLATIONS.vi;
    const value = getNestedValue(dict, key);
    return value !== undefined ? value : (fallback || key);
  }

  function applyDashboardLanguage(lang) {
    currentLanguage = String(lang || '').toLowerCase() === 'en' ? 'en' : 'vi';

    const nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      const translated = t(key, null);
      if (!translated || translated === key) return;
      node.textContent = translated;
    });

    document.title = t('metaMyNFTsTitle', document.title);
  }

  /**
   * Apply initial translations
   */
  function applyInitialTranslations() {
    applyDashboardLanguage(getCurrentLanguage());
  }

  /**
   * Load common page components (header/footer)
   */
  async function loadCommonComponents() {
    try {
      const [headerRes, footerRes] = await Promise.all([
        fetch('components/header.html'),
        fetch('components/footer.html')
      ]);

      if (headerRes.ok) {
        const headerHtml = await headerRes.text();
        document.getElementById('headerContainer').innerHTML = headerHtml;
        if (typeof initializeMobileMenu === 'function') initializeMobileMenu();
        if (typeof initializeLanguageSelector === 'function') initializeLanguageSelector();
        if (typeof window.applyHeaderTranslations === 'function') {
          window.applyHeaderTranslations(getCurrentLanguage());
        }
        if (typeof updateSelectedLanguage === 'function') {
          updateSelectedLanguage(getCurrentLanguage());
        }
      }

      if (footerRes.ok) {
        const footerHtml = await footerRes.text();
        document.getElementById('footerContainer').innerHTML = footerHtml;
      }
    } catch (error) {
      console.error('[NFTDashboard] Error loading page components:', error);
    }
  }
})();
