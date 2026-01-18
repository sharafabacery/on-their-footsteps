/**
 * Test Utilities
 * Helper functions and components for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import ApiService from '../../services/apiService';
import AuthService from '../../services/authService';

// Mock services for testing
const mockApiService = new ApiService();
const mockAuthService = new AuthService(mockApiService);

/**
 * Custom render function with providers
 * @param {ReactElement} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} Render result
 */
const customRender = (ui, options = {}) => {
  const {
    authProviderProps = {},
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <AuthProvider authService={mockAuthService} {...authProviderProps}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Render with custom auth state
 * @param {ReactElement} ui - Component to render
 * @param {Object} authState - Auth state to mock
 * @param {Object} options - Render options
 * @returns {Object} Render result
 */
const renderWithAuth = (ui, authState = {}, options = {}) => {
  // Mock auth service methods
  mockAuthService.isAuthenticated = jest.fn(() => authState.isAuthenticated || false);
  mockAuthService.getCurrentUser = jest.fn(() => authState.user || null);
  mockAuthService.getToken = jest.fn(() => authState.token || null);

  return customRender(ui, options);
};

/**
 * Render with mock API responses
 * @param {ReactElement} ui - Component to render
 * @param {Object} apiMocks - API mock configurations
 * @param {Object} options - Render options
 * @returns {Object} Render result
 */
const renderWithApi = (ui, apiMocks = {}, options = {}) => {
  // Mock API responses
  Object.entries(apiMocks).forEach(([endpoint, mock]) => {
    global.testUtils.mockFetchResponse(mock.data, mock.status);
  });

  return customRender(ui, options);
};

/**
 * Create mock character data
 * @param {Object} overrides - Data to override
 * @returns {Object} Mock character data
 */
const createMockCharacter = (overrides = {}) => ({
  id: 1,
  name: 'Test Character',
  arabic_name: 'شخصية اختبار',
  english_name: 'Test Character',
  title: 'Test Title',
  description: 'Test description',
  category: 'الصحابة',
  era: 'الخلافة الراشدة',
  slug: 'test-character',
  profile_image: '/images/test.jpg',
  views_count: 100,
  likes_count: 25,
  shares_count: 5,
  is_featured: false,
  is_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  full_story: 'Test full story...',
  key_achievements: ['Achievement 1', 'Achievement 2'],
  lessons: ['Lesson 1', 'Lesson 2'],
  quotes: ['Quote 1', 'Quote 2'],
  timeline_events: [
    {
      year: 573,
      title: 'Birth',
      description: 'Test birth event'
    }
  ],
  ...overrides,
});

/**
 * Create mock user data
 * @param {Object} overrides - Data to override
 * @returns {Object} Mock user data
 */
const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  language: 'ar',
  theme: 'light',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Create mock pagination data
 * @param {Object} overrides - Data to override
 * @returns {Object} Mock pagination data
 */
const createMockPagination = (overrides = {}) => ({
  page: 1,
  limit: 12,
  total: 100,
  pages: 9,
  has_next: true,
  has_prev: false,
  ...overrides,
});

/**
 * Create mock API response
 * @param {*} data - Response data
 * @param {Object} options - Response options
 * @returns {Object} Mock API response
 */
const createMockApiResponse = (data, options = {}) => ({
  data,
  status: options.status || 200,
  statusText: options.statusText || 'OK',
  headers: {
    'content-type': 'application/json',
    ...options.headers,
  },
  ok: options.ok !== false,
});

/**
 * Mock async function with delay
 * @param {*} returnValue - Value to return
 * @param {number} delay - Delay in milliseconds
 * @param {boolean} shouldReject - Whether to reject
 * @returns {Promise} Mock async function
 */
const mockAsyncFunction = (returnValue, delay = 0, shouldReject = false) => {
  return jest.fn().mockImplementation(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldReject) {
          reject(new Error('Mock error'));
        } else {
          resolve(returnValue);
        }
      }, delay);
    });
  });
};

/**
 * Create mock hook result
 * @param {Object} overrides - Hook state to override
 * @returns {Object} Mock hook result
 */
const createMockHookResult = (overrides = {}) => ({
  data: null,
  loading: false,
  error: null,
  refetch: jest.fn(),
  ...overrides,
});

/**
 * Fire mock event
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type
 * @param {Object} eventData - Event data
 */
const fireEvent = (element, eventType, eventData = {}) => {
  const event = new Event(eventType, {
    bubbles: true,
    cancelable: true,
    ...eventData,
  });
  
  Object.assign(event, eventData);
  element.dispatchEvent(event);
};

/**
 * Wait for component to update
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Promise that resolves after timeout
 */
const waitForUpdate = (timeout = 0) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

/**
 * Mock scroll behavior
 */
const mockScroll = () => {
  Object.defineProperty(window, 'scrollY', {
    writable: true,
    value: 0,
  });

  Object.defineProperty(window, 'pageYOffset', {
    writable: true,
    value: 0,
  });

  window.scrollTo = jest.fn();
  window.scrollBy = jest.fn();
};

/**
 * Mock resize observer
 */
const mockResizeObserver = () => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

/**
 * Mock intersection observer
 */
const mockIntersectionObserver = () => {
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
};

/**
 * Setup common mocks
 */
const setupCommonMocks = () => {
  mockScroll();
  mockResizeObserver();
  mockIntersectionObserver();
};

/**
 * Cleanup mocks
 */
const cleanupMocks = () => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
};

// Re-export testing library functions
export * from '@testing-library/react';
export { customRender as render };

// Export custom utilities
export {
  renderWithAuth,
  renderWithApi,
  createMockCharacter,
  createMockUser,
  createMockPagination,
  createMockApiResponse,
  mockAsyncFunction,
  createMockHookResult,
  fireEvent,
  waitForUpdate,
  setupCommonMocks,
  cleanupMocks,
};

// Export mocks for use in tests
export { mockApiService, mockAuthService };
