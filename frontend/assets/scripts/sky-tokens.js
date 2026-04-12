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
        if (e.key === 'preferredLanguage') {
          location.reload();
        }
      });

    } catch (error) {
      console.error('[SKYTokens] Initialization error:', error);
      showErrorToast('Failed to initialize SKY Tokens Dashboard');
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

      const bookings = result.bookings;

      // Calculate token statistics
      tokenState.bookingsCount = bookings.length;
      tokenState.totalEarned = bookings.reduce((sum, b) => sum + (b.sky_reward_amount || 0), 0);
      tokenState.balance = tokenState.totalEarned - (tokenState.redeemed || 0);

      // Build rewards array from bookings with SKY rewards
      tokenState.rewards = bookings
        .filter(b => b.sky_minted && b.sky_reward_amount)
        .map(b => ({
          bookingCode: b.booking_code,
          amount: b.sky_reward_amount,
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

      // Hide loading state
      document.getElementById('loadingState').style.display = 'none';

      if (tokenState.rewards.length === 0) {
        document.getElementById('emptyState').style.display = 'flex';
      }

    } catch (error) {
      console.error('[SKYTokens] Failed to load token data:', error);
      document.getElementById('loadingState').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      showErrorToast('Failed to load token data');
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
        : 'N/A';
      
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
               title="View on Etherscan">
              <i class="fas fa-external-link-alt"></i>
            </a>
          ` : '-'}
        </td>
      `;
      tbody.appendChild(row);
    });

    container.appendChild(table);
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
      showErrorToast('Please enter a valid amount');
      return;
    }

    if (amount > tokenState.balance) {
      showErrorToast('Insufficient balance');
      return;
    }

    try {
      // Show loading state
      const btn = document.getElementById('confirmRedeemBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

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
      showSuccessToast('Redemption successful!');
      closeRedeemModal();
      
      // Reload data
      await loadTokenData();

      btn.disabled = false;
      btn.innerHTML = originalText;

    } catch (error) {
      console.error('[SKYTokens] Redemption error:', error);
      showErrorToast(`Redemption failed: ${error.message}`);
      
      const btn = document.getElementById('confirmRedeemBtn');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-gift"></i> <span data-i18n="skyTokens.confirmRedeem">Xác nhận đổi</span>';
    }
  }

  /**
   * Format token amount for display
   */
  function formatTokenAmount(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
  }

  /**
   * Format date for display
   */
  function formatDate(dateString) {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (e) {
      return '-';
    }
  }

  /**
   * Get authentication token
   */
  function getAuthToken() {
    return localStorage.getItem('authToken');
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

  /**
   * Apply initial translations
   */
  function applyInitialTranslations() {
    if (typeof applyPageTranslations === 'function') {
      applyPageTranslations();
    }
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
