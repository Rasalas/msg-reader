/**
 * Tests for UI modules
 * Tests UIManager facade and sub-managers
 */

// Mock the tauri-bridge module
jest.mock('../src/js/tauri-bridge.js', () => ({
    isTauri: jest.fn(() => false),
    openWithSystemViewer: jest.fn(() => Promise.resolve())
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
    sanitize: jest.fn((html) => html)
}));

import UIManager from '../src/js/UIManager.js';
import { ToastManager } from '../src/js/ui/ToastManager.js';
import { AttachmentModalManager } from '../src/js/ui/AttachmentModalManager.js';
import { MessageListRenderer } from '../src/js/ui/MessageListRenderer.js';
import { MessageContentRenderer } from '../src/js/ui/MessageContentRenderer.js';
import { isTauri, openWithSystemViewer } from '../src/js/tauri-bridge.js';

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
        <div id="attachmentModal">
            <div class="attachment-modal-backdrop"></div>
            <button id="attachmentModalClose"></button>
            <a id="attachmentModalDownload"></a>
            <span id="attachmentModalFilename"></span>
            <div id="attachmentModalContent"></div>
            <button id="attachmentModalPrev" style="display: none;"></button>
            <button id="attachmentModalNext" style="display: none;"></button>
        </div>
    `;
}

describe('UIManager (Facade)', () => {
    let uiManager;
    let mockMessageHandler;

    beforeEach(() => {
        setupDOM();
        isTauri.mockReturnValue(false);
        openWithSystemViewer.mockClear();

        mockMessageHandler = {
            getMessages: jest.fn(() => []),
            getCurrentMessage: jest.fn(() => null),
            setCurrentMessage: jest.fn(),
            isPinned: jest.fn(() => false)
        };

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
        test('initializes sub-managers', () => {
            expect(uiManager.toasts).toBeInstanceOf(ToastManager);
            expect(uiManager.modal).toBeInstanceOf(AttachmentModalManager);
            expect(uiManager.messageList).toBeInstanceOf(MessageListRenderer);
            expect(uiManager.messageContent).toBeInstanceOf(MessageContentRenderer);
        });

        test('stores messageHandler reference', () => {
            expect(uiManager.messageHandler).toBe(mockMessageHandler);
        });

        test('gets screen element references', () => {
            expect(uiManager.welcomeScreen).toBe(document.getElementById('welcomeScreen'));
            expect(uiManager.appContainer).toBe(document.getElementById('appContainer'));
        });
    });

    describe('setKeyboardManager', () => {
        test('sets keyboard manager and passes to modal', () => {
            const mockKeyboardManager = { setContext: jest.fn() };
            uiManager.setKeyboardManager(mockKeyboardManager);
            expect(uiManager.keyboardManager).toBe(mockKeyboardManager);
        });
    });

    describe('showWelcomeScreen', () => {
        test('shows welcome screen and hides app container', () => {
            uiManager.showAppContainer();
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
        test('delegates to messageList.render', () => {
            const spy = jest.spyOn(uiManager.messageList, 'render');
            uiManager.updateMessageList();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('showMessage', () => {
        test('delegates to messageContent.render and updates list', () => {
            const renderSpy = jest.spyOn(uiManager.messageContent, 'render');
            const updateSpy = jest.spyOn(uiManager, 'updateMessageList');
            const message = createMockMessage();

            uiManager.showMessage(message);

            expect(renderSpy).toHaveBeenCalledWith(message);
            expect(updateSpy).toHaveBeenCalled();
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
        test('showToast delegates to toasts.show', () => {
            const spy = jest.spyOn(uiManager.toasts, 'show');
            uiManager.showToast('Test', 'info', 3000);
            expect(spy).toHaveBeenCalledWith('Test', 'info', 3000);
        });

        test('showError delegates to toasts.error', () => {
            const spy = jest.spyOn(uiManager.toasts, 'error');
            uiManager.showError('Error');
            expect(spy).toHaveBeenCalledWith('Error', 5000);
        });

        test('showWarning delegates to toasts.warning', () => {
            const spy = jest.spyOn(uiManager.toasts, 'warning');
            uiManager.showWarning('Warning');
            expect(spy).toHaveBeenCalledWith('Warning', 4000);
        });

        test('showInfo delegates to toasts.info', () => {
            const spy = jest.spyOn(uiManager.toasts, 'info');
            uiManager.showInfo('Info');
            expect(spy).toHaveBeenCalledWith('Info', 3000);
        });
    });

    describe('Attachment modal', () => {
        test('openAttachmentModal delegates to modal.open', () => {
            const spy = jest.spyOn(uiManager.modal, 'open');
            const attachment = { fileName: 'test.png', attachMimeTag: 'image/png', contentBase64: 'data:' };
            uiManager.openAttachmentModal(attachment);
            expect(spy).toHaveBeenCalledWith(attachment);
        });

        test('closeAttachmentModal delegates to modal.close', () => {
            const spy = jest.spyOn(uiManager.modal, 'close');
            uiManager.closeAttachmentModal();
            expect(spy).toHaveBeenCalled();
        });

        test('showPrevAttachment delegates to modal', () => {
            const spy = jest.spyOn(uiManager.modal, 'showPrevAttachment');
            uiManager.showPrevAttachment();
            expect(spy).toHaveBeenCalled();
        });

        test('showNextAttachment delegates to modal', () => {
            const spy = jest.spyOn(uiManager.modal, 'showNextAttachment');
            uiManager.showNextAttachment();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Event delegation', () => {
        test('clicking message item calls app.showMessage', () => {
            mockMessageHandler.getMessages.mockReturnValue([createMockMessage()]);
            uiManager.updateMessageList();

            document.querySelector('[data-message-index]').click();

            expect(window.app.showMessage).toHaveBeenCalledWith(0);
        });

        test('clicking pin button calls app.togglePin', () => {
            const viewer = document.getElementById('messageViewer');
            viewer.innerHTML = '<button data-action="pin" data-index="0">Pin</button>';

            viewer.querySelector('[data-action="pin"]').click();

            expect(window.app.togglePin).toHaveBeenCalledWith(0);
        });

        test('clicking delete button calls app.deleteMessage', () => {
            const viewer = document.getElementById('messageViewer');
            viewer.innerHTML = '<button data-action="delete" data-index="0">Delete</button>';

            viewer.querySelector('[data-action="delete"]').click();

            expect(window.app.deleteMessage).toHaveBeenCalledWith(0);
        });
    });

    describe('Edge cases', () => {
        test('handles missing DOM elements gracefully', () => {
            document.body.innerHTML = '';
            expect(() => new UIManager(mockMessageHandler)).not.toThrow();
        });
    });
});

describe('ToastManager', () => {
    let toasts;

    beforeEach(() => {
        document.body.innerHTML = '';
        toasts = new ToastManager();
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.useRealTimers();
    });

    test('creates toast container', () => {
        toasts.show('Test', 'info');
        expect(document.getElementById('toast-container')).toBeTruthy();
    });

    test('creates toast with message', () => {
        toasts.show('Test message', 'info');
        expect(document.querySelector('.toast').textContent).toContain('Test message');
    });

    test('applies error styling', () => {
        toasts.error('Error');
        const toast = document.querySelector('.toast');
        expect(toast.classList.contains('toast-error')).toBe(true);
        expect(toast.className).toContain('bg-red-500');
    });

    test('applies warning styling', () => {
        toasts.warning('Warning');
        const toast = document.querySelector('.toast');
        expect(toast.classList.contains('toast-warning')).toBe(true);
        expect(toast.className).toContain('bg-yellow-500');
    });

    test('applies info styling', () => {
        toasts.info('Info');
        const toast = document.querySelector('.toast');
        expect(toast.classList.contains('toast-info')).toBe(true);
        expect(toast.className).toContain('bg-blue-500');
    });

    test('auto-dismisses after duration', () => {
        jest.useFakeTimers();
        toasts.show('Test', 'info', 1000);

        expect(document.querySelector('.toast')).toBeTruthy();
        jest.advanceTimersByTime(1300);
        expect(document.querySelector('.toast')).toBeFalsy();
    });

    test('close button removes toast', () => {
        jest.useFakeTimers();
        toasts.show('Test', 'info', 10000);

        document.querySelector('[data-action="close-toast"]').click();
        jest.advanceTimersByTime(300);

        expect(document.querySelector('.toast')).toBeFalsy();
    });

    test('multiple toasts can be displayed', () => {
        toasts.show('First', 'info');
        toasts.show('Second', 'info');
        toasts.show('Third', 'info');

        expect(document.querySelectorAll('.toast').length).toBe(3);
    });
});

describe('AttachmentModalManager', () => {
    let modal;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="attachmentModal">
                <div class="attachment-modal-backdrop"></div>
                <button id="attachmentModalClose"></button>
                <a id="attachmentModalDownload"></a>
                <span id="attachmentModalFilename"></span>
                <div id="attachmentModalContent"></div>
                <button id="attachmentModalPrev" style="display: none;"></button>
                <button id="attachmentModalNext" style="display: none;"></button>
            </div>
        `;
        isTauri.mockReturnValue(false);
        modal = new AttachmentModalManager(jest.fn());
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('MIME type detection', () => {
        test('isPreviewableImage', () => {
            expect(modal.isPreviewableImage('image/jpeg')).toBe(true);
            expect(modal.isPreviewableImage('image/png')).toBe(true);
            expect(modal.isPreviewableImage('IMAGE/GIF')).toBe(true);
            expect(modal.isPreviewableImage('application/pdf')).toBe(false);
            expect(modal.isPreviewableImage(null)).toBe(false);
        });

        test('isPdf', () => {
            expect(modal.isPdf('application/pdf')).toBe(true);
            expect(modal.isPdf('APPLICATION/PDF')).toBe(true);
            expect(modal.isPdf('image/png')).toBe(false);
            expect(modal.isPdf(null)).toBe(false);
        });

        test('isText', () => {
            expect(modal.isText('text/plain')).toBe(true);
            expect(modal.isText('text/html')).toBe(true);
            expect(modal.isText('application/json')).toBe(true);
            expect(modal.isText('application/xml')).toBe(true);
            expect(modal.isText('application/javascript')).toBe(true);
            expect(modal.isText('application/x-diff')).toBe(true);
            expect(modal.isText('application/octet-stream')).toBe(false);
            expect(modal.isText(null)).toBe(false);
        });

        test('isPreviewable', () => {
            expect(modal.isPreviewable('image/png')).toBe(true);
            expect(modal.isPreviewable('application/pdf')).toBe(true);
            expect(modal.isPreviewable('text/plain')).toBe(true);
            expect(modal.isPreviewable('application/octet-stream')).toBe(false);
        });
    });

    describe('open and close', () => {
        const attachment = { fileName: 'test.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,abc' };

        test('open shows modal', () => {
            modal.setAttachments([attachment]);
            modal.open(attachment);
            expect(modal.attachmentModal.classList.contains('active')).toBe(true);
        });

        test('open prevents body scroll', () => {
            modal.setAttachments([attachment]);
            modal.open(attachment);
            expect(document.body.style.overflow).toBe('hidden');
        });

        test('open sets keyboard context', () => {
            const mockKb = { setContext: jest.fn() };
            modal.setKeyboardManager(mockKb);
            modal.setAttachments([attachment]);
            modal.open(attachment);
            expect(mockKb.setContext).toHaveBeenCalledWith('modal');
        });

        test('close removes active class', () => {
            modal.attachmentModal.classList.add('active');
            modal.close();
            expect(modal.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('close restores body scroll', () => {
            document.body.style.overflow = 'hidden';
            modal.close();
            expect(document.body.style.overflow).toBe('');
        });

        test('close clears content', () => {
            modal.attachmentModalContent.innerHTML = '<img>';
            modal.close();
            expect(modal.attachmentModalContent.innerHTML).toBe('');
        });
    });

    describe('renderAttachmentPreview', () => {
        test('sets filename', () => {
            const att = { fileName: 'doc.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:' };
            modal.setAttachments([att]);
            modal.renderAttachmentPreview(att);
            expect(modal.attachmentModalFilename.textContent).toBe('doc.pdf');
        });

        test('sets download link', () => {
            const att = { fileName: 'test.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,abc' };
            modal.setAttachments([att]);
            modal.renderAttachmentPreview(att);
            expect(modal.attachmentModalDownload.href).toContain('data:image/png');
            expect(modal.attachmentModalDownload.download).toBe('test.png');
        });

        test('creates img for images', () => {
            const att = { fileName: 'test.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,abc' };
            modal.setAttachments([att]);
            modal.renderAttachmentPreview(att);
            expect(modal.attachmentModalContent.querySelector('img')).toBeTruthy();
        });

        test('creates object for PDFs', () => {
            const att = { fileName: 'test.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:application/pdf;base64,abc' };
            modal.setAttachments([att]);
            modal.renderAttachmentPreview(att);
            expect(modal.attachmentModalContent.querySelector('object')).toBeTruthy();
        });

        test('creates pre for text', () => {
            const att = { fileName: 'test.txt', attachMimeTag: 'text/plain', contentBase64: 'data:text/plain;base64,SGVsbG8=' };
            modal.setAttachments([att]);
            modal.renderAttachmentPreview(att);
            const pre = modal.attachmentModalContent.querySelector('pre');
            expect(pre).toBeTruthy();
            expect(pre.textContent).toBe('Hello');
        });
    });

    describe('navigation', () => {
        const attachments = [
            { fileName: '1.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,1' },
            { fileName: '2.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,2' },
            { fileName: '3.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,3' }
        ];

        test('showNextAttachment advances', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[0]);
            modal.showNextAttachment();
            expect(modal.currentAttachmentIndex).toBe(1);
        });

        test('showNextAttachment does not exceed list', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[2]);
            modal.showNextAttachment();
            expect(modal.currentAttachmentIndex).toBe(2);
        });

        test('showPrevAttachment decrements', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[1]);
            modal.showPrevAttachment();
            expect(modal.currentAttachmentIndex).toBe(0);
        });

        test('showPrevAttachment does not go below zero', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[0]);
            modal.showPrevAttachment();
            expect(modal.currentAttachmentIndex).toBe(0);
        });

        test('updateNavButtons hides prev at start', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[0]);
            expect(modal.attachmentModalPrev.style.display).toBe('none');
            expect(modal.attachmentModalNext.style.display).toBe('flex');
        });

        test('updateNavButtons hides next at end', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[2]);
            expect(modal.attachmentModalPrev.style.display).toBe('flex');
            expect(modal.attachmentModalNext.style.display).toBe('none');
        });

        test('updateNavButtons shows both in middle', () => {
            modal.setAttachments(attachments);
            modal.open(attachments[1]);
            expect(modal.attachmentModalPrev.style.display).toBe('flex');
            expect(modal.attachmentModalNext.style.display).toBe('flex');
        });
    });

    describe('event listeners', () => {
        test('close button closes modal', () => {
            modal.attachmentModal.classList.add('active');
            modal.attachmentModalClose.click();
            expect(modal.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('backdrop click closes modal', () => {
            modal.attachmentModal.classList.add('active');
            modal.attachmentModalBackdrop.click();
            expect(modal.attachmentModal.classList.contains('active')).toBe(false);
        });

        test('prev button navigates', () => {
            const attachments = [
                { fileName: '1.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,1' },
                { fileName: '2.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,2' }
            ];
            modal.setAttachments(attachments);
            modal.open(attachments[1]);
            modal.attachmentModalPrev.click();
            expect(modal.currentAttachmentIndex).toBe(0);
        });

        test('next button navigates', () => {
            const attachments = [
                { fileName: '1.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,1' },
                { fileName: '2.png', attachMimeTag: 'image/png', contentBase64: 'data:image/png;base64,2' }
            ];
            modal.setAttachments(attachments);
            modal.open(attachments[0]);
            modal.attachmentModalNext.click();
            expect(modal.currentAttachmentIndex).toBe(1);
        });
    });

    describe('Tauri PDF handling', () => {
        test('opens PDF with system viewer in Tauri', () => {
            isTauri.mockReturnValue(true);
            const pdfAtt = { fileName: 'test.pdf', attachMimeTag: 'application/pdf', contentBase64: 'data:application/pdf;base64,abc' };
            modal.open(pdfAtt);
            expect(openWithSystemViewer).toHaveBeenCalledWith('data:application/pdf;base64,abc', 'test.pdf');
            expect(modal.attachmentModal.classList.contains('active')).toBe(false);
        });
    });
});

describe('MessageListRenderer', () => {
    let renderer;
    let mockHandler;
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'messageItems';
        container.setAttribute('role', 'listbox');
        document.body.appendChild(container);

        mockHandler = {
            getCurrentMessage: jest.fn(() => null),
            getMessages: jest.fn(() => []),
            isPinned: jest.fn(() => false)
        };

        renderer = new MessageListRenderer(container, mockHandler);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('renders empty list', () => {
        renderer.render();
        // Virtual list creates its own DOM structure, but no message items
        expect(container.querySelectorAll('.message-item').length).toBe(0);
    });

    test('renders message items', () => {
        mockHandler.getMessages.mockReturnValue([
            createMockMessage({ subject: 'Test 1' }),
            createMockMessage({ subject: 'Test 2' })
        ]);
        renderer.render();
        expect(container.querySelectorAll('.message-item').length).toBe(2);
    });

    test('marks active message', () => {
        const msg = createMockMessage();
        mockHandler.getMessages.mockReturnValue([msg]);
        mockHandler.getCurrentMessage.mockReturnValue(msg);
        renderer.render();
        expect(container.querySelector('.message-item').classList.contains('active')).toBe(true);
    });

    test('marks pinned messages', () => {
        mockHandler.getMessages.mockReturnValue([createMockMessage()]);
        mockHandler.isPinned.mockReturnValue(true);
        renderer.render();
        expect(container.querySelector('.message-item').classList.contains('pinned')).toBe(true);
    });

    test('shows attachment icon for messages with attachments', () => {
        mockHandler.getMessages.mockReturnValue([createMockMessage({ attachments: [{ fileName: 'att.pdf' }] })]);
        renderer.render();
        expect(container.querySelector('.attachment-icon')).toBeTruthy();
    });

    test('does not show attachment icon for inline attachments only', () => {
        mockHandler.getMessages.mockReturnValue([createMockMessage({ attachments: [{ fileName: 'inline.png', pidContentId: 'cid123' }] })]);
        renderer.render();
        expect(container.querySelector('.attachment-icon')).toBeFalsy();
    });

    test('sets data-message-index attribute', () => {
        mockHandler.getMessages.mockReturnValue([createMockMessage(), createMockMessage({ subject: 'Second' })]);
        renderer.render();
        const items = container.querySelectorAll('[data-message-index]');
        expect(items[0].dataset.messageIndex).toBe('0');
        expect(items[1].dataset.messageIndex).toBe('1');
    });

    describe('formatMessageDate', () => {
        test('returns time for today', () => {
            expect(renderer.formatMessageDate(new Date())).toMatch(/\d{1,2}:\d{2}/);
        });

        test('returns "Yesterday" for yesterday', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            expect(renderer.formatMessageDate(yesterday)).toBe('Yesterday');
        });

        test('returns month and day for same year', () => {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            expect(renderer.formatMessageDate(date)).toMatch(/[A-Za-z]+\.?\s+\d+/);
        });

        test('returns ISO date for different year', () => {
            expect(renderer.formatMessageDate(new Date('2020-06-15'))).toBe('2020-06-15');
        });

        test('returns "Unknown date" for invalid', () => {
            expect(renderer.formatMessageDate(null)).toBe('Unknown date');
            expect(renderer.formatMessageDate(undefined)).toBe('Unknown date');
            expect(renderer.formatMessageDate(new Date('invalid'))).toBe('Unknown date');
            expect(renderer.formatMessageDate('2024-01-01')).toBe('Unknown date');
        });
    });
});

