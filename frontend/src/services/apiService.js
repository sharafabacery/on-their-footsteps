/**
 * Mockable API Service for better testability
 * Abstracts browser APIs and provides dependency injection points
 */

class ApiService {
  constructor(storage = null, location = null) {
    this.storage = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    this.location = location || (typeof window !== 'undefined' ? window.location : null);
  }

  /**
   * Get authentication token from storage
   * @returns {string|null} Authentication token
   */
  getToken() {
    return this.storage?.getItem('token') || null;
  }

  /**
   * Set authentication token in storage
   * @param {string} token - Authentication token
   */
  setToken(token) {
    if (this.storage) {
      this.storage.setItem('token', token);
    }
  }

  /**
   * Remove authentication token from storage
   */
  removeToken() {
    if (this.storage) {
      this.storage.removeItem('token');
    }
  }

  /**
   * Get user data from storage
   * @returns {string|null} User data JSON
   */
  getUser() {
    return this.storage?.getItem('user') || null;
  }

  /**
   * Set user data in storage
   * @param {Object} user - User data object
   */
  setUser(user) {
    if (this.storage) {
      this.storage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Remove user data from storage
   */
  removeUser() {
    if (this.storage) {
      this.storage.removeItem('user');
    }
  }

  /**
   * Get language preference from storage
   * @returns {string} Language code
   */
  getLanguage() {
    return this.storage?.getItem('language') || 'ar';
  }

  /**
   * Navigate to login page
   */
  navigateToLogin() {
    if (this.location) {
      this.location.href = '/login';
    }
  }

  /**
   * Navigate to a specific URL
   * @param {string} url - Target URL
   */
  navigate(url) {
    if (this.location) {
      this.location.href = url;
    }
  }

  /**
   * Check if storage is available
   * @returns {boolean} Whether storage is available
   */
  isStorageAvailable() {
    return this.storage !== null;
  }

  /**
   * Check if location is available
   * @returns {boolean} Whether location is available
   */
  isLocationAvailable() {
    return this.location !== null;
  }
}

export default ApiService;
