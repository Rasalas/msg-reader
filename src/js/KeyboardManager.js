/**
 * Centralized keyboard event handler for the application
 * Manages keyboard shortcuts, context-aware handling, and accessibility features
 */

import { SHORTCUTS, KEYBOARD_CONTEXTS, HELP_MODAL_SECTIONS, IGNORED_KEYS } from './KeyboardShortcuts.js';
import { themeManager } from './ThemeManager.js';

class KeyboardManager {
    /**
     * Creates a new KeyboardManager instance
     * @param {App} app - The main application instance
     */
    constructor(app) {
        this.app = app;
        this.context = KEYBOARD_CONTEXTS.MAIN;
        this.helpModal = null;
        this.srAnnouncements = null;

        // Build action map for quick lookup
        this.actionMap = this.buildActionMap();

        // Bind event handler
        this.handleKeyDown = this.handleKeyDown.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize keyboard manager
     */
    init() {
        document.addEventListener('keydown', this.handleKeyDown);

        // Get screen reader announcements element
        this.srAnnouncements = document.getElementById('srAnnouncements');

        // Get help modal element
        this.helpModal = document.getElementById('helpModal');

        // Initialize help modal close handlers
        this.initHelpModal();

        // Initialize shortcut hint button
        const shortcutHint = document.getElementById('shortcutHint');
        shortcutHint?.addEventListener('click', () => this.showHelpModal());
    }

    /**
     * Build a map of actions to their handlers
     * @returns {Map} Action name to handler function
     */
    buildActionMap() {
        return new Map([
            ['nextMessage', () => this.navigateMessages(1)],
            ['prevMessage', () => this.navigateMessages(-1)],
            ['openMessage', () => this.selectCurrentMessage()],
            ['firstMessage', () => this.navigateToMessage(0)],
            ['lastMessage', () => this.navigateToMessage(-1)],
            ['pageDown', () => this.navigateMessages(5)],
            ['pageUp', () => this.navigateMessages(-5)],
            ['togglePin', () => this.toggleCurrentPin()],
            ['deleteMessage', () => this.deleteCurrentMessage()],
            ['openFilePicker', () => this.openFilePicker()],
            ['focusSearch', () => this.focusSearch()],
            ['clearSearch', () => this.clearSearch()],
            ['closeModal', () => this.closeCurrentModal()],
            ['prevAttachment', () => this.navigateAttachment(-1)],
            ['nextAttachment', () => this.navigateAttachment(1)],
            ['showHelp', () => this.showHelpModal()],
            ['toggleTheme', () => this.toggleTheme()]
        ]);
    }

    /**
     * Set the current keyboard context
     * @param {string} context - One of KEYBOARD_CONTEXTS values
     */
    setContext(context) {
        this.context = context;
    }

    /**
     * Check if an input element is currently focused
     * @returns {boolean}
     */
    isInputFocused() {
        const activeElement = document.activeElement;
        if (!activeElement) return false;

        const tagName = activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
        const isContentEditable = activeElement.isContentEditable;

        return isInput || isContentEditable;
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        // Ignore if typing in an input field (unless it's Escape)
        if (this.isInputFocused() && event.key !== 'Escape') {
            return;
        }

        // Ignore function keys and modifier-only presses
        if (IGNORED_KEYS.includes(event.key)) {
            return;
        }

        // Build the key identifier (e.g., "Ctrl+o", "Meta+o", "s")
        const keyId = this.buildKeyIdentifier(event);

        // Find matching shortcut
        const shortcut = this.findShortcut(keyId, event.key);

        if (shortcut) {
            const handler = this.actionMap.get(shortcut.action);
            if (handler) {
                event.preventDefault();
                handler();
            }
        }
    }

    /**
     * Build a key identifier from an event
     * @param {KeyboardEvent} event
     * @returns {string}
     */
    buildKeyIdentifier(event) {
        const parts = [];

        if (event.ctrlKey) parts.push('Ctrl');
        if (event.metaKey) parts.push('Meta');
        if (event.altKey) parts.push('Alt');
        // Don't add Shift for characters that require Shift on some keyboard layouts
        // (e.g., '?' and '/' on German keyboards)
        const shiftExceptions = ['?', '/'];
        if (event.shiftKey && !shiftExceptions.includes(event.key)) parts.push('Shift');

        parts.push(event.key);
        return parts.join('+');
    }

    /**
     * Find a shortcut matching the key and current context
     * @param {string} keyId - Full key identifier with modifiers
     * @param {string} baseKey - Just the key without modifiers
     * @returns {Object|null}
     */
    findShortcut(keyId, baseKey) {
        // Flatten all shortcuts
        const allShortcuts = [
            ...SHORTCUTS.navigation,
            ...SHORTCUTS.actions,
            ...SHORTCUTS.modal,
            ...SHORTCUTS.help
        ];

        for (const shortcut of allShortcuts) {
            // Check if context matches
            if (!shortcut.contexts.includes(this.context)) {
                continue;
            }

            // Check if key matches
            const matchesKey = shortcut.keys.some(key => {
                // Handle modifier keys
                if (key.includes('+')) {
                    return key === keyId;
                }
                // Handle simple keys - only match if no modifiers were pressed
                return key === baseKey && keyId === baseKey;
            });

            if (matchesKey) {
                return shortcut;
            }
        }

        return null;
    }

    /**
     * Get the visible messages (filtered if search is active, all otherwise)
     * @returns {Array}
     */
    getVisibleMessages() {
        return this.app.uiManager.messageList.getFilteredMessages();
    }

    /**
     * Get the currently selected message index within visible messages
     * @returns {number}
     */
    getCurrentMessageIndex() {
        const messages = this.getVisibleMessages();
        const currentMessage = this.app.messageHandler.getCurrentMessage();
        return messages.indexOf(currentMessage);
    }

    /**
     * Navigate messages by delta
     * @param {number} delta - Number of messages to move (positive = down, negative = up)
     */
    navigateMessages(delta) {
        const visibleMessages = this.getVisibleMessages();
        if (visibleMessages.length === 0) return;

        const currentIndex = this.getCurrentMessageIndex();
        const newIndex = Math.max(0, Math.min(visibleMessages.length - 1, currentIndex + delta));

        if (newIndex !== currentIndex || currentIndex === -1) {
            const targetIndexInVisible = currentIndex === -1 ? 0 : newIndex;
            // Get the actual message and find its index in the full list
            const targetMessage = visibleMessages[targetIndexInVisible];
            const allMessages = this.app.messageHandler.getMessages();
            const targetIndexInAll = allMessages.indexOf(targetMessage);

            this.app.showMessage(targetIndexInAll);
            this.scrollMessageIntoView(targetIndexInVisible);
            this.announce(`Message ${targetIndexInVisible + 1} of ${visibleMessages.length}`);
        }
    }

    /**
     * Navigate to a specific message
     * @param {number} index - Target index (-1 for last message)
     */
    navigateToMessage(index) {
        const visibleMessages = this.getVisibleMessages();
        if (visibleMessages.length === 0) return;

        const targetIndexInVisible = index === -1 ? visibleMessages.length - 1 : index;
        // Get the actual message and find its index in the full list
        const targetMessage = visibleMessages[targetIndexInVisible];
        const allMessages = this.app.messageHandler.getMessages();
        const targetIndexInAll = allMessages.indexOf(targetMessage);

        this.app.showMessage(targetIndexInAll);
        this.scrollMessageIntoView(targetIndexInVisible);
        this.announce(`Message ${targetIndexInVisible + 1} of ${visibleMessages.length}`);
    }

    /**
     * Select/focus the current message
     */
    selectCurrentMessage() {
        const visibleMessages = this.getVisibleMessages();
        if (visibleMessages.length === 0) return;

        let currentIndexInVisible = this.getCurrentMessageIndex();
        if (currentIndexInVisible === -1) {
            currentIndexInVisible = 0;
        }

        // Get the actual message and find its index in the full list
        const targetMessage = visibleMessages[currentIndexInVisible];
        const allMessages = this.app.messageHandler.getMessages();
        const targetIndexInAll = allMessages.indexOf(targetMessage);

        this.app.showMessage(targetIndexInAll);
        this.scrollMessageIntoView(currentIndexInVisible);

        // Focus the message viewer
        const messageViewer = document.getElementById('messageViewer');
        if (messageViewer) {
            messageViewer.focus();
        }
    }

    /**
     * Toggle pin on current message
     */
    toggleCurrentPin() {
        const visibleMessages = this.getVisibleMessages();
        const currentIndexInVisible = this.getCurrentMessageIndex();
        if (currentIndexInVisible === -1) return;

        // Get the actual message and find its index in the full list
        const targetMessage = visibleMessages[currentIndexInVisible];
        const allMessages = this.app.messageHandler.getMessages();
        const targetIndexInAll = allMessages.indexOf(targetMessage);

        this.app.togglePin(targetIndexInAll);
        const isPinned = this.app.messageHandler.isPinned(targetMessage);
        this.announce(isPinned ? 'Message pinned' : 'Message unpinned');
    }

    /**
     * Delete the current message
     */
    deleteCurrentMessage() {
        const visibleMessages = this.getVisibleMessages();
        const currentIndexInVisible = this.getCurrentMessageIndex();
        if (currentIndexInVisible === -1) return;

        // Get the actual message and find its index in the full list
        const targetMessage = visibleMessages[currentIndexInVisible];
        const allMessages = this.app.messageHandler.getMessages();
        const targetIndexInAll = allMessages.indexOf(targetMessage);

        this.app.deleteMessage(targetIndexInAll);
        this.announce('Message deleted');
    }

    /**
     * Open the file picker
     */
    openFilePicker() {
        const fileInput = document.getElementById('fileInputInApp') || document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Focus the search input
     */
    focusSearch() {
        this.app.uiManager.focusSearch();
    }

    /**
     * Toggle the application theme
     */
    toggleTheme() {
        const newTheme = themeManager.toggleTheme();
        const label = themeManager.getThemeLabel(newTheme);
        this.announce(`Theme: ${label}`);
    }

    /**
     * Clear the search and restore full message list
     * Also handles closing help modal if open
     */
    clearSearch() {
        // First check if help modal is open
        if (this.helpModal?.classList.contains('active')) {
            this.closeHelpModal();
            return;
        }
        // Then clear search if active
        if (this.app.uiManager.searchManager?.isSearchActive()) {
            this.app.uiManager.clearSearch();
        }
    }

    /**
     * Close the currently open modal
     */
    closeCurrentModal() {
        if (this.context === KEYBOARD_CONTEXTS.MODAL) {
            // Check if we should navigate back instead of closing
            const attachmentModal = this.app.uiManager.modal;
            if (attachmentModal?.handleEscape()) {
                // Handled by navigating back in nested content
                return;
            }
            // Close attachment modal
            this.app.uiManager.closeAttachmentModal();
            this.setContext(KEYBOARD_CONTEXTS.MAIN);
        } else if (this.helpModal?.classList.contains('active')) {
            // Close help modal
            this.closeHelpModal();
        }
    }

    /**
     * Navigate attachments in modal
     * @param {number} delta - Direction (-1 for prev, 1 for next)
     */
    navigateAttachment(delta) {
        if (this.context !== KEYBOARD_CONTEXTS.MODAL) return;

        if (delta < 0) {
            this.app.uiManager.showPrevAttachment();
        } else {
            this.app.uiManager.showNextAttachment();
        }
    }

    /**
     * Scroll a message item into view
     * Uses the virtual list's scrollToMessage for proper handling
     * @param {number} index - Message index
     */
    scrollMessageIntoView(index) {
        // Use the message list renderer's scroll method for virtual list support
        this.app.uiManager.messageList.scrollToMessage(index, {
            behavior: 'smooth',
            block: 'nearest'
        });

        // Focus the element after a short delay to allow virtual list to render
        requestAnimationFrame(() => {
            const messageItem = this.app.uiManager.messageList.getMessageElement(index);
            if (messageItem) {
                messageItem.focus();
            }
        });
    }

    /**
     * Announce a message for screen readers
     * @param {string} message - Message to announce
     */
    announce(message) {
        if (this.srAnnouncements) {
            this.srAnnouncements.textContent = message;
            // Clear after a short delay to allow re-announcement of same message
            setTimeout(() => {
                this.srAnnouncements.textContent = '';
            }, 1000);
        }
    }

    /**
     * Initialize help modal event listeners
     */
    initHelpModal() {
        if (!this.helpModal) return;

        const backdrop = this.helpModal.querySelector('.help-modal-backdrop');
        const closeBtn = this.helpModal.querySelector('.help-modal-close');

        backdrop?.addEventListener('click', () => this.closeHelpModal());
        closeBtn?.addEventListener('click', () => this.closeHelpModal());
    }

    /**
     * Show the help modal
     */
    showHelpModal() {
        if (!this.helpModal) return;

        // Build help content if not already built
        const content = this.helpModal.querySelector('.help-modal-content');
        if (content && !content.dataset.initialized) {
            content.innerHTML = this.buildHelpContent();
            content.dataset.initialized = 'true';
        }

        this.helpModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Focus the close button for accessibility
        const closeBtn = this.helpModal.querySelector('.help-modal-close');
        closeBtn?.focus();
    }

    /**
     * Close the help modal
     */
    closeHelpModal() {
        if (!this.helpModal) return;

        this.helpModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Build the help modal content HTML
     * @returns {string}
     */
    buildHelpContent() {
        const sections = HELP_MODAL_SECTIONS.map(section => `
            <div class="help-section">
                <h3>${section.title}</h3>
                <dl class="shortcut-list">
                    ${section.shortcuts.map(shortcut => `
                        <div class="shortcut-item">
                            <dt>${shortcut.keys.map(k => `<kbd>${k}</kbd>`).join(' / ')}</dt>
                            <dd>${shortcut.description}</dd>
                        </div>
                    `).join('')}
                </dl>
            </div>
        `).join('');

        return `
            <h2 id="helpModalTitle">Keyboard Shortcuts</h2>
            ${sections}
            <button class="help-modal-close-btn">Close <kbd>Esc</kbd></button>
        `;
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

export default KeyboardManager;
