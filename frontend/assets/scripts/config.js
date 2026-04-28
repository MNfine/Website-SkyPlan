/**
 * Environment Configuration for SkyPlan Frontend
 * Handles different environments (development, production)
 */

class Config {
  constructor() {
    this.environment = this.getEnvironment();
    this.apiBaseUrl = this.getApiBaseUrl();
    this.frontendUrl = this.getFrontendUrl();
  }

  getRuntimeApiBaseUrl() {
    const runtimeGlobal = (window.SKYPLAN_API_BASE_URL || '').trim();
    if (runtimeGlobal) {
      return runtimeGlobal.replace(/\/$/, '');
    }

    const runtimeStorage = (localStorage.getItem('skyplanApiBaseUrl') || '').trim();
    if (runtimeStorage) {
      return runtimeStorage.replace(/\/$/, '');
    }

    const meta = document.querySelector('meta[name="skyplan-api-base-url"]');
    if (meta && meta.content && meta.content.trim()) {
      return meta.content.trim().replace(/\/$/, '');
    }

    return '';
  }

  getEnvironment() {
    // Check if we're in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'development';
    }
    return 'production';
  }

  getApiBaseUrl() {
    const runtimeApiBase = this.getRuntimeApiBaseUrl();
    if (runtimeApiBase) {
      return runtimeApiBase;
    }

    switch (this.environment) {
      case 'development':
        return window.location.origin;
      case 'production':
        return window.location.origin;
      default:
        return window.location.origin;
    }
  }

  getFrontendUrl() {
    return window.location.origin;
  }

  // VNPay specific configs
  getVNPayReturnUrl() {
    return `${this.frontendUrl}/confirmation.html`;
  }

  // API endpoints
  getApiEndpoints() {
    return {
      bookings: `${this.apiBaseUrl}/api/bookings`,
      vnpayCreate: `${this.apiBaseUrl}/api/payment/vnpay/create`,
      vnpayReturn: `${this.apiBaseUrl}/api/payment/vnpay/return`,
      vnpayConfig: `${this.apiBaseUrl}/api/payment/config`,
      health: `${this.apiBaseUrl}/health`,
      blockchainConfig: `${this.apiBaseUrl}/api/metadata/blockchain-config`
    };
  }

  // Blockchain configuration - fetch and cache from server
  async getBlockchainConfig() {
    // Force fetch fresh config to ensure new fields like receiverAddress are loaded
    const cacheKey = 'skyplan_blockchain_config_v2';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Invalid cache, fetch fresh
      }
    }

    try {
      const response = await fetch(this.getApiEndpoints().blockchainConfig);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        // Cache for session
        sessionStorage.setItem(cacheKey, JSON.stringify(result.data));
        return result.data;
      }

      console.error('Blockchain config fetch failed:', result);
      throw new Error('Invalid blockchain config response');
    } catch (error) {
      console.error('Failed to fetch blockchain config:', error);
      // Return defaults/falsy values - caller should handle this
      return null;
    }
  }

  // Debug info
  getDebugInfo() {
    return {
      environment: this.environment,
      apiBaseUrl: this.apiBaseUrl,
      frontendUrl: this.frontendUrl,
      hostname: window.location.hostname,
      protocol: window.location.protocol
    };
  }
}

// Create global config instance
window.SkyPlanConfig = new Config();

// Log debug info in development
if (window.SkyPlanConfig.environment === 'development') {
  console.log('🚀 SkyPlan Config:', window.SkyPlanConfig.getDebugInfo());
  console.log('📡 API Endpoints:', window.SkyPlanConfig.getApiEndpoints());
}