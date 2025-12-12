/**
 * Constants Module
 * Central location for magic numbers, strings, and configuration values
 */

/**
 * Windows code page to charset mapping
 * Used for decoding email content with specific encodings
 */
const CHARSET_CODES = {
    936: 'gbk',       // Simplified Chinese (GBK)
    950: 'big5',      // Traditional Chinese (Big5)
    932: 'shift_jis', // Japanese (Shift_JIS)
    949: 'cp949',     // Korean (CP949/EUC-KR)
    928: 'gb2312'     // Simplified Chinese (GB2312)
};

/**
 * MIME types that can be previewed as images
 */
const PREVIEWABLE_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
];

/**
 * MIME types that can be previewed as text
 */
const PREVIEWABLE_TEXT_TYPES = [
    'text/plain',
    'text/html',
    'text/css',
    'text/csv',
    'text/xml',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/x-diff'
];

/**
 * PDF MIME type
 */
const PDF_MIME_TYPE = 'application/pdf';

/**
 * Placeholder SVG for missing/broken images
 * Displays "Image not available" text
 */
const PLACEHOLDER_IMAGE_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';

/**
 * File types considered safe for download
 * Used to warn users about potentially dangerous attachments
 */
const SAFE_DOWNLOAD_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/html', 'text/css', 'text/csv',
    // Data
    'application/json', 'application/xml',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/gzip'
]);

/**
 * File extensions considered dangerous
 * These should trigger a warning before download
 */
const DANGEROUS_EXTENSIONS = new Set([
    'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif',
    'vbs', 'vbe', 'js', 'jse', 'ws', 'wsf', 'wsc', 'wsh',
    'ps1', 'ps1xml', 'ps2', 'ps2xml', 'psc1', 'psc2',
    'jar', 'hta', 'cpl', 'msc', 'inf', 'reg'
]);

/**
 * Supported file extensions for email files
 */
const SUPPORTED_EMAIL_EXTENSIONS = ['msg', 'eml'];

/**
 * Default charset for email content
 */
const DEFAULT_CHARSET = 'utf-8';

/**
 * Base64 to binary size conversion factor
 * Base64 encoded data is ~33% larger than binary
 * Binary size ≈ base64Length * 0.75
 */
const BASE64_SIZE_FACTOR = 0.75;

/**
 * Default locale for date/time formatting
 */
const DEFAULT_LOCALE = 'en-US';

/**
 * Toast notification durations (milliseconds)
 */
const TOAST_DURATIONS = {
    error: 5000,
    warning: 4000,
    info: 3000
};

/**
 * Toast background colors (Tailwind CSS classes)
 */
const TOAST_COLORS = {
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
};

module.exports = {
    CHARSET_CODES,
    PREVIEWABLE_IMAGE_TYPES,
    PREVIEWABLE_TEXT_TYPES,
    PDF_MIME_TYPE,
    PLACEHOLDER_IMAGE_SVG,
    SAFE_DOWNLOAD_TYPES,
    DANGEROUS_EXTENSIONS,
    SUPPORTED_EMAIL_EXTENSIONS,
    DEFAULT_CHARSET,
    BASE64_SIZE_FACTOR,
    DEFAULT_LOCALE,
    TOAST_DURATIONS,
    TOAST_COLORS
};
