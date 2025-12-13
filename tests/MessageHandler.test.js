/**
 * Tests for MessageHandler.js
 * Tests message management, pinning, sorting, and storage
 */

// Mock the md5 module before importing MessageHandler
jest.mock('md5', () => jest.fn((str) => 'hash_' + str.substring(0, 10)));

import MessageHandler from '../src/js/MessageHandler.js';
import md5 from 'md5';

describe('MessageHandler', () => {
    let messageHandler;
    let mockStorage;

    beforeEach(() => {
        mockStorage = {
            get: jest.fn(() => []),
            set: jest.fn(),
            remove: jest.fn(),
            has: jest.fn(),
            clear: jest.fn()
        };

        messageHandler = new MessageHandler(mockStorage);
    });

    describe('constructor', () => {
        test('initializes with empty messages array', () => {
            expect(messageHandler.messages).toEqual([]);
        });

        test('initializes with null currentMessage', () => {
            expect(messageHandler.currentMessage).toBeNull();
        });

        test('loads pinned messages from storage', () => {
            mockStorage.get.mockReturnValue(['hash1', 'hash2']);
            const handler = new MessageHandler(mockStorage);

            expect(handler.pinnedMessages.has('hash1')).toBe(true);
            expect(handler.pinnedMessages.has('hash2')).toBe(true);
        });

        test('uses provided storage instance', () => {
            expect(messageHandler.storage).toBe(mockStorage);
        });
    });

    describe('addMessage', () => {
        const mockMsgInfo = {
            subject: 'Test Subject',
            senderEmail: 'test@example.com',
            messageDeliveryTime: '2024-01-15T10:30:00Z',
            body: 'Test body'
        };

        test('adds message to messages array', () => {
            messageHandler.addMessage(mockMsgInfo, 'test.msg');

            expect(messageHandler.messages.length).toBe(1);
        });

        test('returns the added message', () => {
            const result = messageHandler.addMessage(mockMsgInfo, 'test.msg');

            expect(result.subject).toBe('Test Subject');
            expect(result.fileName).toBe('test.msg');
        });

        test('generates messageHash', () => {
            const result = messageHandler.addMessage(mockMsgInfo, 'test.msg');

            expect(result.messageHash).toBeDefined();
            expect(md5).toHaveBeenCalled();
        });

        test('parses timestamp from messageDeliveryTime', () => {
            const result = messageHandler.addMessage(mockMsgInfo, 'test.msg');

            expect(result.timestamp).toBeInstanceOf(Date);
            expect(result.timestamp.toISOString()).toBe('2024-01-15T10:30:00.000Z');
        });

        test('falls back to clientSubmitTime for timestamp', () => {
            const msgInfo = {
                ...mockMsgInfo,
                messageDeliveryTime: null,
                clientSubmitTime: '2024-02-01T12:00:00Z'
            };

            const result = messageHandler.addMessage(msgInfo, 'test.msg');

            expect(result.timestamp.toISOString()).toBe('2024-02-01T12:00:00.000Z');
        });

        test('adds message at beginning of array', () => {
            messageHandler.addMessage(mockMsgInfo, 'first.msg');
            messageHandler.addMessage({ ...mockMsgInfo, subject: 'Second' }, 'second.msg');

            // After sorting, newest should be first
            expect(messageHandler.messages.length).toBe(2);
        });

        test('sorts messages after adding', () => {
            const older = {
                ...mockMsgInfo,
                messageDeliveryTime: '2024-01-01T00:00:00Z'
            };
            const newer = {
                ...mockMsgInfo,
                messageDeliveryTime: '2024-01-15T00:00:00Z'
            };

            messageHandler.addMessage(older, 'older.msg');
            messageHandler.addMessage(newer, 'newer.msg');

            expect(messageHandler.messages[0].timestamp > messageHandler.messages[1].timestamp).toBe(true);
        });
    });

    describe('sortMessages', () => {
        test('sorts messages by timestamp descending', () => {
            messageHandler.messages = [
                { timestamp: new Date('2024-01-01') },
                { timestamp: new Date('2024-01-15') },
                { timestamp: new Date('2024-01-10') }
            ];

            messageHandler.sortMessages();

            expect(messageHandler.messages[0].timestamp.toISOString()).toContain('2024-01-15');
            expect(messageHandler.messages[1].timestamp.toISOString()).toContain('2024-01-10');
            expect(messageHandler.messages[2].timestamp.toISOString()).toContain('2024-01-01');
        });
    });

    describe('deleteMessage', () => {
        beforeEach(() => {
            messageHandler.messages = [
                { messageHash: 'hash1', subject: 'First' },
                { messageHash: 'hash2', subject: 'Second' },
                { messageHash: 'hash3', subject: 'Third' }
            ];
        });

        test('removes message at index', () => {
            messageHandler.deleteMessage(1);

            expect(messageHandler.messages.length).toBe(2);
            expect(messageHandler.messages.find(m => m.messageHash === 'hash2')).toBeUndefined();
        });

        test('removes from pinned messages', () => {
            messageHandler.pinnedMessages.add('hash2');

            messageHandler.deleteMessage(1);

            expect(messageHandler.pinnedMessages.has('hash2')).toBe(false);
        });

        test('saves pinned messages after deletion', () => {
            messageHandler.deleteMessage(0);

            expect(mockStorage.set).toHaveBeenCalledWith('pinnedMessages', expect.any(Array));
        });

        test('returns next message after deletion', () => {
            // Delete middle message (hash2), should return the next one (hash3)
            const result = messageHandler.deleteMessage(1);

            expect(result.messageHash).toBe('hash3');
        });

        test('returns previous message when deleting last', () => {
            // Delete last message (hash3), should return the previous one (hash2)
            const result = messageHandler.deleteMessage(2);

            expect(result.messageHash).toBe('hash2');
        });

        test('returns null when no messages remain', () => {
            messageHandler.messages = [{ messageHash: 'only' }];

            const result = messageHandler.deleteMessage(0);

            expect(result).toBeNull();
        });
    });

    describe('togglePin', () => {
        beforeEach(() => {
            messageHandler.messages = [
                { messageHash: 'hash1', subject: 'First' }
            ];
        });

        test('pins unpinned message', () => {
            messageHandler.togglePin(0);

            expect(messageHandler.pinnedMessages.has('hash1')).toBe(true);
        });

        test('unpins pinned message', () => {
            messageHandler.pinnedMessages.add('hash1');

            messageHandler.togglePin(0);

            expect(messageHandler.pinnedMessages.has('hash1')).toBe(false);
        });

        test('saves pinned messages', () => {
            messageHandler.togglePin(0);

            expect(mockStorage.set).toHaveBeenCalledWith('pinnedMessages', ['hash1']);
        });

        test('returns the toggled message', () => {
            const result = messageHandler.togglePin(0);

            expect(result.messageHash).toBe('hash1');
        });
    });

    describe('isPinned', () => {
        test('returns true for pinned message', () => {
            const msgInfo = { messageHash: 'pinned' };
            messageHandler.pinnedMessages.add('pinned');

            expect(messageHandler.isPinned(msgInfo)).toBe(true);
        });

        test('returns false for unpinned message', () => {
            const msgInfo = { messageHash: 'unpinned' };

            expect(messageHandler.isPinned(msgInfo)).toBe(false);
        });
    });

    describe('savePinnedMessages', () => {
        test('saves pinned messages to storage as array', () => {
            messageHandler.pinnedMessages.add('hash1');
            messageHandler.pinnedMessages.add('hash2');

            messageHandler.savePinnedMessages();

            expect(mockStorage.set).toHaveBeenCalledWith(
                'pinnedMessages',
                expect.arrayContaining(['hash1', 'hash2'])
            );
        });
    });

    describe('setCurrentMessage', () => {
        test('sets current message', () => {
            const message = { subject: 'Test' };

            messageHandler.setCurrentMessage(message);

            expect(messageHandler.currentMessage).toBe(message);
        });
    });

    describe('getCurrentMessage', () => {
        test('returns current message', () => {
            const message = { subject: 'Test' };
            messageHandler.currentMessage = message;

            expect(messageHandler.getCurrentMessage()).toBe(message);
        });

        test('returns null when no current message', () => {
            expect(messageHandler.getCurrentMessage()).toBeNull();
        });
    });

    describe('getMessages', () => {
        test('returns messages array', () => {
            messageHandler.messages = [{ subject: 'Test' }];

            expect(messageHandler.getMessages()).toEqual([{ subject: 'Test' }]);
        });

        test('returns empty array when no messages', () => {
            expect(messageHandler.getMessages()).toEqual([]);
        });
    });
});
