module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src/js', '<rootDir>/tests'],
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'src/js/**/*.js',
        '!src/js/main.js'
    ],
    moduleDirectories: ['node_modules', 'src/js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true,
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(dompurify|@kenjiuno|iconv-lite|md5|rtf-stream-parser)/)'
    ]
};
