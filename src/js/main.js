const MessageHandler = require('./MessageHandler');
const UIManager = require('./UIManager');
const FileHandler = require('./FileHandler');
const { extractMsg, extractEml } = require('./utils');

/**
 * Main application class
 * Orchestrates the email reader application
 */
class App {
    constructor() {
        this.messageHandler = new MessageHandler();
        this.uiManager = new UIManager(this.messageHandler);

        // Inject parsers into FileHandler (Dependency Injection)
        this.fileHandler = new FileHandler(
            this.messageHandler,
            this.uiManager,
            { extractMsg, extractEml }
        );
    }

    /**
     * Shows a message at the given index
     * @param {number} index - Message index
     */
    showMessage(index) {
        const messages = this.messageHandler.getMessages();
        if (messages[index]) {
            this.uiManager.showMessage(messages[index]);
        }
    }

    /**
     * Toggles pin status for a message
     * @param {number} index - Message index
     */
    togglePin(index) {
        const message = this.messageHandler.togglePin(index);
        this.uiManager.updateMessageList();
        this.uiManager.showMessage(message);
    }

    /**
     * Deletes a message at the given index
     * @param {number} index - Message index
     */
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
