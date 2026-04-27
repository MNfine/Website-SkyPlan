/**
 * Wallet UI Controller
 * Manages wallet button visibility and interaction
 * Requires user to be logged in before connecting wallet
 */

// Guard against multiple initializations
let walletUIInitialized = false;
let walletLinkInFlight = false;
let lastWalletLinkKey = null;

function walletT(key, fallback) {
  if (typeof window.getWalletTranslation === 'function') {
    return window.getWalletTranslation(key);
  }
  return fallback || key;
}

async function linkWalletToUser(account) {
  try {
    if (!account || typeof window.AuthState === 'undefined' || !window.AuthState.isAuthenticated()) return;
    const response = await window.AuthState.fetchWithAuth('/api/auth/wallet/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: account })
    });
    const data = await response.json();
    if (data.success && data.user) {
      console.log('Wallet linked to user successfully');
      const token = window.AuthState.getToken();
      const remember = !!localStorage.getItem('authToken');
      window.AuthState.setAuth(token, data.user, remember);
    } else {
      console.warn('Failed to link wallet:', data.message);
    }
  } catch (err) {
    console.error('Error linking wallet to user:', err);
  }
}

// Prompt user to install MetaMask if extension not found
function showInstallMetaMaskPrompt() {
  return new Promise((resolve) => {
    if (document.getElementById('metamask-install-modal')) {
      resolve(null);
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'metamask-install-modal';
    modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:3000;background:rgba(0,0,0,0.45);';

    const box = document.createElement('div');
    box.style.cssText = 'position:relative;background:#fff;border-radius:12px;padding:18px;max-width:480px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-align:center;';

    function closeModal() {
      const m = document.getElementById('metamask-install-modal');
      if (m && m.parentNode) m.parentNode.removeChild(m);
      try { document.removeEventListener('keydown', escHandler); } catch (e) {}
    }

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); resolve(null); } };

    const title = document.createElement('div');
    title.textContent = walletT('installMetaMaskPromptTitle', 'MetaMask not found');
    title.style.cssText = 'font-weight:700;margin-bottom:8px;font-size:16px;';

    const desc = document.createElement('div');
    desc.textContent = walletT('installMetaMaskPromptDesc', 'No MetaMask extension detected in your browser. Install MetaMask to connect using the extension?');
    desc.style.cssText = 'margin:0 0 14px;font-size:13px;color:#333;';

    const installLink = document.createElement('a');
    installLink.href = 'https://metamask.io';
    installLink.target = '_blank';
    installLink.textContent = walletT('installMetaMaskNow', 'Install MetaMask');
    installLink.style.cssText = 'display:inline-block;padding:10px 14px;border-radius:8px;background:linear-gradient(90deg,#1565C0,#42A5F5);border:none;color:#fff;text-decoration:none;font-weight:700;margin-right:8px;';
    installLink.addEventListener('click', () => { closeModal(); resolve('install'); });

    // Close (X) button instead of textual Cancel
    const installCloseBtn = document.createElement('button');
    installCloseBtn.type = 'button';
    installCloseBtn.setAttribute('aria-label', 'Close');
    installCloseBtn.innerHTML = '<span style="font-size:20px;line-height:1;">&times;</span>';
    installCloseBtn.title = walletT('close', 'Đóng');
    installCloseBtn.style.cssText = 'position:absolute;top:10px;right:12px;border:none;background:transparent;font-size:20px;cursor:pointer;color:#666;';
    installCloseBtn.addEventListener('click', () => { closeModal(); resolve(null); });

    modal.addEventListener('click', (e) => { if (e.target === modal) { closeModal(); resolve(null); } });
    document.addEventListener('keydown', escHandler);

    box.appendChild(installCloseBtn);
    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(installLink);
    modal.appendChild(box);
    document.body.appendChild(modal);
  });
}

function isUserLoggedIn() {
  // Check if auth token exists in localStorage or sessionStorage
  const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  return !!authToken;
}

function getAuthSnapshot() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const rawUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  let userId = null;

  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      userId = parsed && parsed.id ? String(parsed.id) : null;
    } catch (error) {
      userId = null;
    }
  }

  return { token, userId };
}

