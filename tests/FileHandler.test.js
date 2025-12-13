/**
 * Tests for FileHandler.js
 * Tests file handling and email parsing logic
 * Note: Event listener tests are skipped as they require browser DOM
 */
import FileHandler from '../src/js/FileHandler.js';

describe('FileHandler', () => {
    let fileHandler;
    let mockMessageHandler;
    let mockUIManager;
    let mockParsers;

    beforeEach(() => {
        mockMessageHandler = {
            addMessage: jest.fn((msgInfo, fileName) => ({ ...msgInfo, fileName })),
            getMessages: jest.fn(() => [])
        };

        mockUIManager = {
            showDropOverlay: jest.fn(),
            hideDropOverlay: jest.fn(),
            showAppContainer: jest.fn(),
            updateMessageList: jest.fn(),
            showMessage: jest.fn(),
            showError: jest.fn()
        };

        mockParsers = {
            extractMsg: jest.fn((buffer) => ({
                subject: 'Test MSG',
                senderEmail: 'test@example.com',
                messageDeliveryTime: '2024-01-01T00:00:00Z'
            })),
            extractEml: jest.fn((buffer) => ({
                subject: 'Test EML',
                senderEmail: 'test@example.com',
                messageDeliveryTime: '2024-01-01T00:00:00Z'
            }))
        };

        fileHandler = new FileHandler(mockMessageHandler, mockUIManager, mockParsers);
    });

    describe('constructor', () => {
        test('stores messageHandler reference', () => {
            expect(fileHandler.messageHandler).toBe(mockMessageHandler);
        });

        test('stores uiManager reference', () => {
            expect(fileHandler.uiManager).toBe(mockUIManager);
        });

        test('stores extractMsg parser', () => {
            expect(fileHandler.extractMsg).toBe(mockParsers.extractMsg);
        });

        test('stores extractEml parser', () => {
            expect(fileHandler.extractEml).toBe(mockParsers.extractEml);
        });

        test('handles missing parsers gracefully', () => {
            const handler = new FileHandler(mockMessageHandler, mockUIManager, {});
            expect(handler.extractMsg).toBeNull();
            expect(handler.extractEml).toBeNull();
        });

        test('handles no parsers argument', () => {
            const handler = new FileHandler(mockMessageHandler, mockUIManager);
            expect(handler.extractMsg).toBeNull();
            expect(handler.extractEml).toBeNull();
        });
    });

    describe('handleFiles', () => {
        beforeEach(() => {
            // Mock handleFile to isolate handleFiles testing
            fileHandler.handleFile = jest.fn();
        });

        test('processes MSG files', () => {
            const mockFile = { name: 'test.msg' };
            fileHandler.handleFiles([mockFile]);

            expect(fileHandler.handleFile).toHaveBeenCalledWith(mockFile);
        });

        test('processes EML files', () => {
            const mockFile = { name: 'test.eml' };
            fileHandler.handleFiles([mockFile]);

            expect(fileHandler.handleFile).toHaveBeenCalledWith(mockFile);
        });

        test('ignores unsupported file types', () => {
            const mockFile = { name: 'test.txt' };
            fileHandler.handleFiles([mockFile]);

            expect(fileHandler.handleFile).not.toHaveBeenCalled();
        });

        test('ignores pdf files', () => {
            fileHandler.handleFiles([{ name: 'test.pdf' }]);
            expect(fileHandler.handleFile).not.toHaveBeenCalled();
        });

        test('ignores exe files', () => {
            fileHandler.handleFiles([{ name: 'test.exe' }]);
            expect(fileHandler.handleFile).not.toHaveBeenCalled();
        });

        test('processes multiple supported files', () => {
            const files = [
                { name: 'test1.msg' },
                { name: 'test2.eml' }
            ];
            fileHandler.handleFiles(files);

            expect(fileHandler.handleFile).toHaveBeenCalledTimes(2);
            expect(fileHandler.handleFile).toHaveBeenCalledWith(files[0]);
            expect(fileHandler.handleFile).toHaveBeenCalledWith(files[1]);
        });

        test('filters mixed file types', () => {
            const files = [
                { name: 'test1.msg' },
                { name: 'test2.txt' },
                { name: 'test3.eml' },
                { name: 'test4.pdf' }
            ];
            fileHandler.handleFiles(files);

            expect(fileHandler.handleFile).toHaveBeenCalledTimes(2);
        });

        test('handles uppercase MSG extension', () => {
            fileHandler.handleFiles([{ name: 'test.MSG' }]);
            expect(fileHandler.handleFile).toHaveBeenCalled();
        });

        test('handles uppercase EML extension', () => {
            fileHandler.handleFiles([{ name: 'test.EML' }]);
            expect(fileHandler.handleFile).toHaveBeenCalled();
        });

        test('handles mixed case extensions', () => {
            fileHandler.handleFiles([
                { name: 'test.Msg' },
                { name: 'test.EmL' }
            ]);
            expect(fileHandler.handleFile).toHaveBeenCalledTimes(2);
        });

        test('handles empty file list', () => {
            fileHandler.handleFiles([]);
            expect(fileHandler.handleFile).not.toHaveBeenCalled();
        });

        test('handles FileList-like object', () => {
            const fileList = {
                0: { name: 'test.msg' },
                1: { name: 'test.eml' },
                length: 2,
                [Symbol.iterator]: function* () {
                    yield this[0];
                    yield this[1];
                }
            };
            fileHandler.handleFiles(fileList);
            expect(fileHandler.handleFile).toHaveBeenCalledTimes(2);
        });
    });

    describe('handleFile', () => {
        let mockFileReader;
        let originalFileReader;

        beforeEach(() => {
            // Store original FileReader
            originalFileReader = global.FileReader;

            // Create mock FileReader
            mockFileReader = {
                readAsArrayBuffer: jest.fn(),
                onload: null,
                onerror: null,
                result: new ArrayBuffer(8)
            };

            global.FileReader = jest.fn(() => mockFileReader);
        });

        afterEach(() => {
            global.FileReader = originalFileReader;
        });

        test('creates FileReader', () => {
            fileHandler.handleFile({ name: 'test.msg' });
            expect(global.FileReader).toHaveBeenCalled();
        });

        test('reads file as ArrayBuffer', () => {
            const file = { name: 'test.msg' };
            fileHandler.handleFile(file);
            expect(mockFileReader.readAsArrayBuffer).toHaveBeenCalledWith(file);
        });

        test('parses MSG file on load', () => {
            const file = { name: 'test.msg' };
            mockMessageHandler.getMessages.mockReturnValue([{ subject: 'Test' }]);

            fileHandler.handleFile(file);

            // Simulate file load
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockParsers.extractMsg).toHaveBeenCalled();
            expect(mockMessageHandler.addMessage).toHaveBeenCalled();
        });

        test('parses EML file on load', () => {
            const file = { name: 'test.eml' };
            mockMessageHandler.getMessages.mockReturnValue([{ subject: 'Test' }]);

            fileHandler.handleFile(file);

            // Simulate file load
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockParsers.extractEml).toHaveBeenCalled();
            expect(mockMessageHandler.addMessage).toHaveBeenCalled();
        });

        test('shows app container after loading file', () => {
            const file = { name: 'test.msg' };
            mockMessageHandler.getMessages.mockReturnValue([{ subject: 'Test' }]);

            fileHandler.handleFile(file);
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockUIManager.showAppContainer).toHaveBeenCalled();
        });

        test('updates message list after loading file', () => {
            const file = { name: 'test.msg' };
            mockMessageHandler.getMessages.mockReturnValue([{ subject: 'Test' }]);

            fileHandler.handleFile(file);
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockUIManager.updateMessageList).toHaveBeenCalled();
        });

        test('shows first message if only one loaded', () => {
            const file = { name: 'test.msg' };
            const message = { subject: 'Test' };
            mockMessageHandler.addMessage.mockReturnValue(message);
            mockMessageHandler.getMessages.mockReturnValue([message]);

            fileHandler.handleFile(file);
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockUIManager.showMessage).toHaveBeenCalledWith(message);
        });

        test('does not show message if multiple messages exist', () => {
            const file = { name: 'test.msg' };
            mockMessageHandler.getMessages.mockReturnValue([{ subject: 'A' }, { subject: 'B' }]);

            fileHandler.handleFile(file);
            mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });

            expect(mockUIManager.showMessage).not.toHaveBeenCalled();
        });

        test('handles parse error gracefully', () => {
            const file = { name: 'test.msg' };
            mockParsers.extractMsg.mockReturnValue(null);

            fileHandler.handleFile(file);

            // Simulate file load - should not throw
            expect(() => {
                mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
            }).not.toThrow();

            expect(mockUIManager.showError).toHaveBeenCalled();
        });

        test('handles read error gracefully', () => {
            const file = { name: 'test.msg' };

            fileHandler.handleFile(file);

            // Simulate error
            mockFileReader.onerror(new Error('Read failed'));

            expect(mockUIManager.showError).toHaveBeenCalled();
        });

        test('handles parser exception gracefully', () => {
            const file = { name: 'test.msg' };
            mockParsers.extractMsg.mockImplementation(() => {
                throw new Error('Parse error');
            });

            fileHandler.handleFile(file);

            expect(() => {
                mockFileReader.onload({ target: { result: new ArrayBuffer(8) } });
            }).not.toThrow();

            expect(mockUIManager.showError).toHaveBeenCalled();
        });
    });
});
