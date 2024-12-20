class UIManager {
    constructor(messageHandler) {
        this.messageHandler = messageHandler;
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.appContainer = document.getElementById('appContainer');
        this.messageItems = document.getElementById('messageItems');
        this.messageViewer = document.getElementById('messageViewer');
        this.dropOverlay = document.querySelector('.drop-overlay');
    }

    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.appContainer.style.display = 'none';
    }

    showAppContainer() {
        this.welcomeScreen.style.display = 'none';
        this.appContainer.style.display = 'flex';
    }

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
                     onclick="window.app.showMessage(${index})" 
                     title="${msg.fileName}">
                    <div class="message-sender">${msg.senderName}</div>
                    <div class="message-subject-line">
                        <span class="message-subject">${msg.subject}</span>
                        ${hasRealAttachments ? '<span class="attachment-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg></span>' : ''}
                    </div>
                    <div class="message-preview-container">
                        <div class="message-preview">${cleanBody}</div>
                        <div class="message-date">${dateStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showMessage(msgInfo) {
        this.messageHandler.setCurrentMessage(msgInfo);
        this.updateMessageList();
        
        const toRecipients = msgInfo.recipients.filter(recipient => recipient.recipType === 'to')
            .map(recipient => `${recipient.name} &lt;${recipient.email}&gt;`).join(', ');
        const ccRecipients = msgInfo.recipients.filter(recipient => recipient.recipType === 'cc')
            .map(recipient => `${recipient.name} &lt;${recipient.email}&gt;`).join(', ');

        // Process email content to scope styles
        let emailContent = msgInfo.bodyContentHTML || msgInfo.bodyContent;
        if (emailContent) {
            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = emailContent;

            // Find all style tags and scope them to .email-content
            const styleTags = tempDiv.getElementsByTagName('style');
            Array.from(styleTags).forEach(styleTag => {
                const cssText = styleTag.textContent;
                // Scope all CSS rules to .email-content
                const scopedCss = cssText.replace(/([^{}]+){/g, '.email-content $1{');
                styleTag.textContent = scopedCss;
            });

            // Update the email content
            emailContent = tempDiv.innerHTML;
        }

        const messageContent = `
            <div class="message-header">
                <div class="message-title pl-6">${msgInfo.subject}</div>
                <div class="message-actions pr-4">
                    <button onclick="window.app.togglePin(${this.messageHandler.getMessages().indexOf(msgInfo)})" class="action-button rounded-full ${this.messageHandler.isPinned(msgInfo) ? 'pinned' : ''}" title="bookmark message">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                    </button>
                    <button onclick="window.app.deleteMessage(${this.messageHandler.getMessages().indexOf(msgInfo)})" class="action-button rounded-full" title="remove message">
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

    renderAttachments(msgInfo) {
        if (!msgInfo.attachments?.length) return '';
        
        return `
            <div class="mt-6">
                <strong>Attachments:</strong>
                <div class="mt-2 space-y-2">
                    ${msgInfo.attachments.map(attachment => {
                        if (attachment.attachMimeTag && attachment.attachMimeTag.startsWith('image/')) {
                            return `
                                <div class="flex items-center space-x-2">
                                    <a href="${attachment.contentBase64}" download="${attachment.fileName}" style="text-decoration:none;">
                                        <div class="flex items-center space-x-2 rounded border p-1">
                                            <div class="border rounded w-12 h-12 flex-shrink-0">
                                                <img src="${attachment.contentBase64}" alt="Attachment" class="w-12 h-12 object-cover">
                                            </div>
                                            <div class="no-underline">
                                                <p class="no-underline text-sm text-gray-800">${attachment.fileName}</p>
                                                <p class="no-underline text-xs text-gray-400">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
                                            </div>
                                        </div>
                                    </a>
                                </div>
                            `;
                        } else {
                            return `
                                <a href="${attachment.contentBase64}" download="${attachment.fileName}" class="text-sm text-gray-600 no-underline">
                                    <div class="rounded border p-2">
                                        <p>${attachment.fileName}</p>
                                        <p class="text-xs text-gray-500">${attachment.attachMimeTag} - ${attachment.contentLength} bytes</p>
                                    </div>
                                </a>
                            `;
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }

    formatMessageDate(date) {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Gestern';
        } else if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        } else {
            return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
    }

    showDropOverlay() {
        this.dropOverlay.classList.add('active');
    }

    hideDropOverlay() {
        this.dropOverlay.classList.remove('active');
    }
}

module.exports = UIManager; 