describe('MessageContentRenderer', () => {
    let renderer;
    let mockHandler;
    let mockModal;
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'messageViewer';
        document.body.appendChild(container);

        mockHandler = {
            setCurrentMessage: jest.fn(),
            getMessages: jest.fn(() => []),
            isPinned: jest.fn(() => false)
        };

        mockModal = {
            setAttachments: jest.fn(),
            isPreviewable: jest.fn(() => false),
            isPreviewableImage: jest.fn(() => false),
            isPdf: jest.fn(() => false),
            isText: jest.fn(() => false),
            isPreviewableEml: jest.fn(() => false)
        };

        renderer = new MessageContentRenderer(container, mockHandler, mockModal);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('sets current message in handler', () => {
        const msg = createMockMessage();
        renderer.render(msg);
        expect(mockHandler.setCurrentMessage).toHaveBeenCalledWith(msg);
    });

    test('renders message subject', () => {
        renderer.render(createMockMessage({ subject: 'Test Subject' }));
        expect(container.textContent).toContain('Test Subject');
    });

    test('renders sender information', () => {
        renderer.render(createMockMessage({ senderName: 'John', senderEmail: 'john@test.com' }));
        expect(container.textContent).toContain('John');
        expect(container.innerHTML).toContain('john@test.com');
    });

    test('renders To recipients', () => {
        renderer.render(createMockMessage());
        expect(container.innerHTML).toContain('Jane Doe');
        expect(container.innerHTML).toContain('jane@example.com');
    });

    test('renders CC recipients', () => {
        renderer.render(createMockMessage());
        expect(container.innerHTML).toContain('Bob Smith');
    });

    test('renders HTML body content', () => {
        renderer.render(createMockMessage({ bodyContentHTML: '<p>This is <strong>HTML</strong></p>' }));
        expect(container.innerHTML).toContain('<strong>HTML</strong>');
    });

    test('renders pin button with data attributes', () => {
        const msg = createMockMessage();
        mockHandler.getMessages.mockReturnValue([msg]);
        renderer.render(msg);
        const btn = container.querySelector('[data-action="pin"]');
        expect(btn).toBeTruthy();
        expect(btn.dataset.index).toBe('0');
    });

    test('renders delete button with data attributes', () => {
        const msg = createMockMessage();
        mockHandler.getMessages.mockReturnValue([msg]);
        renderer.render(msg);
        const btn = container.querySelector('[data-action="delete"]');
        expect(btn).toBeTruthy();
        expect(btn.dataset.index).toBe('0');
    });

    test('adds pinned class when message is pinned', () => {
        const msg = createMockMessage();
        mockHandler.getMessages.mockReturnValue([msg]);
        mockHandler.isPinned.mockReturnValue(true);
        renderer.render(msg);
        expect(container.querySelector('[data-action="pin"]').classList.contains('pinned')).toBe(true);
    });

    describe('formatRecipients', () => {
        test('formats to recipients', () => {
            const recipients = [{ name: 'Alice', email: 'alice@test.com', recipType: 'to' }];
            const result = renderer.formatRecipients(recipients, 'to');
            expect(result).toContain('Alice');
            expect(result).toContain('alice@test.com');
        });

        test('formats cc recipients', () => {
            const recipients = [{ name: 'Bob', email: 'bob@test.com', recipType: 'cc' }];
            expect(renderer.formatRecipients(recipients, 'cc')).toContain('Bob');
        });

        test('returns empty string for no matches', () => {
            const recipients = [{ name: 'Alice', email: 'alice@test.com', recipType: 'to' }];
            expect(renderer.formatRecipients(recipients, 'cc')).toBe('');
        });

        test('joins multiple recipients', () => {
            const recipients = [
                { name: 'A', email: 'a@test.com', recipType: 'to' },
                { name: 'B', email: 'b@test.com', recipType: 'to' }
            ];
            expect(renderer.formatRecipients(recipients, 'to')).toContain(', ');
        });
    });

    describe('processEmailContent', () => {
        test('returns HTML when available', () => {
            const result = renderer.processEmailContent({ bodyContentHTML: '<p>HTML</p>' });
            expect(result).toContain('<p>');
        });

        test('converts plain text to HTML', () => {
            const result = renderer.processEmailContent({ bodyContent: 'Line one\n\nLine two' });
            expect(result).toContain('<p>');
            expect(result).toContain('</p>');
        });

        test('converts line breaks', () => {
            const result = renderer.processEmailContent({ bodyContent: 'Line one\nLine two' });
            expect(result).toContain('<br>');
        });

        test('handles Windows line endings', () => {
            const result = renderer.processEmailContent({ bodyContent: 'Line one\r\nLine two' });
            expect(result).toContain('<br>');
        });
    });

    describe('scopeEmailStyles', () => {
        test('returns empty string for falsy input', () => {
            expect(renderer.scopeEmailStyles(null)).toBe('');
            expect(renderer.scopeEmailStyles('')).toBe('');
        });

        test('scopes style rules', () => {
            const result = renderer.scopeEmailStyles('<style>p { color: red; }</style><p>Test</p>');
            expect(result).toContain('.email-content');
        });

        test('returns content without styles unchanged', () => {
            expect(renderer.scopeEmailStyles('<p>No styles</p>')).toBe('<p>No styles</p>');
        });
    });

    describe('renderAttachments', () => {
        test('returns empty string for no attachments', () => {
            expect(renderer.renderAttachments({})).toBe('');
            expect(renderer.renderAttachments({ attachments: [] })).toBe('');
        });

        test('sets attachments in modal', () => {
            const attachments = [{ fileName: 'test.pdf' }];
            renderer.renderAttachments({ attachments });
            expect(mockModal.setAttachments).toHaveBeenCalledWith(attachments);
        });

        test('renders attachment count', () => {
            expect(renderer.renderAttachments({ attachments: [{ fileName: 'a.pdf' }] })).toContain('1 Attachment');
        });

        test('renders plural for multiple', () => {
            expect(renderer.renderAttachments({ attachments: [{ fileName: 'a.pdf' }, { fileName: 'b.pdf' }] })).toContain('2 Attachments');
        });

        test('renders previewable with preview action', () => {
            mockModal.isPreviewable.mockReturnValue(true);
            const result = renderer.renderAttachments({ attachments: [{ fileName: 'img.png', attachMimeTag: 'image/png', contentBase64: 'data:', contentLength: 100 }] });
            expect(result).toContain('data-action="preview"');
        });

        test('renders non-previewable as download', () => {
            mockModal.isPreviewable.mockReturnValue(false);
            const result = renderer.renderAttachments({ attachments: [{ fileName: 'archive.zip', attachMimeTag: 'application/zip', contentBase64: 'data:', contentLength: 100 }] });
            expect(result).toContain('data-action="download"');
            expect(result).not.toContain('data-action="preview"');
        });
    });
});

describe('Edge cases', () => {
    test('AttachmentModalManager handles missing modal element', () => {
        document.body.innerHTML = '';
        const modal = new AttachmentModalManager(jest.fn());
        expect(() => modal.open({ fileName: 'test.png', attachMimeTag: 'image/png' })).not.toThrow();
    });

    test('MessageListRenderer handles null container', () => {
        const renderer = new MessageListRenderer(null, { getMessages: () => [], getCurrentMessage: () => null, isPinned: () => false });
        expect(() => renderer.render()).not.toThrow();
    });

    test('MessageContentRenderer handles null container', () => {
        const renderer = new MessageContentRenderer(null, { setCurrentMessage: jest.fn(), getMessages: () => [], isPinned: () => false }, null);
        expect(() => renderer.render(createMockMessage())).not.toThrow();
    });
});
