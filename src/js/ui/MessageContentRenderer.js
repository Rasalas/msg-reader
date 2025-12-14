import { sanitizeHTML } from '../sanitizer.js';

/**
 * Renders message content in the main viewer area
 * Handles email body, recipients, and attachments display
 */
export class MessageContentRenderer {
    /**
     * Creates a new MessageContentRenderer instance
     * @param {HTMLElement} containerElement - The message viewer container
     * @param {MessageHandler} messageHandler - Handler for message operations
     * @param {AttachmentModalManager} attachmentModal - Manager for attachment previews
     */
    constructor(containerElement, messageHandler, attachmentModal) {
        this.container = containerElement;
        this.messageHandler = messageHandler;
        this.attachmentModal = attachmentModal;
    }

    /**
     * Displays a message in the main viewer area
     * @param {Object} msgInfo - Message object to display
     */
    render(msgInfo) {
        if (!this.container) return;

        this.messageHandler.setCurrentMessage(msgInfo);

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

        this.container.innerHTML = messageContent;
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
     * Renders the attachments section for a message
     * @param {Object} msgInfo - Message object containing attachments
     * @returns {string} HTML string for the attachments section
     */
    renderAttachments(msgInfo) {
        if (!msgInfo.attachments?.length) return '';

        // Store attachments in modal manager for access
        if (this.attachmentModal) {
            this.attachmentModal.setAttachments(msgInfo.attachments);
        }

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
        const isPreviewable = this.attachmentModal?.isPreviewable(attachment.attachMimeTag);
        const isImage = this.attachmentModal?.isPreviewableImage(attachment.attachMimeTag);
        const isPdf = this.attachmentModal?.isPdf(attachment.attachMimeTag);
        const isText = this.attachmentModal?.isText(attachment.attachMimeTag);

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
                                    <div class="flex items-center space-x-2 rounded border border-gray-200 p-2 hover:border-primary hover:bg-blue-50 transition-colors">
                                        <div class="border border-gray-200 rounded w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden">
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
                                    <div class="flex items-center rounded border border-gray-200 p-2 hover:border-primary hover:bg-blue-50 transition-colors">
                                        <div class="shrink-0 w-10 h-10 flex items-center justify-center">
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
}

export default MessageContentRenderer;