async function ensureWalletLinkedToCurrentUser() {
  if (!isUserLoggedIn()) return;
  let walletAddress = '';

  if (typeof MetaMaskWallet !== 'undefined' && MetaMaskWallet.account) {
    walletAddress = String(MetaMaskWallet.account).trim();
  }

  if (!walletAddress && window.ethereum && typeof window.ethereum.request === 'function') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (Array.isArray(accounts) && accounts[0]) {
        walletAddress = String(accounts[0]).trim();
      }
    } catch (error) {
      console.warn('[WalletUI] Unable to read eth_accounts for wallet linking:', error);
    }
  }

  if (!walletAddress) return;

  const { token, userId } = getAuthSnapshot();
  if (!token || !userId) return;

  const currentLinkKey = `${userId}:${walletAddress.toLowerCase()}`;
  if (walletLinkInFlight || lastWalletLinkKey === currentLinkKey) return;

  walletLinkInFlight = true;
  try {
    const response = await fetch('/api/auth/wallet/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });

    const data = await response.json().catch(() => null);
    if (response.ok && data && data.success) {
      lastWalletLinkKey = currentLinkKey;
      if (data.user) {
        const userJson = JSON.stringify(data.user);
        if (localStorage.getItem('authToken')) {
          localStorage.setItem('currentUser', userJson);
        } else {
          sessionStorage.setItem('currentUser', userJson);
        }
      }
      console.log('[WalletUI] Wallet linked to current user account.');
      return;
    }

    if (response.status === 409) {
      console.warn('[WalletUI] Wallet belongs to another account:', data && data.message ? data.message : 'Conflict');
      return;
    }

    if (response.status === 401) {
      console.warn('[WalletUI] Cannot link wallet: auth token is invalid/expired.');
      return;
    }

    console.warn('[WalletUI] Wallet link failed:', data && data.message ? data.message : response.statusText);
  } catch (error) {
    console.warn('[WalletUI] Wallet link request error:', error);
  } finally {
    walletLinkInFlight = false;
  }
}

// Simple mobile detection used to prefer WalletConnect on mobile
function isMobileDevice() {
  try {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent) || (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 800);
  } catch (e) {
    return false;
  }
}

// Dynamically load a script and return a promise
function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + url));
    document.head.appendChild(s);
  });
}

