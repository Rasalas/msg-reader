class MessageHandler {
    constructor() {
        this.messages = [];
        this.currentMessage = null;
        this.pinnedMessages = new Set(JSON.parse(localStorage.getItem('pinnedMessages') || '[]'));
    }

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

    sortMessages() {
        this.messages.sort((a, b) => b.timestamp - a.timestamp);
    }

    deleteMessage(index) {
        const msgInfo = this.messages[index];
        this.messages.splice(index, 1);
        this.pinnedMessages.delete(msgInfo.messageHash);
        this.savePinnedMessages();
        return this.messages.length > 0 ? this.messages[0] : null;
    }

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

    isPinned(msgInfo) {
        return this.pinnedMessages.has(msgInfo.messageHash);
    }

    savePinnedMessages() {
        localStorage.setItem('pinnedMessages', JSON.stringify([...this.pinnedMessages]));
    }

    setCurrentMessage(message) {
        this.currentMessage = message;
    }

    getCurrentMessage() {
        return this.currentMessage;
    }

    getMessages() {
        return this.messages;
    }
}

module.exports = MessageHandler; 