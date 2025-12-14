import { MessageListRenderer } from './MessageListRenderer.js';
import { MessageContentRenderer } from './MessageContentRenderer.js';
import { AttachmentModalManager } from './AttachmentModalManager.js';
import { ToastManager } from './ToastManager.js';

/**
 * Manages the user interface for the email reader application
 * Delegates to specialized sub-managers
 */
class UIManager {
    constructor(messageHandler) {
        this.messageHandler = messageHandler;

        // Screen elements
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.appContainer = document.getElementById('appContainer');
        this.dropOverlay = document.querySelector('.drop-overlay');

        // Initialize sub-managers
        this.toasts = new ToastManager();
        this.modal = new AttachmentModalManager((msg, type) => this.showToast(msg, type));
        this.messageList = new MessageListRenderer(
            document.getElementById('messageItems'),
            messageHandler
        );
        this.messageContent = new MessageContentRenderer(
            document.getElementById('messageViewer'),
            messageHandler,
            this.modal
        );

        this.keyboardManager = null;
        this.initEventDelegation();
    }

    setKeyboardManager(keyboardManager) {
        this.keyboardManager = keyboardManager;
        this.modal.setKeyboardManager(keyboardManager);
    }

    initEventDelegation() {
        // Message item clicks
        document.getElementById('messageItems')?.addEventListener('click', (e) => {
            const item = e.target.closest('[data-message-index]');
            if (item && window.app) {
                window.app.showMessage(parseInt(item.dataset.messageIndex, 10));
            }
        });

        // Message viewer actions
        document.getElementById('messageViewer')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || !window.app) return;

            const action = btn.dataset.action;
            const index = parseInt(btn.dataset.index, 10);

            if (action === 'pin') window.app.togglePin(index);
            else if (action === 'delete') window.app.deleteMessage(index);
            else if (action === 'preview') {
                const attIdx = parseInt(btn.dataset.attachmentIndex, 10);
                const attachments = this.modal.getAttachments();
                if (attachments?.[attIdx]) this.modal.open(attachments[attIdx]);
            }
        });
    }

    // Screen management
    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.appContainer.style.display = 'none';
    }

    showAppContainer() {
        this.welcomeScreen.style.display = 'none';
        this.appContainer.style.display = 'flex';
    }

    // Message rendering - delegated
    updateMessageList() {
        this.messageList.render();
    }

    showMessage(msgInfo) {
        this.messageContent.render(msgInfo);
        this.updateMessageList();
    }

    // Drop overlay
    showDropOverlay() {
        this.dropOverlay?.classList.add('active');
    }

    hideDropOverlay() {
        this.dropOverlay?.classList.remove('active');
    }

    // Toast notifications - delegated
    showToast(message, type = 'info', duration) {
        this.toasts.show(message, type, duration);
    }

    showError(message, duration = 5000) {
        this.toasts.error(message, duration);
    }

    showWarning(message, duration = 4000) {
        this.toasts.warning(message, duration);
    }

    showInfo(message, duration = 3000) {
        this.toasts.info(message, duration);
    }

    // Attachment modal - delegated
    openAttachmentModal(attachment) {
        this.modal.open(attachment);
    }

    closeAttachmentModal() {
        this.modal.close();
    }

    showPrevAttachment() {
        this.modal.showPrevAttachment();
    }

    showNextAttachment() {
        this.modal.showNextAttachment();
    }
}

export default UIManager;
