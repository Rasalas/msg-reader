# ADR 003: DOMPurify for HTML Sanitization

## Status
Accepted

## Context
Email files (.msg, .eml) contain HTML content that could include malicious scripts or XSS payloads. Displaying untrusted HTML safely is critical for security.

## Decision
Use DOMPurify with a custom allowlist configuration for HTML sanitization.

## Rationale

1. **Security Track Record**: DOMPurify is battle-tested, actively maintained, and used by major organizations (Mozilla, etc.).

2. **Configurability**: Allows fine-grained control over allowed tags and attributes for email-specific needs.

3. **Performance**: Fast DOM-based sanitization with minimal overhead.

4. **Email Compatibility**: Can allow email-specific elements (font, center, tables) while blocking dangerous ones.

5. **No Server Required**: Client-side sanitization maintains the "no server" privacy model.

## Configuration

The sanitizer allows common email elements while blocking dangerous ones:

**Allowed Tags**: p, div, span, table, img, a, h1-h6, ul, ol, li, blockquote, pre, font, center, style

**Forbidden Tags**: script, iframe, object, embed, form, input, button, applet, base, meta, link

**Forbidden Attributes**: onerror, onload, onclick, onmouseover, etc. (all event handlers)

**URL Sanitization**: Only http://, https://, mailto:, and data:image/ protocols are allowed.

## Consequences

### Positive
- Strong XSS protection
- Preserves legitimate email formatting
- Handles legacy HTML (font tags, tables, inline styles)
- Active security maintenance and CVE responses
- Works client-side maintaining privacy

### Negative
- Some complex emails may lose formatting
- Embedded content (iframes, forms) is stripped
- Must update DOMPurify for security patches

## Implementation

```javascript
import { sanitizeHTML } from './sanitizer.js';

// All email HTML passes through sanitizer before DOM insertion
const safeHTML = sanitizeHTML(email.body);
element.innerHTML = safeHTML;
```

## Alternatives Considered

| Option | Reason for Rejection |
|--------|---------------------|
| sanitize-html | Less maintained, Node.js focused |
| js-xss | Less configurable for email use case |
| iframe sandbox | Still allows some attacks, poor UX |
| Text-only display | Loses email formatting completely |
