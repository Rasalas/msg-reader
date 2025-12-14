import { SUPPORTED_EMAIL_EXTENSIONS } from './constants.js';
import { isTauri, readFileFromPath, getFileName } from './tauri-bridge.js';

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

    /**
     * Processes a file from a filesystem path (Tauri only)
     * This is called when a file is opened via file association (double-click)
     * @param {string} filePath - Absolute path to the file
     */
    async handleFileFromPath(filePath) {
        if (!isTauri()) {
            console.error('handleFileFromPath is only available in Tauri');
            return;
        }

        try {
            const fileName = getFileName(filePath);
            const extension = fileName.toLowerCase().split('.').pop();

            if (!SUPPORTED_EMAIL_EXTENSIONS.includes(extension)) {
                console.error('Unsupported file type:', extension);
                return;
            }

            // Read file from filesystem via Tauri
            const fileBuffer = await readFileFromPath(filePath);

            // Parse the email content
            let msgInfo = null;
            if (extension === 'msg' && this.extractMsg) {
                msgInfo = this.extractMsg(fileBuffer);
            } else if (extension === 'eml' && this.extractEml) {
                msgInfo = this.extractEml(fileBuffer);
            }

            if (!msgInfo) {
                throw new Error(`Failed to parse ${extension.toUpperCase()} file`);
            }

            // Add to message handler
            const message = this.messageHandler.addMessage(msgInfo, fileName);

            // Hide welcome screen and show app
            this.uiManager.showAppContainer();

            // Update message list
            this.uiManager.updateMessageList();

            // Show the message
            this.uiManager.showMessage(message);
        } catch (error) {
            console.error('FileHandler: Error processing file from path:', error);
            if (this.uiManager.showError) {
                this.uiManager.showError(`Failed to open: ${filePath}`);
            }
        }
    }

    /**
     * Processes multiple files from filesystem paths in batch (Tauri only)
     * Optimized for loading many files at once - reads in parallel, updates UI once
     * @param {string[]} filePaths - Array of absolute file paths
     */
    async handleFilesFromPaths(filePaths) {
        if (!isTauri()) {
            console.error('handleFilesFromPaths is only available in Tauri');
            return;
        }

        if (!filePaths || filePaths.length === 0) return;

        // Filter to supported extensions
        const supportedPaths = filePaths.filter(filePath => {
            const fileName = getFileName(filePath);
            const extension = fileName.toLowerCase().split('.').pop();
            return SUPPORTED_EMAIL_EXTENSIONS.includes(extension);
        });

        if (supportedPaths.length === 0) return;

        // Show app container early
        this.uiManager.showAppContainer();

        // Process files in parallel batches to avoid overwhelming the system
        const BATCH_SIZE = 20;
        const messages = [];
        let errorCount = 0;

        for (let i = 0; i < supportedPaths.length; i += BATCH_SIZE) {
            const batch = supportedPaths.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.all(
                batch.map(async (filePath) => {
                    try {
                        const fileName = getFileName(filePath);
                        const extension = fileName.toLowerCase().split('.').pop();

                        // Read file from filesystem via Tauri
                        const fileBuffer = await readFileFromPath(filePath);

                        // Parse the email content
                        let msgInfo = null;
                        if (extension === 'msg' && this.extractMsg) {
                            msgInfo = this.extractMsg(fileBuffer);
                        } else if (extension === 'eml' && this.extractEml) {
                            msgInfo = this.extractEml(fileBuffer);
                        }

                        if (!msgInfo) {
                            throw new Error(`Failed to parse ${extension.toUpperCase()} file`);
                        }

                        return { msgInfo, fileName };
                    } catch (error) {
                        console.error('FileHandler: Error processing file:', filePath, error);
                        return null;
                    }
                })
            );

            // Add successfully parsed messages
            for (const result of batchResults) {
                if (result) {
                    const message = this.messageHandler.addMessage(result.msgInfo, result.fileName);
                    messages.push(message);
                } else {
                    errorCount++;
                }
            }
        }

        // Update UI once after all files are processed
        if (messages.length > 0) {
            this.uiManager.updateMessageList();
            // Show the first (newest) message
            this.uiManager.showMessage(messages[0]);
        }

        // Show error summary if any files failed
        if (errorCount > 0) {
            this.uiManager.showWarning(`${errorCount} file(s) could not be loaded`);
        }
    }
}

export default FileHandler;
