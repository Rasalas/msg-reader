/**
 * Jest Test Setup
 * Configures the test environment before each test file runs
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    })
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

// Mock matchMedia for theme tests
const matchMediaMock = {
    matches: false,
    media: '(prefers-color-scheme: dark)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(), // Deprecated but some code might use it
    removeListener: jest.fn(), // Deprecated but some code might use it
    dispatchEvent: jest.fn()
};

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        ...matchMediaMock,
        media: query
    }))
});

// Reset localStorage before each test
beforeEach(() => {
    localStorageMock.store = {};
    matchMediaMock.matches = false;
    jest.clearAllMocks();
});

// Mock window.md5 for tests that need it
global.md5 = jest.fn((str) => `mock-hash-${str.slice(0, 8)}`);
window.md5 = global.md5;
