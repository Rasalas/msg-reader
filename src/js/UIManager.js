import { sanitizeHTML } from './sanitizer.js';
import { DEFAULT_LOCALE, TOAST_COLORS } from './constants.js';
import { isTauri, openWithSystemViewer } from './tauri-bridge.js';

/**
 * Manages the user interface for the email reader application
 * Handles message display, attachment modals, notifications, and UI state
 */
class UIManager {
    /**
     * Creates a new UIManager instance
     * @param {MessageHandler} messageHandler - Handler for message operations
     */
    constructor(messageHandler) {
        this.messageHandler = messageHandler;
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.appContainer = document.getElementById('appContainer');
        this.messageItems = document.getElementById('messageItems');
        this.messageViewer = document.getElementById('messageViewer');
        this.dropOverlay = document.querySelector('.drop-overlay');

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

        // Initialize modal event listeners
        this.initModalEventListeners();

        // Initialize event delegation for dynamic elements
        this.initEventDelegation();
    }

    /**
     * Initializes event delegation for dynamically created elements
     * This replaces inline onclick handlers for better security and maintainability
     */
    initEventDelegation() {
        // Delegate message item clicks
        this.messageItems?.addEventListener('click', (event) => {
            const messageItem = event.target.closest('[data-message-index]');
            if (messageItem) {
                const index = parseInt(messageItem.dataset.messageIndex, 10);
                if (!isNaN(index) && window.app) {
                    window.app.showMessage(index);
                }
            }
        });

        // Delegate message viewer action buttons (pin, delete)
        this.messageViewer?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-action]');
            if (!actionButton || !window.app) return;

            const action = actionButton.dataset.action;
            const index = parseInt(actionButton.dataset.index, 10);

