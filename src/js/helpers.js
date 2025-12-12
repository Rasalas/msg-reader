/**
 * Helper Functions Module
 * Shared utility functions used across the application
 */

const { CHARSET_CODES, DEFAULT_CHARSET } = require('./constants');

/**
 * Escapes special regex characters in a string
 * @param {string} str - The string to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
function escapeRegex(str) {
    if (!str) return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Attempts to URL-decode a string
 * @param {string} str - The string to decode
 * @returns {string|null} Decoded string if different from input, null otherwise
 */
function tryUrlDecoded(str) {
    if (!str) return null;
    try {
        const decoded = decodeURIComponent(str);
        return decoded !== str ? decoded : null;
    } catch (e) {
        return null;
    }
}

/**
 * Gets the charset name from a Windows code page number
 * @param {number} codepage - The Windows code page number
 * @returns {string} The charset name (defaults to utf-8)
 */
function getCharsetFromCodepage(codepage) {
    return CHARSET_CODES[codepage] || DEFAULT_CHARSET;
}

/**
 * Removes angle brackets from Content-ID values
 * @param {string} contentId - The Content-ID value (e.g., "<image001@domain.com>")
 * @returns {string} Clean Content-ID without brackets
 */
function cleanContentId(contentId) {
    if (!contentId) return '';
    return contentId.replace(/[<>]/g, '').trim();
}

/**
 * Checks if a MIME type represents an image
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} True if it's an image type
 */
function isImageMimeType(mimeType) {
    if (!mimeType) return false;
    return mimeType.toLowerCase().startsWith('image/');
}

/**
 * Checks if a MIME type represents a text format
 * @param {string} mimeType - The MIME type to check
 * @returns {boolean} True if it's a text-based type
 */
function isTextMimeType(mimeType) {
    if (!mimeType) return false;
    const normalized = mimeType.toLowerCase();
    return normalized.startsWith('text/') ||
           normalized === 'application/json' ||
           normalized === 'application/xml' ||
           normalized === 'application/javascript' ||
           normalized === 'application/x-diff';
}

/**
 * Extracts the base MIME type without parameters
 * @param {string} contentType - Full Content-Type header value
 * @returns {string} Base MIME type (e.g., "text/html")
 */
function extractBaseMimeType(contentType) {
    if (!contentType) return '';
    return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Extracts charset from Content-Type header
 * @param {string} contentType - Full Content-Type header value
 * @returns {string} Charset or default
 */
function extractCharset(contentType) {
    if (!contentType) return DEFAULT_CHARSET;
    const match = contentType.match(/charset="?([^";\s]+)"?/i);
    return match ? match[1] : DEFAULT_CHARSET;
}

/**
 * Extracts boundary from multipart Content-Type header
 * @param {string} contentType - Full Content-Type header value
 * @returns {string|null} Boundary string or null if not found
 */
function extractBoundary(contentType) {
    if (!contentType) return null;
    const match = contentType.match(/boundary="?([^";\s]+)"?/);
    return match ? match[1] : null;
}

/**
 * Extracts filename from Content-Disposition header
 * @param {string} contentDisposition - Full Content-Disposition header value
 * @returns {string} Filename or 'attachment' as default
 */
function extractFilename(contentDisposition) {
    if (!contentDisposition) return 'attachment';
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/i);
    return match ? match[1] : 'attachment';
}

module.exports = {
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
};
