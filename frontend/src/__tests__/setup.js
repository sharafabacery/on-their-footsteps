/**
 * Test Setup Configuration
 * Configures testing environment with mocks and utilities
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure Testing Library
configure({ testIdAttribute: 'data-testid' });

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Mock window.location
const locationMock = {
  href: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

// Mock window.history
const historyMock = {
  length: 1,
  state: null,
  back: jest.fn(),
  forward: jest.fn(),
  go: jest.fn(),
  pushState: jest.fn(),
  replaceState: jest.fn(),
};

Object.defineProperty(window, 'history', {
  value: historyMock,
  writable: true,
});

// Mock fetch API
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn(() => ({
    getPropertyValue: jest.fn(() => ''),
  })),
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mocked-url'),
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

// Mock environment variables
const originalEnv = import.meta.env;
beforeEach(() => {
  // Reset environment variables
  import.meta.env = { ...originalEnv };
  
  // Reset mocks
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  locationMock.href = 'http://localhost:3000';
  locationMock.pathname = '/';
  locationMock.search = '';
  locationMock.hash = '';
  
  fetch.mockClear();
});

afterEach(() => {
  // Restore environment variables
  import.meta.env = originalEnv;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to mock localStorage
  mockLocalStorage: (data = {}) => {
    localStorageMock.getItem.mockImplementation((key) => data[key] || null);
    localStorageMock.setItem.mockImplementation((key, value) => {
      data[key] = value;
    });
    localStorageMock.removeItem.mockImplementation((key) => {
      delete data[key];
    });
    localStorageMock.clear.mockImplementation(() => {
      Object.keys(data).forEach(key => delete data[key]);
    });
  },

  // Helper to mock fetch responses
  mockFetchResponse: (data, status = 200, headers = {}) => {
    fetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    });
  },

  // Helper to mock fetch error
  mockFetchError: (error = new Error('Network error')) => {
    fetch.mockRejectedValueOnce(error);
  },

  // Helper to wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create mock event
  createMockEvent: (type, data = {}) => ({
    type,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: {
      value: '',
      checked: false,
      ...data,
    },
    ...data,
  }),

  // Helper to create mock component props
  createMockProps: (props = {}) => ({
    children: null,
    className: '',
    id: '',
    ...props,
  }),
};

// Suppress console warnings in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