            if (action === 'pin' && !isNaN(index)) {
                window.app.togglePin(index);
            } else if (action === 'delete' && !isNaN(index)) {
                window.app.deleteMessage(index);
            } else if (action === 'preview') {
                const attachmentIndex = parseInt(actionButton.dataset.attachmentIndex, 10);
                if (!isNaN(attachmentIndex) && this.currentAttachments?.[attachmentIndex]) {
                    this.openAttachmentModal(this.currentAttachments[attachmentIndex]);
                }
            }
        });

        // Delegate toast close buttons
        document.body.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-action="close-toast"]');
            if (closeButton) {
                const toast = closeButton.closest('.toast');
                if (toast) {
                    toast.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }
            }
        });
    }

    /**
     * Displays the welcome screen and hides the main app container
     */
    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.appContainer.style.display = 'none';
    }

    /**
     * Hides the welcome screen and displays the main app container
     */
    showAppContainer() {
        this.welcomeScreen.style.display = 'none';
        this.appContainer.style.display = 'flex';
    }

    /**
     * Updates the message list sidebar with all loaded messages
     * Highlights the current message and shows pinned status
     */
    updateMessageList() {
        const currentMessage = this.messageHandler.getCurrentMessage();
        const messages = this.messageHandler.getMessages();

        this.messageItems.innerHTML = messages.map((msg, index) => {
            const hasRealAttachments = msg.attachments?.some(att => !att.pidContentId) || false;
            const date = msg.timestamp;
            const dateStr = this.formatMessageDate(date);
            const cleanBody = (msg.body || msg.bodyContent || '')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            return `
                <div class="message-item ${messages[index] === currentMessage ? 'active' : ''} ${this.messageHandler.isPinned(msg) ? 'pinned' : ''}"
                     data-message-index="${index}"
                     title="${msg.fileName}">
                    <div class="message-sender">${msg.senderName}</div>
                    <div class="message-subject-line">
                        <span class="message-subject flex-grow">${msg.subject}</span>
                        <div class="flex-shrink-0">
                            ${hasRealAttachments ? '<span class="attachment-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg></span>' : ''}
                        </div>
                    </div>
                    <div class="message-preview-container">
                        <div class="message-preview">${cleanBody}</div>
                        <div class="message-date">${dateStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Displays a message in the main viewer area
     * @param {Object} msgInfo - Message object to display
     */
    showMessage(msgInfo) {
        this.messageHandler.setCurrentMessage(msgInfo);
        this.updateMessageList();

        const toRecipients = this.formatRecipients(msgInfo.recipients, 'to');
        const ccRecipients = this.formatRecipients(msgInfo.recipients, 'cc');
        const emailContent = this.processEmailContent(msgInfo);
        const messageIndex = this.messageHandler.getMessages().indexOf(msgInfo);
        const isPinned = this.messageHandler.isPinned(msgInfo);

        const messageContent = `
            <div class="message-header">
                <div class="message-title pl-6">${msgInfo.subject}</div>
                <div class="message-actions pr-4">
                    <button data-action="pin" data-index="${messageIndex}" class="action-button rounded-full ${isPinned ? 'pinned' : ''}" title="bookmark message">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                    </button>
                    <button data-action="delete" data-index="${messageIndex}" class="action-button rounded-full" title="remove message">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-gray-200 border-solid">
                <div class="mb-4">
                    <div class="text-gray-600"><strong>From:</strong> ${msgInfo.senderName} &lt;${msgInfo.senderEmail}&gt;</div>
                    ${toRecipients ? `<div class="text-gray-600"><strong>To:</strong> ${toRecipients}</div>` : ''}
                    ${ccRecipients ? `<div class="text-gray-600"><strong>CC:</strong> ${ccRecipients}</div>` : ''}
                    <div class="text-gray-500 text-sm mt-2">${msgInfo.timestamp.toLocaleString()}</div>
                </div>
                <div class="prose max-w-none">
                    <div class="email-content" style="position: relative; isolation: isolate;">
                        ${emailContent}
                    </div>
                </div>
                ${this.renderAttachments(msgInfo)}
            </div>
        `;

        this.messageViewer.innerHTML = messageContent;
    }

    /**
     * Formats recipients of a specific type for display
     * @param {Array} recipients - Array of recipient objects
     * @param {string} type - Recipient type ('to' or 'cc')
     * @returns {string} Formatted recipient string
     */
    formatRecipients(recipients, type) {
        return recipients
            .filter(recipient => recipient.recipType === type)
            .map(recipient => `${recipient.name} &lt;${recipient.email}&gt;`)
            .join(', ');
    }

    /**
     * Scopes CSS styles within email content to prevent style leakage
     * @param {string} htmlContent - HTML content with potential style tags
     * @returns {string} HTML content with scoped styles
     */
    scopeEmailStyles(htmlContent) {
        if (!htmlContent) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Find all style tags and scope them to .email-content
        const styleTags = tempDiv.getElementsByTagName('style');
        Array.from(styleTags).forEach(styleTag => {
            const cssText = styleTag.textContent;
            // Scope all CSS rules to .email-content
            const scopedCss = cssText.replace(/([^{}]+){/g, '.email-content $1{');
            styleTag.textContent = scopedCss;
        });

        return tempDiv.innerHTML;
    }

    /**
     * Processes email content: converts plain text to HTML if needed and scopes styles
     * @param {Object} msgInfo - Message object
     * @returns {string} Processed and sanitized email content
     */
    processEmailContent(msgInfo) {
        let emailContent = msgInfo.bodyContentHTML || msgInfo.bodyContent;

        // If no HTML, convert plain text to HTML with paragraphs and line breaks
        if (!msgInfo.bodyContentHTML && emailContent) {
            // Normalize line endings
            const text = emailContent.replace(/\r\n/g, '\n');
            // Split into paragraphs by double line breaks
            const paragraphs = text.split(/\n{2,}/).map(p => {
                // Replace single line breaks in paragraph with <br>
                return p.replace(/\n/g, '<br>');
            });
            emailContent = '<p>' + paragraphs.join('</p><p>') + '</p>';
        }

        // Scope styles and sanitize
        emailContent = this.scopeEmailStyles(emailContent);
        return sanitizeHTML(emailContent);
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
        // Match text/* types and common text-based application types
        return normalizedMime.startsWith('text/') ||
               normalizedMime.startsWith('application/text') ||  // includes application/text/x-diff
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
     * Initializes event listeners for the attachment preview modal
     * Handles close button, backdrop click, navigation, and keyboard shortcuts
     */
    initModalEventListeners() {
        if (!this.attachmentModal) return;

        // Close button click
        this.attachmentModalClose?.addEventListener('click', () => this.closeAttachmentModal());

        // Backdrop click (click outside to close)
        this.attachmentModalBackdrop?.addEventListener('click', () => this.closeAttachmentModal());

        // Navigation buttons
        this.attachmentModalPrev?.addEventListener('click', () => this.showPrevAttachment());
        this.attachmentModalNext?.addEventListener('click', () => this.showNextAttachment());

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!this.attachmentModal?.classList.contains('active')) return;

            if (e.key === 'Escape') {
                this.closeAttachmentModal();
            } else if (e.key === 'ArrowLeft') {
                this.showPrevAttachment();
            } else if (e.key === 'ArrowRight') {
                this.showNextAttachment();
            }
        });
    }

    /**
     * Opens the attachment preview modal for a specific attachment
     * In Tauri, PDFs are opened with the system viewer instead of the modal
     * @param {Object} attachment - Attachment object to preview
     * @param {number} [index=0] - Index of the attachment in the list
     */
    openAttachmentModal(attachment, index = 0) {
        if (!this.attachmentModal) return;

        // In Tauri, open PDFs with system viewer (WebKit has issues with data: URLs)
        if (isTauri() && this.isPdf(attachment.attachMimeTag)) {
            openWithSystemViewer(attachment.contentBase64, attachment.fileName)
                .catch(err => {
                    console.error('Failed to open PDF with system viewer:', err);
                    this.showToast('Failed to open PDF', 'error');
                });
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
    closeAttachmentModal() {
        if (!this.attachmentModal) return;

        this.attachmentModal.classList.remove('active');
        this.attachmentModalContent.innerHTML = '';

        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Renders the attachments section for a message
     * @param {Object} msgInfo - Message object containing attachments
     * @returns {string} HTML string for the attachments section
     */
    renderAttachments(msgInfo) {
        if (!msgInfo.attachments?.length) return '';

        // Store attachments for modal access
        this.currentAttachments = msgInfo.attachments;

        return `
            <div class="mt-6">
                <hr class="border-t border-gray-200 mb-4">
                <div class="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 text-gray-600">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    <span class="text-gray-600">${msgInfo.attachments.length} ${msgInfo.attachments.length === 1 ? 'Attachment' : 'Attachments'}</span>
                </div>
                <div class="flex flex-wrap gap-4">
                    ${msgInfo.attachments.map((attachment, index) => {
                        const isPreviewable = this.isPreviewable(attachment.attachMimeTag);
                        const isImage = this.isPreviewableImage(attachment.attachMimeTag);
                        const isPdf = this.isPdf(attachment.attachMimeTag);
                        const isText = this.isText(attachment.attachMimeTag);

                        // Icon selection helper
                        const getIcon = () => {
                            if (isImage) {
                                return `<img src="${attachment.contentBase64}" alt="Attachment" class="w-10 h-10 object-cover">`;
                            } else if (isPdf) {
                                return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-500">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>`;
                            } else if (isText) {
                                return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-slate-500">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>`;
                            }
                            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-400">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>`;
                        };

                        if (isPreviewable) {
                            // Previewable files: click opens modal
                            return `
                                <div class="cursor-pointer min-w-[250px] max-w-fit"
                                     data-action="preview"
                                     data-attachment-index="${index}"
                                     title="Click to preview">
                                    <div class="flex items-center space-x-2 rounded border p-2 hover:border-primary hover:bg-blue-50 transition-colors">
                                        <div class="border rounded w-10 h-10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            ${getIcon()}
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-800">${attachment.fileName}</p>
                                            <p class="text-xs text-gray-400">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
                                        </div>
                                        <div class="ml-auto pl-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-400">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178Z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else {
                            // Non-previewable files: direct download
                            return `
                                <a href="${attachment.contentBase64}" download="${attachment.fileName}" class="text-sm text-gray-600 no-underline min-w-[250px] max-w-fit">
                                    <div class="flex items-center rounded border p-2 hover:border-primary hover:bg-blue-50 transition-colors">
                                        <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-gray-400">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </div>
                                        <div class="ml-2">
                                            <p class="text-sm text-gray-800">${attachment.fileName}</p>
                                            <p class="text-xs text-gray-400">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
                                        </div>
                                    </div>
                                </a>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Formats a date for display in the message list
     * Returns relative format (today, yesterday) or absolute date
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatMessageDate(date) {
        // Defensive: handle undefined/null/invalid dates
        if (!date || Object.prototype.toString.call(date) !== '[object Date]' || isNaN(date.getTime())) {
            return 'Unknown date';
        }
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString(DEFAULT_LOCALE, { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString(DEFAULT_LOCALE, { month: 'short', day: 'numeric' }); // Returns "Dec. 31" format
        } else {
            return date.toISOString().split('T')[0]; // Returns "2024-12-31" format in ISO 8601
        }
    }

    /**
     * Shows the drag-and-drop overlay
     */
    showDropOverlay() {
        this.dropOverlay.classList.add('active');
    }

    /**
     * Hides the drag-and-drop overlay
     */
    hideDropOverlay() {
        this.dropOverlay.classList.remove('active');
    }

    /**
     * Shows an error toast notification
     * @param {string} message - Error message to display
     * @param {number} [duration=5000] - Duration in ms before auto-dismiss
     */
    showError(message, duration = 5000) {
        this.showToast(message, 'error', duration);
    }

    /**
     * Shows a warning toast notification
     * @param {string} message - Warning message to display
     * @param {number} [duration=4000] - Duration in ms before auto-dismiss
     */
    showWarning(message, duration = 4000) {
        this.showToast(message, 'warning', duration);
    }

    /**
     * Shows an info toast notification
     * @param {string} message - Info message to display
     * @param {number} [duration=3000] - Duration in ms before auto-dismiss
     */
    showInfo(message, duration = 3000) {
        this.showToast(message, 'info', duration);
    }

    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms
     */
    showToast(message, type = 'info', duration = 3000) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;

        // Set background color based on type
        toast.className += ` ${TOAST_COLORS[type] || TOAST_COLORS.info}`;

        // Add icon based on type
        const icons = {
            error: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            warning: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            info: '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="flex-grow">${message}</span>
            <button class="ml-2 hover:opacity-75 focus:outline-none" data-action="close-toast">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

export default UIManager;