// Open a WalletConnect session on mobile and deep-link to a wallet app (MetaMask recommended)
async function openWalletConnectSession() {
  // Load WalletConnect client + QR modal (v1 client) dynamically
  try {
    await loadScript('https://unpkg.com/@walletconnect/client@1.6.6/dist/umd/index.min.js');
    await loadScript('https://unpkg.com/@walletconnect/qrcode-modal@1.6.6/dist/umd/index.min.js');
  } catch (err) {
    console.error('Failed to load WalletConnect libraries', err);
    alert(walletT('connectionFailed', 'Không thể tải thư viện WalletConnect. Vui lòng thử lại.'));
    return false;
  }

  const WC = (window.WalletConnect && (window.WalletConnect.default || window.WalletConnect)) || window.WalletConnect;
  const QR = (window.WalletConnectQRCodeModal && (window.WalletConnectQRCodeModal.default || window.WalletConnectQRCodeModal)) || window.WalletConnectQRCodeModal || window.QRCodeModal;

  if (!WC) {
    console.error('WalletConnect client not available');
    return false;
  }

  try {
    // Create connector without auto QR modal; we'll show QR only on desktop
    const connector = new (WC)({ bridge: 'https://bridge.walletconnect.org' });

    if (!connector.connected) {
      // createSession will populate connector.uri
      await connector.createSession();
    }

    const uri = connector.uri || connector._uri;
    if (!uri) {
      console.error('WalletConnect URI not found', connector);
      return false;
    }

    // Listen for connect event to capture account
    connector.on('connect', (error, payload) => {
      if (error) {
        console.error('WalletConnect connect error', error);
        return;
      }
      try {
        const { accounts } = payload.params[0] || {};
        const account = Array.isArray(accounts) && accounts[0] ? accounts[0] : null;
        // Populate a minimal MetaMaskWallet shim so existing UI updates continue to work
        window.MetaMaskWallet = window.MetaMaskWallet || {};
        window.MetaMaskWallet.isConnected = true;
        window.MetaMaskWallet.account = account;
        window.MetaMaskWallet.disconnect = async () => {
          try { await connector.killSession(); } catch (e) { console.warn(e); }
          window.MetaMaskWallet.isConnected = false;
          window.MetaMaskWallet.account = null;
          updateWalletUIState();
        };
        if (account) {
          linkWalletToUser(account);
        }
        updateWalletUIState();
      } catch (e) {
        console.error(e);
      }
    });

    connector.on('disconnect', (error, payload) => {
      if (error) console.error('WalletConnect disconnect', error);
      if (window.MetaMaskWallet) {
        window.MetaMaskWallet.isConnected = false;
        window.MetaMaskWallet.account = null;
      }
      updateWalletUIState();
    });

    // Prepare deep link and QR behavior
    const encoded = encodeURIComponent(uri);
    const metamaskLink = `https://metamask.app.link/wc?uri=${encoded}`;

    // On mobile: show a small modal with a tap-to-open button (ensures user gesture deep-link).
    if (isMobileDevice()) {
      if (!document.getElementById('wc-deeplink-modal')) {
        const modal = document.createElement('div');
        modal.id = 'wc-deeplink-modal';
        modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:3000;background:rgba(0,0,0,0.45);';

        const box = document.createElement('div');
        box.style.cssText = 'position:relative;background:#fff;border-radius:12px;padding:18px;max-width:420px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-align:center;';

        // Close helper
        function closeModal() {
          const m = document.getElementById('wc-deeplink-modal');
          if (m && m.parentNode) m.parentNode.removeChild(m);
          try { document.removeEventListener('keydown', escHandler); } catch (e) {}
        }

        const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.innerHTML = '<span style="font-size:20px;line-height:1;">&times;</span>';
        closeBtn.title = walletT('close', 'Đóng');
        closeBtn.style.cssText = 'position:absolute;top:10px;right:12px;border:none;background:transparent;font-size:20px;cursor:pointer;color:#666;';
        closeBtn.addEventListener('click', closeModal);

        const title = document.createElement('div');
        title.textContent = walletT('openWalletTitle', 'Mở ví để kết nối');
        title.style.cssText = 'font-weight:700;margin-bottom:8px;font-size:16px;';

        const note = document.createElement('div');
        note.textContent = walletT('openWalletNote', 'Chạm nút bên dưới để mở app ví và xác nhận kết nối');
        note.style.cssText = 'margin:0 0 12px;font-size:13px;color:#333;';

        const openLink = document.createElement('a');
        openLink.href = metamaskLink;
        openLink.textContent = walletT('openInMetaMask', 'Mở trong MetaMask');
        openLink.style.cssText = 'display:inline-block;padding:12px 16px;background:linear-gradient(90deg,#1565C0,#42A5F5);color:white;border-radius:8px;text-decoration:none;font-weight:700;';
        openLink.addEventListener('click', () => setTimeout(closeModal, 1000));

        const qrBtn = document.createElement('button');
        qrBtn.type = 'button';
        qrBtn.textContent = walletT('showQr', 'Hiện mã QR');
        qrBtn.style.cssText = 'display:block;margin:12px auto 0;padding:8px 10px;border:1px solid #ddd;border-radius:8px;background:#fff;';
        qrBtn.addEventListener('click', () => {
          if (QR && typeof QR.open === 'function') {
            QR.open(uri);
          } else {
            alert(walletT('connectionFailed', 'Không thể hiển thị mã QR.'));
          }
        });

        // Close when tapping outside the dialog
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        // Escape key
        document.addEventListener('keydown', escHandler);

        box.appendChild(closeBtn);
        box.appendChild(title);
        box.appendChild(note);
        box.appendChild(openLink);
        box.appendChild(qrBtn);
        modal.appendChild(box);
        document.body.appendChild(modal);
      }

      return connector;
    }

    // Desktop: show QR modal so user can scan with mobile wallet
    if (QR && typeof QR.open === 'function') {
      QR.open(uri);
    } else {
      console.warn('QR modal not available');
    }

    return connector;
  } catch (err) {
    console.error('Error starting WalletConnect session', err);
    return false;
  }
}

