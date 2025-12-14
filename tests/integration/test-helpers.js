/**
 * Integration Test Helpers
 * Provides mock data and utilities for integration tests
 */

// Mock scrollIntoView for jsdom (not available in jsdom)
if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = jest.fn();
}

/**
 * Creates a mock parsed message object (simulating output from extractMsg/extractEml)
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock message data
 */
export function createMockParsedMessage(overrides = {}) {
    const now = new Date();
    return {
        subject: 'Test Email Subject',
        senderName: 'John Doe',
        senderEmail: 'john.doe@example.com',
        recipients: [
            { name: 'Jane Smith', email: 'jane.smith@example.com', recipType: 'to' },
            { name: 'Bob Wilson', email: 'bob.wilson@example.com', recipType: 'cc' }
        ],
        messageDeliveryTime: now.toISOString(),
        clientSubmitTime: now.toISOString(),
        creationTime: now.toISOString(),
        lastModificationTime: now.toISOString(),
        bodyContent: 'This is the plain text body of the email.',
        bodyContentHTML: '<p>This is the <strong>HTML body</strong> of the email.</p>',
        attachments: [],
        ...overrides
    };
}

/**
 * Creates a mock message with attachments
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock message with attachments
 */
export function createMockMessageWithAttachments(overrides = {}) {
    return createMockParsedMessage({
        attachments: [
            {
                fileName: 'document.pdf',
                attachMimeTag: 'application/pdf',
                contentLength: 1024,
                contentBase64: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO'
            },
            {
                fileName: 'image.png',
                attachMimeTag: 'image/png',
                contentLength: 2048,
                contentBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'
            }
        ],
        ...overrides
    });
}

/**
 * Creates a mock message with inline images
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock message with inline images
 */
export function createMockMessageWithInlineImages(overrides = {}) {
    return createMockParsedMessage({
        bodyContentHTML: '<p>Here is an image: <img src="cid:inline-image-1"></p>',
        attachments: [
            {
                fileName: 'inline-image.png',
                attachMimeTag: 'image/png',
                contentLength: 1024,
                contentBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE',
                pidContentId: 'inline-image-1',
                contentId: 'inline-image-1'
            }
        ],
        ...overrides
    });
}

/**
 * Creates multiple mock messages with different dates
 * @param {number} count - Number of messages to create
 * @returns {Array} Array of mock messages
 */
export function createMockMessages(count) {
    const messages = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const date = new Date(now.getTime() - i * 3600000); // Each message 1 hour apart
        messages.push(createMockParsedMessage({
            subject: `Test Email ${i + 1}`,
            senderName: `Sender ${i + 1}`,
            senderEmail: `sender${i + 1}@example.com`,
            messageDeliveryTime: date.toISOString(),
            clientSubmitTime: date.toISOString()
        }));
    }

    return messages;
}

/**
 * Sets up the full DOM structure required by the app
 * @returns {Object} References to key DOM elements
 */
