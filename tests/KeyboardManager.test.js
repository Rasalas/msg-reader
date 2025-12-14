/**
 * Tests for KeyboardManager.js
 * Tests keyboard shortcuts, context management, navigation, actions, and accessibility
 */

import KeyboardManager from '../src/js/KeyboardManager.js';
import { KEYBOARD_CONTEXTS, SHORTCUTS, IGNORED_KEYS } from '../src/js/KeyboardShortcuts.js';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

describe('KeyboardManager', () => {
    let keyboardManager;
    let mockApp;
    let mockMessages;

    /**
     * Creates a mock keyboard event
     */
    function createKeyEvent(key, options = {}) {
        return new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
            ctrlKey: options.ctrlKey || false,
            metaKey: options.metaKey || false,
            altKey: options.altKey || false,
            shiftKey: options.shiftKey || false,
            ...options
        });
    }

    /**
     * Sets up the DOM structure required by KeyboardManager
     */
    function setupDOM() {
        document.body.innerHTML = `
            <div id="srAnnouncements" aria-live="polite"></div>
            <div id="helpModal">
                <div class="help-modal-backdrop"></div>
                <div class="help-modal-content"></div>
                <button class="help-modal-close"></button>
            </div>
            <div id="shortcutHint"></div>
            <div id="messageItems" role="listbox">
                <div class="message-item" data-message-index="0" tabindex="0">Message 1</div>
                <div class="message-item" data-message-index="1" tabindex="0">Message 2</div>
                <div class="message-item" data-message-index="2" tabindex="0">Message 3</div>
            </div>
            <div id="messageViewer" tabindex="0"></div>
            <input type="file" id="fileInputInApp" />
            <input type="text" id="textInput" />
            <textarea id="textArea"></textarea>
        `;
    }

    beforeEach(() => {
        jest.useFakeTimers();
        setupDOM();

        mockMessages = [
            { id: '1', subject: 'Message 1' },
            { id: '2', subject: 'Message 2' },
            { id: '3', subject: 'Message 3' }
        ];

        mockApp = {
            messageHandler: {
                getMessages: jest.fn(() => mockMessages),
                getCurrentMessage: jest.fn(() => mockMessages[0]),
                isPinned: jest.fn(() => false)
            },
            uiManager: {
                closeAttachmentModal: jest.fn(),
                showPrevAttachment: jest.fn(),
                showNextAttachment: jest.fn(),
                messageList: {
                    scrollToMessage: jest.fn(),
                    getMessageElement: jest.fn((index) => document.querySelector(`[data-message-index="${index}"]`))
                }
            },
            showMessage: jest.fn(),
            togglePin: jest.fn(),
            deleteMessage: jest.fn()
        };

        keyboardManager = new KeyboardManager(mockApp);
    });

    afterEach(() => {
        keyboardManager.destroy();
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('constructor and initialization', () => {
        test('initializes with main context', () => {
            expect(keyboardManager.context).toBe(KEYBOARD_CONTEXTS.MAIN);
        });

        test('stores app reference', () => {
            expect(keyboardManager.app).toBe(mockApp);
        });

        test('builds action map', () => {
            expect(keyboardManager.actionMap).toBeInstanceOf(Map);
            expect(keyboardManager.actionMap.has('nextMessage')).toBe(true);
            expect(keyboardManager.actionMap.has('prevMessage')).toBe(true);
            expect(keyboardManager.actionMap.has('openMessage')).toBe(true);
        });

        test('gets DOM element references', () => {
            expect(keyboardManager.srAnnouncements).toBe(document.getElementById('srAnnouncements'));
            expect(keyboardManager.helpModal).toBe(document.getElementById('helpModal'));
        });

        test('adds keydown event listener', () => {
            // Create a new instance and track if handler is called
            const km = new KeyboardManager(mockApp);
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('j');
            document.dispatchEvent(event);
            // If handler was called, showMessage would be called
            expect(mockApp.showMessage).toHaveBeenCalled();
            km.destroy();
        });

        test('initializes shortcut hint button', () => {
            const shortcutHint = document.getElementById('shortcutHint');
            const showHelpSpy = jest.spyOn(keyboardManager, 'showHelpModal');
            shortcutHint.click();
            expect(showHelpSpy).toHaveBeenCalled();
        });
    });

    describe('context management', () => {
        test('setContext changes context to modal', () => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MODAL);
            expect(keyboardManager.context).toBe(KEYBOARD_CONTEXTS.MODAL);
        });

        test('setContext changes context back to main', () => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MODAL);
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MAIN);
            expect(keyboardManager.context).toBe(KEYBOARD_CONTEXTS.MAIN);
        });

        test('shortcuts are context-dependent - main context blocks modal shortcuts', () => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MAIN);
            const event = createKeyEvent('ArrowLeft');
            keyboardManager.handleKeyDown(event);
            // ArrowLeft is for modal navigation, should not trigger in main
            expect(mockApp.uiManager.showPrevAttachment).not.toHaveBeenCalled();
        });

        test('shortcuts are context-dependent - modal context uses modal shortcuts', () => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MODAL);
            const event = createKeyEvent('ArrowLeft');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.uiManager.showPrevAttachment).toHaveBeenCalled();
        });
    });

    describe('main context - navigation', () => {
        beforeEach(() => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MAIN);
        });

        test('ArrowDown selects next message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('ArrowDown');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(1);
        });

        test('j key selects next message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('j');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(1);
        });

        test('ArrowUp selects previous message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[1]);
            const event = createKeyEvent('ArrowUp');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(0);
        });

        test('k key selects previous message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[1]);
            const event = createKeyEvent('k');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(0);
        });

        test('Home navigates to first message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[2]);
            const event = createKeyEvent('Home');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(0);
        });

        test('End navigates to last message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('End');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(2);
        });

        test('PageDown navigates 5 messages forward', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('PageDown');
            keyboardManager.handleKeyDown(event);
            // Should clamp to last message (index 2) since we only have 3 messages
            expect(mockApp.showMessage).toHaveBeenCalledWith(2);
        });

        test('Space navigates 5 messages forward (page down)', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent(' ');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(2);
        });

        test('PageUp navigates 5 messages backward', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[2]);
            const event = createKeyEvent('PageUp');
            keyboardManager.handleKeyDown(event);
            // Should clamp to first message (index 0)
            expect(mockApp.showMessage).toHaveBeenCalledWith(0);
        });

        test('navigation does not go below 0', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('ArrowUp');
            keyboardManager.handleKeyDown(event);
            // Should stay at 0, not navigate
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('navigation does not exceed list length', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[2]);
            const event = createKeyEvent('ArrowDown');
            keyboardManager.handleKeyDown(event);
            // Should stay at last, not navigate
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('navigation handles no current message by selecting first', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(null);
            const event = createKeyEvent('ArrowDown');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(0);
        });
    });

    describe('main context - actions', () => {
        beforeEach(() => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MAIN);
        });

        test('Enter opens/selects current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[1]);
            const event = createKeyEvent('Enter');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(1);
        });

        test('o key opens/selects current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[1]);
            const event = createKeyEvent('o');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).toHaveBeenCalledWith(1);
        });

        test('s key toggles pin on current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('s');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.togglePin).toHaveBeenCalledWith(0);
        });

        test('Delete key deletes current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('Delete');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.deleteMessage).toHaveBeenCalledWith(0);
        });

        test('Backspace deletes current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('Backspace');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.deleteMessage).toHaveBeenCalledWith(0);
        });

        test('Ctrl+o opens file picker', () => {
            const fileInput = document.getElementById('fileInputInApp');
            const clickSpy = jest.spyOn(fileInput, 'click');
            const event = createKeyEvent('o', { ctrlKey: true });
            keyboardManager.handleKeyDown(event);
            expect(clickSpy).toHaveBeenCalled();
        });

        test('Meta+o (Cmd+o) opens file picker', () => {
            const fileInput = document.getElementById('fileInputInApp');
            const clickSpy = jest.spyOn(fileInput, 'click');
            const event = createKeyEvent('o', { metaKey: true });
            keyboardManager.handleKeyDown(event);
            expect(clickSpy).toHaveBeenCalled();
        });

        test('? key shows help modal', () => {
            const showHelpSpy = jest.spyOn(keyboardManager, 'showHelpModal');
            const event = createKeyEvent('?');
            keyboardManager.handleKeyDown(event);
            expect(showHelpSpy).toHaveBeenCalled();
        });
    });

    describe('modal context', () => {
        beforeEach(() => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MODAL);
        });

        test('Escape closes modal and returns to main context', () => {
            const event = createKeyEvent('Escape');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.uiManager.closeAttachmentModal).toHaveBeenCalled();
            expect(keyboardManager.context).toBe(KEYBOARD_CONTEXTS.MAIN);
        });

        test('ArrowLeft navigates to previous attachment', () => {
            const event = createKeyEvent('ArrowLeft');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.uiManager.showPrevAttachment).toHaveBeenCalled();
        });

        test('ArrowRight navigates to next attachment', () => {
            const event = createKeyEvent('ArrowRight');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.uiManager.showNextAttachment).toHaveBeenCalled();
        });

        test('navigation shortcuts are ignored in modal context', () => {
            const event = createKeyEvent('j');
            keyboardManager.handleKeyDown(event);
            // j is main context only
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('action shortcuts are ignored in modal context', () => {
            const event = createKeyEvent('s');
            keyboardManager.handleKeyDown(event);
            // s (pin) is main context only
            expect(mockApp.togglePin).not.toHaveBeenCalled();
        });

        test('? shows help modal in modal context', () => {
            const showHelpSpy = jest.spyOn(keyboardManager, 'showHelpModal');
            const event = createKeyEvent('?');
            keyboardManager.handleKeyDown(event);
            expect(showHelpSpy).toHaveBeenCalled();
        });
    });

    describe('help modal', () => {
        test('showHelpModal adds active class', () => {
            keyboardManager.showHelpModal();
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(true);
        });

        test('showHelpModal prevents body scroll', () => {
            keyboardManager.showHelpModal();
            expect(document.body.style.overflow).toBe('hidden');
        });

        test('showHelpModal builds content on first call', () => {
            const content = keyboardManager.helpModal.querySelector('.help-modal-content');
            keyboardManager.showHelpModal();
            expect(content.innerHTML).toContain('Keyboard Shortcuts');
            expect(content.dataset.initialized).toBe('true');
        });

        test('showHelpModal does not rebuild content on subsequent calls', () => {
            keyboardManager.showHelpModal();
            const content = keyboardManager.helpModal.querySelector('.help-modal-content');
            const originalHTML = content.innerHTML;
            keyboardManager.closeHelpModal();
            keyboardManager.showHelpModal();
            expect(content.innerHTML).toBe(originalHTML);
        });

        test('closeHelpModal removes active class', () => {
            keyboardManager.showHelpModal();
            keyboardManager.closeHelpModal();
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(false);
        });

        test('closeHelpModal restores body scroll', () => {
            keyboardManager.showHelpModal();
            keyboardManager.closeHelpModal();
            expect(document.body.style.overflow).toBe('');
        });

        test('Escape closes help modal when active', () => {
            keyboardManager.showHelpModal();
            const event = createKeyEvent('Escape');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(false);
        });

        test('backdrop click closes help modal', () => {
            keyboardManager.showHelpModal();
            const backdrop = keyboardManager.helpModal.querySelector('.help-modal-backdrop');
            backdrop.click();
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(false);
        });

        test('close button click closes help modal', () => {
            keyboardManager.showHelpModal();
            const closeBtn = keyboardManager.helpModal.querySelector('.help-modal-close');
            closeBtn.click();
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(false);
        });

        test('buildHelpContent generates valid HTML with sections', () => {
            const content = keyboardManager.buildHelpContent();
            expect(content).toContain('Navigation');
            expect(content).toContain('Actions');
            expect(content).toContain('Modal');
            expect(content).toContain('Help');
        });
    });

    describe('edge cases - input focus', () => {
        test('keyboard events in text input are ignored', () => {
            const input = document.getElementById('textInput');
            input.focus();
            const event = createKeyEvent('j');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('keyboard events in textarea are ignored', () => {
            const textarea = document.getElementById('textArea');
            textarea.focus();
            const event = createKeyEvent('k');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('Escape key works even when input is focused', () => {
            keyboardManager.showHelpModal();
            const input = document.getElementById('textInput');
            input.focus();
            const event = createKeyEvent('Escape');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.helpModal.classList.contains('active')).toBe(false);
        });

        test('isInputFocused returns true for input elements', () => {
            const input = document.getElementById('textInput');
            input.focus();
            expect(keyboardManager.isInputFocused()).toBe(true);
        });

        test('isInputFocused returns true for textarea elements', () => {
            const textarea = document.getElementById('textArea');
            textarea.focus();
            expect(keyboardManager.isInputFocused()).toBe(true);
        });

        test('isInputFocused returns true for select elements', () => {
            // Create a select element (which is input-like)
            const select = document.createElement('select');
            select.tabIndex = 0;
            document.body.appendChild(select);
            select.focus();

            // Verify the element is focused
            expect(document.activeElement).toBe(select);
            // Therefore isInputFocused should return true (select is input-like)
            expect(keyboardManager.isInputFocused()).toBe(true);

            // Clean up
            select.remove();
        });

        test('isInputFocused returns false for non-input elements', () => {
            // Test through keyboard handling behavior
            // When a non-input is focused, shortcuts should still work
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);

            // Focus the message viewer (a div, not an input)
            const messageViewer = document.getElementById('messageViewer');
            messageViewer.focus();

            // Clear any previous calls
            jest.clearAllMocks();

            // Press 'j' - if isInputFocused returns false, the shortcut will be processed
            const event = createKeyEvent('j');
            keyboardManager.handleKeyDown(event);

            // If isInputFocused correctly returned false, showMessage should be called
            expect(mockApp.showMessage).toHaveBeenCalled();
        });
    });

    describe('edge cases - modifier keys', () => {
        test('Ctrl modifier changes shortcut matching', () => {
            // Regular 'o' opens message
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const eventO = createKeyEvent('o');
            keyboardManager.handleKeyDown(eventO);
            expect(mockApp.showMessage).toHaveBeenCalled();

            // Ctrl+o opens file picker
            jest.clearAllMocks();
            const fileInput = document.getElementById('fileInputInApp');
            const clickSpy = jest.spyOn(fileInput, 'click');
            const eventCtrlO = createKeyEvent('o', { ctrlKey: true });
            keyboardManager.handleKeyDown(eventCtrlO);
            expect(clickSpy).toHaveBeenCalled();
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('buildKeyIdentifier includes Ctrl modifier', () => {
            const event = createKeyEvent('o', { ctrlKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('Ctrl+o');
        });

        test('buildKeyIdentifier includes Meta modifier', () => {
            const event = createKeyEvent('o', { metaKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('Meta+o');
        });

        test('buildKeyIdentifier includes Alt modifier', () => {
            const event = createKeyEvent('a', { altKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('Alt+a');
        });

        test('buildKeyIdentifier includes Shift modifier', () => {
            const event = createKeyEvent('a', { shiftKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('Shift+a');
        });

        test('buildKeyIdentifier excludes Shift for ? key', () => {
            const event = createKeyEvent('?', { shiftKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('?');
        });

        test('buildKeyIdentifier handles multiple modifiers', () => {
            const event = createKeyEvent('s', { ctrlKey: true, shiftKey: true });
            expect(keyboardManager.buildKeyIdentifier(event)).toBe('Ctrl+Shift+s');
        });
    });

    describe('edge cases - empty message list', () => {
        test('navigation has no effect on empty list', () => {
            mockApp.messageHandler.getMessages.mockReturnValue([]);
            const event = createKeyEvent('j');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('navigateToMessage has no effect on empty list', () => {
            mockApp.messageHandler.getMessages.mockReturnValue([]);
            const event = createKeyEvent('Home');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('selectCurrentMessage has no effect on empty list', () => {
            mockApp.messageHandler.getMessages.mockReturnValue([]);
            const event = createKeyEvent('Enter');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('toggleCurrentPin has no effect when no message selected', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(null);
            const event = createKeyEvent('s');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.togglePin).not.toHaveBeenCalled();
        });

        test('deleteCurrentMessage has no effect when no message selected', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(null);
            const event = createKeyEvent('Delete');
            keyboardManager.handleKeyDown(event);
            expect(mockApp.deleteMessage).not.toHaveBeenCalled();
        });
    });

    describe('edge cases - ignored keys', () => {
        test('function keys are ignored', () => {
            const event = createKeyEvent('F1');
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            keyboardManager.handleKeyDown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        test('Tab key is ignored', () => {
            const event = createKeyEvent('Tab');
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            keyboardManager.handleKeyDown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        test('CapsLock is ignored', () => {
            const event = createKeyEvent('CapsLock');
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            keyboardManager.handleKeyDown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });

        test('modifier-only presses are ignored', () => {
            const shiftEvent = createKeyEvent('Shift');
            const ctrlEvent = createKeyEvent('Control');
            const altEvent = createKeyEvent('Alt');
            const metaEvent = createKeyEvent('Meta');

            keyboardManager.handleKeyDown(shiftEvent);
            keyboardManager.handleKeyDown(ctrlEvent);
            keyboardManager.handleKeyDown(altEvent);
            keyboardManager.handleKeyDown(metaEvent);

            expect(mockApp.showMessage).not.toHaveBeenCalled();
        });

        test('all IGNORED_KEYS are actually ignored', () => {
            IGNORED_KEYS.forEach(key => {
                const event = createKeyEvent(key);
                const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
                keyboardManager.handleKeyDown(event);
                expect(preventDefaultSpy).not.toHaveBeenCalled();
            });
        });
    });

    describe('accessibility - announcements', () => {
        test('announce sets screen reader text', () => {
            keyboardManager.announce('Test message');
            expect(keyboardManager.srAnnouncements.textContent).toBe('Test message');
        });

        test('announce clears text after delay', () => {
            jest.useFakeTimers();
            keyboardManager.announce('Test message');
            expect(keyboardManager.srAnnouncements.textContent).toBe('Test message');
            jest.advanceTimersByTime(1100);
            expect(keyboardManager.srAnnouncements.textContent).toBe('');
            jest.useRealTimers();
        });

        test('navigation announces position', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('ArrowDown');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.srAnnouncements.textContent).toContain('Message 2 of 3');
        });

        test('togglePin announces pinned state', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            mockApp.messageHandler.isPinned.mockReturnValue(true);
            const event = createKeyEvent('s');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.srAnnouncements.textContent).toBe('Message pinned');
        });

        test('togglePin announces unpinned state', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            mockApp.messageHandler.isPinned.mockReturnValue(false);
            const event = createKeyEvent('s');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.srAnnouncements.textContent).toBe('Message unpinned');
        });

        test('deleteMessage announces deletion', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('Delete');
            keyboardManager.handleKeyDown(event);
            expect(keyboardManager.srAnnouncements.textContent).toBe('Message deleted');
        });
    });

    describe('accessibility - focus management', () => {
        test('scrollMessageIntoView delegates to virtual list scrollToMessage', () => {
            keyboardManager.scrollMessageIntoView(1);
            expect(mockApp.uiManager.messageList.scrollToMessage).toHaveBeenCalledWith(1, {
                behavior: 'smooth',
                block: 'nearest'
            });
        });

        test('scrollMessageIntoView gets element from virtual list', () => {
            keyboardManager.scrollMessageIntoView(1);
            // Uses requestAnimationFrame, so we need to flush
            jest.runAllTimers();
            expect(mockApp.uiManager.messageList.getMessageElement).toHaveBeenCalledWith(1);
        });

        test('selectCurrentMessage focuses message viewer', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const messageViewer = document.getElementById('messageViewer');
            const focusSpy = jest.spyOn(messageViewer, 'focus');
            keyboardManager.selectCurrentMessage();
            expect(focusSpy).toHaveBeenCalled();
        });

        test('showHelpModal focuses close button', () => {
            const closeBtn = keyboardManager.helpModal.querySelector('.help-modal-close');
            const focusSpy = jest.spyOn(closeBtn, 'focus');
            keyboardManager.showHelpModal();
            expect(focusSpy).toHaveBeenCalled();
        });
    });

    describe('event handling', () => {
        test('preventDefault is called for matched shortcuts', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[0]);
            const event = createKeyEvent('j');
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            keyboardManager.handleKeyDown(event);
            expect(preventDefaultSpy).toHaveBeenCalled();
        });

        test('preventDefault is not called for unmatched keys', () => {
            const event = createKeyEvent('z');
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            keyboardManager.handleKeyDown(event);
            expect(preventDefaultSpy).not.toHaveBeenCalled();
        });
    });

    describe('findShortcut', () => {
        test('finds shortcut by simple key', () => {
            const shortcut = keyboardManager.findShortcut('j', 'j');
            expect(shortcut).toBeTruthy();
            expect(shortcut.action).toBe('nextMessage');
        });

        test('finds shortcut by modifier key combination', () => {
            const shortcut = keyboardManager.findShortcut('Ctrl+o', 'o');
            expect(shortcut).toBeTruthy();
            expect(shortcut.action).toBe('openFilePicker');
        });

        test('returns null for non-existent shortcut', () => {
            const shortcut = keyboardManager.findShortcut('z', 'z');
            expect(shortcut).toBeNull();
        });

        test('respects context when finding shortcuts', () => {
            keyboardManager.setContext(KEYBOARD_CONTEXTS.MODAL);
            // j is only in main context
            const shortcut = keyboardManager.findShortcut('j', 'j');
            expect(shortcut).toBeNull();
        });
    });

    describe('getCurrentMessageIndex', () => {
        test('returns correct index for current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(mockMessages[1]);
            expect(keyboardManager.getCurrentMessageIndex()).toBe(1);
        });

        test('returns -1 when no current message', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue(null);
            expect(keyboardManager.getCurrentMessageIndex()).toBe(-1);
        });

        test('returns -1 when current message not in list', () => {
            mockApp.messageHandler.getCurrentMessage.mockReturnValue({ id: 'unknown' });
            expect(keyboardManager.getCurrentMessageIndex()).toBe(-1);
        });
    });

    describe('destroy', () => {
        test('removes keydown event listener', () => {
            const spy = jest.spyOn(keyboardManager, 'handleKeyDown');
            keyboardManager.destroy();
            const event = createKeyEvent('j');
            document.dispatchEvent(event);
            // Handler should not be called after destroy
            // Note: We need to check spy was NOT called after destroy
            spy.mockClear();
            document.dispatchEvent(event);
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('edge cases - missing DOM elements', () => {
        test('handles missing srAnnouncements element', () => {
            document.getElementById('srAnnouncements').remove();
            const km = new KeyboardManager(mockApp);
            expect(() => km.announce('Test')).not.toThrow();
            km.destroy();
        });

        test('handles missing helpModal element', () => {
            document.getElementById('helpModal').remove();
            const km = new KeyboardManager(mockApp);
            expect(() => km.showHelpModal()).not.toThrow();
            expect(() => km.closeHelpModal()).not.toThrow();
            km.destroy();
        });

        test('handles missing fileInput element', () => {
            document.getElementById('fileInputInApp').remove();
            expect(() => keyboardManager.openFilePicker()).not.toThrow();
        });

        test('handles missing message item for scroll', () => {
            expect(() => keyboardManager.scrollMessageIntoView(99)).not.toThrow();
        });

        test('handles missing shortcutHint button', () => {
            document.getElementById('shortcutHint').remove();
            expect(() => new KeyboardManager(mockApp)).not.toThrow();
        });
    });

    describe('integration - shortcut definitions', () => {
        test('all navigation shortcuts have handlers', () => {
            SHORTCUTS.navigation.forEach(shortcut => {
                expect(keyboardManager.actionMap.has(shortcut.action)).toBe(true);
            });
        });

        test('all action shortcuts have handlers', () => {
            SHORTCUTS.actions.forEach(shortcut => {
                expect(keyboardManager.actionMap.has(shortcut.action)).toBe(true);
            });
        });

        test('all modal shortcuts have handlers', () => {
            SHORTCUTS.modal.forEach(shortcut => {
                expect(keyboardManager.actionMap.has(shortcut.action)).toBe(true);
            });
        });

        test('all help shortcuts have handlers', () => {
            SHORTCUTS.help.forEach(shortcut => {
                expect(keyboardManager.actionMap.has(shortcut.action)).toBe(true);
            });
        });
    });
});
