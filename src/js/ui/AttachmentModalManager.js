import { isTauri, openWithSystemViewer } from '../tauri-bridge.js';

/**
 * Manages the attachment preview modal
 * Handles opening, closing, navigation, and rendering of attachment previews
 */
export class AttachmentModalManager {
    /**
     * Creates a new AttachmentModalManager instance
     * @param {Function} showToast - Function to show toast notifications
     */
    constructor(showToast) {
        this.showToast = showToast;

        // Modal elements
        this.attachmentModal = document.getElementById('attachmentModal');
        this.attachmentModalBackdrop = this.attachmentModal?.querySelector('.attachment-modal-backdrop');
        this.attachmentModalClose = document.getElementById('attachmentModalClose');
        this.attachmentModalDownload = document.getElementById('attachmentModalDownload');
        this.attachmentModalFilename = document.getElementById('attachmentModalFilename');
        this.attachmentModalContent = document.getElementById('attachmentModalContent');
        this.attachmentModalPrev = document.getElementById('attachmentModalPrev');
        this.attachmentModalNext = document.getElementById('attachmentModalNext');

        // Modal state
        this.currentAttachmentIndex = 0;
        this.previewableAttachments = [];
        this.currentAttachments = [];

        // Reference to keyboard manager (set externally)
        this.keyboardManager = null;

        // Initialize modal event listeners
        this.initModalEventListeners();
    }

    /**
     * Set the keyboard manager reference
     * @param {KeyboardManager} keyboardManager
     */
    setKeyboardManager(keyboardManager) {
        this.keyboardManager = keyboardManager;
    }

    /**
     * Set the current attachments list
     * @param {Array} attachments - Array of attachment objects
     */
    setAttachments(attachments) {
        this.currentAttachments = attachments || [];
    }

    /**
     * Get the current attachments list
     * @returns {Array} Array of attachment objects
     */
    getAttachments() {
        return this.currentAttachments;
    }

    /**
     * Initializes event listeners for the attachment preview modal
     * Handles close button, backdrop click, and navigation
     */
    initModalEventListeners() {
        if (!this.attachmentModal) return;

        // Close button click
        this.attachmentModalClose?.addEventListener('click', () => this.close());

        // Backdrop click (click outside to close)
        this.attachmentModalBackdrop?.addEventListener('click', () => this.close());

        // Navigation buttons
        this.attachmentModalPrev?.addEventListener('click', () => this.showPrevAttachment());
        this.attachmentModalNext?.addEventListener('click', () => this.showNextAttachment());
    }

