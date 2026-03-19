/**
 * MetaMask Wallet Integration for SkyPlan
 * Features: Connect/Disconnect, Network Check, Sepolia Switch
 */

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const SEPOLIA_CHAIN_ID_INT = 11155111;

const MetaMaskWallet = {
  isConnected: false,
  account: null,
  chainId: null,
  isCorrectNetwork: false,
  provider: null,

  init: function() {
    if (!this.detectMetaMask()) {
      console.warn('[MetaMask] Not installed');
      return false;
    }

    this.provider = window.ethereum;

    // Listen for account changes
    this.provider.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.account = accounts[0];
        this.updateUI();
      }
    });

    // Listen for network changes
    this.provider.on('chainChanged', (chainId) => {
      this.chainId = chainId;
      this.isCorrectNetwork = this.isSepoliaNetwork();
      this.updateUI();

      if (!this.isCorrectNetwork) {
        this.showNetworkWarning();
      }
    });

    // Try to restore previous connection
    this.restoreConnection();
    return true;
  },

  detectMetaMask: function() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  },

  connect: function() {
    if (!this.provider) {
      return Promise.resolve({ success: false, error: 'MetaMask not detected' });
    }

    const self = this;
    return this.provider
      .request({
        method: 'eth_requestAccounts',
      })
      .then(function(accounts) {
        if (accounts && accounts.length > 0) {
          self.account = accounts[0];

          return self.provider.request({
            method: 'eth_chainId',
          });
        }
        throw new Error('No accounts returned');
      })
      .then(function(chainId) {
        self.chainId = chainId;
        self.isCorrectNetwork = self.isSepoliaNetwork();

        if (!self.isCorrectNetwork) {
          return self.switchToSepolia();
        }
        return true;
      })
      .then(function() {
        self.isConnected = true;
        self.saveConnectionState();
        self.updateUI();
        return { success: true, account: self.account };
      })
      .catch(function(error) {
        console.error('[MetaMask] Connect failed:', error);
        return { success: false, error: error.message };
      });
  },

  disconnect: function() {
    this.isConnected = false;
    this.account = null;
    this.chainId = null;
    this.isCorrectNetwork = false;

    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');

    this.updateUI();
  },

  isSepoliaNetwork: function() {
    if (!this.chainId) return false;
    return (
      this.chainId === SEPOLIA_CHAIN_ID ||
      this.chainId === SEPOLIA_CHAIN_ID_INT ||
      parseInt(this.chainId, 16) === SEPOLIA_CHAIN_ID_INT
    );
  },

  switchToSepolia: function() {
    if (!this.provider) return Promise.resolve(false);

    const self = this;
    return this.provider
      .request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })
      .then(function() {
        self.isCorrectNetwork = true;
        self.saveConnectionState();
        self.updateUI();
        return true;
      })
      .catch(function(switchError) {
        if (switchError.code === 4902) {
          return self.addSepoliaNetwork();
        }
        console.error('[MetaMask] Switch failed:', switchError);
        return false;
      });
  },

  addSepoliaNetwork: function() {
    const self = this;
    return this.provider
      .request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID,
            chainName: 'Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [
              'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
              'https://rpc.sepolia.org',
            ],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      })
      .then(function() {
        self.isCorrectNetwork = true;
        self.saveConnectionState();
        self.updateUI();
        return true;
      })
      .catch(function(error) {
        console.error('[MetaMask] Add Sepolia failed:', error);
        return false;
      });
  },

  getShortAddress: function() {
    if (!this.account) return null;
    return this.account.substring(0, 6) + '...' + this.account.substring(this.account.length - 4);
  },

  saveConnectionState: function() {
    if (this.isConnected && this.account) {
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', this.account);
    }
  },

  restoreConnection: function() {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    const savedAddress = localStorage.getItem('walletAddress');

    if (!wasConnected || !savedAddress || !this.provider) return;

    const self = this;
    this.provider
      .request({
        method: 'eth_accounts',
      })
      .then(function(accounts) {
        if (
          accounts &&
          accounts.length > 0 &&
          accounts[0].toLowerCase() === savedAddress.toLowerCase()
        ) {
          self.account = accounts[0];

          return self.provider.request({
            method: 'eth_chainId',
          });
        }
        return null;
      })
      .then(function(chainId) {
        if (chainId) {
          self.chainId = chainId;
          self.isCorrectNetwork = self.isSepoliaNetwork();
          self.isConnected = true;
          self.updateUI();
        }
      })
      .catch(function(error) {
        console.warn('[MetaMask] Restore failed:', error);
      });
  },

  updateUI: function() {
    const walletBtn = document.getElementById('wallet-connect-btn');
    if (!walletBtn) return;

    if (this.isConnected && this.account) {
      walletBtn.classList.add('connected');
      walletBtn.setAttribute('data-connected', 'true');
      walletBtn.innerHTML =
        '<i class="fas fa-wallet"></i><span class="wallet-address">' +
        this.getShortAddress() +
        '</span>';
    } else {
      walletBtn.classList.remove('connected');
      walletBtn.setAttribute('data-connected', 'false');
      walletBtn.innerHTML =
        '<i class="fas fa-wallet"></i><span data-i18n="connectWalletText">Connect Wallet</span>';
    }
  },

  showNetworkWarning: function() {
    if (typeof showToast === 'function') {
      const lang = localStorage.getItem('preferredLanguage') || 'vi';
      const msg = lang === 'en' ? 'Please switch to Sepolia testnet' : 'Vui lòng chuyển sang mạng Sepolia';
      showToast('⚠️ Wrong Network', msg, 'warning');
    }
  },
};

/**
 * Initialize when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    MetaMaskWallet.init();
  }, 100);
});

/**
 * Handle wallet button clicks
 */
document.addEventListener('click', function(e) {
  const walletBtn = e.target.closest('#wallet-connect-btn');
  if (walletBtn) {
    e.preventDefault();

    if (MetaMaskWallet.isConnected) {
      const menu = document.getElementById('wallet-menu');
      if (menu) {
        menu.classList.toggle('active');
      }
    } else {
      MetaMaskWallet.connect().then(function(result) {
        if (!result.success) {
          if (typeof showToast === 'function') {
            showToast('❌ Connection Failed', result.error || 'Unknown error', 'error');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast(
              '✅ Connected',
              'Wallet ' + MetaMaskWallet.getShortAddress() + ' connected',
              'success'
            );
          }
        }
      });
    }
  }

  // Handle disconnect
  const disconnectBtn = e.target.closest('#wallet-disconnect-btn');
  if (disconnectBtn) {
    e.preventDefault();
    MetaMaskWallet.disconnect();

    const menu = document.getElementById('wallet-menu');
    if (menu) menu.classList.remove('active');

    if (typeof showToast === 'function') {
      showToast('👋 Disconnected', 'Wallet disconnected', 'info');
    }
  }

  // Close menu when clicking outside
  if (!e.target.closest('.wallet-section')) {
    const menu = document.getElementById('wallet-menu');
    if (menu) menu.classList.remove('active');
  }
});
