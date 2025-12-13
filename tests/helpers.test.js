/**
 * Tests for helpers.js
 */
import {
    escapeRegex,
    tryUrlDecoded,
    getCharsetFromCodepage,
    cleanContentId,
    isImageMimeType,
    isTextMimeType,
    extractBaseMimeType,
    extractCharset,
    extractBoundary,
    extractFilename
} from '../src/js/helpers.js';

describe('escapeRegex', () => {
    test('escapes special regex characters', () => {
        expect(escapeRegex('test.file')).toBe('test\\.file');
        expect(escapeRegex('file[1]')).toBe('file\\[1\\]');
        expect(escapeRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
        expect(escapeRegex('(test)')).toBe('\\(test\\)');
        expect(escapeRegex('a|b')).toBe('a\\|b');
        expect(escapeRegex('^start$end')).toBe('\\^start\\$end');
    });

    test('handles empty or null input', () => {
        expect(escapeRegex('')).toBe('');
        expect(escapeRegex(null)).toBe('');
        expect(escapeRegex(undefined)).toBe('');
    });

    test('leaves normal strings unchanged', () => {
        expect(escapeRegex('normal-string')).toBe('normal-string');
        expect(escapeRegex('image001@domain.com')).toBe('image001@domain\\.com');
    });
});

describe('tryUrlDecoded', () => {
    test('decodes URL-encoded strings', () => {
        expect(tryUrlDecoded('hello%20world')).toBe('hello world');
        expect(tryUrlDecoded('test%2Fpath')).toBe('test/path');
    });

    test('returns null for non-encoded strings', () => {
        expect(tryUrlDecoded('plain-string')).toBeNull();
        expect(tryUrlDecoded('no encoding here')).toBeNull();
    });

    test('returns null for invalid encoding', () => {
        expect(tryUrlDecoded('%ZZ')).toBeNull();
    });

    test('handles empty or null input', () => {
        expect(tryUrlDecoded('')).toBeNull();
        expect(tryUrlDecoded(null)).toBeNull();
        expect(tryUrlDecoded(undefined)).toBeNull();
    });
});

describe('getCharsetFromCodepage', () => {
    test('returns correct charset for known code pages', () => {
        expect(getCharsetFromCodepage(936)).toBe('gbk');
        expect(getCharsetFromCodepage(950)).toBe('big5');
        expect(getCharsetFromCodepage(932)).toBe('shift_jis');
        expect(getCharsetFromCodepage(949)).toBe('cp949');
        expect(getCharsetFromCodepage(928)).toBe('gb2312');
    });

    test('returns utf-8 for unknown code pages', () => {
        expect(getCharsetFromCodepage(1252)).toBe('utf-8');
        expect(getCharsetFromCodepage(0)).toBe('utf-8');
        expect(getCharsetFromCodepage(undefined)).toBe('utf-8');
        expect(getCharsetFromCodepage(null)).toBe('utf-8');
    });
});

describe('cleanContentId', () => {
    test('removes angle brackets from content ID', () => {
        expect(cleanContentId('<image001@domain.com>')).toBe('image001@domain.com');
        expect(cleanContentId('image001@domain.com')).toBe('image001@domain.com');
    });

    test('handles empty or null input', () => {
        expect(cleanContentId('')).toBe('');
        expect(cleanContentId(null)).toBe('');
        expect(cleanContentId(undefined)).toBe('');
    });

    test('trims whitespace', () => {
        expect(cleanContentId('  <image001@domain.com>  ')).toBe('image001@domain.com');
    });
});

describe('isImageMimeType', () => {
    test('returns true for image types', () => {
        expect(isImageMimeType('image/jpeg')).toBe(true);
        expect(isImageMimeType('image/png')).toBe(true);
        expect(isImageMimeType('image/gif')).toBe(true);
        expect(isImageMimeType('IMAGE/PNG')).toBe(true);
    });

    test('returns false for non-image types', () => {
        expect(isImageMimeType('text/plain')).toBe(false);
        expect(isImageMimeType('application/pdf')).toBe(false);
    });

    test('handles empty or null input', () => {
        expect(isImageMimeType('')).toBe(false);
        expect(isImageMimeType(null)).toBe(false);
        expect(isImageMimeType(undefined)).toBe(false);
    });
});

describe('isTextMimeType', () => {
    test('returns true for text types', () => {
        expect(isTextMimeType('text/plain')).toBe(true);
        expect(isTextMimeType('text/html')).toBe(true);
        expect(isTextMimeType('application/json')).toBe(true);
        expect(isTextMimeType('application/xml')).toBe(true);
        expect(isTextMimeType('application/javascript')).toBe(true);
    });

    test('returns false for non-text types', () => {
        expect(isTextMimeType('image/png')).toBe(false);
        expect(isTextMimeType('application/pdf')).toBe(false);
    });

    test('handles empty or null input', () => {
        expect(isTextMimeType('')).toBe(false);
        expect(isTextMimeType(null)).toBe(false);
    });
});

describe('extractBaseMimeType', () => {
    test('extracts base MIME type', () => {
        expect(extractBaseMimeType('text/html; charset=utf-8')).toBe('text/html');
        expect(extractBaseMimeType('application/json')).toBe('application/json');
        expect(extractBaseMimeType('multipart/mixed; boundary="----=_Part"')).toBe('multipart/mixed');
    });

    test('handles empty or null input', () => {
        expect(extractBaseMimeType('')).toBe('');
        expect(extractBaseMimeType(null)).toBe('');
    });
});

describe('extractCharset', () => {
    test('extracts charset from content-type', () => {
        expect(extractCharset('text/html; charset=utf-8')).toBe('utf-8');
        expect(extractCharset('text/plain; charset="iso-8859-1"')).toBe('iso-8859-1');
    });

    test('returns default for missing charset', () => {
        expect(extractCharset('text/html')).toBe('utf-8');
        expect(extractCharset('')).toBe('utf-8');
        expect(extractCharset(null)).toBe('utf-8');
    });
});

describe('extractBoundary', () => {
    test('extracts boundary from multipart content-type', () => {
        expect(extractBoundary('multipart/mixed; boundary="----=_Part_123"')).toBe('----=_Part_123');
        expect(extractBoundary('multipart/alternative; boundary=simple_boundary')).toBe('simple_boundary');
    });

    test('returns null for non-multipart', () => {
        expect(extractBoundary('text/html')).toBeNull();
        expect(extractBoundary('')).toBeNull();
        expect(extractBoundary(null)).toBeNull();
    });
});

describe('extractFilename', () => {
    test('extracts filename from content-disposition', () => {
        expect(extractFilename('attachment; filename="document.pdf"')).toBe('document.pdf');
        expect(extractFilename('attachment; filename=image.png')).toBe('image.png');
    });

    test('returns default for missing filename', () => {
        expect(extractFilename('attachment')).toBe('attachment');
        expect(extractFilename('')).toBe('attachment');
        expect(extractFilename(null)).toBe('attachment');
    });
});
