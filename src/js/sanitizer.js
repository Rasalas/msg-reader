/**
 * HTML Sanitization Module
 * Protects against XSS attacks by sanitizing untrusted HTML content
 */
import DOMPurify from 'dompurify';

/**
 * Configuration for DOMPurify
 * Allows common email HTML elements while blocking dangerous ones
 */
export const SANITIZE_CONFIG = {
    ALLOWED_TAGS: [
        // Text formatting
        'p', 'br', 'div', 'span', 'b', 'i', 'u', 'strong', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
        // Headings
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Lists
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // Tables
        'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'caption', 'colgroup', 'col',
        // Links and media
        'a', 'img',
        // Structure
        'blockquote', 'pre', 'code', 'hr', 'address',
        // Styling (scoped in email context)
        'style',
        // Font tags (legacy emails)
        'font', 'center'
    ],
    ALLOWED_ATTR: [
        // Common
        'class', 'id', 'style', 'title',
        // Links
        'href', 'target', 'rel',
        // Images
        'src', 'alt', 'width', 'height',
        // Tables
        'colspan', 'rowspan', 'cellpadding', 'cellspacing', 'border', 'align', 'valign', 'bgcolor',
        // Font (legacy)
        'color', 'face', 'size'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'applet', 'base', 'meta', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'],
    // Allow data: URLs only for images (base64 embedded images are common in emails)
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['target'],
    // Force all links to open in new tab for security
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} html - The untrusted HTML content
 * @returns {string} Sanitized HTML safe for innerHTML
 */
export function sanitizeHTML(html) {
    if (!html) return '';

    // Create a DOMPurify instance (for browser environment)
    let cleanHTML;
    try {
        cleanHTML = DOMPurify.sanitize(html, SANITIZE_CONFIG);
    } catch (error) {
        console.error('Error sanitizing HTML:', error);
        // Return escaped text as fallback
        return escapeHTML(html);
    }

    return cleanHTML;
}

/**
 * Escapes HTML special characters
 * @param {string} text - Plain text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitizes a URL to prevent javascript: and data: URL attacks
 * Allows http:, https:, mailto:, and data:image for embedded images
 * @param {string} url - The URL to sanitize
 * @returns {string} Safe URL or empty string if dangerous
 */
export function sanitizeURL(url) {
    if (!url) return '';

    const trimmed = url.trim().toLowerCase();

    // Allow safe protocols
    if (trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('mailto:')) {
        return url;
    }

    // Allow data:image URLs (common in emails for embedded images)
    if (trimmed.startsWith('data:image/')) {
        return url;
    }

    // Block everything else (javascript:, data:text/html, etc.)
    return '';
}
