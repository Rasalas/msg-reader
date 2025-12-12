/**
 * Tests for sanitizer.js
 * Ensures XSS protection and HTML sanitization work correctly
 */
const { sanitizeHTML, escapeHTML, sanitizeURL, SANITIZE_CONFIG } = require('../src/js/sanitizer');

describe('SANITIZE_CONFIG', () => {
    test('has required allowed tags', () => {
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('p');
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('div');
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('a');
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('img');
        expect(SANITIZE_CONFIG.ALLOWED_TAGS).toContain('table');
    });

    test('forbids dangerous tags', () => {
        expect(SANITIZE_CONFIG.FORBID_TAGS).toContain('script');
        expect(SANITIZE_CONFIG.FORBID_TAGS).toContain('iframe');
        expect(SANITIZE_CONFIG.FORBID_TAGS).toContain('form');
        expect(SANITIZE_CONFIG.FORBID_TAGS).toContain('input');
    });

    test('forbids event handler attributes', () => {
        expect(SANITIZE_CONFIG.FORBID_ATTR).toContain('onclick');
        expect(SANITIZE_CONFIG.FORBID_ATTR).toContain('onerror');
        expect(SANITIZE_CONFIG.FORBID_ATTR).toContain('onload');
        expect(SANITIZE_CONFIG.FORBID_ATTR).toContain('onmouseover');
    });
});

describe('sanitizeHTML', () => {
    test('removes script tags', () => {
        const input = '<p>Hello</p><script>alert("xss")</script>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert');
        expect(result).toContain('<p>Hello</p>');
    });

    test('removes onclick handlers', () => {
        const input = '<div onclick="alert(1)">Click</div>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('onclick');
        expect(result).toContain('Click');
    });

    test('removes onerror handlers', () => {
        const input = '<img src="x" onerror="alert(1)">';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('onerror');
    });

    test('preserves safe tags', () => {
        const input = '<p>Hello <strong>world</strong></p>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<p>');
        expect(result).toContain('<strong>');
        expect(result).toContain('world');
    });

    test('preserves links with href', () => {
        const input = '<a href="https://example.com">Link</a>';
        const result = sanitizeHTML(input);
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('Link');
    });

    test('preserves images with src', () => {
        const input = '<img src="https://example.com/image.png" alt="Test">';
        const result = sanitizeHTML(input);
        expect(result).toContain('src="https://example.com/image.png"');
        expect(result).toContain('alt="Test"');
    });

    test('preserves table structure', () => {
        const input = '<table><tr><td>Cell</td></tr></table>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<table>');
        expect(result).toContain('<tr>');
        expect(result).toContain('<td>');
        expect(result).toContain('Cell');
    });

    test('removes iframe tags', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<iframe');
    });

    test('removes form elements', () => {
        const input = '<form action="/"><input type="text"><button>Submit</button></form>';
        const result = sanitizeHTML(input);
        expect(result).not.toContain('<form');
        expect(result).not.toContain('<input');
        expect(result).not.toContain('<button');
    });

    test('handles empty input', () => {
        expect(sanitizeHTML('')).toBe('');
        expect(sanitizeHTML(null)).toBe('');
        expect(sanitizeHTML(undefined)).toBe('');
    });

    test('handles style tags consistently', () => {
        const input = '<style>.test { color: red; }</style><div class="test">Styled</div>';
        const result = sanitizeHTML(input);
        // DOMPurify may remove style tags in JSDOM environment
        // The important thing is that it doesn't throw and preserves the div
        expect(result).toContain('Styled');
        expect(result).toContain('class="test"');
    });

    test('preserves legacy font tags', () => {
        const input = '<font color="red">Red text</font>';
        const result = sanitizeHTML(input);
        expect(result).toContain('<font');
        expect(result).toContain('color="red"');
    });
});

describe('escapeHTML', () => {
    test('escapes HTML special characters', () => {
        const input = '<script>alert("xss")</script>';
        const result = escapeHTML(input);
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).not.toContain('<script>');
    });

    test('escapes ampersands', () => {
        const input = 'Hello & World';
        const result = escapeHTML(input);
        expect(result).toContain('&amp;');
    });

    test('preserves quotes in text', () => {
        const input = 'Say "Hello"';
        const result = escapeHTML(input);
        // textContent preserves quotes as-is (they don't need escaping in text nodes)
        expect(result).toContain('"Hello"');
    });

    test('handles empty input', () => {
        expect(escapeHTML('')).toBe('');
        expect(escapeHTML(null)).toBe('');
        expect(escapeHTML(undefined)).toBe('');
    });

    test('preserves normal text', () => {
        const input = 'Hello World';
        const result = escapeHTML(input);
        expect(result).toBe('Hello World');
    });
});

describe('sanitizeURL', () => {
    test('allows https URLs', () => {
        const url = 'https://example.com/path?query=1';
        expect(sanitizeURL(url)).toBe(url);
    });

    test('allows http URLs', () => {
        const url = 'http://example.com/path';
        expect(sanitizeURL(url)).toBe(url);
    });

    test('allows mailto URLs', () => {
        const url = 'mailto:test@example.com';
        expect(sanitizeURL(url)).toBe(url);
    });

    test('allows data:image URLs', () => {
        const url = 'data:image/png;base64,ABC123';
        expect(sanitizeURL(url)).toBe(url);
    });

    test('allows data:image/jpeg URLs', () => {
        const url = 'data:image/jpeg;base64,/9j/4AAQ';
        expect(sanitizeURL(url)).toBe(url);
    });

    test('blocks javascript URLs', () => {
        expect(sanitizeURL('javascript:alert(1)')).toBe('');
        expect(sanitizeURL('JAVASCRIPT:alert(1)')).toBe('');
        expect(sanitizeURL('  javascript:alert(1)  ')).toBe('');
    });

    test('blocks data:text/html URLs', () => {
        expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    test('blocks data:application URLs', () => {
        expect(sanitizeURL('data:application/javascript,alert(1)')).toBe('');
    });

    test('blocks vbscript URLs', () => {
        expect(sanitizeURL('vbscript:msgbox("xss")')).toBe('');
    });

    test('handles empty input', () => {
        expect(sanitizeURL('')).toBe('');
        expect(sanitizeURL(null)).toBe('');
        expect(sanitizeURL(undefined)).toBe('');
    });

    test('handles URLs with whitespace', () => {
        const url = '  https://example.com  ';
        expect(sanitizeURL(url)).toBe(url);
    });
});
