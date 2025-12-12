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

// Reset localStorage before each test
beforeEach(() => {
    localStorageMock.store = {};
    jest.clearAllMocks();
});

// Mock window.md5 for tests that need it
global.md5 = jest.fn((str) => `mock-hash-${str.slice(0, 8)}`);
window.md5 = global.md5;
