/**
 * Regression tests for HTML injection from crafted .msg/.eml files.
 * Uses the real DOMPurify, unlike the UI tests that mock it.
 */
import { sanitizeEmailHTML, scopeCss } from '../src/js/sanitizer.js';
import { toSafeMimeType } from '../src/js/helpers.js';
import { messageToHtmlDocument } from '../src/js/messageExport.js';
import { MessageListRenderer } from '../src/js/ui/MessageListRenderer.js';
import { MessageContentRenderer } from '../src/js/ui/MessageContentRenderer.js';
import { ToastManager } from '../src/js/ui/ToastManager.js';

const PAYLOAD = '<img src=x onerror="window.__xss=1">';

function createMessage(overrides = {}) {
    return {
        subject: PAYLOAD,
        senderName: PAYLOAD,
        senderEmail: 'attacker@example.com',
        recipients: [],
        timestamp: new Date('2024-06-15T10:30:00Z'),
        bodyContent: PAYLOAD,
        bodyContentHTML: '',
        fileName: 'evil.eml',
        attachments: [],
        ...overrides
    };
}

function createModalStub(overrides = {}) {
    return {
        setAttachments: jest.fn(),
        isPreviewable: jest.fn(() => false),
        isPreviewableImage: jest.fn(() => false),
        isPdf: jest.fn(() => false),
        isText: jest.fn(() => false),
        isPreviewableEml: jest.fn(() => false),
        setInlineImageMetadata: jest.fn(),
        openInlineImage: jest.fn(),
        ...overrides
    };
}

afterEach(() => {
    document.body.innerHTML = '';
    delete window.__xss;
});

describe('message list', () => {
    function renderList(message) {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const handler = {
            getCurrentMessage: () => null,
            getMessages: () => [message],
            isPinned: () => false
        };
        new MessageListRenderer(container, handler).render();
        return container;
    }

    test('renders subject, sender and preview as text', () => {
        const container = renderList(createMessage());

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.message-subject').textContent).toBe(PAYLOAD);
        expect(container.querySelector('.message-sender').textContent).toBe(PAYLOAD);
    });

    test('preview cannot be smuggled past the tag-stripping regex', () => {
        // An unterminated tag survives /<[^>]*>/ and would swallow the next element
        const container = renderList(
            createMessage({ bodyContent: 'hi <img src=x onerror=alert(1) ' })
        );

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.message-preview').textContent).toContain('<img');
    });
});

describe('message viewer', () => {
    function renderMessage(message, modal = createModalStub()) {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const handler = {
            setCurrentMessage: jest.fn(),
            getMessages: () => [message],
            isPinned: () => false
        };
        const renderer = new MessageContentRenderer(container, handler, modal);
        renderer.render(message);
        return { container, renderer };
    }

    test('renders the subject header as text', () => {
        const { container } = renderMessage(createMessage());

        expect(container.querySelector('.message-title').textContent).toBe(PAYLOAD);
        expect(container.querySelector('.message-header img')).toBeNull();
    });

    test('shows plain-text bodies literally', () => {
        const { container } = renderMessage(createMessage());

        expect(container.querySelector('.email-content img')).toBeNull();
        expect(container.querySelector('.email-content').textContent).toContain(PAYLOAD);
    });

    test('never hands unsanitized body HTML to a live element', () => {
        const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        const assigned = [];
        jest.spyOn(Element.prototype, 'innerHTML', 'set').mockImplementation(function (value) {
            assigned.push(String(value));
            descriptor.set.call(this, value);
        });

        try {
            renderMessage(
                createMessage({
                    subject: 'ok',
                    senderName: 'ok',
                    bodyContentHTML: `<style>p{color:red}</style><p>Hi</p>${PAYLOAD}`
                })
            );
        } finally {
            jest.restoreAllMocks();
        }

        expect(assigned.some((html) => html.includes('onerror'))).toBe(false);
    });

    test('escapes attachment metadata', () => {
        const attachment = {
            fileName: PAYLOAD,
            attachMimeTag: 'image/png"><img src=x onerror=alert(1)>',
            contentLength: 10,
            contentBase64: 'data:image/png;base64,AA=="><img src=x onerror=alert(1)>'
        };
        const modal = createModalStub({
            isPreviewable: jest.fn(() => true),
            isPreviewableImage: jest.fn(() => true)
        });
        const { container } = renderMessage(
            createMessage({ subject: 'ok', senderName: 'ok', attachments: [attachment] }),
            modal
        );

        const images = container.querySelectorAll('.attachment-sections img');
        expect(images).toHaveLength(1);
        expect(images[0].getAttribute('onerror')).toBeNull();
        expect(container.querySelector('.attachment-filename').textContent).toBe(PAYLOAD);
    });
});

