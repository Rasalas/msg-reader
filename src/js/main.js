import '../styles.css';
import MessageHandler from './MessageHandler.js';
import UIManager from './UIManager.js';
import FileHandler from './FileHandler.js';
import KeyboardManager from './KeyboardManager.js';
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

        // Initialize keyboard manager for shortcuts and navigation
        this.keyboardManager = new KeyboardManager(this);

        // Connect keyboard manager to UI manager for modal context changes
        this.uiManager.setKeyboardManager(this.keyboardManager);
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
        // Get the message being deleted and filtered list before deletion
        const messages = this.messageHandler.getMessages();
        const messageToDelete = messages[index];
        const filteredMessages = this.uiManager.messageList.getFilteredMessages();
        const isSearchActive = this.uiManager.searchManager.isSearchActive();

        // Find position in filtered list (if search is active)
        let nextFilteredMessage = null;
        if (isSearchActive && filteredMessages.length > 1) {
            const filteredIndex = filteredMessages.indexOf(messageToDelete);
            if (filteredIndex !== -1) {
                // Get next visible message in filtered results
                const nextFilteredIndex = Math.min(filteredIndex + 1, filteredMessages.length - 1);
                // If we're deleting the last one, go to previous
                nextFilteredMessage = filteredIndex === filteredMessages.length - 1
                    ? filteredMessages[filteredIndex - 1]
                    : filteredMessages[nextFilteredIndex];
            }
        }

        // Perform the deletion
        const nextMessage = this.messageHandler.deleteMessage(index);
        this.uiManager.updateMessageList();

        // Show the appropriate next message
        const messageToShow = isSearchActive && nextFilteredMessage ? nextFilteredMessage : nextMessage;

        if (messageToShow) {
            this.uiManager.showMessage(messageToShow);
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
    if (pendingFiles.length > 0) {
        // Use batch method for multiple files
        await window.app.fileHandler.handleFilesFromPaths(pendingFiles);
    }

    // Listen for files opened while app is running (double-click)
    await onFileOpen((filePath) => {
        window.app.fileHandler.handleFileFromPath(filePath);
    });

    // Listen for drag & drop events (Tauri-specific)
    await onFileDrop({
        onDrop: async (filePaths) => {
            // Use batch method for multiple dropped files
            await window.app.fileHandler.handleFilesFromPaths(filePaths);
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