// Show a desktop modal to let the user choose extension vs mobile WalletConnect
function showDesktopConnectChoice() {
  return new Promise((resolve) => {
    if (document.getElementById('wallet-connect-choice-modal')) {
      resolve(null);
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'wallet-connect-choice-modal';
    modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:3000;background:rgba(0,0,0,0.45);';

    const box = document.createElement('div');
    box.style.cssText = 'position:relative;background:#fff;border-radius:12px;padding:18px;max-width:520px;width:94%;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-align:center;';

    function closeModal() {
      const m = document.getElementById('wallet-connect-choice-modal');
      if (m && m.parentNode) m.parentNode.removeChild(m);
      try { document.removeEventListener('keydown', escHandler); } catch (e) {}
    }

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); resolve(null); } };

    const title = document.createElement('div');
    title.textContent = walletT('connectChoiceTitle', 'How would you like to connect?');
    title.style.cssText = 'font-weight:700;margin-bottom:8px;font-size:16px;';

    const desc = document.createElement('div');
    desc.textContent = walletT('connectChoiceDescription', 'Choose MetaMask extension on desktop or use a mobile wallet app (WalletConnect).');
    desc.style.cssText = 'margin:0 0 14px;font-size:13px;color:#333;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;';

    const extBtn = document.createElement('button');
    extBtn.type = 'button';
    extBtn.textContent = walletT('connectChoiceUseExtension', 'Connect with MetaMask extension');
    extBtn.style.cssText = 'padding:10px 14px;border-radius:8px;background:#f6f6f6;border:1px solid #ddd;cursor:pointer;font-weight:700;';

    const mobileBtn = document.createElement('button');
    mobileBtn.type = 'button';
    mobileBtn.textContent = walletT('connectChoiceUseMobileApp', 'Connect with mobile wallet app');
    mobileBtn.style.cssText = 'padding:10px 14px;border-radius:8px;background:linear-gradient(90deg,#1565C0,#42A5F5);border:none;color:#fff;cursor:pointer;font-weight:700;';

    // Close (X) button instead of textual Cancel
    const choiceCloseBtn = document.createElement('button');
    choiceCloseBtn.type = 'button';
    choiceCloseBtn.setAttribute('aria-label', 'Close');
    choiceCloseBtn.innerHTML = '<span style="font-size:20px;line-height:1;">&times;</span>';
    choiceCloseBtn.title = walletT('close', 'Đóng');
    choiceCloseBtn.style.cssText = 'position:absolute;top:10px;right:12px;border:none;background:transparent;font-size:20px;cursor:pointer;color:#666;';
    choiceCloseBtn.addEventListener('click', () => { closeModal(); resolve(null); });

    extBtn.addEventListener('click', () => { closeModal(); resolve('extension'); });
    mobileBtn.addEventListener('click', () => { closeModal(); resolve('mobile'); });

    modal.addEventListener('click', (e) => { if (e.target === modal) { closeModal(); resolve(null); } });
    document.addEventListener('keydown', escHandler);

    box.appendChild(choiceCloseBtn);
    box.appendChild(title);
    box.appendChild(desc);
    btnRow.appendChild(extBtn);
    btnRow.appendChild(mobileBtn);
    box.appendChild(btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);
  });
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
      // Ensure any leftover native tooltip/title is removed to prevent browser tooltip
      try { connectBtn.removeAttribute('title'); } catch (e) { /* ignore */ }
      // Also remove common tooltip attrs and observe for re-adds (third-party scripts)
      try {
        ['data-original-title', 'data-bs-original-title', 'data-tooltip'].forEach(a => { try { connectBtn.removeAttribute(a); } catch (e) {} });
        const titleObserver = new MutationObserver((mutations) => {
          mutations.forEach((m) => {
            if (m.type === 'attributes') {
              const name = m.attributeName;
              if (name === 'title' || name === 'data-original-title' || name === 'data-bs-original-title' || name === 'data-tooltip') {
                try { m.target.removeAttribute(name); } catch (e) {}
              }
            }
          });
        });
        titleObserver.observe(connectBtn, { attributes: true, attributeFilter: ['title', 'data-original-title', 'data-bs-original-title', 'data-tooltip'] });
        connectBtn.__titleObserver = titleObserver;
      } catch (e) {
        // ignore if MutationObserver not available
      }
      clearInterval(checkHeader);
      walletUIInitialized = true;

      // Check login status
      const isLoggedIn = isUserLoggedIn();
      
      if (!isLoggedIn) {
        // Not logged in - disable wallet connection
        connectBtn.disabled = true;
        connectBtn.setAttribute('aria-label', walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet'));
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

      // Check if MetaMask is available. If on mobile without MetaMask, allow WalletConnect flow.
      const isMobile = isMobileDevice();
      const hasMetaMask = typeof window.ethereum !== 'undefined';

      if (!hasMetaMask && !isMobile) {
        // MetaMask not installed on desktop - allow user to explicitly choose connection
        connectBtn.disabled = false;
        connectBtn.style.opacity = '';
        connectBtn.style.cursor = 'pointer';
        connectBtn.setAttribute('aria-label', walletT('metamaskNotDetected', 'MetaMask extension not detected. Choose connection method.'));

        // Show tooltip on hover (with guard) - ensure the button is a positioned anchor
        if (!connectBtn.dataset.walletTooltipBound) {
          try {
            const pos = getComputedStyle(connectBtn).position;
            if (!pos || pos === 'static') {
              connectBtn.style.position = 'relative';
            }
          } catch (e) {
            // best-effort: set relative if computed style fails
            connectBtn.style.position = 'relative';
          }

          // Prevent other tooltip libraries from showing their tooltips when hovering this button
          try {
            connectBtn.addEventListener('mouseover', (e) => { try { e.stopImmediatePropagation(); } catch (err) { e.stopPropagation(); } }, true);
            connectBtn.addEventListener('focus', (e) => { try { e.stopImmediatePropagation(); } catch (err) { e.stopPropagation(); } }, true);
          } catch (e) {}

          connectBtn.addEventListener('mouseenter', () => {
            // remove any previously added wallet-tooltip instances
            try { connectBtn.querySelectorAll('.wallet-tooltip').forEach(n => n.remove()); } catch (e) {}

            const tooltip = document.createElement('div');
            tooltip.className = 'wallet-tooltip';
            tooltip.textContent = walletT('installMetaMaskToConnect', 'Install MetaMask to connect wallet');
            // Position tooltip below the button
            tooltip.style.cssText = 'position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; white-space: nowrap; z-index: 1002; pointer-events: none;';
            connectBtn.appendChild(tooltip);
            // Remove tooltip on mouseleave immediately
            const leaveHandler = () => { try { tooltip.remove(); } catch (e) {} };
            connectBtn.addEventListener('mouseleave', leaveHandler, { once: true });
            // Fallback removal after 3s
            setTimeout(() => { try { tooltip.remove(); } catch (e) {} }, 3000);
          });
          connectBtn.dataset.walletTooltipBound = '1';
        }
        // Continue initialization so user can pick extension or mobile explicitly
      }

      // If on mobile and MetaMask is not present, allow WalletConnect (deep-link) flow
      if (!hasMetaMask && isMobile) {
        connectBtn.disabled = false;
        connectBtn.style.opacity = '';
        connectBtn.style.cursor = 'pointer';
        connectBtn.setAttribute('aria-label', walletT('connectWalletViaWalletConnect', 'Connect Wallet (WalletConnect)'));
      }

      // User logged in + MetaMask available - enable wallet connection
      connectBtn.disabled = false;
      connectBtn.style.opacity = '';
      connectBtn.style.cursor = 'pointer';
      connectBtn.setAttribute('aria-label', walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet'));

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
            if (!connectBtn.dataset.connecting) {
              connectBtn.dataset.connecting = '1';
              try {
                console.log('Wallet connect requested — isMobile:', isMobile, 'hasMetaMask:', hasMetaMask, 'MetaMaskWallet:', typeof MetaMaskWallet !== 'undefined');

                // On desktop, let the user choose extension vs mobile app
                if (!isMobile) {
                  let userChoice = null;
                  try {
                    userChoice = await showDesktopConnectChoice();
                  } catch (err) {
                    console.warn('showDesktopConnectChoice error', err);
                  }
                  if (!userChoice) {
                    // user cancelled; stop connecting
                    return;
                  }
                  if (userChoice === 'mobile') {
                    // user chose mobile flow -> open WalletConnect session (desktop will show QR)
                    await openWalletConnectSession();
                    updateWalletUIState();
                    return;
                  }
                  // userChoice === 'extension' -> ensure extension is installed now
                  const nowHasMetaMask = typeof window.ethereum !== 'undefined';
                  if (!nowHasMetaMask) {
                    try {
                      const installChoice = await showInstallMetaMaskPrompt();
                      if (installChoice === 'install') {
                        window.open('https://metamask.io', '_blank');
                      }
                    } catch (e) {
                      console.warn('showInstallMetaMaskPrompt error', e);
                    }
                    return;
                  }
                  // else fall through to extension connect logic
                }

                // Prefer MetaMask extension/provider if present
                const nowHasMetaMask = typeof window.ethereum !== 'undefined';
                if (nowHasMetaMask) {
                  // Try MetaMask wrapper first (project-specific)
                  if (typeof MetaMaskWallet !== 'undefined' && typeof MetaMaskWallet.connect === 'function') {
                    try {
                      const success = await MetaMaskWallet.connect();
                      if (success && MetaMaskWallet.account) {
                        await linkWalletToUser(MetaMaskWallet.account);
                      }
                      updateWalletUIState();
                      return;
                    } catch (err) {
                      console.warn('MetaMaskWallet.connect() failed, will try provider:', err);
                    }
                  }

                  // If wrapper not available, try direct provider request
                  if (window.ethereum && typeof window.ethereum.request === 'function') {
                    try {
                      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                      if (accounts && accounts[0]) {
                        window.MetaMaskWallet = window.MetaMaskWallet || {};
                        window.MetaMaskWallet.isConnected = true;
                        window.MetaMaskWallet.account = accounts[0];
                        await linkWalletToUser(accounts[0]);
                        window.MetaMaskWallet.disconnect = async () => {
                          // No standard programmatic disconnect for extension; just update UI
                          window.MetaMaskWallet.isConnected = false;
                          window.MetaMaskWallet.account = null;
                          updateWalletUIState();
                        };
                        updateWalletUIState();
                        return;
                      }
                    } catch (err) {
                      console.warn('window.ethereum.request(eth_requestAccounts) failed:', err);
                      // fall through to WalletConnect fallback
                    }
                  }
                }

                // If we reach here, either no MetaMask/provider or provider call failed — fallback to WalletConnect
                console.log('Falling back to WalletConnect flow');
                await openWalletConnectSession();
                updateWalletUIState();
              } catch (err) {
                console.error('Wallet connect failed', err);
              } finally {
                delete connectBtn.dataset.connecting;
              }
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
      spanEl.setAttribute('data-i18n', 'walletConnected');
      spanEl.textContent = walletT('walletConnected', 'Ví đã kết nối');
    }
    // Show address if available
    if (walletAddress && MetaMaskWallet.account) {
      walletAddress.textContent = MetaMaskWallet.account;
    }

    ensureWalletLinkedToCurrentUser();
  } else {
    // Show as disconnected
    connectBtn.classList.remove('connected');
    const spanEl = connectBtn.querySelector('span');
    if (spanEl) {
      spanEl.setAttribute('data-i18n', 'connectWalletText');
      spanEl.textContent = walletT('connectWalletText', 'Connect Wallet');
    }
    if (walletMenu) {
      walletMenu.classList.remove('show');
    }

    lastWalletLinkKey = null;
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
    connectBtn.setAttribute('aria-label', walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet'));
  }
});

window.addEventListener('auth-logout', () => {
  // Disable wallet button on logout
  const connectBtn = document.getElementById('wallet-connect-btn');
  const walletMenu = document.getElementById('wallet-menu');
  
  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.setAttribute('aria-label', walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet'));
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
  // Update button aria-label (avoid native tooltip)
  if (isUserLoggedIn()) {
    connectBtn.setAttribute('aria-label', walletT('connectMetaMaskWalletTitle', 'Connect MetaMask wallet'));
  } else {
    connectBtn.setAttribute('aria-label', walletT('loginRequiredToConnectWallet', 'Sign in first to connect wallet'));
  }
  // Update button text
  updateWalletUIState();
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
