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
    console.log('[DEBUG] init: MetaMask detected');

    // Listen for account changes
    this.provider.on('accountsChanged', (accounts) => {
      console.log('[DEBUG] accountsChanged event: accounts =', accounts);
      if (accounts.length === 0) {
        console.log('[DEBUG] accountsChanged: No accounts, disconnecting');
        this.disconnect();
      } else {
        console.log('[DEBUG] accountsChanged: Setting account to', accounts[0]);
        this.account = accounts[0];
        this.updateUI();
      }
    });

    // Listen for network changes
    this.provider.on('chainChanged', (chainId) => {
      console.log('[DEBUG] chainChanged event: chainId =', chainId);
      this.chainId = chainId;
      this.isCorrectNetwork = this.isSepoliaNetwork();
      console.log('[DEBUG] chainChanged: isCorrectNetwork =', this.isCorrectNetwork);

      if (!this.isCorrectNetwork) {
        console.log('[DEBUG] chainChanged: Not on Sepolia, disconnecting');
        this.isConnected = false;
        this.clearConnectionState();
        this.updateUI();
        this.showNetworkWarning();
        return;
      }

      if (this.account) {
        console.log('[DEBUG] chainChanged: On Sepolia with account, marking as connected');
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
    console.log('[DEBUG] refreshChainState: Requesting current chainId from provider');

    if (!this.provider) {
      console.log('[DEBUG] refreshChainState: No provider, setting to disconnected');
      this.chainId = null;
      this.isCorrectNetwork = false;
      this.isConnected = false;
      return Promise.resolve(false);
    }

    return this.provider.request({ method: 'eth_chainId' })
      .then(function(chainId) {
        console.log('[DEBUG] refreshChainState: Got chainId from provider:', chainId);
        self.chainId = chainId;
        self.isCorrectNetwork = self.isSepoliaNetwork();
        console.log('[DEBUG] refreshChainState: isCorrectNetwork =', self.isCorrectNetwork);

        if (!self.isCorrectNetwork) {
          console.log('[DEBUG] refreshChainState: Not on Sepolia, disconnecting');
          self.isConnected = false;
          self.clearConnectionState();
        }

        self.updateUI();
        return self.isCorrectNetwork;
      })
      .catch(function(error) {
        console.error('[DEBUG] refreshChainState: Failed to get chainId', error);
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
    console.log('[DEBUG] connect: Starting connection process');
    
    return this.provider
      .request({
        method: 'eth_requestAccounts',
      })
      .then(function(accounts) {
        console.log('[DEBUG] connect: Got accounts:', accounts);
        if (accounts && accounts.length > 0) {
          self.account = accounts[0];
          console.log('[DEBUG] connect: Account set to', self.account);

          return self.provider.request({
            method: 'eth_chainId',
          });
        }
        throw new Error('No accounts returned');
      })
      .then(function(chainId) {
        console.log('[DEBUG] connect: Current chainId from provider:', chainId);
        self.chainId = chainId;
        self.isCorrectNetwork = self.isSepoliaNetwork();
        console.log('[DEBUG] connect: isCorrectNetwork =', self.isCorrectNetwork);

        if (!self.isCorrectNetwork) {
          console.log('[DEBUG] connect: Not on Sepolia, attempting switch...');
          return self.switchToSepolia().then(function(switched) {
            if (!switched) {
              console.log('[DEBUG] connect: Switch to Sepolia failed');
              throw new Error(walletText('sepoliaRequired', 'Cannot continue unless you switch to Sepolia network.'));
            }

            console.log('[DEBUG] connect: Switch succeeded, verifying chainId...');
            return self.provider.request({
              method: 'eth_chainId',
            }).then(function(updatedChainId) {
              console.log('[DEBUG] connect: Verified chainId after switch:', updatedChainId);
              self.chainId = updatedChainId;
              self.isCorrectNetwork = self.isSepoliaNetwork();
              console.log('[DEBUG] connect: isCorrectNetwork after verification =', self.isCorrectNetwork);

              if (!self.isCorrectNetwork) {
                console.log('[DEBUG] connect: Still not on Sepolia after switch!');
                throw new Error(walletText('sepoliaRequired', 'Cannot continue unless you switch to Sepolia network.'));
              }

              return true;
            });
          });
        }
        return true;
      })
      .then(function() {
        console.log('[DEBUG] connect: All checks passed, setting isConnected = true');
        self.isConnected = true;
        self.saveConnectionState();
        self.updateUI();
        console.log('[DEBUG] connect: SUCCESS - Connection complete', self.getConnectionInfo());
        return { success: true, account: self.account };
      })
      .catch(function(error) {
        console.error('[DEBUG] connect: FAILED -', error);
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
    console.log('[DEBUG] switchToSepolia: Requesting network switch to Sepolia...');
    
    return this.provider
      .request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })
      .then(function() {
        console.log('[DEBUG] switchToSepolia: Switch request succeeded');
        // ❌ KHÔNG lưu state ở đây! Để chainChanged event xử lý
        return true;
      })
      .catch(function(switchError) {
        console.error('[DEBUG] switchToSepolia: Switch failed with code:', switchError.code, switchError.message);
        if (switchError.code === 4902) {
          console.log('[DEBUG] switchToSepolia: Network not found, attempting to add Sepolia...');
          return self.addSepoliaNetwork();
        }
        console.error('[MetaMask] Switch failed:', switchError);
        return false;
      });
  },

  addSepoliaNetwork: function() {
    const self = this;
    console.log('[DEBUG] addSepoliaNetwork: Adding Sepolia to MetaMask...');
    
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
        console.log('[DEBUG] addSepoliaNetwork: Sepolia added successfully');
        // ❌ KHÔNG lưu state ở đây! Để chainChanged event xử lý
        return true;
      })
      .catch(function(error) {
        console.error('[DEBUG] addSepoliaNetwork: Failed to add Sepolia', error);
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
    console.log('[DEBUG] restoreConnection: wasConnected =', wasConnected, ', savedAddress =', savedAddress);

    if (!wasConnected || !savedAddress || !this.provider) {
      console.log('[DEBUG] restoreConnection: Restore conditions not met, skipping');
      return;
    }

    const self = this;
    this.provider
      .request({
        method: 'eth_accounts',
      })
      .then(function(accounts) {
        console.log('[DEBUG] restoreConnection: Current accounts from provider:', accounts);
        if (
          accounts &&
          accounts.length > 0 &&
          accounts[0].toLowerCase() === savedAddress.toLowerCase()
        ) {
          console.log('[DEBUG] restoreConnection: Account matches saved address');
          self.account = accounts[0];

          return self.provider.request({
            method: 'eth_chainId',
          });
        }
        console.log('[DEBUG] restoreConnection: Account mismatch or no accounts');
        return null;
      })
      .then(function(chainId) {
        if (chainId) {
          console.log('[DEBUG] restoreConnection: Got chainId:', chainId);
          self.chainId = chainId;
          self.isCorrectNetwork = self.isSepoliaNetwork();
          console.log('[DEBUG] restoreConnection: isCorrectNetwork =', self.isCorrectNetwork);
          self.isConnected = self.isCorrectNetwork;
          console.log('[DEBUG] restoreConnection: Setting isConnected =', self.isConnected);

          if (!self.isCorrectNetwork) {
            console.log('[DEBUG] restoreConnection: Not on Sepolia, clearing state');
            self.clearConnectionState();
          }

          self.updateUI();
        }
      })
      .catch(function(error) {
        console.warn('[DEBUG] restoreConnection: Restore failed:', error);
      });
  },

  updateUI: function() {
    const walletBtn = document.getElementById('wallet-connect-btn');
    if (!walletBtn) return;

    console.log('[DEBUG] updateUI: isConnected =', this.isConnected, ', account =', this.account, ', isCorrectNetwork =', this.isCorrectNetwork);
    
    if (this.isConnected && this.account && this.isCorrectNetwork) {
      console.log('[DEBUG] updateUI: Showing CONNECTED state');
      walletBtn.classList.add('connected');
      walletBtn.setAttribute('data-connected', 'true');
      walletBtn.innerHTML =
        '<i class="fas fa-wallet"></i><span class="wallet-address">' +
        this.getShortAddress() +
        '</span>';
    } else {
      console.log('[DEBUG] updateUI: Showing DISCONNECTED state');
      walletBtn.classList.remove('connected');
      walletBtn.setAttribute('data-connected', 'false');
      walletBtn.innerHTML =
        '<i class="fas fa-wallet"></i><span data-i18n="connectWalletText">' +
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
    console.log('[DEBUG] DOMContentLoaded: Initializing MetaMask wallet');
    MetaMaskWallet.init();
    
    // Expose debug function globally
    window.walletDebug = function() {
      const info = MetaMaskWallet.getConnectionInfo();
      console.log('=== WALLET DEBUG INFO ===');
      console.log('Account:', info.account);
      console.log('Short Address:', info.shortAddress);
      console.log('ChainId:', info.chainId);
      console.log('Network Name:', info.networkName);
      console.log('IS CONNECTED:', info.isConnected);
      console.log('IS CORRECT NETWORK (Sepolia):', info.isCorrectNetwork);
      console.log('Required Network:', info.requiredNetwork);
      console.log('localStorage.walletConnected:', localStorage.getItem('walletConnected'));
      console.log('localStorage.walletAddress:', localStorage.getItem('walletAddress'));
      console.table(info);
      return info;
    };
    console.log('[DEBUG] Debug function available: walletDebug()');
  }, 100);
});

/**
 * Handle wallet button clicks
 */
document.addEventListener('click', function(e) {
  const walletBtn = e.target.closest('#wallet-connect-btn');
  if (walletBtn) {
    e.preventDefault();
    console.log('[DEBUG] Wallet button clicked');

    MetaMaskWallet.refreshChainState().then(function(onSepolia) {
      console.log('[DEBUG] After refreshChainState: onSepolia =', onSepolia);
      console.log('[DEBUG] Current state: isConnected =', MetaMaskWallet.isConnected, ', account =', MetaMaskWallet.account, ', isCorrectNetwork =', MetaMaskWallet.isCorrectNetwork);
      
      if (MetaMaskWallet.isConnected && MetaMaskWallet.account && onSepolia) {
        console.log('[DEBUG] Already connected on Sepolia, opening menu');
        const menu = document.getElementById('wallet-menu');
        if (menu) {
          menu.classList.toggle('active');
        }
        return;
      }

      if (!onSepolia && MetaMaskWallet.account) {
        console.log('[DEBUG] Has account but not on Sepolia, showing warning');
        MetaMaskWallet.showNetworkWarning();
      }

      console.log('[DEBUG] Calling connect()');
      MetaMaskWallet.connect().then(function(result) {
        console.log('[DEBUG] Connect result:', result);
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
    console.log('[DEBUG] Disconnect button clicked');
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
