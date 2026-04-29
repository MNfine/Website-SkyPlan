/**
 * SKY Tokens Dashboard Module
 * Displays user's SKY token balance, rewards history, and redemption options
 */

(function() {
  'use strict';

  // State
  let tokenState = {
    balance: 0,
    totalEarned: 0,
    redeemed: 0,
    rewards: [],
    bookingsCount: 0,
  };
  let currentLanguage = 'vi';

  const SKY_TRANSLATIONS = {
    vi: {
      metaMyTokensTitle: 'SkyPlan - SKY Tokens của tôi',
      skyTokens: {
        pageTitle: 'SKY Tokens',
        pageSubtitle: 'Quản lý điểm thưởng SKY từ các chuyến bay của bạn',
        yourBalance: 'Số dư của bạn',
        balanceInfo: 'Bạn sở hữu những Token SKY này trên blockchain Sepolia',
        viewOnEtherscan: 'Xem trên Etherscan',
        redeemTokens: 'Đổi điểm',
        totalEarned: 'Tổng kiếm được',
        redeemed: 'Đã đổi',
        totalBookings: 'Tổng booking',
        rewardsHistory: 'Lịch sử phần thưởng',
        noRewards: 'Chưa có phần thưởng',
        noRewardsDesc: 'Hoàn tất các chuyến bay để kiếm SKY tokens',
        howToUse: 'Cách sử dụng SKY',
        step1Title: 'Kiếm điểm',
        step1Desc: 'Mỗi lần đặt vé máy bay thành công, bạn sẽ nhận được SKY tokens tự động',
        step2Title: 'Tích lũy',
        step2Desc: 'Các tokens được lưu trữ an toàn trên blockchain Sepolia',
        step3Title: 'Đổi thưởng',
        step3Desc: 'Sử dụng tokens để đổi chiết khấu, nâng cấp hoặc những phần thưởng khác',
        redeemTitle: 'Đổi SKY Tokens',
        amountLabel: 'Số lượng muốn đổi:',
        maxLabel: 'Tối đa',
        available: 'Có sẵn:',
        redeemFor: 'Đổi lấy:',
        flightDiscount: 'Chiết khấu vé máy bay',
        seatUpgrade: 'Nâng cấp chỗ ngồi',
        willRedeem: 'Sẽ đổi:',
        remainingBalance: 'Số dư còn lại:',
        redeemDisclaimer: 'Tỷ giá hiện tại: 1 SKY = 100 VND',
        cancel: 'Hủy',
        confirmRedeem: 'Xác nhận đổi',
        tableBooking: 'Booking',
        tableFlight: 'Chuyến bay',
        tableAmount: 'Số lượng',
        tableDate: 'Ngày',
        tableAction: 'Thao tác',
        processing: 'Đang xử lý...',
        validAmountRequired: 'Vui lòng nhập số lượng hợp lệ',
        insufficientBalance: 'Số dư không đủ',
        redemptionSuccess: 'Đổi điểm thành công!',
        redemptionFailed: 'Đổi điểm thất bại',
        voucherCreated: 'Voucher mới',
        voucherHistoryTitle: 'Voucher đã đổi',
        noVouchers: 'Chưa có voucher',
        noVouchersDesc: 'Đổi SKY Tokens để nhận voucher sử dụng ở trang thanh toán',
        copyVoucher: 'Sao chép mã',
        copied: 'Đã sao chép',
        expiresAt: 'HSD',
        expired: 'Đã hết hạn',
        initError: 'Không thể khởi tạo trang SKY Tokens',
        loadError: 'Không thể tải dữ liệu SKY Tokens',
        na: 'N/A'
      }
    },
    en: {
      metaMyTokensTitle: 'SkyPlan - My SKY Tokens',
      skyTokens: {
        pageTitle: 'SKY Tokens',
        pageSubtitle: 'Manage SKY rewards from your flights',
        yourBalance: 'Your Balance',
        balanceInfo: 'You own these SKY tokens on Sepolia blockchain',
        viewOnEtherscan: 'View on Etherscan',
        redeemTokens: 'Redeem Tokens',
        totalEarned: 'Total Earned',
        redeemed: 'Redeemed',
        totalBookings: 'Total Bookings',
        rewardsHistory: 'Rewards History',
        noRewards: 'No Rewards Yet',
        noRewardsDesc: 'Complete flights to earn SKY tokens',
        howToUse: 'How to Use SKY',
        step1Title: 'Earn',
        step1Desc: 'Each successful flight booking automatically earns SKY tokens',
        step2Title: 'Accumulate',
        step2Desc: 'Your tokens are securely stored on Sepolia blockchain',
        step3Title: 'Redeem',
        step3Desc: 'Use tokens for discounts, upgrades, and other rewards',
        redeemTitle: 'Redeem SKY Tokens',
        amountLabel: 'Amount to redeem:',
        maxLabel: 'Max',
        available: 'Available:',
        redeemFor: 'Redeem for:',
        flightDiscount: 'Flight discount',
        seatUpgrade: 'Seat upgrade',
        willRedeem: 'Will redeem:',
        remainingBalance: 'Remaining balance:',
        redeemDisclaimer: 'Current rate: 1 SKY = 100 VND',
        cancel: 'Cancel',
        confirmRedeem: 'Confirm Redeem',
        tableBooking: 'Booking',
        tableFlight: 'Flight',
        tableAmount: 'Amount',
        tableDate: 'Date',
        tableAction: 'Action',
        processing: 'Processing...',
        validAmountRequired: 'Please enter a valid amount',
        insufficientBalance: 'Insufficient balance',
        redemptionSuccess: 'Redemption successful!',
        redemptionFailed: 'Redemption failed',
        voucherCreated: 'New voucher',
        voucherHistoryTitle: 'Redeemed Vouchers',
        noVouchers: 'No vouchers yet',
        noVouchersDesc: 'Redeem SKY Tokens to get vouchers for the payment page',
        copyVoucher: 'Copy code',
        copied: 'Copied',
        expiresAt: 'Expires',
        expired: 'Expired',
        initError: 'Failed to initialize SKY Tokens Dashboard',
        loadError: 'Failed to load token data',
        na: 'N/A'
      }
    }
  };

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async function() {
    await initializeSKYTokensDashboard();
  });

  /**
   * Initialize SKY Tokens Dashboard
   */
  async function initializeSKYTokensDashboard() {
    console.log('[SKYTokens] Initializing...');

    try {
      // Load common components
      await loadCommonComponents();

      // Check authentication
      const token = getAuthToken();
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      // Load token data
      await loadTokenData();

      // Setup UI event listeners
      setupEventListeners();

      // Apply initial translations
      applyInitialTranslations();

      // Listen for language changes
      window.addEventListener('storage', function(e) {
        if (e.key === 'preferredLanguage' || e.key === 'language') {
          applySkyTokensLanguage(e.newValue || getCurrentLanguage());
          renderRewardsTable();
          renderVoucherList();
        }
      });

      window.addEventListener('languageChanged', function(e) {
        const nextLang = e && e.detail && (e.detail.lang || e.detail.language);
        applySkyTokensLanguage(nextLang || getCurrentLanguage());
        renderRewardsTable();
        renderVoucherList();
      });

      document.addEventListener('languageChanged', function(e) {
        const nextLang = e && e.detail && (e.detail.lang || e.detail.language);
        applySkyTokensLanguage(nextLang || getCurrentLanguage());
        renderRewardsTable();
        renderVoucherList();
      });

    } catch (error) {
      console.error('[SKYTokens] Initialization error:', error);
      showErrorToast(t('skyTokens.initError', 'Failed to initialize SKY Tokens Dashboard'));
    }
  }

  /**
   * Load token data from backend
   */
  async function loadTokenData() {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Show loading state
      document.getElementById('loadingState').style.display = 'grid';
      document.getElementById('emptyState').style.display = 'none';
      document.getElementById('rewardsList').innerHTML = '';

      // Fetch user's bookings (includes token info)
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

      await syncVouchersFromServer(token, true);

      const bookings = result.bookings;

      const getSkyRewardAmount = (booking) => {
        const value = booking.sky_reward_amount ?? booking.rewardSky ?? 0;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };

      const getSkyRedeemedAmount = (booking) => {
        const value = booking.sky_redeemed_amount ?? booking.redeemedSky ?? 0;
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };

      // Calculate token statistics
      tokenState.bookingsCount = bookings.length;
      tokenState.totalEarned = bookings.reduce((sum, b) => sum + getSkyRewardAmount(b), 0);
      tokenState.redeemed = bookings.reduce((sum, b) => sum + getSkyRedeemedAmount(b), 0);
      tokenState.balance = Math.max(0, tokenState.totalEarned - tokenState.redeemed);

      // Build rewards array from bookings with SKY rewards
      tokenState.rewards = bookings
        .filter(b => b.sky_minted && getSkyRewardAmount(b) > 0)
        .map(b => ({
          bookingCode: b.booking_code,
          amount: getSkyRewardAmount(b),
          txHash: b.sky_mint_tx_hash,
          date: b.created_at,
          status: b.status,
          flight: b.outbound_flight ? {
            flightNumber: b.outbound_flight.flight_number,
            from: b.outbound_flight.departure_airport,
            to: b.outbound_flight.arrival_airport
          } : null
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      console.log(`[SKYTokens] Loaded ${tokenState.rewards.length} rewards`);

      // Update UI
      updateTokenStats();
      renderRewardsTable();
      renderVoucherList();

      // Hide loading state
      document.getElementById('loadingState').style.display = 'none';

      if (tokenState.rewards.length === 0) {
        document.getElementById('emptyState').style.display = 'flex';
      }

    } catch (error) {
      console.error('[SKYTokens] Failed to load token data:', error);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      showErrorToast(t('skyTokens.loadError', 'Failed to load token data'));
    }
  }

  /**
   * Update token statistics cards
   */
  function updateTokenStats() {
    document.getElementById('tokenBalance').textContent = formatTokenAmount(tokenState.balance);
    document.getElementById('totalEarned').textContent = formatTokenAmount(tokenState.totalEarned);
    document.getElementById('tokensRedeemed').textContent = formatTokenAmount(tokenState.redeemed);
    document.getElementById('bookingsCount').textContent = tokenState.bookingsCount;

    // Update available amount for redeem modal
    document.getElementById('availableAmount').textContent = formatTokenAmount(tokenState.balance);
  }

  /**
   * Render rewards history table
   */
  function renderRewardsTable() {
    const container = document.getElementById('rewardsList');
    container.innerHTML = '';

    if (tokenState.rewards.length === 0) {
      return;
    }

    const table = document.createElement('table');
    table.className = 'rewards-table-element';
    table.innerHTML = `
      <thead>
        <tr>
          <th data-i18n="skyTokens.tableBooking">Booking</th>
          <th data-i18n="skyTokens.tableFlight">Chuyến bay</th>
          <th data-i18n="skyTokens.tableAmount">Số lượng</th>
          <th data-i18n="skyTokens.tableDate">Ngày</th>
          <th data-i18n="skyTokens.tableAction">Thao tác</th>
        </tr>
      </thead>
      <tbody id="rewardsBody">
      </tbody>
    `;

    const tbody = table.querySelector('#rewardsBody');
    tokenState.rewards.forEach(reward => {
      const row = document.createElement('tr');
      const flightInfo = reward.flight 
        ? `${reward.flight.flightNumber} (${reward.flight.from} → ${reward.flight.to})`
        : t('skyTokens.na', 'N/A');
      
      row.innerHTML = `
        <td class="booking-code">${reward.bookingCode}</td>
        <td class="flight-info">${flightInfo}</td>
        <td class="reward-amount">${formatTokenAmount(reward.amount)} SKY</td>
        <td class="reward-date">${formatDate(reward.date)}</td>
        <td class="reward-action">
          ${reward.txHash ? `
            <a href="https://sepolia.etherscan.io/tx/${reward.txHash}" 
               target="_blank" 
               class="link-button" 
              title="${t('skyTokens.viewOnEtherscan', 'View on Etherscan')}">
              <i class="fas fa-external-link-alt"></i>
            </a>
          ` : '-'}
        </td>
      `;
      tbody.appendChild(row);
    });

    container.appendChild(table);
    applySkyTokensLanguage(currentLanguage);
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Refresh balance
    document.getElementById('refreshBalance').addEventListener('click', () => {
      loadTokenData();
    });

    // Redeem button
    document.getElementById('redeemTokensBtn').addEventListener('click', () => {
      showRedeemModal();
    });

    // Redeem modal controls
    document.querySelector('.modal-close').addEventListener('click', () => {
      closeRedeemModal();
    });

    document.getElementById('redeemModal').addEventListener('click', (e) => {
      if (e.target.id === 'redeemModal') {
        closeRedeemModal();
      }
    });

    document.getElementById('cancelRedeemBtn').addEventListener('click', () => {
      closeRedeemModal();
    });

    document.getElementById('maxRedeemBtn').addEventListener('click', () => {
      document.getElementById('redeemAmount').value = tokenState.balance;
      updateRedemptionPreview();
    });

    document.getElementById('redeemAmount').addEventListener('input', updateRedemptionPreview);

    document.querySelectorAll('input[name="redeemType"]').forEach(radio => {
      radio.addEventListener('change', updateRedemptionPreview);
    });

    document.getElementById('confirmRedeemBtn').addEventListener('click', handleRedeemConfirm);

    // View on explorer button
    if (window.ethereum && window.ethereum.selectedAddress) {
      document.getElementById('viewOnExplorer').style.display = 'block';
      document.getElementById('viewOnExplorer').addEventListener('click', () => {
        const address = window.ethereum.selectedAddress;
        window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank');
      });
    }
  }

  /**
   * Show redeem modal
   */
  function showRedeemModal() {
    document.getElementById('redeemModal').style.display = 'flex';
    document.getElementById('redeemAmount').value = '';
    updateRedemptionPreview();
  }

  /**
   * Close redeem modal
   */
  function closeRedeemModal() {
    document.getElementById('redeemModal').style.display = 'none';
  }

  /**
   * Update redemption preview
   */
  function updateRedemptionPreview() {
    const amount = parseInt(document.getElementById('redeemAmount').value) || 0;
    const remaining = Math.max(0, tokenState.balance - amount);

    document.getElementById('previewAmount').textContent = formatTokenAmount(amount);
    document.getElementById('previewRemaining').textContent = formatTokenAmount(remaining);
  }

  /**
   * Handle redeem confirmation
   */
  async function handleRedeemConfirm() {
    const amount = parseInt(document.getElementById('redeemAmount').value) || 0;
    const redeemType = document.querySelector('input[name="redeemType"]:checked').value;

    if (amount <= 0) {
      showErrorToast(t('skyTokens.validAmountRequired', 'Please enter a valid amount'));
      return;
    }

    if (amount > tokenState.balance) {
      showErrorToast(t('skyTokens.insufficientBalance', 'Insufficient balance'));
      return;
    }

    try {
      // Show loading state
      const btn = document.getElementById('confirmRedeemBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('skyTokens.processing', 'Processing...')}`;

      // Call backend to process redemption
      const token = getAuthToken();
      const response = await fetch('/api/bookings/redeem-sky', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          redeem_type: redeemType
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Redemption failed');
      }

      // Success
      const redeemInfo = result.redeem || {};
      const voucher = redeemInfo.voucher || null;

      showSuccessToast(t('skyTokens.redemptionSuccess', 'Redemption successful!'));

      if (voucher && voucher.code) {
        persistRedeemVoucher(voucher);
        renderVoucherList();
        const voucherLabel = t('skyTokens.voucherCreated', 'New voucher');
        const voucherValue = Number(voucher.value || 0);
        showSuccessToast(`${voucherLabel}: ${voucher.code} (${formatVnd(voucherValue)})`);
      }
      closeRedeemModal();
      
      // Reload data
      await loadTokenData();

      btn.disabled = false;
      btn.innerHTML = originalText;

    } catch (error) {
      console.error('[SKYTokens] Redemption error:', error);
      showErrorToast(`${t('skyTokens.redemptionFailed', 'Redemption failed')}: ${error.message}`);
      
      const btn = document.getElementById('confirmRedeemBtn');
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-gift"></i> <span data-i18n="skyTokens.confirmRedeem">${t('skyTokens.confirmRedeem', 'Confirm Redeem')}</span>`;
    }
  }

  /**
   * Format token amount for display
   */
  function formatTokenAmount(amount) {
    return new Intl.NumberFormat(currentLanguage === 'en' ? 'en-US' : 'vi-VN').format(amount || 0);
  }

  /**
   * Format date for display
   */
  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(currentLanguage === 'en' ? 'en-US' : 'vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return '-';
    }
  }

  function formatVnd(amount) {
    const text = new Intl.NumberFormat(currentLanguage === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount || 0);

    return text.replace(/₫/g, ' VND');
  }

  function formatDateTime(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString(currentLanguage === 'en' ? 'en-US' : 'vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '-';
    }
  }

  function getPersistedVouchers() {
    try {
      const raw = JSON.parse(localStorage.getItem('skyplanRedeemVouchers') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (_) {
      return [];
    }
  }

  async function syncVouchersFromServer(token, includeExpired = true) {
    if (!token) return;
    try {
      const query = includeExpired ? '?include_expired=true' : '';
      const response = await fetch(`/api/bookings/redeem-vouchers${query}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;

      const result = await response.json();
      if (!result.success || !Array.isArray(result.vouchers)) return;

      const fromServer = result.vouchers.map((voucher) => ({
        code: String(voucher.code || '').toUpperCase(),
        type: String(voucher.type || 'fixed').toLowerCase(),
        value: Number(voucher.value || 0),
        minAmount: Number(voucher.min_amount || voucher.minAmount || 0),
        currency: voucher.currency || 'VND',
        description: voucher.description || '',
        redeemType: voucher.redeem_type || voucher.redeemType || 'discount',
        expiresAt: voucher.expires_at || voucher.expiresAt || null,
        createdAt: voucher.created_at || voucher.createdAt || null,
        source: 'sky_redeem_server',
      })).filter((voucher) => voucher.code && voucher.value > 0);

      localStorage.setItem('skyplanRedeemVouchers', JSON.stringify(fromServer.slice(0, 50)));
    } catch (error) {
      console.warn('[SKYTokens] Failed to sync vouchers from server:', error);
    }
  }

  function renderVoucherList() {
    const voucherListEl = document.getElementById('voucherList');
    const emptyStateEl = document.getElementById('voucherEmptyState');
    if (!voucherListEl || !emptyStateEl) return;

    const vouchers = getPersistedVouchers();
    voucherListEl.innerHTML = '';

    if (!vouchers.length) {
      emptyStateEl.style.display = 'flex';
      return;
    }

    emptyStateEl.style.display = 'none';
    const now = Date.now();

    vouchers.forEach((voucher) => {
      const code = String(voucher.code || '').toUpperCase();
      const value = Number(voucher.value || 0);
      const minAmount = Number(voucher.minAmount || voucher.min_amount || 0);
      const expiresAt = voucher.expiresAt || voucher.expires_at || null;
      const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
      const isExpired = Number.isFinite(expiresMs) ? expiresMs < now : false;

      const card = document.createElement('div');
      card.className = `voucher-card${isExpired ? ' voucher-expired' : ''}`;

      const metaText = isExpired
        ? t('skyTokens.expired', 'Expired')
        : `${t('skyTokens.expiresAt', 'Expires')}: ${formatDateTime(expiresAt)}`;

      card.innerHTML = `
        <div>
          <div class="voucher-code">${code || '-'}</div>
          <div class="voucher-meta">${voucher.description || ''}</div>
        </div>
        <div class="voucher-meta">
          <div>${formatVnd(value)}</div>
          <div>Min: ${formatVnd(minAmount)}</div>
          <div>${metaText}</div>
        </div>
        <div>
          <button class="voucher-copy-btn" type="button">${t('skyTokens.copyVoucher', 'Copy code')}</button>
        </div>
      `;

      const copyBtn = card.querySelector('.voucher-copy-btn');
      if (copyBtn && code && !isExpired) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(code);
            copyBtn.textContent = t('skyTokens.copied', 'Copied');
            setTimeout(() => {
              copyBtn.textContent = t('skyTokens.copyVoucher', 'Copy code');
            }, 1200);
          } catch (_) {
            showErrorToast('Cannot copy voucher code');
          }
        });
      } else if (copyBtn && isExpired) {
        copyBtn.disabled = true;
      }

      voucherListEl.appendChild(card);
    });
  }

  function persistRedeemVoucher(voucher) {
    try {
      const storageKey = 'skyplanRedeemVouchers';
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const normalized = {
        code: String(voucher.code || '').toUpperCase(),
        type: String(voucher.type || 'fixed').toLowerCase(),
        value: Number(voucher.value || 0),
        minAmount: Number(voucher.min_amount || voucher.minAmount || 0),
        currency: voucher.currency || 'VND',
        description: voucher.description || '',
        redeemType: voucher.redeem_type || voucher.redeemType || 'discount',
        expiresAt: voucher.expires_at || voucher.expiresAt || null,
        source: 'sky_redeem',
      };

      if (!normalized.code || normalized.value <= 0) {
        return;
      }

      const deduped = current.filter((item) => String(item.code || '').toUpperCase() !== normalized.code);
      deduped.unshift(normalized);
      localStorage.setItem(storageKey, JSON.stringify(deduped.slice(0, 20)));
    } catch (error) {
      console.warn('[SKYTokens] Failed to persist redeem voucher:', error);
    }
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
      alert(message);
    }
  }

  /**
   * Show success toast notification
   */
  function showSuccessToast(message) {
    if (window.Toast && typeof window.Toast.success === 'function') {
      window.Toast.success(message);
    } else {
      console.log(message);
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
    const dict = SKY_TRANSLATIONS[currentLanguage] || SKY_TRANSLATIONS.vi;
    const value = getNestedValue(dict, key);
    return value !== undefined ? value : (fallback || key);
  }

  function applySkyTokensLanguage(lang) {
    currentLanguage = String(lang || '').toLowerCase() === 'en' ? 'en' : 'vi';

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      const translated = t(key, null);
      if (!translated || translated === key) return;
      node.textContent = translated;
    });

    document.title = t('metaMyTokensTitle', document.title);
  }

  /**
   * Apply initial translations
   */
  function applyInitialTranslations() {
    applySkyTokensLanguage(getCurrentLanguage());
    renderVoucherList();
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
      console.error('[SKYTokens] Error loading page components:', error);
    }
  }
})();
