const MessageHandler = require('./MessageHandler');
const UIManager = require('./UIManager');
const FileHandler = require('./FileHandler');
const { extractMsg } = require('./utils');

// Make sure extractMsg is available globally
if (typeof window !== 'undefined') {
    window.extractMsg = extractMsg;
}

class App {
    constructor() {
        this.messageHandler = new MessageHandler();
        this.uiManager = new UIManager(this.messageHandler);
        this.fileHandler = new FileHandler(this.messageHandler, this.uiManager);
    }

    showMessage(index) {
        const messages = this.messageHandler.getMessages();
        if (messages[index]) {
            this.uiManager.showMessage(messages[index]);
        }
    }

    togglePin(index) {
        const message = this.messageHandler.togglePin(index);
        this.uiManager.updateMessageList();
        this.uiManager.showMessage(message);
    }

    deleteMessage(index) {
        const nextMessage = this.messageHandler.deleteMessage(index);
        this.uiManager.updateMessageList();
        
        if (nextMessage) {
            this.uiManager.showMessage(nextMessage);
        } else {
            this.uiManager.showWelcomeScreen();
        }
    }
}

// Initialize the app when the DOM is loaded
if (typeof window !== 'undefined') {
    window.App = App;
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
}

module.exports = App; 