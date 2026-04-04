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
        return 'http://localhost:5000';
      case 'production':
        return window.location.origin;
      default:
        return 'http://localhost:5000';
    }
  }

  getFrontendUrl() {
    switch (this.environment) {
      case 'development':
        return 'http://localhost:5000';
      case 'production':
        return window.location.origin;
      default:
        return window.location.origin;
    }
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
      health: `${this.apiBaseUrl}/health`
    };
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