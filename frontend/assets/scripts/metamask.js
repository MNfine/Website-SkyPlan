/**
 * MetaMask Wallet Integration for SkyPlan
 * Handles wallet connection, account management, and network switching
 */

const MetaMaskWallet = (function () {
  'use strict';

  // State
  let state = {
    isConnected: false,
    account: null,
    chainId: null,
    isCorrectNetwork: false,
    provider: null,
    initialized: false, // Guard against multiple initializations
    connecting: false, // Guard against multiple simultaneous connection attempts
  };

  const SEPOLIA_CHAIN_ID = '11155111';
  const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

  // Global wallet state for synchronization
  window.WalletState = {
    isConnected: false,
    account: null,
    chainId: null
  };

  /**
   * Initialize MetaMask
   */
  async function init() {
    try {
      // Guard against multiple initializations
      if (state.initialized) {
        console.log('MetaMask already initialized, skipping...');
        return true;
      }

      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        console.warn('MetaMask not detected');
        return false;
      }

      state.provider = window.ethereum;
      state.initialized = true;

      // Set up event listeners
      setupEventListeners();

      // Try to restore previous connection
      restoreConnection();

      return true;

    } catch (error) {
      console.error('MetaMask init error:', error);
      return false;
    }
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    if (!state.provider) return;

    // Account changed
    state.provider.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        state.account = accounts[0];
        window.WalletState.account = accounts[0];
        window.WalletState.isConnected = true;
        updateWalletUI();
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));
      } else {
        disconnect();
      }
    });

    // Chain changed
    state.provider.on('chainChanged', (chainId) => {
      state.chainId = chainId;
      window.WalletState.chainId = chainId;
      state.isCorrectNetwork = isSepoliaNetwork();
      updateWalletUI();
      
      // Notify other components
      window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));
    });
  }

  /**
   * Connect wallet
   */
  async function connect() {
    try {
      // Guard against multiple simultaneous connection attempts
      if (state.connecting) {
        console.warn('Connection already in progress, please wait...');
        showNotification('Connection already in progress. Please wait...', 'warning');
        return false;
      }

      if (!state.provider) {
        showNotification('MetaMask not detected. Please install MetaMask extension.', 'error');
        return false;
      }

      state.connecting = true;

      // Request account access
      const accounts = await state.provider.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        state.account = accounts[0];
        state.isConnected = true;
        
        // Update global state
        window.WalletState.account = accounts[0];
        window.WalletState.isConnected = true;
        window.WalletState.chainId = await state.provider.request({ method: 'eth_chainId' });

        // Get chain ID
        const chainId = await state.provider.request({
          method: 'eth_chainId',
        });
        state.chainId = chainId;
        state.isCorrectNetwork = isSepoliaNetwork();
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));

        // Check if on correct network
        if (!state.isCorrectNetwork) {
          const switched = await switchToSepolia();
          if (!switched) {
            showNotification('Please switch to Sepolia Testnet manually', 'warning');
          }
        }

        // Save connection state
        saveConnectionState();

        // Update UI
        updateWalletUI();

        // Show success notification
        const lang = window.getPersistedLanguage();
        const msg = (lang === 'vi') ? 'Ví MetaMask đã kết nối thành công!' : 'MetaMask wallet connected successfully!';
        showNotification(msg, 'success');

        state.connecting = false;
        return true;

      } else {
        showNotification('No accounts found. Please unlock MetaMask.', 'error');
        state.connecting = false;
        return false;
      }

    } catch (error) {
      console.error('Connect wallet error:', error);
      state.connecting = false;

      // Handle specific errors
      if (error.code === 4001) {
        showNotification('Connection rejected by user', 'error');
      } else if (error.code === -32603) {
        showNotification('Internal error. Please try again.', 'error');
      } else if (error.message && error.message.includes('already pending')) {
        showNotification('Connection request already pending. Please wait...', 'warning');
      } else {
        showNotification('Failed to connect wallet: ' + error.message, 'error');
      }

      return false;
    }
  }

  /**
   * Disconnect wallet
   */
  function disconnect() {
    state.isConnected = false;
    state.account = null;
    state.chainId = null;
    state.isCorrectNetwork = false;

    // Clear stored state
    localStorage.removeItem('skyplan_wallet_connected');
    localStorage.removeItem('skyplan_wallet_account');

    // Update global state
    window.WalletState.isConnected = false;
    window.WalletState.account = null;
    
    // Notify other components
    window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));

    updateWalletUI();

    const lang = window.getPersistedLanguage();
    const msg = (lang === 'vi') ? 'Ví đã ngắt kết nối' : 'Wallet disconnected';
    showNotification(msg, 'info');
  }

  /**
   * Check if connected to Sepolia network
   */
  function isSepoliaNetwork() {
    return state.chainId === SEPOLIA_CHAIN_ID_HEX || state.chainId === SEPOLIA_CHAIN_ID;
  }

  /**
   * Switch to Sepolia network
   */
  async function switchToSepolia() {
    try {
      if (!state.provider) return false;

      // Try to switch to Sepolia
      try {
        await state.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
        });

        state.chainId = SEPOLIA_CHAIN_ID_HEX;
        state.isCorrectNetwork = true;
        updateWalletUI();

        const lang = window.getPersistedLanguage();
        const msg = (lang === 'vi') ? 'Đã chuyển sang mạng Sepolia' : 'Switched to Sepolia network';
        showNotification(msg, 'success');

        return true;

      } catch (switchError) {
        // Chain not added, try to add it
        if (switchError.code === 4902) {
          return await addSepoliaNetwork();
        }
        throw switchError;
      }

    } catch (error) {
      console.error('Switch to Sepolia error:', error);
      return false;
    }
  }

  /**
   * Add Sepolia network to MetaMask
   */
  async function addSepoliaNetwork() {
    try {
      if (!state.provider) return false;

      await state.provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEPOLIA_CHAIN_ID_HEX,
          chainName: 'Sepolia Testnet',
          rpcUrls: ['https://sepolia.infura.io/v3/'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
          nativeCurrency: {
            name: 'Sepolia ETH',
            symbol: 'ETH',
            decimals: 18,
          },
        }],
      });

      state.chainId = SEPOLIA_CHAIN_ID_HEX;
      state.isCorrectNetwork = true;
      updateWalletUI();

      const lang = window.getPersistedLanguage();
      const msg = (lang === 'vi') ? 'Mạng Sepolia đã được thêm' : 'Sepolia network added';
      showNotification(msg, 'success');

      return true;

    } catch (error) {
      console.error('Add Sepolia network error:', error);
      return false;
    }
  }

  /**
   * Get connection info
   */
  function getConnectionInfo() {
    return {
      isConnected: state.isConnected,
      account: state.account,
      chainId: state.chainId,
      isCorrectNetwork: state.isCorrectNetwork,
    };
  }

  /**
   * Save connection state to localStorage
   */
  function saveConnectionState() {
    localStorage.setItem('skyplan_wallet_connected', 'true');
    localStorage.setItem('skyplan_wallet_account', state.account);
  }

  function restoreConnection() {
    try {
      if (!state.provider) return;

      // 1. Phục hồi ngay lập tức từ localStorage để UI không bị giật/block
      const savedAccount = localStorage.getItem('skyplan_wallet_account');
      if (savedAccount) {
        state.account = savedAccount;
        state.isConnected = true;
        window.WalletState.account = savedAccount;
        window.WalletState.isConnected = true;
        
        // Render UI lập tức
        updateWalletUI();
        window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));
      }

      // 2. Chạy ngầm (background) RPC request để verify lại trạng thái
      // This prevents stale disconnected state when the wallet was connected
      // outside this specific page flow.
      state.provider.request({
        method: 'eth_accounts',
      }).then(accounts => {
        if (accounts && accounts.length > 0) {
          console.log('[MetaMask] Found existing account:', accounts[0]);
          state.account = accounts[0];
          state.isConnected = true;

          // Update global state
          window.WalletState.account = accounts[0];
          window.WalletState.isConnected = true;

          // Keep local restore hints in sync.
          saveConnectionState();

          // Get chain ID
          state.provider.request({
            method: 'eth_chainId',
          }).then(chainId => {
            state.chainId = chainId;
            window.WalletState.chainId = chainId;
            state.isCorrectNetwork = isSepoliaNetwork();
            updateWalletUI();
            
            // Notify other components
            window.dispatchEvent(new CustomEvent('walletStateChanged', { detail: window.WalletState }));
          });
        } else {
          console.debug('[MetaMask] No authorized accounts found on restore');
        }
      }).catch(err => {
        console.error('[MetaMask] Restore connection error:', err);
      });
    } catch (error) {
      console.error('Restore connection error:', error);
    }
  }

  /**
   * Update wallet UI
   */
  function updateWalletUI() {
    try {
      const walletStatus = document.getElementById('walletStatus');
      const connectBtn = document.getElementById('connectWalletBtn');
      const headerConnectBtn = document.getElementById('wallet-connect-btn');
      const walletAddress = document.getElementById('walletAddress');
      const headerWalletAddress = document.getElementById('wallet-address');
      const walletMenu = document.getElementById('wallet-menu');
      const demoConnectBtn = document.getElementById('demoConnectWalletBtn');

      if (!walletStatus && !connectBtn && !headerConnectBtn) return;

      const isConnected = state.isConnected && state.account;

      // Update Header Button & Menu
      if (headerConnectBtn) {
        // Check if user is logged in (from localStorage/sessionStorage)
        const isLoggedIn = !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
        const shouldShowConnected = isConnected && isLoggedIn;

        headerConnectBtn.setAttribute('data-connected', shouldShowConnected ? 'true' : 'false');
        if (shouldShowConnected) {
          headerConnectBtn.classList.add('connected');
          const spanEl = headerConnectBtn.querySelector('span');
          if (spanEl) {
            spanEl.setAttribute('data-i18n', 'walletConnected');
            const lang = (typeof window.getPersistedLanguage === 'function') ? window.getPersistedLanguage() : 'vi';
            if (window.getWalletTranslation) {
              spanEl.textContent = window.getWalletTranslation('walletConnected');
            } else {
              spanEl.textContent = (lang === 'en') ? 'Wallet Connected' : 'Ví đã kết nối';
            }
          }
          if (headerWalletAddress) headerWalletAddress.textContent = state.account;
        } else {
          headerConnectBtn.classList.remove('connected');
          const spanEl = headerConnectBtn.querySelector('span');
          if (spanEl) {
            spanEl.setAttribute('data-i18n', 'connectWalletText');
            const lang = (typeof window.getPersistedLanguage === 'function') ? window.getPersistedLanguage() : 'vi';
            if (window.getWalletTranslation) {
              spanEl.textContent = window.getWalletTranslation('connectWalletText');
            } else {
              spanEl.textContent = (lang === 'en') ? 'Connect Wallet' : 'Kết nối ví';
            }
          }
          if (walletMenu) walletMenu.classList.remove('show');
        }
      }

      // Update Payment Page Specific UI
      if (isConnected) {
        if (walletStatus) walletStatus.style.display = 'block';
        if (connectBtn) {
          const lang = window.getPersistedLanguage();
          connectBtn.textContent = (lang === 'vi') ? 'Ví đã kết nối' : 'Wallet connected';
          connectBtn.disabled = true;
          connectBtn.style.background = 'rgba(255, 255, 255, 0.92)';
          connectBtn.style.color = '#0d9ca8';
        }
        if (walletAddress) walletAddress.textContent = state.account;
      } else {
        if (walletStatus) walletStatus.style.display = 'none';
        if (connectBtn) {
          connectBtn.textContent = '🔌 Connect Wallet';
          connectBtn.disabled = false;
          connectBtn.style.background = '';
          connectBtn.style.color = '';
        }
      }

      // Wrong network warning
      if (isConnected && !state.isCorrectNetwork) {
        const lang = window.getPersistedLanguage();
        const msg = (lang === 'vi') ? 'Vui lòng chuyển sang mạng Sepolia' : 'Please switch to Sepolia network';
        showNotification(msg, 'warning');
      }

    } catch (error) {
      console.error('Update wallet UI error:', error);
    }
  }

  /**
   * Show notification
   */
  function showNotification(msg, type = 'info') {
    try {
      if (typeof window.notify === 'function') {
        window.notify(msg, type, 4000);
      } else if (typeof window.showToast === 'function') {
        window.showToast(msg, { type: type, duration: 4000 });
      } else {
        console.log('[' + type.toUpperCase() + ']', msg);
      }
    } catch (error) {
      console.error(msg);
    }
  }

  // Public API
  return {
    init: init,
    connect: connect,
    disconnect: disconnect,
    switchToSepolia: switchToSepolia,
    addSepoliaNetwork: addSepoliaNetwork,
    getConnectionInfo: getConnectionInfo,
    isSepoliaNetwork: isSepoliaNetwork,
    
    // State getters
    get isConnected() { return state.isConnected; },
    get account() { return state.account; },
    get chainId() { return state.chainId; },
    get isCorrectNetwork() { return state.isCorrectNetwork; },
    get provider() { return state.provider; },
  };
})();

// Expose globally so other scripts can reliably use window.MetaMaskWallet.
try {
  window.MetaMaskWallet = MetaMaskWallet;
  window.initWallet = async function() {
    console.log('[Wallet] Initializing wallet system...');
    try {
      if (typeof MetaMaskWallet.init === 'function') {
        const initialized = await MetaMaskWallet.init();
        if (initialized) {
          console.log('[Wallet] ✓ MetaMask initialized');
        }
      }
      return true;
    } catch (error) {
      console.error('[Wallet] Initialization failed:', error);
      return false;
    }
  };
} catch (_) {}

// Initialize when DOM is ready (only once)
let mmInitAttempted = false;
document.addEventListener('DOMContentLoaded', function () {
  if (!mmInitAttempted) {
    mmInitAttempted = true;
    MetaMaskWallet.init();
  }
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loaded' || document.readyState === 'complete') {
  if (!mmInitAttempted) {
    mmInitAttempted = true;
    MetaMaskWallet.init();
  }
}

