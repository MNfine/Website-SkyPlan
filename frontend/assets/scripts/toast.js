// Toast notifications for SkyPlan
// Usage: showToast(message, {type: 'info'|'success'|'error', duration: 5000, dismissible: true})
(function () {
  const CONTAINER_ID = 'skyplan-toast-container';
  const DEFAULT_DURATION = 5000;

  // Inject styles once
  function injectStyles() {
    if (document.getElementById('skyplan-toast-styles')) return;
    const css = `
      #${CONTAINER_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      .skyplan-toast {
        min-width: 260px;
        max-width: 380px;
        background: #fff;
        color: #111;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(120%);
        opacity: 0;
        transition: transform 320ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease-in;
        pointer-events: auto;
        font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
        border-left: 4px solid transparent;
      }
      .skyplan-toast.show {
        transform: translateX(0);
        opacity: 1;
      }
      .skyplan-toast .toast-icon {
        width: 36px; height: 36px; flex: 0 0 36px; display:flex; align-items:center; justify-content:center;
        border-radius: 6px;
        font-size: 18px;
      }
      .skyplan-toast .toast-body { flex: 1; font-size: 14px; line-height: 1.25; }
      .skyplan-toast .toast-close { margin-left: 8px; background: transparent; border: none; cursor: pointer; padding: 6px; border-radius: 6px; }
      .skyplan-toast.type-info { border-left-color: #2196f3; }
      .skyplan-toast.type-success { border-left-color: #2e7d32; }
      .skyplan-toast.type-error { border-left-color: #d32f2f; }
      .skyplan-toast.type-info .toast-icon { background: rgba(33,150,243,0.12); color: #1976d2; }
      .skyplan-toast.type-success .toast-icon { background: rgba(46,125,50,0.08); color: #2e7d32; }
      .skyplan-toast.type-error .toast-icon { background: rgba(211,47,47,0.08); color: #d32f2f; }
    `;
    const style = document.createElement('style');
    style.id = 'skyplan-toast-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function getContainer() {
    let c = document.getElementById(CONTAINER_ID);
    if (!c) {
      c = document.createElement('div');
      c.id = CONTAINER_ID;
      document.body.appendChild(c);
    }
    return c;
  }

  function createToastElement(message, options) {
    const { type = 'info', dismissible = true } = options || {};
    const el = document.createElement('div');
    el.className = `skyplan-toast type-${type}`;

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (type === 'success') icon.innerHTML = '✔';
    else if (type === 'error') icon.innerHTML = '✖';
    else icon.innerHTML = 'ℹ';

    const body = document.createElement('div');
    body.className = 'toast-body';
    body.innerHTML = message;

    el.appendChild(icon);
    el.appendChild(body);

    if (dismissible) {
      const close = document.createElement('button');
      close.className = 'toast-close';
      close.innerHTML = '&#10005;';
      close.setAttribute('aria-label', 'Close');
      close.addEventListener('click', () => removeToast(el));
      el.appendChild(close);
    }

    return el;
  }

  function removeToast(el) {
    if (!el) return;
    el.classList.remove('show');
    // wait for transition
    setTimeout(() => {
      el.remove();
    }, 350);
  }

  function showToast(message, options) {
    injectStyles();
    const container = getContainer();
    const opts = Object.assign({ type: 'info', duration: DEFAULT_DURATION, dismissible: true }, options || {});
    const toast = createToastElement(message, opts);
    container.appendChild(toast);
    // force reflow then show
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    if (opts.duration && opts.duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast);
        clearTimeout(timer);
      }, opts.duration);
    }

    return toast;
  }

  // expose globally
  window.showToast = showToast;
  window.SkyPlanToasts = { showToast };
  // small convenience wrapper for safe notifications
  window.notify = function(message, type = 'info', duration = DEFAULT_DURATION, dismissible = true) {
    try {
      // prefer showToast
      if (typeof showToast === 'function') {
        return showToast(message, { type: type, duration: duration, dismissible: dismissible });
      }
    } catch (e) {
      // fall through to alert
    }
    alert(message);
  };
})();
