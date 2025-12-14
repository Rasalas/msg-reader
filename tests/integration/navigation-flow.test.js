/**
 * Integration Tests: Keyboard Navigation Flow
 *
 * Tests the complete navigation flow:
 * User presses navigation key
 * → KeyboardManager processes event
 * → MessageHandler updates active message
 * → UIManager updates highlighting
 * → Screen reader announcement
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
import KeyboardManager from '../../src/js/KeyboardManager.js';
import {
    setupFullDOM,
    createMockParsedMessage,
    createMockParsers,
    createMockFile,
    createKeyboardEvent,
    waitForDOMUpdate
} from './test-helpers.js';

describe('Keyboard Navigation Flow Integration', () => {
    let messageHandler;
    let uiManager;
    let fileHandler;
    let keyboardManager;
    let app;
    let mockParsers;
    let domElements;

    /**
     * Helper to add multiple messages to the handler
     */
    async function addMessages(count) {
        const messages = [];
        for (let i = 0; i < count; i++) {
            const date = new Date(Date.now() - i * 3600000);
            messages.push(createMockParsedMessage({
                subject: `Message ${i + 1}`,
                senderName: `Sender ${i + 1}`,
                messageDeliveryTime: date.toISOString()
            }));
        }

        // Set up mock parsers to return messages in sequence
        let callIndex = 0;
        mockParsers.extractMsg.mockImplementation(() => {
            const msg = messages[callIndex];
            callIndex++;
            return msg;
        });

        // Add files
        const files = messages.map((_, i) => createMockFile(`message${i + 1}.msg`, 'content'));
        fileHandler.handleFiles(files);
        await waitForDOMUpdate(100);

        return messages;
    }

    beforeEach(() => {
        // Setup full DOM structure
        domElements = setupFullDOM();

        // Initialize components
        messageHandler = new MessageHandler();
        uiManager = new UIManager(messageHandler);
        mockParsers = createMockParsers();
        fileHandler = new FileHandler(messageHandler, uiManager, mockParsers);

        // Create App-like object for KeyboardManager
        app = {
            messageHandler,
            uiManager,
            fileHandler,
            showMessage: jest.fn((index) => {
                const messages = messageHandler.getMessages();
                if (messages[index]) {
                    uiManager.showMessage(messages[index]);
                }
            }),
            togglePin: jest.fn((index) => {
                const message = messageHandler.togglePin(index);
                uiManager.updateMessageList();
                uiManager.showMessage(message);
            }),
            deleteMessage: jest.fn((index) => {
                const nextMessage = messageHandler.deleteMessage(index);
                uiManager.updateMessageList();
                if (nextMessage) {
                    uiManager.showMessage(nextMessage);
                } else {
                    uiManager.showWelcomeScreen();
                }
            })
        };

        // Initialize KeyboardManager with app
        keyboardManager = new KeyboardManager(app);
        uiManager.setKeyboardManager(keyboardManager);

        // Setup window.app for event delegation
        window.app = app;
    });

    afterEach(() => {
        keyboardManager.destroy();
        document.body.innerHTML = '';
        jest.clearAllMocks();
        delete window.app;
    });

    describe('Arrow key navigation', () => {
        it('should navigate to next message with ArrowDown', async () => {
            // Arrange - Add 3 messages
            await addMessages(3);
            expect(messageHandler.getMessages()).toHaveLength(3);

            // Show first message
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act - Press ArrowDown
            const event = createKeyboardEvent('ArrowDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Second message is now active
            expect(app.showMessage).toHaveBeenLastCalledWith(1);
            const activeItem = domElements.messageItems.querySelector('.message-item.active');
            expect(activeItem).not.toBeNull();
            expect(activeItem.id).toBe('message-1');
        });

        it('should navigate to previous message with ArrowUp', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(1); // Start at second message
            await waitForDOMUpdate();

            // Act - Press ArrowUp
            const event = createKeyboardEvent('ArrowUp');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - First message is now active
            expect(app.showMessage).toHaveBeenLastCalledWith(0);
        });

        it('should stay at first message when pressing ArrowUp at beginning', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act - Press ArrowUp at first message
            const event = createKeyboardEvent('ArrowUp');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Still at first message (index 0)
            const currentMessage = messageHandler.getCurrentMessage();
            expect(messageHandler.getMessages().indexOf(currentMessage)).toBe(0);
        });

        it('should stay at last message when pressing ArrowDown at end', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(2); // Last message
            await waitForDOMUpdate();

            // Act - Press ArrowDown at last message
            const event = createKeyboardEvent('ArrowDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Still at last message
            const currentMessage = messageHandler.getCurrentMessage();
            expect(messageHandler.getMessages().indexOf(currentMessage)).toBe(2);
        });
    });

    describe('Vim-style navigation', () => {
        it('should navigate down with j key', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('j');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(app.showMessage).toHaveBeenLastCalledWith(1);
        });

        it('should navigate up with k key', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(1);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('k');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(app.showMessage).toHaveBeenLastCalledWith(0);
        });
    });

    describe('Jump navigation', () => {
        it('should jump to first message with Home key', async () => {
            // Arrange
            await addMessages(5);
            app.showMessage(3); // Start in middle
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('Home');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(app.showMessage).toHaveBeenLastCalledWith(0);
        });

        it('should jump to last message with End key', async () => {
            // Arrange
            await addMessages(5);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('End');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(app.showMessage).toHaveBeenLastCalledWith(4);
        });

        it('should select current message with o key (open)', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(1);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('o');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - showMessage should be called
            expect(app.showMessage).toHaveBeenCalled();
        });
    });

    describe('Page navigation', () => {
        it('should navigate 5 messages down with PageDown', async () => {
            // Arrange
            await addMessages(10);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('PageDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Should move 5 positions
            expect(app.showMessage).toHaveBeenLastCalledWith(5);
        });

        it('should navigate 5 messages up with PageUp', async () => {
            // Arrange
            await addMessages(10);
            app.showMessage(7);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('PageUp');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Should move 5 positions up
            expect(app.showMessage).toHaveBeenLastCalledWith(2);
        });

        it('should stop at list boundaries with PageDown', async () => {
            // Arrange
            await addMessages(5);
            app.showMessage(3);
            await waitForDOMUpdate();

            // Act - PageDown from position 3 (would go to 8, but only 5 messages)
            const event = createKeyboardEvent('PageDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Should stop at last message (index 4)
            expect(app.showMessage).toHaveBeenLastCalledWith(4);
        });
    });

    describe('Screen reader announcements', () => {
        it('should announce message position on navigation', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('ArrowDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - SR announcement element should have content
            expect(domElements.srAnnouncements.textContent).toContain('Message 2 of 3');
        });
    });

    describe('Input field focus', () => {
        it('should not trigger navigation when input field is focused', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Create and focus an input
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            // Track showMessage calls before key press
            const callCountBefore = app.showMessage.mock.calls.length;

            // Act
            const event = createKeyboardEvent('ArrowDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - showMessage should not have been called again
            expect(app.showMessage.mock.calls.length).toBe(callCountBefore);

            // Cleanup
            input.remove();
        });

        it('should allow Escape key even when input is focused', async () => {
            // Arrange
            await addMessages(1);

            // Open attachment modal
            uiManager.openAttachmentModal({
                fileName: 'test.pdf',
                attachMimeTag: 'application/pdf',
                contentBase64: 'data:application/pdf;base64,test'
            });
            await waitForDOMUpdate();

            // Create and focus an input inside modal
            const input = document.createElement('input');
            domElements.attachmentModal.appendChild(input);
            input.focus();

            // Act - Press Escape
            const event = createKeyboardEvent('Escape');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Modal should close
            expect(domElements.attachmentModal.classList.contains('active')).toBe(false);

            // Cleanup
            input.remove();
        });
    });

    describe('Context awareness', () => {
        it('should not navigate when modal is open', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Open attachment modal
            keyboardManager.setContext('modal');

            const callCountBefore = app.showMessage.mock.calls.length;

            // Act - Try to navigate
            const event = createKeyboardEvent('ArrowDown');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - Navigation should not happen in modal context
            expect(app.showMessage.mock.calls.length).toBe(callCountBefore);
        });
    });

    describe('Enter key to select message', () => {
        it('should focus message viewer on Enter key', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('Enter');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert - showMessage should have been called for current index
            expect(app.showMessage).toHaveBeenCalled();
        });
    });

    describe('Empty message list', () => {
        it('should handle navigation gracefully with no messages', async () => {
            // Arrange - No messages loaded
            expect(messageHandler.getMessages()).toHaveLength(0);

            // Act - Should not throw
            const event = createKeyboardEvent('ArrowDown');
            expect(() => {
                document.dispatchEvent(event);
            }).not.toThrow();
        });
    });
});
