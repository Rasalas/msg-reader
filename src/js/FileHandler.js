const { SUPPORTED_EMAIL_EXTENSIONS } = require('./constants');

/**
 * Handles file input via drag-and-drop and file input elements
 * Processes MSG and EML email files
 */
class FileHandler {
    /**
     * Creates a new FileHandler instance
     * @param {MessageHandler} messageHandler - Handler for message operations
     * @param {UIManager} uiManager - UI manager for display updates
     * @param {Object} parsers - Parser functions for email files
     * @param {Function} parsers.extractMsg - MSG file parser
     * @param {Function} parsers.extractEml - EML file parser
     */
    constructor(messageHandler, uiManager, parsers = {}) {
        this.messageHandler = messageHandler;
        this.uiManager = uiManager;
        this.extractMsg = parsers.extractMsg || null;
        this.extractEml = parsers.extractEml || null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uiManager.showDropOverlay();
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (e.clientX <= 0 || e.clientY <= 0 ||
                e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
                this.uiManager.hideDropOverlay();
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uiManager.hideDropOverlay();
            // Validate dataTransfer exists and has files
            if (e.dataTransfer?.files?.length > 0) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // File input handlers
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }

        const fileInputInApp = document.getElementById('fileInputInApp');
        if (fileInputInApp) {
            fileInputInApp.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
            });
        }
    }

    /**
     * Processes multiple files
     * @param {FileList} files - Files to process
     */
    handleFiles(files) {
        Array.from(files).forEach(file => {
            const extension = file.name.toLowerCase().split('.').pop();
            if (SUPPORTED_EMAIL_EXTENSIONS.includes(extension)) {
                this.handleFile(file);
            }
        });
    }

    /**
     * Processes a single file
     * @param {File} file - The file to process
     */
    handleFile(file) {
        const reader = new FileReader();

        reader.onerror = (error) => {
            console.error('FileHandler: Error reading file:', error);
            if (this.uiManager.showError) {
                this.uiManager.showError(`Failed to read file: ${file.name}`);
            }
        };

        reader.onload = (e) => {
            try {
                const fileBuffer = e.target.result;
                const extension = file.name.toLowerCase().split('.').pop();

                let msgInfo = null;
                if (extension === 'msg' && this.extractMsg) {
                    msgInfo = this.extractMsg(fileBuffer);
                } else if (extension === 'eml' && this.extractEml) {
                    msgInfo = this.extractEml(fileBuffer);
                }

                if (!msgInfo) {
                    throw new Error(`Failed to parse ${extension.toUpperCase()} file`);
                }

                const message = this.messageHandler.addMessage(msgInfo, file.name);

                // Hide welcome screen and show app
                this.uiManager.showAppContainer();

                // Update message list
                this.uiManager.updateMessageList();

                // Show first message if it's the only one
                if (this.messageHandler.getMessages().length === 1) {
                    this.uiManager.showMessage(message);
                }
            } catch (error) {
                console.error('FileHandler: Error processing file:', error);
                if (this.uiManager.showError) {
                    this.uiManager.showError(`Failed to process email: ${file.name}`);
                }
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

module.exports = FileHandler;
