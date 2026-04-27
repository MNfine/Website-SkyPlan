/**
 * Wallet Login Module
 * Handles MetaMask/Ethereum wallet-based authentication
 * Flow: Connect Wallet → Request Nonce → Sign Message → Verify Signature → Get JWT Token
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    SEPOLIA_CHAIN_ID: '11155111',
    SEPOLIA_CHAIN_ID_HEX: '0xaa36a7',
  };

  // State
  let walletState = {
    isMetaMaskInstalled: false,
    isConnected: false,
    account: null,
    networkId: null,
  };

  function getCurrentLang() {
    try {
      return localStorage.getItem('preferredLanguage') || 'vi';
    } catch (error) {
      return 'vi';
    }
  }

  function getText(key, fallback) {
    const lang = getCurrentLang();
    const dict = window.translations && window.translations[lang] ? window.translations[lang] : null;

    if (dict && dict[key]) {
      return dict[key];
    }

    if (dict) {
      const parts = key.split('.');
      let node = dict;
      for (let i = 0; i < parts.length; i += 1) {
        if (node && typeof node === 'object' && parts[i] in node) {
          node = node[parts[i]];
        } else {
          node = null;
          break;
        }
      }

      if (typeof node === 'string') {
        return node;
      }
    }

    return fallback;
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function() {
    initializeWalletLogin();
  });

  /**
   * Initialize wallet login module
   */
  function initializeWalletLogin() {
    console.log('[WalletLogin] Initializing...');
    
    // Check if MetaMask is installed
    walletState.isMetaMaskInstalled = typeof window.ethereum !== 'undefined';
    
    // Get DOM elements
    const elements = getWalletElements();
    
    // Setup event listeners
    setupEventListeners(elements);
    
    // Initial UI state
    updateMetaMaskStatus(elements);
    
    // Check if wallet is already connected
    if (walletState.isMetaMaskInstalled) {
      checkConnectedAccounts();
    }
  }

  /**
   * Get all wallet-related DOM elements
   */
  function getWalletElements() {
    return {
      connectBtn: document.getElementById('connectWalletBtn'),
      disconnectBtn: document.getElementById('disconnectWalletBtn'),
      signMessageBtn: document.getElementById('signMessageBtn'),
      walletStatus: document.getElementById('metamaskStatus'),
      connectedInfo: document.getElementById('connectedWalletInfo'),
      walletAddress: document.getElementById('walletAddressDisplay'),
      signSection: document.getElementById('signMessageSection'),
      loadingState: document.getElementById('walletLoadingState'),
      errorMessage: document.getElementById('walletErrorMessage'),
      networkInfo: document.getElementById('networkInfo'),
      networkName: document.getElementById('networkName'),
      loginTabs: document.querySelectorAll('.login-tab'),
    };
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners(elements) {
    // Tab switching
    elements.loginTabs.forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        switchLoginTab(this.dataset.tab);
      });
    });

    // Wallet buttons
    if (elements.connectBtn) {
      elements.connectBtn.addEventListener('click', handleConnectWallet);
    }
    if (elements.disconnectBtn) {
      elements.disconnectBtn.addEventListener('click', handleDisconnectWallet);
    }
    if (elements.signMessageBtn) {
      elements.signMessageBtn.addEventListener('click', handleSignMessage);
    }

    // Listen for account/chain changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
  }

  /**
   * Switch between login tabs (Email vs Wallet)
   */
  function switchLoginTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.login-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.login-tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tabContent === tabName);
    });

    console.log(`[WalletLogin] Switched to ${tabName} tab`);
  }

  /**
   * Update MetaMask installation status
   */
  function updateMetaMaskStatus(elements) {
    if (walletState.isMetaMaskInstalled) {
      elements.walletStatus.style.display = 'none';
      elements.connectBtn.style.display = 'block';
    } else {
      elements.walletStatus.style.display = 'block';
      elements.connectBtn.style.display = 'none';
    }
  }

  /**
   * Check if wallet is already connected
   */
  async function checkConnectedAccounts() {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        walletState.account = accounts[0];
        walletState.isConnected = true;
        updateWalletUI();
      }
    } catch (error) {
      console.error('[WalletLogin] Error checking connected accounts:', error);
    }
  }

  /**
   * Handle connect wallet button click
   */
  async function handleConnectWallet() {
    if (!window.ethereum) {
      showWalletError(getText('login.metamaskNotInstalled', 'MetaMask is not installed'));
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        walletState.account = accounts[0];
        walletState.isConnected = true;
        
        // Check network
        await checkAndSwitchNetwork();
        
        // Update UI
        updateWalletUI();
        clearWalletError();
      }
    } catch (error) {
      console.error('[WalletLogin] Error connecting wallet:', error);
      if (error.code === 4001) {
        showWalletError(getText('login.walletConnectionRejected', 'You rejected the wallet connection request'));
      } else {
        showWalletError(`${getText('login.walletConnectionFailed', 'Failed to connect wallet')}: ${error.message}`);
      }
    }
  }

  /**
   * Handle disconnect wallet button click
   */
  async function handleDisconnectWallet() {
    walletState.isConnected = false;
    walletState.account = null;
    
    // Clear stored auth state
    if (window.AuthState && typeof window.AuthState.clearAuth === 'function') {
      window.AuthState.clearAuth();
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
    }
    localStorage.removeItem('walletConnected');
    
    updateWalletUI();
    console.log('[WalletLogin] Wallet disconnected');
  }

  /**
   * Check and switch to Sepolia network if needed
   */
  async function checkAndSwitchNetwork() {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      walletState.networkId = chainId;

      if (chainId !== CONFIG.SEPOLIA_CHAIN_ID_HEX) {
        console.log('[WalletLogin] Requesting to switch to Sepolia network...');
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.SEPOLIA_CHAIN_ID_HEX }],
          });
          console.log('[WalletLogin] Switched to Sepolia');
        } catch (switchError) {
          if (switchError.code === 4902) {
            // Sepolia not added to wallet, add it
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: CONFIG.SEPOLIA_CHAIN_ID_HEX,
                chainName: 'Sepolia Testnet',
                rpcUrls: ['https://rpc.sepolia.org', 'https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'sETH',
                  decimals: 18
                }
              }],
            });
          } else {
            console.error('[WalletLogin] Network switch error:', switchError);
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error('[WalletLogin] Error checking/switching network:', error);
      throw error;
    }
  }

  /**
   * Handle sign message button click
   */
  async function handleSignMessage() {
    const elements = getWalletElements();
    
    if (!walletState.isConnected || !walletState.account) {
      showWalletError(getText('login.walletNotConnected', 'Wallet not connected'));
      return;
    }

    try {
      // Show loading state
      showLoadingState(elements, true);
      clearWalletError(elements);

      // Step 1: Get nonce from backend
      console.log('[WalletLogin] Requesting nonce from backend...');
      const nonceResponse = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletState.account })
      });

      const nonceData = await nonceResponse.json().catch(() => null);

      if (!nonceResponse.ok) {
        const nonceErrorMessage = nonceData && nonceData.message ? nonceData.message : nonceResponse.statusText;
        throw new Error(`${getText('login.walletNonceFailed', 'Failed to get verification nonce')}: ${nonceErrorMessage}`);
      }

      if (!nonceData.success || !nonceData.data) {
        throw new Error(nonceData.message || 'Failed to get nonce');
      }

      const { nonce, message } = nonceData.data;
      console.log('[WalletLogin] Got nonce:', nonce);

      // Step 2: Request signature from wallet
      console.log('[WalletLogin] Requesting signature...');
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletState.account],
      });

      console.log('[WalletLogin] Got signature:', signature);

      // Step 3: Verify signature on backend
      console.log('[WalletLogin] Verifying signature on backend...');
      const verifyResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletState.account,
          signature: signature,
          message: message,
          nonce: nonce
        })
      });

      const verifyData = await verifyResponse.json().catch(() => null);

      if (!verifyResponse.ok) {
        const verifyErrorMessage = verifyData && verifyData.message ? verifyData.message : verifyResponse.statusText;
        throw new Error(`${getText('login.walletVerifyFailed', 'Failed to verify wallet signature')}: ${verifyErrorMessage}`);
      }

      if (!verifyData.success || !verifyData.data.token) {
        throw new Error(verifyData.message || 'Verification failed');
      }

      // Step 4: Persist authentication state so header/user menu updates globally
      const token = verifyData.data.token;
      const user = verifyData.data.user || verifyData.user || null;

      if (window.AuthState && typeof window.AuthState.setAuth === 'function' && user) {
        window.AuthState.setAuth(token, user, true);
      } else {
        localStorage.setItem('authToken', token);
        if (user) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      }

      localStorage.setItem('walletConnected', walletState.account);

      if (typeof window.updateHeaderUserInfo === 'function') {
        window.updateHeaderUserInfo();
      }
      
      console.log('[WalletLogin] ✓ Authentication successful!');
      showLoadingState(elements, false);

      // Redirect giống login email: ưu tiên returnUrl, fallback về trang chủ
      setTimeout(() => {
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
        window.location.href = returnUrl || '/index.html';
      }, 1000);

    } catch (error) {
      console.error('[WalletLogin] Error during sign-in:', error);
      showWalletError(`${getText('login.walletSignFailed', 'Wallet sign in failed')}: ${error.message}`, elements);
      showLoadingState(elements, false);
    }
  }

  /**
   * Update wallet UI based on connection state
   */
  function updateWalletUI() {
    const elements = getWalletElements();
    
    if (walletState.isConnected && walletState.account) {
      // Show connected state
      elements.connectBtn.style.display = 'none';
      elements.connectedInfo.style.display = 'block';
      elements.signSection.style.display = 'block';
      elements.networkInfo.style.display = 'block';
      
      // Display formatted address
      elements.walletAddress.textContent = formatAddress(walletState.account);
      elements.walletAddress.title = walletState.account;
    } else {
      // Show disconnected state
      elements.connectBtn.style.display = 'block';
      elements.connectedInfo.style.display = 'none';
      elements.signSection.style.display = 'none';
      elements.networkInfo.style.display = 'none';
    }
  }

  /**
   * Show loading state
   */
  function showLoadingState(elements, isLoading) {
    if (isLoading) {
      elements.loadingState.style.display = 'flex';
      elements.signSection.style.display = 'none';
    } else {
      elements.loadingState.style.display = 'none';
      elements.signSection.style.display = 'block';
    }
  }

  /**
   * Show error message
   */
  function showWalletError(message, elements) {
    if (!elements) {
      elements = getWalletElements();
    }
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
  }

  /**
   * Clear error message
   */
  function clearWalletError(elements) {
    if (!elements) {
      elements = getWalletElements();
    }
    elements.errorMessage.textContent = '';
    elements.errorMessage.style.display = 'none';
  }

  /**
   * Handle account changes in MetaMask
   */
  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      console.log('[WalletLogin] Wallet disconnected by user');
      handleDisconnectWallet();
    } else if (accounts[0] !== walletState.account) {
      console.log('[WalletLogin] Account changed:', accounts[0]);
      walletState.account = accounts[0];
      updateWalletUI();
    }
  }

  /**
   * Handle chain/network changes
   */
  function handleChainChanged(chainId) {
    console.log('[WalletLogin] Chain changed to:', chainId);
    walletState.networkId = chainId;
    
    if (chainId !== CONFIG.SEPOLIA_CHAIN_ID_HEX) {
      console.warn('[WalletLogin] Not on Sepolia testnet!');
      const elements = getWalletElements();
      showWalletError(getText('login.walletSwitchSepolia', 'Please switch to Sepolia Testnet'), elements);
    }
  }

  /**
   * Format Ethereum address for display
   */
  function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
  }

  // Export for external use if needed
  window.WalletLogin = {
    state: walletState,
    switchTab: switchLoginTab,
    formatAddress: formatAddress
  };

})();
