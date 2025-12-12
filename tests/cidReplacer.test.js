/**
 * Tests for cidReplacer.js
 */
const {
    replaceCidReferences,
    buildCidPatterns
} = require('../src/js/cidReplacer');
const { PLACEHOLDER_IMAGE_SVG } = require('../src/js/constants');

describe('buildCidPatterns', () => {
    test('builds patterns for content ID', () => {
        const patterns = buildCidPatterns('image001@domain.com', '');
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns.some(p => p.includes('cid:image001@domain\\.com'))).toBe(true);
    });

    test('builds patterns for filename', () => {
        const patterns = buildCidPatterns('', 'logo.png');
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns.some(p => p.includes('logo\\.png'))).toBe(true);
    });

    test('builds patterns for both content ID and filename', () => {
        const patterns = buildCidPatterns('image001@domain.com', 'logo.png');
        expect(patterns.some(p => p.includes('image001@domain\\.com'))).toBe(true);
        expect(patterns.some(p => p.includes('logo\\.png'))).toBe(true);
    });

    test('handles angle brackets in content ID', () => {
        const patterns = buildCidPatterns('<image001@domain.com>', '');
        // Should strip angle brackets from the content ID itself
        expect(patterns.some(p => p.includes('image001@domain\\.com'))).toBe(true);
        // Should also generate patterns to match cid:<...> format
        expect(patterns.some(p => p.includes('cid:<'))).toBe(true);
    });
});

describe('replaceCidReferences', () => {
    test('replaces cid: references with base64 data', () => {
        const html = '<img src="cid:image001@domain.com">';
        const attachments = [{
            attachMimeTag: 'image/png',
            contentId: 'image001@domain.com',
            contentBase64: 'data:image/png;base64,ABC123'
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('data:image/png;base64,ABC123');
        expect(result).not.toContain('cid:');
    });

    test('replaces filename-based cid references', () => {
        const html = '<img src="cid:logo.png">';
        const attachments = [{
            attachMimeTag: 'image/png',
            fileName: 'logo.png',
            contentBase64: 'data:image/png;base64,XYZ789'
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('data:image/png;base64,XYZ789');
    });

    test('uses placeholder for unmatched cid references', () => {
        const html = '<img src="cid:unknown@domain.com">';
        const result = replaceCidReferences(html, []);
        expect(result).toContain(PLACEHOLDER_IMAGE_SVG);
    });

    test('handles empty HTML', () => {
        expect(replaceCidReferences('', [])).toBe('');
        expect(replaceCidReferences(null, [])).toBe('');
        expect(replaceCidReferences(undefined, [])).toBe('');
    });

    test('handles empty attachments', () => {
        const html = '<p>No images here</p>';
        expect(replaceCidReferences(html, [])).toBe(html);
        expect(replaceCidReferences(html, null)).toBe(html);
    });

    test('replaces multiple cid references', () => {
        const html = '<img src="cid:image1@domain.com"><img src="cid:image2@domain.com">';
        const attachments = [
            {
                attachMimeTag: 'image/png',
                contentId: 'image1@domain.com',
                contentBase64: 'data:image/png;base64,IMG1'
            },
            {
                attachMimeTag: 'image/jpeg',
                contentId: 'image2@domain.com',
                contentBase64: 'data:image/jpeg;base64,IMG2'
            }
        ];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('data:image/png;base64,IMG1');
        expect(result).toContain('data:image/jpeg;base64,IMG2');
        expect(result).not.toContain('cid:');
    });

    test('handles cid with angle brackets', () => {
        const html = '<img src="cid:<image001@domain.com>">';
        const attachments = [{
            attachMimeTag: 'image/png',
            contentId: '<image001@domain.com>',
            contentBase64: 'data:image/png;base64,TEST'
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('data:image/png;base64,TEST');
    });

    test('replaces href for non-image attachments', () => {
        const html = '<a href="cid:document@domain.com">Download</a>';
        const attachments = [{
            attachMimeTag: 'application/pdf',
            contentId: 'document@domain.com',
            contentBase64: 'data:application/pdf;base64,PDF123'
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('href="data:application/pdf;base64,PDF123"');
    });

    test('handles pidContentId field', () => {
        const html = '<img src="cid:pid-image@domain.com">';
        const attachments = [{
            attachMimeTag: 'image/png',
            pidContentId: 'pid-image@domain.com',
            contentBase64: 'data:image/png;base64,PID123'
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain('data:image/png;base64,PID123');
    });

    test('skips attachments without contentBase64', () => {
        const html = '<img src="cid:nodata@domain.com">';
        const attachments = [{
            attachMimeTag: 'image/png',
            contentId: 'nodata@domain.com'
            // No contentBase64
        }];

        const result = replaceCidReferences(html, attachments);
        expect(result).toContain(PLACEHOLDER_IMAGE_SVG);
    });
});
