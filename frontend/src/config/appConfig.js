/**
 * Application Configuration Management
 * Centralized configuration with environment-specific settings
 */

/**
 * Create application configuration
 * @param {Object} env - Environment variables (default: import.meta.env)
 * @returns {Object} Configuration object
 */
export const createAppConfig = (env = import.meta.env) => {
  return {
    // API Configuration
    api: {
      baseUrl: env.VITE_API_URL || '/api',
      timeout: parseInt(env.VITE_API_TIMEOUT) || 10000,
      retries: parseInt(env.VITE_API_RETRIES) || 3,
      retryDelay: parseInt(env.VITE_API_RETRY_DELAY) || 1000,
    },

    // Application Settings
    app: {
      name: env.VITE_APP_NAME || 'على خطاهم',
      version: env.VITE_APP_VERSION || '1.0.0',
      environment: env.MODE || 'development',
      debug: env.MODE === 'development',
    },

    // Feature Flags
    features: {
      analytics: env.VITE_ENABLE_ANALYTICS === 'true',
      debugging: env.MODE === 'development',
      errorReporting: env.VITE_ENABLE_ERROR_REPORTING !== 'false',
      performanceMonitoring: env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
      serviceWorker: env.VITE_ENABLE_SERVICE_WORKER !== 'false',
    },

    // UI Configuration
    ui: {
      theme: env.VITE_DEFAULT_THEME || 'light',
      language: env.VITE_DEFAULT_LANGUAGE || 'ar',
      rtl: env.VITE_DEFAULT_RTL !== 'false',
      animations: env.VITE_DISABLE_ANIMATIONS !== 'true',
    },

    // Pagination
    pagination: {
      defaultLimit: parseInt(env.VITE_DEFAULT_PAGE_SIZE) || 12,
      maxLimit: parseInt(env.VITE_MAX_PAGE_SIZE) || 100,
    },

    // Cache Settings
    cache: {
      characterDetail: parseInt(env.VITE_CACHE_CHARACTER_DETAIL) || 600, // 10 minutes
      featuredContent: parseInt(env.VITE_CACHE_FEATURED_CONTENT) || 300, // 5 minutes
      categories: parseInt(env.VITE_CACHE_CATEGORIES) || 3600, // 1 hour
      searchResults: parseInt(env.VITE_CACHE_SEARCH_RESULTS) || 120, // 2 minutes
    },

    // File Upload
    upload: {
      maxFileSize: parseInt(env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
      allowedTypes: env.VITE_ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/png',
        'image/webp'
      ],
    },

    // Authentication
    auth: {
      tokenRefreshThreshold: parseInt(env.VITE_TOKEN_REFRESH_THRESHOLD) || 300, // 5 minutes
      sessionTimeout: parseInt(env.VITE_SESSION_TIMEOUT) || 3600, // 1 hour
    },

    // External Services
    external: {
      analyticsId: env.VITE_ANALYTICS_ID,
      sentryDsn: env.VITE_SENTRY_DSN,
      mapsApiKey: env.VITE_MAPS_API_KEY,
    },

    // Development Settings
    development: {
      mockApi: env.VITE_MOCK_API === 'true',
      mockDelay: parseInt(env.VITE_MOCK_DELAY) || 0,
      logLevel: env.VITE_LOG_LEVEL || 'info',
    },
  };
};

// Create default configuration instance
export const config = createAppConfig();

/**
 * Get configuration value by path
 * @param {string} path - Dot-separated path (e.g., 'api.baseUrl')
 * @param {*} fallback - Fallback value if path doesn't exist
 * @returns {*} Configuration value
 */
export const getConfig = (path, fallback = null) => {
  const keys = path.split('.');
  let value = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  
  return value;
};

/**
 * Check if a feature is enabled
 * @param {string} featureName - Feature name
 * @returns {boolean} Whether feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return Boolean(getConfig(`features.${featureName}`, false));
};

/**
 * Get API configuration
 * @returns {Object} API configuration
 */
export const getApiConfig = () => {
  return config.api;
};

/**
 * Get UI configuration
 * @returns {Object} UI configuration
 */
export const getUiConfig = () => {
  return config.ui;
};

/**
 * Get cache configuration
 * @returns {Object} Cache configuration
 */
export const getCacheConfig = () => {
  return config.cache;
};

/**
 * Check if running in development mode
 * @returns {boolean} Whether in development mode
 */
export const isDevelopment = () => {
  return config.app.environment === 'development';
};

/**
 * Check if running in production mode
 * @returns {boolean} Whether in production mode
 */
export const isProduction = () => {
  return config.app.environment === 'production';
};

/**
 * Check if running in test mode
 * @returns {boolean} Whether in test mode
 */
export const isTest = () => {
  return config.app.environment === 'test';
};

/**
 * Get environment-specific configuration
 * @returns {Object} Environment-specific settings
 */
export const getEnvironmentConfig = () => {
  return {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
    mode: config.app.environment,
  };
};

export default config;
