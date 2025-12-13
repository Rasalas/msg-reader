/**
 * Tests for constants.js
 */
import {
    CHARSET_CODES,
    PREVIEWABLE_IMAGE_TYPES,
    PREVIEWABLE_TEXT_TYPES,
    PDF_MIME_TYPE,
    PLACEHOLDER_IMAGE_SVG,
    SAFE_DOWNLOAD_TYPES,
    DANGEROUS_EXTENSIONS,
    SUPPORTED_EMAIL_EXTENSIONS,
    DEFAULT_CHARSET
} from '../src/js/constants.js';

describe('CHARSET_CODES', () => {
    test('contains expected code pages', () => {
        expect(CHARSET_CODES[936]).toBe('gbk');
        expect(CHARSET_CODES[950]).toBe('big5');
        expect(CHARSET_CODES[932]).toBe('shift_jis');
        expect(CHARSET_CODES[949]).toBe('cp949');
        expect(CHARSET_CODES[928]).toBe('gb2312');
    });

    test('is not empty', () => {
        expect(Object.keys(CHARSET_CODES).length).toBeGreaterThan(0);
    });
});

describe('PREVIEWABLE_IMAGE_TYPES', () => {
    test('contains common image types', () => {
        expect(PREVIEWABLE_IMAGE_TYPES).toContain('image/jpeg');
        expect(PREVIEWABLE_IMAGE_TYPES).toContain('image/png');
        expect(PREVIEWABLE_IMAGE_TYPES).toContain('image/gif');
        expect(PREVIEWABLE_IMAGE_TYPES).toContain('image/webp');
    });

    test('is an array', () => {
        expect(Array.isArray(PREVIEWABLE_IMAGE_TYPES)).toBe(true);
    });
});

describe('PREVIEWABLE_TEXT_TYPES', () => {
    test('contains common text types', () => {
        expect(PREVIEWABLE_TEXT_TYPES).toContain('text/plain');
        expect(PREVIEWABLE_TEXT_TYPES).toContain('text/html');
        expect(PREVIEWABLE_TEXT_TYPES).toContain('application/json');
    });

    test('is an array', () => {
        expect(Array.isArray(PREVIEWABLE_TEXT_TYPES)).toBe(true);
    });
});

describe('PDF_MIME_TYPE', () => {
    test('is correct', () => {
        expect(PDF_MIME_TYPE).toBe('application/pdf');
    });
});

describe('PLACEHOLDER_IMAGE_SVG', () => {
    test('is a data URI', () => {
        expect(PLACEHOLDER_IMAGE_SVG.startsWith('data:image/svg+xml;base64,')).toBe(true);
    });

    test('is not empty', () => {
        expect(PLACEHOLDER_IMAGE_SVG.length).toBeGreaterThan(50);
    });
});

describe('SAFE_DOWNLOAD_TYPES', () => {
    test('is a Set', () => {
        expect(SAFE_DOWNLOAD_TYPES instanceof Set).toBe(true);
    });

    test('contains safe types', () => {
        expect(SAFE_DOWNLOAD_TYPES.has('image/jpeg')).toBe(true);
        expect(SAFE_DOWNLOAD_TYPES.has('application/pdf')).toBe(true);
        expect(SAFE_DOWNLOAD_TYPES.has('text/plain')).toBe(true);
    });
});

describe('DANGEROUS_EXTENSIONS', () => {
    test('is a Set', () => {
        expect(DANGEROUS_EXTENSIONS instanceof Set).toBe(true);
    });

    test('contains dangerous extensions', () => {
        expect(DANGEROUS_EXTENSIONS.has('exe')).toBe(true);
        expect(DANGEROUS_EXTENSIONS.has('bat')).toBe(true);
        expect(DANGEROUS_EXTENSIONS.has('cmd')).toBe(true);
        expect(DANGEROUS_EXTENSIONS.has('vbs')).toBe(true);
        expect(DANGEROUS_EXTENSIONS.has('js')).toBe(true);
    });
});

describe('SUPPORTED_EMAIL_EXTENSIONS', () => {
    test('contains msg and eml', () => {
        expect(SUPPORTED_EMAIL_EXTENSIONS).toContain('msg');
        expect(SUPPORTED_EMAIL_EXTENSIONS).toContain('eml');
    });

    test('has exactly 2 entries', () => {
        expect(SUPPORTED_EMAIL_EXTENSIONS.length).toBe(2);
    });
});

describe('DEFAULT_CHARSET', () => {
    test('is utf-8', () => {
        expect(DEFAULT_CHARSET).toBe('utf-8');
    });
});
