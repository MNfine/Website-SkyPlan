/**
 * MetaMask Wallet Integration for SkyPlan
 * Features: Connect/Disconnect, Network Check, Sepolia Switch
 */

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const SEPOLIA_CHAIN_ID_INT = 11155111;

function walletLang() {
  if (typeof window.getWalletLanguage === 'function') {
    return window.getWalletLanguage();
  }

  const localStorageLang = localStorage.getItem('preferredLanguage') || localStorage.getItem('language');
  const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
  const lang = (localStorageLang || docLang || 'vi').toLowerCase();
  return lang === 'en' ? 'en' : 'vi';
}

function walletText(key, fallback) {
  if (typeof window.getWalletTranslation === 'function') {
    return window.getWalletTranslation(key, walletLang());
  }

  return fallback || key;
}

function walletTextWithParams(key, values, fallback) {
  if (typeof window.formatWalletTranslation === 'function') {
    return window.formatWalletTranslation(key, values, walletLang());
  }

  return fallback || key;
}

function walletToast(key, fallback, type, values) {
  if (typeof showToast !== 'function') return;
  const message = values ? walletTextWithParams(key, values, fallback) : walletText(key, fallback);
  showToast(message, { type: type || 'info' });
}

function getNetworkNameByChainId(chainId) {
  if (!chainId) return 'Unknown';

  const normalized = String(chainId).toLowerCase();
  if (normalized === '0xaa36a7' || normalized === '11155111') return 'Sepolia';
  if (normalized === '0x1' || normalized === '1') return 'Ethereum Mainnet';
  if (normalized === '0x14a34' || normalized === '84532') return 'Base Sepolia';

  if (normalized.startsWith('0x')) {
    return 'Chain ' + parseInt(normalized, 16);
  }

  return 'Chain ' + normalized;
}

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

      if (!this.isCorrectNetwork) {
        this.isConnected = false;
        this.clearConnectionState();
        this.updateUI();
        this.showNetworkWarning();
        return;
      }

      if (this.account) {
        this.isConnected = true;
        this.saveConnectionState();
      }

      this.updateUI();
    });

    // Try to restore previous connection
    this.restoreConnection();
    return true;
  },

  detectMetaMask: function() {
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  },

  refreshChainState: function() {
    const self = this;

    if (!this.provider) {
      this.chainId = null;
      this.isCorrectNetwork = false;
      this.isConnected = false;
      return Promise.resolve(false);
    }

    return this.provider.request({ method: 'eth_chainId' })
      .then(function(chainId) {
        self.chainId = chainId;
        self.isCorrectNetwork = self.isSepoliaNetwork();

        if (!self.isCorrectNetwork) {
          self.isConnected = false;
          self.clearConnectionState();
        }

        self.updateUI();
        return self.isCorrectNetwork;
      })
      .catch(function(error) {
        console.error('[MetaMask] Failed to get chainId:', error);
        self.chainId = null;
        self.isCorrectNetwork = false;
        self.isConnected = false;
        self.clearConnectionState();
        self.updateUI();
        return false;
      });
  },

  connect: function() {
    if (!this.provider) {
      return Promise.resolve({
        success: false,
        error: walletText('metamaskNotDetected', 'MetaMask not detected. Please install MetaMask.'),
      });
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
          return self.switchToSepolia().then(function(switched) {
            if (!switched) {
              throw new Error(walletText('sepoliaRequired', 'Cannot continue unless you switch to Sepolia network.'));
            }
            return self.provider.request({
              method: 'eth_chainId',
            }).then(function(updatedChainId) {
              self.chainId = updatedChainId;
              self.isCorrectNetwork = self.isSepoliaNetwork();

              if (!self.isCorrectNetwork) {
                throw new Error(walletText('sepoliaRequired', 'Cannot continue unless you switch to Sepolia network.'));
              }

              return true;
            });
          });
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
        self.isConnected = false;
        self.clearConnectionState();
        self.updateUI();
        const normalizedError = error && error.message
          ? error.message
          : walletText('unknownError', 'Unknown error');
        return { success: false, error: normalizedError };
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

  getConnectionInfo: function() {
    return {
      account: this.account,
      shortAddress: this.getShortAddress(),
      chainId: this.chainId,
      networkName: getNetworkNameByChainId(this.chainId),
      isConnected: this.isConnected,
      isCorrectNetwork: this.isCorrectNetwork,
      requiredNetwork: 'Sepolia',
      requiredChainId: SEPOLIA_CHAIN_ID,
    };
  },

  saveConnectionState: function() {
    if (this.isConnected && this.account) {
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('walletAddress', this.account);
    }
  },

  clearConnectionState: function() {
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
  },

  restoreConnection: function() {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    const savedAddress = localStorage.getItem('walletAddress');

    if (!wasConnected || !savedAddress || !this.provider) {
      return;
    }

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
          self.isConnected = self.isCorrectNetwork;

          if (!self.isCorrectNetwork) {
            self.clearConnectionState();
          }

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
    
    if (this.isConnected && this.account && this.isCorrectNetwork) {
      walletBtn.classList.add('connected');
      walletBtn.setAttribute('data-connected', 'true');
      walletBtn.innerHTML =
        '<span class="wallet-address">' +
        this.getShortAddress() +
        '</span>';
    } else {
      walletBtn.classList.remove('connected');
      walletBtn.setAttribute('data-connected', 'false');
      walletBtn.innerHTML =
        '<span data-i18n="connectWalletText">' +
        walletText('connectWalletText', 'Connect Wallet') +
        '</span>';
    }
  },

  showNetworkWarning: function() {
    walletToast('switchToSepolia', 'Please switch to Sepolia network', 'warning');
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

    MetaMaskWallet.refreshChainState().then(function(onSepolia) {
      if (MetaMaskWallet.isConnected && MetaMaskWallet.account && onSepolia) {
        const menu = document.getElementById('wallet-menu');
        if (menu) {
          menu.classList.toggle('active');
        }
        return;
      }

      if (!onSepolia && MetaMaskWallet.account) {
        MetaMaskWallet.showNetworkWarning();
      }

      MetaMaskWallet.connect().then(function(result) {
        if (!result.success) {
          const errText = result.error || walletText('unknownError', 'Unknown error');
          if (typeof showToast === 'function') {
            showToast(
              walletText('connectionFailed', 'Connection failed') + ': ' + errText,
              { type: 'error' }
            );
          }
        } else {
          walletToast(
            'connectedMessage',
            'Wallet {address} connected',
            'success',
            { address: MetaMaskWallet.getShortAddress() }
          );
        }
      });
    });
  }

  // Handle disconnect
  const disconnectBtn = e.target.closest('#wallet-disconnect-btn');
  if (disconnectBtn) {
    e.preventDefault();
    MetaMaskWallet.disconnect();

    const menu = document.getElementById('wallet-menu');
    if (menu) menu.classList.remove('active');

    walletToast('disconnectedMessage', 'Wallet disconnected', 'info');
  }

  // Close menu when clicking outside
  if (!e.target.closest('.wallet-section')) {
    const menu = document.getElementById('wallet-menu');
    if (menu) menu.classList.remove('active');
  }
});
