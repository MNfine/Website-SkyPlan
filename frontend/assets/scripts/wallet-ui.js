/**
 * Wallet UI Controller
 * Manages wallet button visibility and interaction
 * Requires user to be logged in before connecting wallet
 */

// Guard against multiple initializations
let walletUIInitialized = false;

function walletT(key, fallback) {
  if (typeof window.getWalletTranslation === 'function') {
    return window.getWalletTranslation(key);
  }
  return fallback || key;
}

function isUserLoggedIn() {
  // Check if auth token exists in localStorage or sessionStorage
  const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  return !!authToken;
}

function initWalletUI() {
  // Prevent multiple initializations
  if (walletUIInitialized) {
    console.log('Wallet UI already initialized, skipping...');
    return;
  }
  
  // Wait for header to load
  const checkHeader = setInterval(() => {
    const connectBtn = document.getElementById('wallet-connect-btn');
    const walletMenu = document.getElementById('wallet-menu');
    const disconnectBtn = document.getElementById('wallet-disconnect-btn');

    if (connectBtn && walletMenu) {
      clearInterval(checkHeader);
      walletUIInitialized = true;

      // Check login status
      const isLoggedIn = isUserLoggedIn();
      
      if (!isLoggedIn) {
        // Not logged in - disable wallet connection
        connectBtn.disabled = true;
        connectBtn.title = walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet');
        connectBtn.style.opacity = '0.5';
        connectBtn.style.cursor = 'not-allowed';
        
        // Redirect to login if clicked (with guard to prevent duplicate listeners)
        if (!connectBtn.dataset.walletLoginBound) {
          connectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'login.html';
          });
          connectBtn.dataset.walletLoginBound = '1';
        }
        return;
      }

      // Check if MetaMask is available
      const hasMetaMask = typeof window.ethereum !== 'undefined';
      
      if (!hasMetaMask) {
        // MetaMask not installed - show message and disable button
        connectBtn.disabled = true;
        connectBtn.title = 'MetaMask extension not detected. Please install it from https://metamask.io';
        connectBtn.style.opacity = '0.5';
        connectBtn.style.cursor = 'not-allowed';
        
        // Show tooltip on hover (with guard)
        if (!connectBtn.dataset.walletTooltipBound) {
          connectBtn.addEventListener('mouseenter', () => {
            const tooltip = document.createElement('div');
            tooltip.className = 'wallet-tooltip';
            tooltip.textContent = walletT('installMetaMaskToConnect', 'Install MetaMask to connect wallet');
            tooltip.style.cssText = 'position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; white-space: nowrap; margin-bottom: 8px; z-index: 1002;';
            connectBtn.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 3000);
          });
          connectBtn.dataset.walletTooltipBound = '1';
        }
        return;
      }

      // User logged in + MetaMask available - enable wallet connection
      connectBtn.disabled = false;
      connectBtn.style.opacity = '';
      connectBtn.style.cursor = 'pointer';
      connectBtn.title = walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet');

      // Initially hide wallet menu
      if (walletMenu) {
        walletMenu.classList.remove('show');
      }

      // Wallet connect button - toggle menu on click (with guard to prevent duplicate listeners)
      if (!connectBtn.dataset.walletConnectBound) {
        connectBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const isConnected = connectBtn.getAttribute('data-connected') === 'true';

          if (isConnected) {
            // If connected, toggle menu visibility
            if (walletMenu) {
              walletMenu.classList.toggle('show');
            }
          } else {
            if (typeof window.showBlockchainIntegrationPopup === 'function') {
              const choice = await window.showBlockchainIntegrationPopup();
              if (choice === 'guide') {
                window.location.href = 'support.html#blockchain-ticket-guide';
                return;
              }
              if (choice !== 'integrate') return;
            }

            // If not connected, try to connect wallet (prevent multiple rapid clicks)
            if (!connectBtn.dataset.connecting && typeof MetaMaskWallet !== 'undefined' && MetaMaskWallet.connect) {
              connectBtn.dataset.connecting = '1';
              MetaMaskWallet.connect().then(() => {
                updateWalletUIState();
              }).finally(() => {
                delete connectBtn.dataset.connecting;
              });
            }
          }
        });
        connectBtn.dataset.walletConnectBound = '1';
      }

      // Disconnect button (with guard)
      if (disconnectBtn && !disconnectBtn.dataset.walletDisconnectBound) {
        disconnectBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof MetaMaskWallet !== 'undefined' && MetaMaskWallet.disconnect) {
            MetaMaskWallet.disconnect();
          }
          if (walletMenu) {
            walletMenu.classList.remove('show');
          }
        });
        disconnectBtn.dataset.walletDisconnectBound = '1';
      }

      // Close menu when clicking outside (with guard for document listener)
      if (!document.body.dataset.walletMenuOutsideClickBound) {
        document.addEventListener('click', (e) => {
          if (walletMenu && !e.target.closest('.wallet-section')) {
            walletMenu.classList.remove('show');
          }
        });
        document.body.dataset.walletMenuOutsideClickBound = '1';
      }

      // Update wallet UI based on connection status
      updateWalletUIState();

      // Keep button state synced when MetaMask state changes asynchronously.
      if (window.ethereum && !window.ethereum.__skyplanWalletUiBound) {
        window.ethereum.on('accountsChanged', () => {
          setTimeout(updateWalletUIState, 0);
        });
        window.ethereum.on('chainChanged', () => {
          setTimeout(updateWalletUIState, 0);
        });
        window.ethereum.__skyplanWalletUiBound = '1';
      }

      // Restore path in metamask.js is async; this refresh catches that update.
      setTimeout(updateWalletUIState, 600);
    }
  }, 250);
}

