/**
 * Integration Tests: File Opening Flow
 *
 * Tests the complete flow:
 * User selects .msg/.eml file
 * → FileHandler validates file
 * → Parser extracts content
 * → MessageHandler stores message
 * → UIManager renders list and content
 */

// Mock external dependencies
jest.mock('../../src/js/tauri-bridge.js', () => ({
    isTauri: jest.fn(() => false),
    openWithSystemViewer: jest.fn(() => Promise.resolve()),
    readFileFromPath: jest.fn(),
    getFileName: jest.fn(),
    getPendingFiles: jest.fn(() => Promise.resolve([])),
    onFileOpen: jest.fn(() => Promise.resolve()),
    onFileDrop: jest.fn(() => Promise.resolve()),
    checkForUpdates: jest.fn()
}));

jest.mock('dompurify', () => ({
    sanitize: jest.fn((html) => html)
}));

import MessageHandler from '../../src/js/MessageHandler.js';
import UIManager from '../../src/js/UIManager.js';
import FileHandler from '../../src/js/FileHandler.js';
import {
    setupFullDOM,
    createMockParsedMessage,
    createMockMessageWithAttachments,
    createMockMessageWithInlineImages,
    createMockFile,
    createMockParsers,
    waitForDOMUpdate
} from './test-helpers.js';

