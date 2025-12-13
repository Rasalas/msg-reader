import '../styles.css';
import MessageHandler from './MessageHandler.js';
import UIManager from './UIManager.js';
import FileHandler from './FileHandler.js';
import { extractMsg, extractEml } from './utils.js';
import { isTauri, getPendingFiles, onFileOpen, onFileDrop, checkForUpdates } from './tauri-bridge.js';

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

/**
 * Initialize Tauri-specific file handling
 * Called after app initialization when running in Tauri
 */
async function initTauriFileHandling() {
    // Check for files passed on app startup (double-click to open)
    const pendingFiles = await getPendingFiles();
    for (const filePath of pendingFiles) {
        window.app.fileHandler.handleFileFromPath(filePath);
    }

    // Listen for files opened while app is running (double-click)
    await onFileOpen((filePath) => {
        window.app.fileHandler.handleFileFromPath(filePath);
    });

    // Listen for drag & drop events (Tauri-specific)
    await onFileDrop({
        onDrop: (filePaths) => {
            for (const filePath of filePaths) {
                window.app.fileHandler.handleFileFromPath(filePath);
            }
        },
        onEnter: () => {
            window.app.uiManager.showDropOverlay();
        },
        onLeave: () => {
            window.app.uiManager.hideDropOverlay();
        },
    });

    // Check for updates (runs in background, shows dialog if update available)
    checkForUpdates();
}

// Initialize the app when the DOM is loaded
if (typeof window !== 'undefined') {
    window.App = App;
    document.addEventListener('DOMContentLoaded', async () => {
        window.app = new App();

        // Initialize Tauri file handling if running in Tauri
        if (isTauri()) {
            await initTauriFileHandling();
        }
    });
}

export default App;