function updateWalletUIState() {
  const connectBtn = document.getElementById('wallet-connect-btn');
  const walletMenu = document.getElementById('wallet-menu');
  const walletAddress = document.getElementById('wallet-address');

  if (!connectBtn) return;

  // Check if wallet is connected using MetaMask state
  const isConnected =
    typeof MetaMaskWallet !== 'undefined' &&
    MetaMaskWallet.isConnected === true;

  connectBtn.setAttribute('data-connected', isConnected ? 'true' : 'false');

  if (isConnected) {
    // Show as connected
    connectBtn.classList.add('connected');
    const spanEl = connectBtn.querySelector('span');
    if (spanEl) {
      spanEl.setAttribute('data-i18n', 'connectedText');
      spanEl.textContent = 'Ví đã kết nối';
    }
    
    // Show address if available
    if (walletAddress && MetaMaskWallet.account) {
      walletAddress.textContent = MetaMaskWallet.account;
    }
  } else {
    // Show as disconnected
    connectBtn.classList.remove('connected');
    const spanEl = connectBtn.querySelector('span');
    if (spanEl) {
      spanEl.setAttribute('data-i18n', 'connectWalletText');
      spanEl.textContent = 'Connect Wallet';
    }
    if (walletMenu) {
      walletMenu.classList.remove('show');
    }
  }
}

// Listen for login/logout events
window.addEventListener('auth-login', () => {
  // Re-enable wallet button after login
  const connectBtn = document.getElementById('wallet-connect-btn');
  if (connectBtn) {
    connectBtn.disabled = false;
    connectBtn.style.opacity = '';
    connectBtn.style.cursor = 'pointer';
    connectBtn.title = walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet');
  }
});

window.addEventListener('auth-logout', () => {
  // Disable wallet button on logout
  const connectBtn = document.getElementById('wallet-connect-btn');
  const walletMenu = document.getElementById('wallet-menu');
  
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.title = walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet');
    connectBtn.style.opacity = '0.5';
    connectBtn.style.cursor = 'not-allowed';
    connectBtn.setAttribute('data-connected', 'false');
    
    // Disconnect wallet
    if (typeof MetaMaskWallet !== 'undefined' && MetaMaskWallet.disconnect) {
      MetaMaskWallet.disconnect().catch(console.error);
    }
  }

  if (walletMenu) {
    walletMenu.classList.remove('show');
  }
});

document.addEventListener('languageChanged', () => {
  const connectBtn = document.getElementById('wallet-connect-btn');
  if (!connectBtn) return;

  if (isUserLoggedIn()) {
    connectBtn.title = walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet');
  } else {
    connectBtn.title = walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet');
  }
});

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  function headerAlreadyPresent() {
    const headerContainer = document.getElementById('header-container') || document.getElementById('header-placeholder');
    if (!headerContainer) return false;
    // If something has already injected header markup, don't trigger another injection.
    return headerContainer.children && headerContainer.children.length > 0;
  }

  // Initialize MetaMask first
  if (typeof MetaMaskWallet !== 'undefined' && typeof MetaMaskWallet.init === 'function') {
    MetaMaskWallet.init();
  }

  // Try to init wallet UI immediately
  initWalletUI();

  // Re-init after header loads via loadHeaderFooter or loadCommonComponents
  if (!headerAlreadyPresent() && typeof loadCommonComponents === 'function') {
    loadCommonComponents().then(() => {
      setTimeout(initWalletUI, 100);
    }).catch(() => {
      // Fallback if loadCommonComponents fails
      setTimeout(initWalletUI, 500);
    });
  } else if (!headerAlreadyPresent() && typeof loadHeaderFooter === 'function') {
    loadHeaderFooter().then(() => {
      setTimeout(initWalletUI, 100);
    }).catch(() => {
      // Fallback if loadHeaderFooter fails
      setTimeout(initWalletUI, 500);
    });
  } else {
    // Fallback: retry init after delay if no loader function exists
    setTimeout(initWalletUI, 500);
  }

  // Also listen for header-loaded custom event (if any)
  document.addEventListener('header-loaded', () => {
    setTimeout(initWalletUI, 100);
  });
});

// Export for external use
window.updateWalletUIState = updateWalletUIState;
