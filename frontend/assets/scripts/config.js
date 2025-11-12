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

  getEnvironment() {
    // Check if we're in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'development';
    }
    return 'production';
  }

  getApiBaseUrl() {
    switch (this.environment) {
      case 'development':
        return 'http://localhost:5000';
      case 'production':
        return 'https://your-production-api.com'; // Replace with actual production URL
      default:
        return 'http://localhost:5000';
    }
  }

  getFrontendUrl() {
    switch (this.environment) {
      case 'development':
        return 'http://localhost:5000';
      case 'production':
        return 'https://your-production-domain.com'; // Replace with actual domain
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