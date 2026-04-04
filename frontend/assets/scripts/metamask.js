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
  };

  const SEPOLIA_CHAIN_ID = '11155111';
  const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7';

  /**
   * Initialize MetaMask
   */
  async function init() {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        console.warn('MetaMask not detected');
        return false;
      }

      state.provider = window.ethereum;

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
        updateWalletUI();
      } else {
        disconnect();
      }
    });

    // Chain changed
    state.provider.on('chainChanged', (chainId) => {
      state.chainId = chainId;
      state.isCorrectNetwork = isSepoliaNetwork();
      updateWalletUI();
    });
  }

  /**
   * Connect wallet
   */
  async function connect() {
    try {
      if (!state.provider) {
        showNotification('MetaMask not detected. Please install MetaMask extension.', 'error');
        return false;
      }

      // Request account access
      const accounts = await state.provider.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        state.account = accounts[0];
        state.isConnected = true;

        // Get chain ID
        const chainId = await state.provider.request({
          method: 'eth_chainId',
        });
        state.chainId = chainId;
        state.isCorrectNetwork = isSepoliaNetwork();

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
        const lang = localStorage.getItem('preferredLanguage') || 'vi';
        const msg = (lang === 'vi') ? 'Ví MetaMask đã kết nối thành công!' : 'MetaMask wallet connected successfully!';
        showNotification(msg, 'success');

        return true;

      } else {
        showNotification('No accounts found. Please unlock MetaMask.', 'error');
        return false;
      }

    } catch (error) {
      console.error('Connect wallet error:', error);

      // Handle specific errors
      if (error.code === 4001) {
        showNotification('Connection rejected by user', 'error');
      } else if (error.code === -32603) {
        showNotification('Internal error. Please try again.', 'error');
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

    updateWalletUI();

    const lang = localStorage.getItem('preferredLanguage') || 'vi';
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

        const lang = localStorage.getItem('preferredLanguage') || 'vi';
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

      const lang = localStorage.getItem('preferredLanguage') || 'vi';
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

  /**
   * Restore connection from localStorage
   */
  function restoreConnection() {
    try {
      const wasConnected = localStorage.getItem('skyplan_wallet_connected') === 'true';
      if (wasConnected && state.provider) {
        // Try to get accounts silently
        state.provider.request({
          method: 'eth_accounts',
        }).then(accounts => {
          if (accounts && accounts.length > 0) {
            state.account = accounts[0];
            state.isConnected = true;

            // Get chain ID
            state.provider.request({
              method: 'eth_chainId',
            }).then(chainId => {
              state.chainId = chainId;
              state.isCorrectNetwork = isSepoliaNetwork();
              updateWalletUI();
            });
          }
        }).catch(console.error);
      }
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
      const walletAddress = document.getElementById('walletAddress');
      const demoConnectBtn = document.getElementById('demoConnectWalletBtn');

      if (!walletStatus && !connectBtn) return;

      // In UI demo mode, wallet visibility is controlled by blockchain-payment.js demo flow.
      if (demoConnectBtn && !connectBtn) {
        if (!state.isConnected && walletStatus) {
          walletStatus.style.display = 'none';
        }
        return;
      }

      if (state.isConnected && state.account) {
        // Show connected status
        if (walletStatus) {
          walletStatus.style.display = 'block';
        }
        if (connectBtn) {
          const lang = localStorage.getItem('preferredLanguage') || 'vi';
          connectBtn.textContent = (lang === 'vi') ? 'Ví đã kết nối' : 'Wallet connected';
          connectBtn.disabled = true;
          connectBtn.style.background = 'rgba(255, 255, 255, 0.92)';
          connectBtn.style.color = '#0d9ca8';
          connectBtn.style.boxShadow = 'none';
        }

        if (walletAddress) {
          walletAddress.textContent = state.account;
        }

      } else {
        // Show disconnected status
        if (walletStatus) {
          walletStatus.style.display = 'none';
        }
        if (connectBtn) {
          connectBtn.textContent = '🔌 Connect Wallet';
          connectBtn.disabled = false;
          connectBtn.style.background = '';
          connectBtn.style.color = '';
          connectBtn.style.boxShadow = '';
        }
      }

      // Show warning if wrong network
      if (state.isConnected && !state.isCorrectNetwork) {
        const lang = localStorage.getItem('preferredLanguage') || 'vi';
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

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    init();
  });

  // Fallback initialization
  if (document.readyState === 'loaded' || document.readyState === 'complete') {
    init();
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

// Set up connect wallet button handler
document.addEventListener('DOMContentLoaded', function () {
  const connectBtn = document.getElementById('connectWalletBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', async function () {
      if (MetaMaskWallet.isConnected) {
        MetaMaskWallet.disconnect();
      } else {
        await MetaMaskWallet.connect();
      }
    });
  }
});

// Export globally
window.MetaMaskWallet = MetaMaskWallet;
