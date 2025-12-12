module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src/js', '<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'src/js/**/*.js',
        '!src/js/main.js' // Exclude entry point
    ],
    moduleDirectories: ['node_modules', 'src/js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true
};