describe('File Opening Flow Integration', () => {
    let messageHandler;
    let uiManager;
    let fileHandler;
    let mockParsers;
    let domElements;

    beforeEach(() => {
        window.localStorage.clear();
        // Setup full DOM structure
        domElements = setupFullDOM();

        // Initialize real components with mock parsers
        messageHandler = new MessageHandler();
        uiManager = new UIManager(messageHandler);

        // Create mock parsers
        mockParsers = createMockParsers();

        // Initialize FileHandler with real components and mock parsers
        fileHandler = new FileHandler(messageHandler, uiManager, mockParsers);

        // Setup window.app mock for event delegation
        window.app = {
            showMessage: jest.fn((index) => {
                const messages = messageHandler.getMessages();
                if (messages[index]) {
                    uiManager.showMessage(messages[index]);
                }
            }),
            togglePin: jest.fn(),
            deleteMessage: jest.fn()
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        window.localStorage.clear();
        jest.clearAllMocks();
        delete window.app;
    });

    describe('Single file upload', () => {
        it('should process MSG file and render message in list', async () => {
            // Arrange
            const mockMessage = createMockParsedMessage({
                subject: 'Important Meeting',
                senderName: 'Alice Johnson'
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('meeting.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert - Parser was called
            expect(mockParsers.extractMsg).toHaveBeenCalledTimes(1);

            // Assert - Message was added to handler
            expect(messageHandler.getMessages()).toHaveLength(1);
            expect(messageHandler.getMessages()[0].subject).toBe('Important Meeting');

            // Assert - UI shows app container
            expect(domElements.welcomeScreen.style.display).toBe('none');
            expect(domElements.appContainer.style.display).toBe('flex');

            // Assert - Message list was updated
            expect(domElements.messageItems.children.length).toBe(1);
            expect(domElements.messageItems.innerHTML).toContain('Important Meeting');
            expect(domElements.messageItems.innerHTML).toContain('Alice Johnson');
        });

        it('should process EML file and render message in list', async () => {
            // Arrange
            const mockMessage = createMockParsedMessage({
                subject: 'Project Update',
                senderName: 'Bob Smith'
            });
            mockParsers.extractEml.mockReturnValue(mockMessage);

            const emlFile = createMockFile('update.eml', 'mock content');

            // Act
            fileHandler.handleFiles([emlFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(mockParsers.extractEml).toHaveBeenCalledTimes(1);
            expect(messageHandler.getMessages()).toHaveLength(1);
            expect(messageHandler.getMessages()[0].subject).toBe('Project Update');
        });

        it('should show message content after first file upload', async () => {
            // Arrange
            const mockMessage = createMockParsedMessage({
                subject: 'First Email',
                bodyContentHTML: '<p>This is the email body</p>'
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('first.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert - Message viewer shows content
            expect(domElements.messageViewer.innerHTML).toContain('First Email');
            expect(domElements.messageViewer.innerHTML).toContain('This is the email body');
        });

        it('should display sender information in message viewer', async () => {
            // Arrange
            const mockMessage = createMockParsedMessage({
                senderName: 'Jane Doe',
                senderEmail: 'jane@company.com'
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('test.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(domElements.messageViewer.innerHTML).toContain('Jane Doe');
            expect(domElements.messageViewer.innerHTML).toContain('jane@company.com');
        });

        it('should display recipients in message viewer', async () => {
            // Arrange
            const mockMessage = createMockParsedMessage({
                recipients: [
                    { name: 'Recipient One', email: 'r1@test.com', recipType: 'to' },
                    { name: 'CC Person', email: 'cc@test.com', recipType: 'cc' }
                ]
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('test.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(domElements.messageViewer.innerHTML).toContain('Recipient One');
            expect(domElements.messageViewer.innerHTML).toContain('CC Person');
        });
    });

    describe('Message with attachments', () => {
        it('should render attachment section for messages with attachments', async () => {
            // Arrange
            const mockMessage = createMockMessageWithAttachments({
                subject: 'Email with Files'
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('attachments.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert - Attachments section is visible
            expect(domElements.messageViewer.innerHTML).toContain('Attachment');
            expect(domElements.messageViewer.innerHTML).toContain('document.pdf');
            expect(domElements.messageViewer.innerHTML).toContain('image.png');
        });

        it('should show attachment icon in message list for messages with real attachments', async () => {
            // Arrange
            const mockMessage = createMockMessageWithAttachments();
            // Remove pidContentId to make it a "real" attachment (not inline)
            mockMessage.attachments = mockMessage.attachments.map(att => {
                const { pidContentId, ...rest } = att;
                return rest;
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('test.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert - Attachment icon should be present in message list
            const messageItem = domElements.messageItems.querySelector('.message-item');
            expect(messageItem).not.toBeNull();
            expect(messageItem.innerHTML).toContain('attachment-icon');
        });

        it('should open inline images in the attachment modal', async () => {
            // Arrange
            const inlineImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE';
            const mockMessage = createMockMessageWithInlineImages({
                bodyContentHTML: `<p>Here is an image: <img src="${inlineImage}" alt="inline-image.png"></p>`,
                attachments: [
                    {
                        fileName: 'inline-image.png',
                        attachMimeTag: 'image/png',
                        contentLength: 1024,
                        contentBase64: inlineImage,
                        pidContentId: 'inline-image-1',
                        contentId: 'inline-image-1'
                    }
                ]
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('inline-image.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            const inlineImageElement = domElements.messageViewer.querySelector('.email-content img');
            expect(inlineImageElement).not.toBeNull();

            inlineImageElement.click();
            await waitForDOMUpdate(0);

            // Assert
            expect(domElements.attachmentModal.classList.contains('active')).toBe(true);
            expect(document.getElementById('attachmentModalFilename').textContent).toContain('inline-image.png');
            expect(document.querySelector('#attachmentModalContent img').src).toContain(inlineImage);
            expect(document.getElementById('attachmentModalZoomControls').hidden).toBe(false);
        });

        it('should always show inline images in the message body', async () => {
            // Arrange
            const iconImage = 'data:image/png;base64,icon';
            const screenshotImage = 'data:image/png;base64,screen';
            const mockMessage = createMockParsedMessage({
                bodyContentHTML: `
                    <p>
                        <img src="${iconImage}" alt="asset-a.png" width="84" height="67">
                        <img src="${screenshotImage}" alt="asset-b.jpg" width="640" height="480">
                    </p>
                `,
                attachments: [
                    {
                        fileName: 'asset-a.png',
                        attachMimeTag: 'image/png',
                        contentLength: 1336,
                        contentBase64: iconImage,
                        pidContentId: 'cid-a',
                        contentId: 'cid-a'
                    },
                    {
                        fileName: 'asset-b.jpg',
                        attachMimeTag: 'image/png',
                        contentLength: 4096,
                        contentBase64: screenshotImage,
                        pidContentId: 'cid-b',
                        contentId: 'cid-b'
                    }
                ]
            });
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('inline-heuristic.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            const images = domElements.messageViewer.querySelectorAll('.email-content img');

            // Assert
            expect(images[0].hidden).toBe(false);
            expect(images[1].hidden).toBe(false);
            expect(domElements.messageViewer.querySelector('.inline-image-toggle')).toBeNull();
        });

        it('should not render inline images in the attachment section', async () => {
            // Arrange
            const mockMessage = createMockMessageWithInlineImages();
            mockParsers.extractMsg.mockReturnValue(mockMessage);

            const msgFile = createMockFile('inline-only.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(domElements.messageViewer.innerHTML).not.toContain('Attachment');
            expect(domElements.messageViewer.innerHTML).not.toContain('inline-image.png');
        });
    });

    describe('Unsupported file types', () => {
        it('should ignore files with unsupported extensions', async () => {
            // Arrange
            const txtFile = createMockFile('document.txt', 'text content');
            const pdfFile = createMockFile('document.pdf', 'pdf content');

            // Act
            fileHandler.handleFiles([txtFile, pdfFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(mockParsers.extractMsg).not.toHaveBeenCalled();
            expect(mockParsers.extractEml).not.toHaveBeenCalled();
            expect(messageHandler.getMessages()).toHaveLength(0);
        });
    });

    describe('Parser error handling', () => {
        it('should handle parser returning null gracefully', async () => {
            // Arrange
            mockParsers.extractMsg.mockReturnValue(null);

            const msgFile = createMockFile('corrupt.msg', 'invalid content');

            // Spy on console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert
            expect(messageHandler.getMessages()).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Drag and drop events', () => {
        it('should show drop overlay on dragover', () => {
            // Act
            const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
            document.dispatchEvent(dragOverEvent);

            // Assert
            expect(domElements.dropOverlay.classList.contains('active')).toBe(true);
        });

        it('should hide drop overlay on drop', async () => {
            // Setup - Show overlay first
            uiManager.showDropOverlay();
            expect(domElements.dropOverlay.classList.contains('active')).toBe(true);

            // Act
            const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
            Object.defineProperty(dropEvent, 'dataTransfer', {
                value: { files: [] }
            });
            document.dispatchEvent(dropEvent);

            // Assert
            expect(domElements.dropOverlay.classList.contains('active')).toBe(false);
        });
    });

    describe('Message list item interaction', () => {
        it('should mark first message as active after upload', async () => {
            // Arrange
            mockParsers.extractMsg.mockReturnValue(createMockParsedMessage());
            const msgFile = createMockFile('test.msg', 'mock content');

            // Act
            fileHandler.handleFiles([msgFile]);
            await waitForDOMUpdate(100);

            // Assert
            const messageItem = domElements.messageItems.querySelector('.message-item');
            expect(messageItem.classList.contains('active')).toBe(true);
            expect(messageItem.getAttribute('aria-selected')).toBe('true');
        });
    });
});