    /**
     * Checks if a MIME type is a previewable image format
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the MIME type is a previewable image
     */
    isPreviewableImage(mimeType) {
        if (!mimeType) return false;
        const previewableTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/webp', 'image/svg+xml', 'image/bmp'
        ];
        return previewableTypes.includes(mimeType.toLowerCase());
    }

    /**
     * Checks if a MIME type is PDF
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the MIME type is PDF
     */
    isPdf(mimeType) {
        if (!mimeType) return false;
        return mimeType.toLowerCase() === 'application/pdf';
    }

    /**
     * Checks if a MIME type is a text-based format
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the MIME type is text-based
     */
    isText(mimeType) {
        if (!mimeType) return false;
        const normalizedMime = mimeType.toLowerCase();
        return normalizedMime.startsWith('text/') ||
               normalizedMime.startsWith('application/text') ||
               normalizedMime === 'application/json' ||
               normalizedMime === 'application/xml' ||
               normalizedMime === 'application/javascript' ||
               normalizedMime === 'application/x-diff';
    }

    /**
     * Checks if an attachment can be previewed in the modal
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the attachment is previewable
     */
    isPreviewable(mimeType) {
        return this.isPreviewableImage(mimeType) || this.isPdf(mimeType) || this.isText(mimeType);
    }

    /**
     * Checks if an attachment should be opened with system viewer (Tauri PDF)
     * @param {Object} attachment - Attachment object
     * @returns {boolean} True if should use system viewer
     */
    _shouldOpenWithSystemViewer(attachment) {
        return isTauri() && this.isPdf(attachment.attachMimeTag);
    }

    /**
     * Opens a PDF with the system viewer (Tauri only)
     * @param {Object} attachment - Attachment object
     */
    _openPdfWithSystemViewer(attachment) {
        openWithSystemViewer(attachment.contentBase64, attachment.fileName)
            .catch(err => {
                console.error('Failed to open PDF with system viewer:', err);
                if (this.showToast) {
                    this.showToast('Failed to open PDF', 'error');
                }
            });
    }

    /**
     * Opens the attachment preview modal for a specific attachment
     * In Tauri, PDFs are opened with the system viewer instead of the modal
     * @param {Object} attachment - Attachment object to preview
     */
    open(attachment) {
        if (!this.attachmentModal) return;

        // In Tauri, open PDFs with system viewer (WebKit has issues with data: URLs)
        if (this._shouldOpenWithSystemViewer(attachment)) {
            this._openPdfWithSystemViewer(attachment);
            return;
        }

        // Build list of previewable attachments if not already set
        if (this.currentAttachments) {
            this.previewableAttachments = this.currentAttachments.filter(att =>
                this.isPreviewable(att.attachMimeTag)
            );
        }

        // Find the index in previewable attachments
        this.currentAttachmentIndex = this.previewableAttachments.findIndex(att =>
            att.fileName === attachment.fileName && att.contentBase64 === attachment.contentBase64
        );
        if (this.currentAttachmentIndex === -1) this.currentAttachmentIndex = 0;

        this.renderAttachmentPreview(attachment);

        // Show modal
        this.attachmentModal.classList.add('active');

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Notify keyboard manager of context change
        if (this.keyboardManager) {
            this.keyboardManager.setContext('modal');
        }
    }

    /**
     * Renders the preview content for an attachment in the modal
     * @param {Object} attachment - Attachment object to render
     */
    renderAttachmentPreview(attachment) {
        // Set filename
        this.attachmentModalFilename.textContent = attachment.fileName;

        // Set download link
        this.attachmentModalDownload.href = attachment.contentBase64;
        this.attachmentModalDownload.download = attachment.fileName;

        // Clear previous content
        this.attachmentModalContent.innerHTML = '';

        // Render appropriate preview
        if (this.isPreviewableImage(attachment.attachMimeTag)) {
            const img = document.createElement('img');
            img.src = attachment.contentBase64;
            img.alt = attachment.fileName;
            this.attachmentModalContent.appendChild(img);
        } else if (this.isPdf(attachment.attachMimeTag)) {
            // Use object tag for better PDF compatibility with data: URLs
            const pdfObject = document.createElement('object');
            pdfObject.data = attachment.contentBase64;
            pdfObject.type = 'application/pdf';
            pdfObject.innerHTML = `<p class="text-center p-4">PDF kann nicht angezeigt werden. <a href="${attachment.contentBase64}" download="${attachment.fileName}" class="text-blue-500 underline">Hier herunterladen</a></p>`;
            this.attachmentModalContent.appendChild(pdfObject);
        } else if (this.isText(attachment.attachMimeTag)) {
            // Decode base64 to text
            try {
                const base64Data = attachment.contentBase64?.split(',')[1];
                if (!base64Data) {
                    throw new Error('Invalid base64 data format');
                }
                const textContent = atob(base64Data);

                const pre = document.createElement('pre');
                pre.className = 'attachment-text-preview';
                pre.textContent = textContent;
                this.attachmentModalContent.appendChild(pre);
            } catch (error) {
                console.error('Error decoding text attachment:', error);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-center p-4 text-gray-500';
                errorDiv.textContent = 'Unable to preview this file';
                this.attachmentModalContent.appendChild(errorDiv);
            }
        }

        // Update navigation buttons
        this.updateNavButtons();
    }

    /**
     * Updates the visibility of navigation buttons based on current attachment position
     */
    updateNavButtons() {
        const total = this.previewableAttachments.length;
        const hasPrev = this.currentAttachmentIndex > 0;
        const hasNext = this.currentAttachmentIndex < total - 1;

        // Only show button if navigation in that direction is possible
        this.attachmentModalPrev.style.display = hasPrev ? 'flex' : 'none';
        this.attachmentModalNext.style.display = hasNext ? 'flex' : 'none';
    }

    /**
     * Shows the previous attachment in the modal
     */
    showPrevAttachment() {
        if (this.currentAttachmentIndex > 0) {
            this.currentAttachmentIndex--;
            this.renderAttachmentPreview(this.previewableAttachments[this.currentAttachmentIndex]);
        }
    }

    /**
     * Shows the next attachment in the modal
     */
    showNextAttachment() {
        if (this.currentAttachmentIndex < this.previewableAttachments.length - 1) {
            this.currentAttachmentIndex++;
            this.renderAttachmentPreview(this.previewableAttachments[this.currentAttachmentIndex]);
        }
    }

    /**
     * Closes the attachment preview modal and restores page scroll
     */
    close() {
        if (!this.attachmentModal) return;

        this.attachmentModal.classList.remove('active');
        this.attachmentModalContent.innerHTML = '';

        // Restore body scroll
        document.body.style.overflow = '';

        // Notify keyboard manager of context change
        if (this.keyboardManager) {
            this.keyboardManager.setContext('main');
        }
    }
}

export default AttachmentModalManager;
