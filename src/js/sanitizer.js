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
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
};

/**
 * Removes problematic MS Office CSS properties that break layout in browsers
 * @param {string} html - HTML content with style attributes
 * @returns {string} HTML with cleaned style attributes
 */
function cleanMsoStyles(html) {
    if (!html) return '';

    // Clean style attributes in the HTML
    return html.replace(/style="([^"]*)"/gi, (match, styleValue) => {
        const cleaned = styleValue
            // Remove absolute/fixed positioning (breaks layout outside Outlook)
            .replace(/position\s*:\s*(absolute|fixed)[^;]*/gi, '')
            // Remove MSO-specific positioning properties only
            .replace(/mso-position[^:]*:[^;]+;?/gi, '')
            // Clean up multiple semicolons and whitespace
            .replace(/;\s*;/g, ';')
            .replace(/^\s*;\s*/g, '')
            .trim();

        return cleaned ? `style="${cleaned}"` : '';
    });
}

const EMAIL_STYLE_SCOPE = '.email-content';
const KEYFRAME_SELECTOR = /^(?:from|to|\d+(?:\.\d+)?%)$/i;
const DOCUMENT_ROOT_SELECTOR = /^(?:(?:html|body|:root)(?=\s|>|$)\s*>?\s*)+/i;

function scopeSelector(selector, scope) {
    const rest = selector.replace(DOCUMENT_ROOT_SELECTOR, '').trim();
    return rest ? `${scope} ${rest}` : scope;
}

/**
 * Prefixes every selector in a stylesheet so email CSS cannot restyle the app
 * @param {string} cssText - Stylesheet text from an email
 * @param {string} [scope] - Selector of the email container
 * @returns {string} Scoped stylesheet text
 */
export function scopeCss(cssText, scope = EMAIL_STYLE_SCOPE) {
    if (!cssText) return '';

    return cssText.replace(/([^{}]+)\{/g, (match, prelude) => {
        const selectors = prelude.split(',').map((selector) => selector.trim());
        if (
            selectors[0].startsWith('@') ||
            selectors.every((selector) => !selector || KEYFRAME_SELECTOR.test(selector))
        ) {
            return match;
        }

        const leadingWhitespace = prelude.match(/^\s*/)[0];
        const scoped = selectors
            .filter(Boolean)
            .map((selector) => scopeSelector(selector, scope))
            .join(', ');
        return `${leadingWhitespace}${scoped} {`;
    });
}

let emailPurifier = null;

// Separate instance so the email hooks don't affect other sanitizeHTML callers.
function getEmailPurifier() {
    if (emailPurifier) return emailPurifier;

    emailPurifier = DOMPurify(window);
    emailPurifier.addHook('afterSanitizeElements', (node) => {
        if (node.nodeName === 'STYLE') {
            node.textContent = scopeCss(node.textContent);
        }
    });
    emailPurifier.addHook('afterSanitizeAttributes', (node) => {
        const href = node.nodeName === 'A' ? node.getAttribute('href') : null;
        if (href && !href.startsWith('#')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });
    return emailPurifier;
}

function purify(purifier, html, configOverrides) {
    if (!html) return '';

    try {
        return purifier.sanitize(cleanMsoStyles(html), { ...SANITIZE_CONFIG, ...configOverrides });
    } catch (error) {
        console.error('Error sanitizing HTML:', error);
        return escapeHTML(html);
    }
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param {string} html - The untrusted HTML content
 * @param {Object} [configOverrides] - Extra DOMPurify options
 * @returns {string} Sanitized HTML safe for innerHTML
 */
export function sanitizeHTML(html, configOverrides = {}) {
    return purify(DOMPurify, html, configOverrides);
}

/**
 * Sanitizes an email body for the message viewer.
 * Style sheets are scoped to the email container and links open outside the app.
 * Sanitizing happens before any DOM sees the markup, so no handler can fire.
 * @param {string} html - The untrusted email HTML
 * @returns {string} Sanitized HTML safe for innerHTML
 */
export function sanitizeEmailHTML(html) {
    return purify(getEmailPurifier(), html);
}

const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

/**
 * Escapes HTML special characters; the result is safe in text and quoted attributes
 * @param {string} text - Plain text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHTML(text) {
    if (text === null || text === undefined || text === '') return '';
    return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
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
