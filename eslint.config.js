import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.commonjs,
                ...globals.es2021,
                ...globals.jest,
                ...globals.node,
                md5: 'readonly'
            }
        },
        rules: {
            // Error prevention
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': ['warn', { allow: ['error', 'warn'] }],

            // Code style
            'indent': ['error', 4, { SwitchCase: 1 }],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'always'],

            // Best practices
            'eqeqeq': ['error', 'always'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',
            'no-return-assign': 'error',
            'no-throw-literal': 'error',
            'prefer-const': 'error',
            'no-var': 'error',

            // Security
            'no-script-url': 'error'
        }
    }
];