export function setupFullDOM() {
    document.body.innerHTML = `
        <!-- Skip Link -->
        <a href="#messageViewer" class="skip-link">Skip to message content</a>

        <!-- Screen Reader Announcements -->
        <div id="srAnnouncements" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>

        <!-- Help Modal -->
        <div id="helpModal" class="help-modal" role="dialog" aria-modal="true" aria-labelledby="helpModalTitle">
            <div class="help-modal-backdrop"></div>
            <div class="help-modal-container">
                <div class="help-modal-header">
                    <span class="help-modal-title">Keyboard Shortcuts</span>
                    <button class="help-modal-close" aria-label="Close"></button>
                </div>
                <div class="help-modal-content"></div>
            </div>
        </div>

        <!-- Drop Overlay -->
        <div class="drop-overlay">
            <div class="drop-message">drop .msg/.eml files here</div>
        </div>

        <!-- Attachment Preview Modal -->
        <div id="attachmentModal" class="attachment-modal" role="dialog" aria-modal="true" aria-labelledby="attachmentModalFilename">
            <div class="attachment-modal-backdrop"></div>
            <div class="attachment-modal-container">
                <div class="attachment-modal-header">
                    <span id="attachmentModalFilename" class="attachment-modal-filename" role="heading" aria-level="2"></span>
                    <div class="attachment-modal-actions">
                        <a id="attachmentModalDownload" href="#" download="" class="attachment-modal-download" title="Download"></a>
                        <button id="attachmentModalClose" class="attachment-modal-close" title="Close"></button>
                    </div>
                </div>
                <div id="attachmentModalContent" class="attachment-modal-content"></div>
            </div>
            <button id="attachmentModalPrev" class="attachment-modal-nav attachment-modal-nav-prev" title="Previous" style="display: none;"></button>
            <button id="attachmentModalNext" class="attachment-modal-nav attachment-modal-nav-next" title="Next" style="display: none;"></button>
        </div>

        <!-- Welcome Screen -->
        <div id="welcomeScreen" class="welcome-screen" style="display: flex;">
            <div class="welcome-logo">msgReader</div>
            <div class="welcome-content">
                drop .msg/.eml files here or
                <label class="browse-button">pick files
                    <input type="file" id="fileInput" class="hidden" accept=".msg,.eml" multiple>
                </label>
            </div>
        </div>

        <!-- Main App -->
        <div id="appContainer" class="app-container" style="display: none;">
            <div class="message-list">
                <div class="app-logo">msgReader</div>
                <div class="upload-area rounded-2xl border-2 border-slate-300">
                    <label>
                        drop .msg/.eml files here or click to upload
                        <input type="file" id="fileInputInApp" class="hidden" accept=".msg,.eml" multiple>
                    </label>
                </div>
                <div id="messageItems" class="message-items" role="listbox" aria-label="Email messages" tabindex="0"></div>
                <button id="shortcutHint" class="shortcut-hint" aria-label="Show keyboard shortcuts">
                    Press <kbd>?</kbd> for shortcuts
                </button>
            </div>
            <div id="messageViewer" class="message-viewer" role="main" aria-label="Message content" tabindex="-1"></div>
        </div>
    `;

    return {
        welcomeScreen: document.getElementById('welcomeScreen'),
        appContainer: document.getElementById('appContainer'),
        messageItems: document.getElementById('messageItems'),
        messageViewer: document.getElementById('messageViewer'),
        fileInput: document.getElementById('fileInput'),
        fileInputInApp: document.getElementById('fileInputInApp'),
        dropOverlay: document.querySelector('.drop-overlay'),
        attachmentModal: document.getElementById('attachmentModal'),
        helpModal: document.getElementById('helpModal'),
        srAnnouncements: document.getElementById('srAnnouncements')
    };
}

/**
 * Creates a mock File object
 * @param {string} name - Filename
 * @param {string} content - File content
 * @param {string} type - MIME type
 * @returns {File} Mock File object
 */
export function createMockFile(name, content = '', type = 'application/octet-stream') {
    return new File([content], name, { type });
}

/**
 * Simulates a keyboard event
 * @param {string} key - Key name
 * @param {Object} options - Additional options (ctrlKey, metaKey, etc.)
 * @returns {KeyboardEvent} Keyboard event
 */
export function createKeyboardEvent(key, options = {}) {
    return new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
    });
}

/**
 * Waits for DOM updates
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function waitForDOMUpdate(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates mock parsers that return predefined data
 * @param {Array} messages - Array of mock messages to return in sequence
 * @returns {Object} Object with extractMsg and extractEml mock functions
 */
export function createMockParsers(messages = []) {
    let callIndex = 0;

    const getMockMessage = () => {
        if (messages.length === 0) {
            return createMockParsedMessage();
        }
        const message = messages[callIndex % messages.length];
        callIndex++;
        return message;
    };

    return {
        extractMsg: jest.fn(() => getMockMessage()),
        extractEml: jest.fn(() => getMockMessage())
    };
}
