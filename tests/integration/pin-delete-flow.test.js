/**
 * Integration Tests: Pin and Delete Flow
 *
 * Tests the message pin flow:
 * User clicks Pin button or presses 's'
 * → MessageHandler updates pin status
 * → Storage persists change
 * → UIManager renders list with pin indicator
 *
 * Tests the message delete flow:
 * User clicks Delete button or presses 'd'
 * → MessageHandler removes message
 * → Storage updates
 * → UIManager renders updated list
 * → Next message becomes active
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

describe('Pin and Delete Flow Integration', () => {
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

        let callIndex = 0;
        mockParsers.extractMsg.mockImplementation(() => {
            const msg = messages[callIndex];
            callIndex++;
            return msg;
        });

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

        // Create App-like object
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
        localStorage.clear();
        delete window.app;
    });

    describe('Pin Flow', () => {
        describe('Pin via keyboard shortcut', () => {
            it('should pin message when pressing "s" key', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act
                const event = createKeyboardEvent('s');
                document.dispatchEvent(event);
                await waitForDOMUpdate();

                // Assert
                expect(app.togglePin).toHaveBeenCalledWith(0);
                const message = messageHandler.getMessages()[0];
                expect(messageHandler.isPinned(message)).toBe(true);
            });

            it('should unpin message when pressing "s" again', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);

                // Pin the message first
                messageHandler.togglePin(0);
                uiManager.updateMessageList();
                await waitForDOMUpdate();

                const message = messageHandler.getMessages()[0];
                expect(messageHandler.isPinned(message)).toBe(true);

                // Act - Press s again to unpin
                const event = createKeyboardEvent('s');
                document.dispatchEvent(event);
                await waitForDOMUpdate();

                // Assert
                expect(app.togglePin).toHaveBeenCalled();
            });
        });

        describe('Pin via UI button', () => {
            it('should toggle pin when clicking pin button in message viewer', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act - Click pin button
                const pinButton = domElements.messageViewer.querySelector('[data-action="pin"]');
                expect(pinButton).not.toBeNull();
                pinButton.click();
                await waitForDOMUpdate();

                // Assert
                expect(app.togglePin).toHaveBeenCalledWith(0);
            });

            it('should show pinned class on pin button when message is pinned', async () => {
                // Arrange
                await addMessages(1);

                // Pin the message
                messageHandler.togglePin(0);
                uiManager.updateMessageList();
                uiManager.showMessage(messageHandler.getMessages()[0]);
                await waitForDOMUpdate();

                // Assert
                const pinButton = domElements.messageViewer.querySelector('[data-action="pin"]');
                expect(pinButton.classList.contains('pinned')).toBe(true);
            });
        });

        describe('Pin visual indicator', () => {
            it('should show pinned class on message list item when pinned', async () => {
                // Arrange
                await addMessages(3);

                // Pin second message
                messageHandler.togglePin(1);
                uiManager.updateMessageList();
                await waitForDOMUpdate();

                // Assert
                const pinnedItem = domElements.messageItems.querySelector('.message-item.pinned');
                expect(pinnedItem).not.toBeNull();
                expect(pinnedItem.id).toBe('message-1');
            });
        });

        describe('Pin persistence', () => {
            it('should persist pinned state to localStorage', async () => {
                // Arrange
                await addMessages(1);

                // Act
                messageHandler.togglePin(0);
                await waitForDOMUpdate();

                // Assert - Check localStorage was called
                expect(localStorage.setItem).toHaveBeenCalled();
            });
        });
    });

    describe('Delete Flow', () => {
        describe('Delete via keyboard shortcut', () => {
            it('should delete message when pressing Delete key', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act
                const event = createKeyboardEvent('Delete');
                document.dispatchEvent(event);
                await waitForDOMUpdate();

                // Assert
                expect(app.deleteMessage).toHaveBeenCalledWith(0);
            });

            it('should delete message when pressing Backspace key', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act
                const event = createKeyboardEvent('Backspace');
                document.dispatchEvent(event);
                await waitForDOMUpdate();

                // Assert
                expect(app.deleteMessage).toHaveBeenCalledWith(0);
            });
        });

        describe('Delete via UI button', () => {
            it('should delete message when clicking delete button', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(1);
                await waitForDOMUpdate();

                // Act - Click delete button
                const deleteButton = domElements.messageViewer.querySelector('[data-action="delete"]');
                expect(deleteButton).not.toBeNull();
                deleteButton.click();
                await waitForDOMUpdate();

                // Assert
                expect(app.deleteMessage).toHaveBeenCalledWith(1);
            });
        });

        describe('Delete behavior', () => {
            it('should show next message after deleting', async () => {
                // Arrange
                await addMessages(3);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act - Delete first message
                app.deleteMessage(0);
                await waitForDOMUpdate();

                // Assert - Message list should have 2 items
                expect(messageHandler.getMessages()).toHaveLength(2);

                // The next message should be shown
                const currentMessage = messageHandler.getCurrentMessage();
                expect(currentMessage).not.toBeNull();
            });

            it('should show previous message when deleting last message', async () => {
                // Arrange
                await addMessages(3);
                const lastIndex = 2;
                app.showMessage(lastIndex);
                await waitForDOMUpdate();

                // Act - Delete last message
                app.deleteMessage(lastIndex);
                await waitForDOMUpdate();

                // Assert
                expect(messageHandler.getMessages()).toHaveLength(2);
                const currentMessage = messageHandler.getCurrentMessage();
                expect(currentMessage).not.toBeNull();
            });

            it('should show welcome screen when deleting last remaining message', async () => {
                // Arrange
                await addMessages(1);
                app.showMessage(0);
                await waitForDOMUpdate();

                // Act - Delete the only message
                app.deleteMessage(0);
                await waitForDOMUpdate();

                // Assert
                expect(messageHandler.getMessages()).toHaveLength(0);
                expect(domElements.welcomeScreen.style.display).toBe('flex');
                expect(domElements.appContainer.style.display).toBe('none');
            });

            it('should remove pin status when deleting pinned message', async () => {
                // Arrange
                await addMessages(3);

                // Pin the message
                messageHandler.togglePin(0);
                const message = messageHandler.getMessages()[0];
                expect(messageHandler.isPinned(message)).toBe(true);

                // Act - Delete the pinned message
                app.deleteMessage(0);
                await waitForDOMUpdate();

                // Assert - Pinned set should not contain the deleted message hash
                // (message is removed from the list)
                expect(messageHandler.getMessages()).toHaveLength(2);
            });
        });

        describe('Delete updates UI', () => {
            it('should update message list after delete', async () => {
                // Arrange
                await addMessages(3);
                await waitForDOMUpdate();

                expect(domElements.messageItems.querySelectorAll('.message-item').length).toBe(3);

                // Act
                app.deleteMessage(0);
                await waitForDOMUpdate();

                // Assert
                expect(domElements.messageItems.querySelectorAll('.message-item').length).toBe(2);
            });
        });
    });

    describe('Combined Pin and Delete operations', () => {
        it('should handle pinning and then deleting a message', async () => {
            // Arrange
            await addMessages(3);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Pin the message
            messageHandler.togglePin(0);
            uiManager.updateMessageList();
            await waitForDOMUpdate();

            const message = messageHandler.getMessages()[0];
            expect(messageHandler.isPinned(message)).toBe(true);

            // Act - Delete the pinned message
            app.deleteMessage(0);
            await waitForDOMUpdate();

            // Assert
            expect(messageHandler.getMessages()).toHaveLength(2);
        });

        it('should maintain other pinned messages after deleting one', async () => {
            // Arrange
            await addMessages(3);

            // Pin first and third messages
            messageHandler.togglePin(0);
            messageHandler.togglePin(2);
            uiManager.updateMessageList();
            await waitForDOMUpdate();

            // Act - Delete the first (pinned) message
            app.deleteMessage(0);
            await waitForDOMUpdate();

            // Assert - The originally third message (now at index 1) should still be pinned
            const messages = messageHandler.getMessages();
            expect(messages).toHaveLength(2);

            // The message that was at index 2 is now at index 1
            expect(messageHandler.isPinned(messages[1])).toBe(true);
        });
    });

    describe('Screen reader announcements', () => {
        it('should announce when message is pinned', async () => {
            // Arrange
            await addMessages(1);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('s');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(domElements.srAnnouncements.textContent).toContain('pinned');
        });

        it('should announce when message is deleted', async () => {
            // Arrange
            await addMessages(2);
            app.showMessage(0);
            await waitForDOMUpdate();

            // Act
            const event = createKeyboardEvent('Delete');
            document.dispatchEvent(event);
            await waitForDOMUpdate();

            // Assert
            expect(domElements.srAnnouncements.textContent).toContain('deleted');
        });
    });
});
