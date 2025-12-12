const { storage } = require('./storage');

/**
 * Manages email messages and their state
 * Handles message storage, pinning, sorting, and current selection
 */
class MessageHandler {
    /**
     * Creates a new MessageHandler instance
     * @param {Storage} [storageInstance] - Optional storage instance for dependency injection
     */
    constructor(storageInstance = null) {
        this.storage = storageInstance || storage;
        this.messages = [];
        this.currentMessage = null;
        this.pinnedMessages = new Set(this.storage.get('pinnedMessages', []));
    }

    /**
     * Adds a new message to the handler
     * @param {Object} msgInfo - Parsed message data
     * @param {string} fileName - Original filename of the email file
     * @returns {Object} The added message with hash and timestamp
     */
    addMessage(msgInfo, fileName) {
        // Generate hash from message properties
        const hashInput = `${msgInfo.senderEmail}-${msgInfo.messageDeliveryTime}-${msgInfo.subject}-${fileName}`;
        const hash = md5(hashInput);

        // Robust date parsing: try multiple fields
        const dateFields = [
            msgInfo.messageDeliveryTime,
            msgInfo.clientSubmitTime,
            msgInfo.creationTime,
            msgInfo.lastModificationTime
        ];
        let parsedDate = null;
        for (const val of dateFields) {
            if (val) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) {
                    parsedDate = d;
                    break;
                }
            }
        }

        // Add message to list
        const message = {
            ...msgInfo,
            fileName,
            messageHash: hash,
            timestamp: parsedDate
        };

        this.messages.unshift(message);
        this.sortMessages();
        return message;
    }

    /**
     * Sorts messages by timestamp in descending order (newest first)
     */
    sortMessages() {
        this.messages.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Deletes a message at the specified index
     * @param {number} index - Index of the message to delete
     * @returns {Object|null} The first remaining message, or null if no messages remain
     */
    deleteMessage(index) {
        const msgInfo = this.messages[index];
        this.messages.splice(index, 1);
        this.pinnedMessages.delete(msgInfo.messageHash);
        this.savePinnedMessages();
        return this.messages.length > 0 ? this.messages[0] : null;
    }

    /**
     * Toggles the pinned state of a message
     * @param {number} index - Index of the message to toggle
     * @returns {Object} The toggled message
     */
    togglePin(index) {
        const msgInfo = this.messages[index];
        if (this.isPinned(msgInfo)) {
            this.pinnedMessages.delete(msgInfo.messageHash);
        } else {
            this.pinnedMessages.add(msgInfo.messageHash);
        }
        this.savePinnedMessages();
        return msgInfo;
    }

    /**
     * Checks if a message is pinned
     * @param {Object} msgInfo - Message object to check
     * @returns {boolean} True if the message is pinned
     */
    isPinned(msgInfo) {
        return this.pinnedMessages.has(msgInfo.messageHash);
    }

    /**
     * Persists the pinned messages set to storage
     */
    savePinnedMessages() {
        this.storage.set('pinnedMessages', [...this.pinnedMessages]);
    }

    /**
     * Sets the currently displayed message
     * @param {Object} message - Message to set as current
     */
    setCurrentMessage(message) {
        this.currentMessage = message;
    }

    /**
     * Gets the currently displayed message
     * @returns {Object|null} The current message or null
     */
    getCurrentMessage() {
        return this.currentMessage;
    }

    /**
     * Gets all loaded messages
     * @returns {Array} Array of message objects
     */
    getMessages() {
        return this.messages;
    }
}

module.exports = MessageHandler; 