describe('sanitizeEmailHTML', () => {
    test('removes script vectors', () => {
        const result = sanitizeEmailHTML(
            `${PAYLOAD}<svg onload=alert(1)></svg><a href="javascript:alert(1)">x</a><script>alert(1)</script>`
        );

        expect(result).not.toMatch(/onerror|onload|javascript:|<script/i);
    });

    test('scopes style elements to the email container', () => {
        const result = sanitizeEmailHTML(
            '<p>x</p><style>body, .app-header { display:none }</style>'
        );

        expect(result).toContain('.email-content, .email-content .app-header {');
    });

    test('opens web links outside the app', () => {
        const result = sanitizeEmailHTML('<a href="https://example.com">x</a><a href="#top">y</a>');
        const doc = new DOMParser().parseFromString(result, 'text/html');
        const [external, anchor] = doc.querySelectorAll('a');

        expect(external.getAttribute('target')).toBe('_blank');
        expect(external.getAttribute('rel')).toBe('noopener noreferrer');
        expect(anchor.hasAttribute('target')).toBe(false);
    });
});

describe('scopeCss', () => {
    test('prefixes every selector in a list', () => {
        expect(scopeCss('p, a:hover { color: red }')).toBe(
            '.email-content p, .email-content a:hover { color: red }'
        );
    });

    test('maps document roots to the container', () => {
        expect(scopeCss('html body > div { x: y }')).toBe('.email-content div { x: y }');
        expect(scopeCss(':root { x: y }')).toBe('.email-content { x: y }');
    });

    test('leaves at-rules and keyframe steps alone', () => {
        expect(scopeCss('@media (max-width: 600px) { p { x: y } }')).toBe(
            '@media (max-width: 600px) { .email-content p { x: y } }'
        );
        expect(scopeCss('@keyframes k { from { x: y } 50% { x: z } }')).toBe(
            '@keyframes k { from { x: y } 50% { x: z } }'
        );
    });
});

describe('toSafeMimeType', () => {
    test('keeps well-formed types', () => {
        expect(toSafeMimeType('Image/PNG')).toBe('image/png');
        expect(toSafeMimeType('application/vnd.ms-outlook')).toBe('application/vnd.ms-outlook');
    });

    test('replaces anything that could break out of a data URL', () => {
        expect(toSafeMimeType('image/png"><img src=x>')).toBe('application/octet-stream');
        expect(toSafeMimeType('text/html;base64,PHNjcmlwdD4')).toBe('application/octet-stream');
        expect(toSafeMimeType(undefined)).toBe('application/octet-stream');
    });
});

describe('toast notifications', () => {
    test('render messages as text', () => {
        new ToastManager().show(`Failed to open: /tmp/${PAYLOAD}.eml`, 'error');

        expect(document.querySelector('.toast img')).toBeNull();
        expect(document.querySelector('.toast').textContent).toContain(PAYLOAD);
    });
});

describe('HTML export', () => {
    test('sanitizes the body and forbids scripts in the exported page', () => {
        const html = messageToHtmlDocument(
            createMessage({
                subject: 'ok',
                senderName: 'ok',
                bodyContentHTML: `<p>Hi</p>${PAYLOAD}<script>alert(1)</script>`
            })
        );

        expect(html).toContain('http-equiv="Content-Security-Policy"');
        expect(html).toContain("default-src 'none'");
        expect(html).not.toMatch(/onerror|<script/i);
        expect(html).toContain('<p>Hi</p>');
    });
});
