/**
 * Tests for UIManager.js
 * Tests UI rendering, message display, modals, toasts, and event handling
 */

// Mock the tauri-bridge module
jest.mock('../src/js/tauri-bridge.js', () => ({
    isTauri: jest.fn(() => false),
    openWithSystemViewer: jest.fn(() => Promise.resolve())
}));

// Mock DOMPurify - return input as-is for testing
jest.mock('dompurify', () => ({
    sanitize: jest.fn((html) => html)
}));

import UIManager from '../src/js/UIManager.js';
import { isTauri, openWithSystemViewer } from '../src/js/tauri-bridge.js';

describe('UIManager', () => {
    let uiManager;
    let mockMessageHandler;

    /**
     * Creates a mock message object for testing
     */
    function createMockMessage(overrides = {}) {
        return {
            subject: 'Test Subject',
            senderName: 'John Doe',
            senderEmail: 'john@example.com',
            recipients: [
                { name: 'Jane Doe', email: 'jane@example.com', recipType: 'to' },
                { name: 'Bob Smith', email: 'bob@example.com', recipType: 'cc' }
            ],
            timestamp: new Date('2024-06-15T10:30:00Z'),
            bodyContent: 'Plain text body',
            bodyContentHTML: '<p>HTML body content</p>',
            fileName: 'test.msg',
            messageHash: 'hash123',
            attachments: [],
            ...overrides
        };
    }

    /**
     * Sets up the DOM structure required by UIManager
     */
    function setupDOM() {
        document.body.innerHTML = `
            <div id="welcomeScreen" style="display: flex;"></div>
            <div id="appContainer" style="display: none;"></div>
            <div id="messageItems" role="listbox"></div>
            <div id="messageViewer"></div>
            <div class="drop-overlay"></div>

            <!-- Attachment Modal -->
            <div id="attachmentModal">
                <div class="attachment-modal-backdrop"></div>
                <button id="attachmentModalClose"></button>
                <a id="attachmentModalDownload"></a>
                <span id="attachmentModalFilename"></span>
                <div id="attachmentModalContent"></div>
                <button id="attachmentModalPrev" style="display: none;"></button>
                <button id="attachmentModalNext" style="display: none;"></button>
            </div>

            <div id="aria-live" aria-live="polite"></div>
        `;
    }

    beforeEach(() => {
        setupDOM();

        mockMessageHandler = {
            getMessages: jest.fn(() => []),
            getCurrentMessage: jest.fn(() => null),
            setCurrentMessage: jest.fn(),
            isPinned: jest.fn(() => false),
            togglePin: jest.fn(),
            deleteMessage: jest.fn()
        };

        // Reset window.app mock
        window.app = {
            showMessage: jest.fn(),
            togglePin: jest.fn(),
            deleteMessage: jest.fn()
        };

        uiManager = new UIManager(mockMessageHandler);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        delete window.app;
    });

    describe('constructor', () => {
        test('initializes DOM element references', () => {
            expect(uiManager.welcomeScreen).toBe(document.getElementById('welcomeScreen'));
            expect(uiManager.appContainer).toBe(document.getElementById('appContainer'));
            expect(uiManager.messageItems).toBe(document.getElementById('messageItems'));
            expect(uiManager.messageViewer).toBe(document.getElementById('messageViewer'));
        });

        test('initializes modal element references', () => {
            expect(uiManager.attachmentModal).toBe(document.getElementById('attachmentModal'));
            expect(uiManager.attachmentModalClose).toBe(document.getElementById('attachmentModalClose'));
            expect(uiManager.attachmentModalContent).toBe(document.getElementById('attachmentModalContent'));
        });

        test('initializes modal state', () => {
            expect(uiManager.currentAttachmentIndex).toBe(0);
            expect(uiManager.previewableAttachments).toEqual([]);
        });

        test('stores messageHandler reference', () => {
            expect(uiManager.messageHandler).toBe(mockMessageHandler);
        });
    });

    describe('setKeyboardManager', () => {
        test('sets keyboard manager reference', () => {
            const mockKeyboardManager = { setContext: jest.fn() };
            uiManager.setKeyboardManager(mockKeyboardManager);
            expect(uiManager.keyboardManager).toBe(mockKeyboardManager);
        });
    });

    describe('showWelcomeScreen', () => {
        test('shows welcome screen and hides app container', () => {
            uiManager.showAppContainer(); // First show app
            uiManager.showWelcomeScreen();

            expect(uiManager.welcomeScreen.style.display).toBe('flex');
            expect(uiManager.appContainer.style.display).toBe('none');
        });
    });

    describe('showAppContainer', () => {
        test('hides welcome screen and shows app container', () => {
            uiManager.showAppContainer();

            expect(uiManager.welcomeScreen.style.display).toBe('none');
            expect(uiManager.appContainer.style.display).toBe('flex');
        });
    });

    describe('updateMessageList', () => {
        test('renders empty message list', () => {
            mockMessageHandler.getMessages.mockReturnValue([]);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.innerHTML).toBe('');
        });

        test('renders message items', () => {
            const messages = [createMockMessage()];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(messages[0]);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.querySelectorAll('.message-item').length).toBe(1);
        });

        test('marks active message', () => {
            const messages = [createMockMessage()];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(messages[0]);

            uiManager.updateMessageList();

            const messageItem = uiManager.messageItems.querySelector('.message-item');
            expect(messageItem.classList.contains('active')).toBe(true);
            expect(messageItem.getAttribute('aria-selected')).toBe('true');
        });

        test('marks pinned messages', () => {
            const messages = [createMockMessage()];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(messages[0]);
            mockMessageHandler.isPinned.mockReturnValue(true);

            uiManager.updateMessageList();

            const messageItem = uiManager.messageItems.querySelector('.message-item');
            expect(messageItem.classList.contains('pinned')).toBe(true);
        });

        test('renders sender name', () => {
            const messages = [createMockMessage({ senderName: 'Alice Smith' })];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.innerHTML).toContain('Alice Smith');
        });

        test('renders subject', () => {
            const messages = [createMockMessage({ subject: 'Important Meeting' })];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.innerHTML).toContain('Important Meeting');
        });

        test('shows attachment icon for messages with attachments', () => {
            const messages = [createMockMessage({
                attachments: [{ fileName: 'doc.pdf', attachMimeTag: 'application/pdf' }]
            })];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.querySelector('.attachment-icon')).toBeTruthy();
        });

        test('does not show attachment icon for inline attachments only', () => {
            const messages = [createMockMessage({
                attachments: [{ fileName: 'inline.png', pidContentId: 'cid:123' }]
            })];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.querySelector('.attachment-icon')).toBeFalsy();
        });

        test('sets data-message-index attribute', () => {
            const messages = [createMockMessage(), createMockMessage({ subject: 'Second' })];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);

            uiManager.updateMessageList();

            const items = uiManager.messageItems.querySelectorAll('[data-message-index]');
            expect(items[0].dataset.messageIndex).toBe('0');
            expect(items[1].dataset.messageIndex).toBe('1');
        });

        test('sets aria-activedescendant when message is selected', () => {
            const messages = [createMockMessage()];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(messages[0]);

            uiManager.updateMessageList();

            expect(uiManager.messageItems.getAttribute('aria-activedescendant')).toBe('message-0');
        });
    });

    describe('showMessage', () => {
        test('sets current message in handler', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(mockMessageHandler.setCurrentMessage).toHaveBeenCalledWith(message);
        });

        test('renders message subject', () => {
            const message = createMockMessage({ subject: 'Test Email Subject' });
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(uiManager.messageViewer.innerHTML).toContain('Test Email Subject');
        });

        test('renders sender information', () => {
            const message = createMockMessage({
                senderName: 'Alice',
                senderEmail: 'alice@example.com'
            });
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(uiManager.messageViewer.innerHTML).toContain('Alice');
            expect(uiManager.messageViewer.innerHTML).toContain('alice@example.com');
        });

        test('renders To recipients', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(uiManager.messageViewer.innerHTML).toContain('Jane Doe');
            expect(uiManager.messageViewer.innerHTML).toContain('jane@example.com');
        });

        test('renders CC recipients', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(uiManager.messageViewer.innerHTML).toContain('Bob Smith');
            expect(uiManager.messageViewer.innerHTML).toContain('bob@example.com');
        });

        test('renders HTML body content', () => {
            const message = createMockMessage({
                bodyContentHTML: '<p>This is <strong>HTML</strong> content</p>'
            });
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            expect(uiManager.messageViewer.innerHTML).toContain('<strong>HTML</strong>');
        });

        test('renders pin button with correct data attributes', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            const pinButton = uiManager.messageViewer.querySelector('[data-action="pin"]');
            expect(pinButton).toBeTruthy();
            expect(pinButton.dataset.index).toBe('0');
        });

        test('renders delete button with correct data attributes', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);

            uiManager.showMessage(message);

            const deleteButton = uiManager.messageViewer.querySelector('[data-action="delete"]');
            expect(deleteButton).toBeTruthy();
            expect(deleteButton.dataset.index).toBe('0');
        });

        test('adds pinned class when message is pinned', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);
            mockMessageHandler.isPinned.mockReturnValue(true);

            uiManager.showMessage(message);

            const pinButton = uiManager.messageViewer.querySelector('[data-action="pin"]');
            expect(pinButton.classList.contains('pinned')).toBe(true);
        });
    });

    describe('formatRecipients', () => {
        test('formats to recipients', () => {
            const recipients = [
                { name: 'Alice', email: 'alice@test.com', recipType: 'to' },
                { name: 'Bob', email: 'bob@test.com', recipType: 'to' }
            ];

            const result = uiManager.formatRecipients(recipients, 'to');

            expect(result).toContain('Alice');
            expect(result).toContain('alice@test.com');
            expect(result).toContain('Bob');
            expect(result).toContain('bob@test.com');
        });

        test('formats cc recipients', () => {
            const recipients = [
                { name: 'Alice', email: 'alice@test.com', recipType: 'to' },
                { name: 'Charlie', email: 'charlie@test.com', recipType: 'cc' }
            ];

            const result = uiManager.formatRecipients(recipients, 'cc');

            expect(result).toContain('Charlie');
            expect(result).toContain('charlie@test.com');
            expect(result).not.toContain('Alice');
        });

        test('returns empty string when no matching recipients', () => {
            const recipients = [
                { name: 'Alice', email: 'alice@test.com', recipType: 'to' }
            ];

            const result = uiManager.formatRecipients(recipients, 'cc');

            expect(result).toBe('');
        });

        test('joins multiple recipients with comma', () => {
            const recipients = [
                { name: 'A', email: 'a@test.com', recipType: 'to' },
                { name: 'B', email: 'b@test.com', recipType: 'to' }
            ];

            const result = uiManager.formatRecipients(recipients, 'to');

            expect(result).toContain(', ');
        });
    });

    describe('processEmailContent', () => {
        test('returns HTML content when available', () => {
            const msgInfo = {
                bodyContentHTML: '<p>HTML content</p>',
                bodyContent: 'Plain text'
            };

            const result = uiManager.processEmailContent(msgInfo);

            expect(result).toContain('<p>');
        });

        test('converts plain text to HTML when no HTML available', () => {
            const msgInfo = {
                bodyContentHTML: null,
                bodyContent: 'Line one\n\nLine two'
            };

            const result = uiManager.processEmailContent(msgInfo);

            expect(result).toContain('<p>');
            expect(result).toContain('</p>');
        });

        test('converts line breaks to br tags', () => {
            const msgInfo = {
                bodyContentHTML: null,
                bodyContent: 'Line one\nLine two'
            };

            const result = uiManager.processEmailContent(msgInfo);

            expect(result).toContain('<br>');
        });

        test('handles Windows line endings', () => {
            const msgInfo = {
                bodyContentHTML: null,
                bodyContent: 'Line one\r\nLine two'
            };

            const result = uiManager.processEmailContent(msgInfo);

            expect(result).toContain('<br>');
        });
    });

    describe('scopeEmailStyles', () => {
        test('returns empty string for falsy input', () => {
            expect(uiManager.scopeEmailStyles(null)).toBe('');
            expect(uiManager.scopeEmailStyles('')).toBe('');
            expect(uiManager.scopeEmailStyles(undefined)).toBe('');
        });

        test('scopes style rules to .email-content', () => {
            const html = '<style>p { color: red; }</style><p>Test</p>';
            const result = uiManager.scopeEmailStyles(html);

            expect(result).toContain('.email-content');
        });

        test('returns content without style tags unchanged', () => {
            const html = '<p>No styles here</p>';
            const result = uiManager.scopeEmailStyles(html);

            expect(result).toBe('<p>No styles here</p>');
        });
    });

    describe('MIME type detection methods', () => {
        describe('isPreviewableImage', () => {
            test('returns true for jpeg', () => {
                expect(uiManager.isPreviewableImage('image/jpeg')).toBe(true);
            });

            test('returns true for png', () => {
                expect(uiManager.isPreviewableImage('image/png')).toBe(true);
            });

            test('returns true for gif', () => {
                expect(uiManager.isPreviewableImage('image/gif')).toBe(true);
            });

            test('returns true for webp', () => {
                expect(uiManager.isPreviewableImage('image/webp')).toBe(true);
            });

            test('returns true for svg', () => {
                expect(uiManager.isPreviewableImage('image/svg+xml')).toBe(true);
            });

            test('returns true for bmp', () => {
                expect(uiManager.isPreviewableImage('image/bmp')).toBe(true);
            });

            test('returns false for pdf', () => {
                expect(uiManager.isPreviewableImage('application/pdf')).toBe(false);
            });

            test('returns false for null/undefined', () => {
                expect(uiManager.isPreviewableImage(null)).toBe(false);
                expect(uiManager.isPreviewableImage(undefined)).toBe(false);
            });

            test('handles case insensitivity', () => {
                expect(uiManager.isPreviewableImage('IMAGE/JPEG')).toBe(true);
            });
        });

        describe('isPdf', () => {
            test('returns true for application/pdf', () => {
                expect(uiManager.isPdf('application/pdf')).toBe(true);
            });

            test('returns false for other types', () => {
                expect(uiManager.isPdf('image/jpeg')).toBe(false);
            });

            test('returns false for null/undefined', () => {
                expect(uiManager.isPdf(null)).toBe(false);
                expect(uiManager.isPdf(undefined)).toBe(false);
            });

            test('handles case insensitivity', () => {
                expect(uiManager.isPdf('APPLICATION/PDF')).toBe(true);
            });
        });

        describe('isText', () => {
            test('returns true for text/plain', () => {
                expect(uiManager.isText('text/plain')).toBe(true);
            });

            test('returns true for text/html', () => {
                expect(uiManager.isText('text/html')).toBe(true);
            });

            test('returns true for application/json', () => {
                expect(uiManager.isText('application/json')).toBe(true);
            });

            test('returns true for application/xml', () => {
                expect(uiManager.isText('application/xml')).toBe(true);
            });

            test('returns true for application/javascript', () => {
                expect(uiManager.isText('application/javascript')).toBe(true);
            });

            test('returns true for application/x-diff', () => {
                expect(uiManager.isText('application/x-diff')).toBe(true);
            });

            test('returns false for binary types', () => {
                expect(uiManager.isText('application/octet-stream')).toBe(false);
            });

            test('returns false for null/undefined', () => {
                expect(uiManager.isText(null)).toBe(false);
                expect(uiManager.isText(undefined)).toBe(false);
            });
        });

        describe('isPreviewable', () => {
            test('returns true for images', () => {
                expect(uiManager.isPreviewable('image/png')).toBe(true);
            });

            test('returns true for PDFs', () => {
                expect(uiManager.isPreviewable('application/pdf')).toBe(true);
            });

            test('returns true for text', () => {
                expect(uiManager.isPreviewable('text/plain')).toBe(true);
            });

            test('returns false for non-previewable types', () => {
                expect(uiManager.isPreviewable('application/octet-stream')).toBe(false);
            });
        });
    });

    describe('formatMessageDate', () => {
        test('returns time for today', () => {
            const now = new Date();
            const result = uiManager.formatMessageDate(now);

            // Should contain time format (HH:MM)
            expect(result).toMatch(/\d{1,2}:\d{2}/);
        });

        test('returns "Yesterday" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const result = uiManager.formatMessageDate(yesterday);

            expect(result).toBe('Yesterday');
        });

        test('returns month and day for same year', () => {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);

            const result = uiManager.formatMessageDate(date);

            // Should contain month abbreviation and day
            expect(result).toMatch(/[A-Za-z]+\.?\s+\d+/);
        });

        test('returns ISO date for different year', () => {
            const oldDate = new Date('2020-06-15');

            const result = uiManager.formatMessageDate(oldDate);

            expect(result).toBe('2020-06-15');
        });

        test('returns "Unknown date" for invalid date', () => {
            expect(uiManager.formatMessageDate(null)).toBe('Unknown date');
            expect(uiManager.formatMessageDate(undefined)).toBe('Unknown date');
            expect(uiManager.formatMessageDate(new Date('invalid'))).toBe('Unknown date');
        });

        test('returns "Unknown date" for non-Date objects', () => {
            expect(uiManager.formatMessageDate('2024-01-01')).toBe('Unknown date');
            expect(uiManager.formatMessageDate(123456)).toBe('Unknown date');
        });
    });

    describe('Drop overlay', () => {
        test('showDropOverlay adds active class', () => {
            uiManager.showDropOverlay();

            expect(uiManager.dropOverlay.classList.contains('active')).toBe(true);
        });

        test('hideDropOverlay removes active class', () => {
            uiManager.dropOverlay.classList.add('active');
            uiManager.hideDropOverlay();

            expect(uiManager.dropOverlay.classList.contains('active')).toBe(false);
        });
    });

    describe('Toast notifications', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('showToast creates toast container if not exists', () => {
            expect(document.getElementById('toast-container')).toBeFalsy();

            uiManager.showToast('Test message');

            expect(document.getElementById('toast-container')).toBeTruthy();
        });

        test('showToast creates toast element', () => {
            uiManager.showToast('Test message');

            const toast = document.querySelector('.toast');
            expect(toast).toBeTruthy();
            expect(toast.textContent).toContain('Test message');
        });

        test('showToast applies error styling', () => {
            uiManager.showToast('Error message', 'error');

            const toast = document.querySelector('.toast');
            expect(toast.classList.contains('toast-error')).toBe(true);
            expect(toast.className).toContain('bg-red-500');
        });

        test('showToast applies warning styling', () => {
            uiManager.showToast('Warning message', 'warning');

            const toast = document.querySelector('.toast');
            expect(toast.classList.contains('toast-warning')).toBe(true);
            expect(toast.className).toContain('bg-yellow-500');
        });

        test('showToast applies info styling', () => {
            uiManager.showToast('Info message', 'info');

            const toast = document.querySelector('.toast');
            expect(toast.classList.contains('toast-info')).toBe(true);
            expect(toast.className).toContain('bg-blue-500');
        });

        test('showToast defaults to info type', () => {
            uiManager.showToast('Message');

            const toast = document.querySelector('.toast');
            expect(toast.className).toContain('bg-blue-500');
        });

        test('showError calls showToast with error type', () => {
            const spy = jest.spyOn(uiManager, 'showToast');
            uiManager.showError('Error!');

            expect(spy).toHaveBeenCalledWith('Error!', 'error', 5000);
        });

        test('showWarning calls showToast with warning type', () => {
            const spy = jest.spyOn(uiManager, 'showToast');
            uiManager.showWarning('Warning!');

            expect(spy).toHaveBeenCalledWith('Warning!', 'warning', 4000);
        });

        test('showInfo calls showToast with info type', () => {
            const spy = jest.spyOn(uiManager, 'showToast');
            uiManager.showInfo('Info!');

            expect(spy).toHaveBeenCalledWith('Info!', 'info', 3000);
        });

        test('toast auto-dismisses after duration', () => {
            uiManager.showToast('Test', 'info', 3000);

            expect(document.querySelectorAll('.toast').length).toBe(1);

            // Advance timers past duration + animation time
            jest.advanceTimersByTime(3300);

            expect(document.querySelectorAll('.toast').length).toBe(0);
        });

        test('multiple toasts can be displayed', () => {
            uiManager.showToast('First');
            uiManager.showToast('Second');
            uiManager.showToast('Third');

            expect(document.querySelectorAll('.toast').length).toBe(3);
        });
    });

    describe('Attachment modal', () => {
        const createMockAttachment = (overrides = {}) => ({
            fileName: 'test.jpg',
            attachMimeTag: 'image/jpeg',
            contentBase64: 'data:image/jpeg;base64,abc123',
            contentLength: 1024,
            ...overrides
        });

        test('openAttachmentModal shows modal', () => {
            const attachment = createMockAttachment();
            uiManager.currentAttachments = [attachment];

            uiManager.openAttachmentModal(attachment);

            expect(uiManager.attachmentModal.classList.contains('active')).toBe(true);
        });

        test('openAttachmentModal prevents body scroll', () => {
            const attachment = createMockAttachment();
            uiManager.currentAttachments = [attachment];

            uiManager.openAttachmentModal(attachment);

            expect(document.body.style.overflow).toBe('hidden');
        });

        test('openAttachmentModal sets keyboard context', () => {
            const mockKeyboardManager = { setContext: jest.fn() };
            uiManager.setKeyboardManager(mockKeyboardManager);
            const attachment = createMockAttachment();
            uiManager.currentAttachments = [attachment];

            uiManager.openAttachmentModal(attachment);

            expect(mockKeyboardManager.setContext).toHaveBeenCalledWith('modal');
        });

        test('closeAttachmentModal hides modal', () => {
            uiManager.attachmentModal.classList.add('active');

            uiManager.closeAttachmentModal();

            expect(uiManager.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('closeAttachmentModal restores body scroll', () => {
            document.body.style.overflow = 'hidden';

            uiManager.closeAttachmentModal();

            expect(document.body.style.overflow).toBe('');
        });

        test('closeAttachmentModal sets keyboard context to main', () => {
            const mockKeyboardManager = { setContext: jest.fn() };
            uiManager.setKeyboardManager(mockKeyboardManager);

            uiManager.closeAttachmentModal();

            expect(mockKeyboardManager.setContext).toHaveBeenCalledWith('main');
        });

        test('closeAttachmentModal clears content', () => {
            uiManager.attachmentModalContent.innerHTML = '<p>Old content</p>';

            uiManager.closeAttachmentModal();

            expect(uiManager.attachmentModalContent.innerHTML).toBe('');
        });

        test('renderAttachmentPreview sets filename', () => {
            const attachment = createMockAttachment({ fileName: 'document.pdf' });

            uiManager.renderAttachmentPreview(attachment);

            expect(uiManager.attachmentModalFilename.textContent).toBe('document.pdf');
        });

        test('renderAttachmentPreview sets download link', () => {
            const attachment = createMockAttachment();

            uiManager.renderAttachmentPreview(attachment);

            expect(uiManager.attachmentModalDownload.href).toContain(attachment.contentBase64);
            expect(uiManager.attachmentModalDownload.download).toBe(attachment.fileName);
        });

        test('renderAttachmentPreview creates img for images', () => {
            const attachment = createMockAttachment({
                attachMimeTag: 'image/png',
                contentBase64: 'data:image/png;base64,xyz'
            });

            uiManager.renderAttachmentPreview(attachment);

            const img = uiManager.attachmentModalContent.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.src).toContain('data:image/png');
        });

        test('renderAttachmentPreview creates object for PDFs', () => {
            const attachment = createMockAttachment({
                attachMimeTag: 'application/pdf',
                contentBase64: 'data:application/pdf;base64,xyz'
            });

            uiManager.renderAttachmentPreview(attachment);

            const pdfObject = uiManager.attachmentModalContent.querySelector('object');
            expect(pdfObject).toBeTruthy();
            expect(pdfObject.type).toBe('application/pdf');
        });

        test('renderAttachmentPreview creates pre for text', () => {
            const textContent = btoa('Hello World');
            const attachment = createMockAttachment({
                attachMimeTag: 'text/plain',
                contentBase64: `data:text/plain;base64,${textContent}`
            });

            uiManager.renderAttachmentPreview(attachment);

            const pre = uiManager.attachmentModalContent.querySelector('pre');
            expect(pre).toBeTruthy();
            expect(pre.textContent).toBe('Hello World');
        });

        test('openAttachmentModal opens PDF with system viewer in Tauri', async () => {
            isTauri.mockReturnValue(true);
            const attachment = createMockAttachment({
                attachMimeTag: 'application/pdf',
                contentBase64: 'data:application/pdf;base64,xyz'
            });

            uiManager.openAttachmentModal(attachment);

            expect(openWithSystemViewer).toHaveBeenCalledWith(
                attachment.contentBase64,
                attachment.fileName
            );
            expect(uiManager.attachmentModal.classList.contains('active')).toBe(false);
        });
    });

    describe('Attachment navigation', () => {
        const attachments = [
            { fileName: 'a.jpg', attachMimeTag: 'image/jpeg', contentBase64: 'data:image/jpeg;base64,a' },
            { fileName: 'b.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,b' },
            { fileName: 'c.gif', attachMimeTag: 'image/gif', contentBase64: 'data:image/gif;base64,c' }
        ];

        beforeEach(() => {
            uiManager.currentAttachments = attachments;
            uiManager.previewableAttachments = attachments;
        });

        test('showNextAttachment advances to next', () => {
            uiManager.currentAttachmentIndex = 0;

            uiManager.showNextAttachment();

            expect(uiManager.currentAttachmentIndex).toBe(1);
        });

        test('showNextAttachment does not advance past end', () => {
            uiManager.currentAttachmentIndex = 2;

            uiManager.showNextAttachment();

            expect(uiManager.currentAttachmentIndex).toBe(2);
        });

        test('showPrevAttachment goes to previous', () => {
            uiManager.currentAttachmentIndex = 1;

            uiManager.showPrevAttachment();

            expect(uiManager.currentAttachmentIndex).toBe(0);
        });

        test('showPrevAttachment does not go below zero', () => {
            uiManager.currentAttachmentIndex = 0;

            uiManager.showPrevAttachment();

            expect(uiManager.currentAttachmentIndex).toBe(0);
        });

        test('updateNavButtons hides prev at start', () => {
            uiManager.currentAttachmentIndex = 0;

            uiManager.updateNavButtons();

            expect(uiManager.attachmentModalPrev.style.display).toBe('none');
            expect(uiManager.attachmentModalNext.style.display).toBe('flex');
        });

        test('updateNavButtons hides next at end', () => {
            uiManager.currentAttachmentIndex = 2;

            uiManager.updateNavButtons();

            expect(uiManager.attachmentModalPrev.style.display).toBe('flex');
            expect(uiManager.attachmentModalNext.style.display).toBe('none');
        });

        test('updateNavButtons shows both in middle', () => {
            uiManager.currentAttachmentIndex = 1;

            uiManager.updateNavButtons();

            expect(uiManager.attachmentModalPrev.style.display).toBe('flex');
            expect(uiManager.attachmentModalNext.style.display).toBe('flex');
        });
    });

    describe('renderAttachments', () => {
        test('returns empty string when no attachments', () => {
            const msgInfo = { attachments: [] };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toBe('');
        });

        test('returns empty string when attachments is null', () => {
            const msgInfo = { attachments: null };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toBe('');
        });

        test('renders attachment count', () => {
            const msgInfo = {
                attachments: [
                    { fileName: 'a.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:', contentLength: 100 }
                ]
            };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toContain('1 Attachment');
        });

        test('renders plural for multiple attachments', () => {
            const msgInfo = {
                attachments: [
                    { fileName: 'a.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:', contentLength: 100 },
                    { fileName: 'b.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:', contentLength: 200 }
                ]
            };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toContain('2 Attachments');
        });

        test('stores attachments reference', () => {
            const attachments = [{ fileName: 'test.pdf' }];
            const msgInfo = { attachments };

            uiManager.renderAttachments(msgInfo);

            expect(uiManager.currentAttachments).toBe(attachments);
        });

        test('renders previewable attachment with preview action', () => {
            const msgInfo = {
                attachments: [
                    { fileName: 'image.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,abc', contentLength: 500 }
                ]
            };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toContain('data-action="preview"');
            expect(result).toContain('data-attachment-index="0"');
        });

        test('renders non-previewable attachment as download link', () => {
            const msgInfo = {
                attachments: [
                    { fileName: 'archive.zip', attachMimeTag: 'application/zip', contentBase64: 'data:application/zip;base64,abc', contentLength: 1000 }
                ]
            };

            const result = uiManager.renderAttachments(msgInfo);

            expect(result).toContain('download="archive.zip"');
            expect(result).not.toContain('data-action="preview"');
        });
    });

    describe('Event delegation', () => {
        test('clicking message item calls showMessage', () => {
            const messages = [createMockMessage()];
            mockMessageHandler.getMessages.mockReturnValue(messages);
            mockMessageHandler.getCurrentMessage.mockReturnValue(null);
            uiManager.updateMessageList();

            const messageItem = uiManager.messageItems.querySelector('[data-message-index]');
            messageItem.click();

            expect(window.app.showMessage).toHaveBeenCalledWith(0);
        });

        test('clicking pin button calls togglePin', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);
            uiManager.showMessage(message);

            const pinButton = uiManager.messageViewer.querySelector('[data-action="pin"]');
            pinButton.click();

            expect(window.app.togglePin).toHaveBeenCalledWith(0);
        });

        test('clicking delete button calls deleteMessage', () => {
            const message = createMockMessage();
            mockMessageHandler.getMessages.mockReturnValue([message]);
            uiManager.showMessage(message);

            const deleteButton = uiManager.messageViewer.querySelector('[data-action="delete"]');
            deleteButton.click();

            expect(window.app.deleteMessage).toHaveBeenCalledWith(0);
        });

        test('clicking close-toast button removes toast', () => {
            jest.useFakeTimers();
            uiManager.showToast('Test');

            const closeButton = document.querySelector('[data-action="close-toast"]');
            closeButton.click();

            jest.advanceTimersByTime(400);

            expect(document.querySelectorAll('.toast').length).toBe(0);
            jest.useRealTimers();
        });
    });

    describe('Modal event listeners', () => {
        test('close button click closes modal', () => {
            uiManager.attachmentModal.classList.add('active');

            uiManager.attachmentModalClose.click();

            expect(uiManager.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('backdrop click closes modal', () => {
            uiManager.attachmentModal.classList.add('active');

            uiManager.attachmentModalBackdrop.click();

            expect(uiManager.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('prev button navigates to previous', () => {
            const attachments = [
                { fileName: 'a.jpg', attachMimeTag: 'image/jpeg', contentBase64: 'data:image/jpeg;base64,a' },
                { fileName: 'b.jpg', attachMimeTag: 'image/jpeg', contentBase64: 'data:image/jpeg;base64,b' }
            ];
            uiManager.currentAttachments = attachments;
            uiManager.previewableAttachments = attachments;
            uiManager.currentAttachmentIndex = 1;

            uiManager.attachmentModalPrev.click();

            expect(uiManager.currentAttachmentIndex).toBe(0);
        });

        test('next button navigates to next', () => {
            const attachments = [
                { fileName: 'a.jpg', attachMimeTag: 'image/jpeg', contentBase64: 'data:image/jpeg;base64,a' },
                { fileName: 'b.jpg', attachMimeTag: 'image/jpeg', contentBase64: 'data:image/jpeg;base64,b' }
            ];
            uiManager.currentAttachments = attachments;
            uiManager.previewableAttachments = attachments;
            uiManager.currentAttachmentIndex = 0;

            uiManager.attachmentModalNext.click();

            expect(uiManager.currentAttachmentIndex).toBe(1);
        });
    });

    describe('Edge cases', () => {
        test('handles missing DOM elements gracefully', () => {
            document.body.innerHTML = '';

            expect(() => {
                new UIManager(mockMessageHandler);
            }).not.toThrow();
        });

        test('initEventDelegation handles missing messageItems', () => {
            document.body.innerHTML = '';
            const ui = new UIManager(mockMessageHandler);

            expect(() => {
                // Should not throw even with null messageItems
            }).not.toThrow();
        });

        test('handles message without body content', () => {
            const message = createMockMessage({
                bodyContent: null,
                bodyContentHTML: null
            });
            mockMessageHandler.getMessages.mockReturnValue([message]);

            expect(() => {
                uiManager.showMessage(message);
            }).not.toThrow();
        });

        test('handles empty recipients array', () => {
            const message = createMockMessage({ recipients: [] });
            mockMessageHandler.getMessages.mockReturnValue([message]);

            expect(() => {
                uiManager.showMessage(message);
            }).not.toThrow();
        });
    });
});
