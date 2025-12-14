import { DEFAULT_LOCALE } from '../constants.js';
import { VirtualList } from './VirtualList.js';

/**
 * Height of a message item in pixels
 * Used for virtual list calculations
 */
const MESSAGE_ITEM_HEIGHT = 72;

/**
 * Renders the message list sidebar using virtual scrolling
 * Only renders visible items for better performance with large lists
 */
export class MessageListRenderer {
    /**
     * Creates a new MessageListRenderer instance
     * @param {HTMLElement} containerElement - The message items container
     * @param {MessageHandler} messageHandler - Handler for message operations
     */
    constructor(containerElement, messageHandler) {
        this.container = containerElement;
        this.messageHandler = messageHandler;

        // Initialize virtual list
        this.virtualList = new VirtualList(containerElement, {
            itemHeight: MESSAGE_ITEM_HEIGHT,
            buffer: 5,
            renderItem: (message, index) => this.renderMessageItem(message, index)
        });
    }

    /**
     * Updates the message list sidebar with all loaded messages
     * Highlights the current message and shows pinned status
     */
    render() {
        if (!this.container) return;

        const messages = this.messageHandler.getMessages();

        // Update ARIA label with count
        this.container.setAttribute('aria-label', `Email messages, ${messages.length} items`);

        // Update virtual list with messages
        this.virtualList.setItems(messages);

        // Ensure current message is visible after render
        const currentMessage = this.messageHandler.getCurrentMessage();
        const currentIndex = messages.indexOf(currentMessage);
        if (currentIndex >= 0) {
            this.container.setAttribute('aria-activedescendant', `message-${currentIndex}`);
        }
    }

    /**
     * Renders a single message item
     * @param {Object} msg - Message object
     * @param {number} index - Message index
     * @returns {string} HTML string for the message item
     */
    renderMessageItem(msg, index) {
        const currentMessage = this.messageHandler.getCurrentMessage();
        const messages = this.messageHandler.getMessages();
        const hasRealAttachments = msg.attachments?.some(att => !att.pidContentId) || false;
        const date = msg.timestamp;
        const dateStr = this.formatMessageDate(date);
        const cleanBody = (msg.body || msg.bodyContent || '')
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const isActive = messages[index] === currentMessage;
        const isPinned = this.messageHandler.isPinned(msg);

        return `
            <div class="message-item ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}"
                 id="message-${index}"
                 role="option"
                 aria-selected="${isActive}"
                 aria-setsize="${messages.length}"
                 aria-posinset="${index + 1}"
                 data-message-index="${index}"
                 tabindex="${isActive ? '0' : '-1'}"
                 title="${msg.fileName}">
                <div class="message-sender">${msg.senderName}</div>
                <div class="message-subject-line">
                    <span class="message-subject grow">${msg.subject}</span>
                    <div class="shrink-0">
                        ${hasRealAttachments ? '<span class="attachment-icon" aria-label="Has attachments"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg></span>' : ''}
                    </div>
                </div>
                <div class="message-preview-container">
                    <div class="message-preview">${cleanBody}</div>
                    <div class="message-date">${dateStr}</div>
                </div>
            </div>
        `;
    }

    /**
     * Formats a date for display in the message list
     * Returns relative format (today, yesterday) or absolute date
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatMessageDate(date) {
        // Defensive: handle undefined/null/invalid dates
        if (!date || Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime())) {
            return 'Unknown date';
        }
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString(DEFAULT_LOCALE, { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', day: 'numeric' });
        } else {
            return date.toISOString().split('T')[0];
        }
    }

    /**
     * Scrolls a message item into view
     * @param {number} index - Message index
     * @param {Object} [options] - Scroll options
     */
    scrollToMessage(index, options = {}) {
        this.virtualList.scrollToIndex(index, options);
    }

    /**
     * Gets the DOM element for a specific message index
     * @param {number} index - Message index
     * @returns {HTMLElement|null}
     */
    getMessageElement(index) {
        return this.virtualList.getItemElement(index);
    }

    /**
     * Checks if a message is currently visible in the viewport
     * @param {number} index - Message index
     * @returns {boolean}
     */
    isMessageVisible(index) {
        return this.virtualList.isItemVisible(index);
    }

    /**
     * Updates a single message item without full re-render
     * @param {number} index - Message index to update
     */
    updateMessage(index) {
        const messages = this.messageHandler.getMessages();
        if (index >= 0 && index < messages.length) {
            this.virtualList.updateItem(index, messages[index]);
        }
    }

    /**
     * Cleans up resources
     */
    destroy() {
        this.virtualList.destroy();
    }
}

export default MessageListRenderer;
