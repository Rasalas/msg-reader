import { MessageListRenderer } from './MessageListRenderer.js';
import { MessageContentRenderer } from './MessageContentRenderer.js';
import { AttachmentModalManager } from './AttachmentModalManager.js';
import { ToastManager } from './ToastManager.js';
import { SearchManager } from '../SearchManager.js';
import { isTauri, saveFileWithDialog } from '../tauri-bridge.js';

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
        this.searchManager = new SearchManager(messageHandler);
        this.messageList = new MessageListRenderer(
            document.getElementById('messageItems'),
            messageHandler
        );
        this.messageContent = new MessageContentRenderer(
            document.getElementById('messageViewer'),
            messageHandler,
            this.modal
        );

        // Search elements
        this.searchInput = document.getElementById('search-input');
        this.searchClearBtn = document.getElementById('search-clear');
        this.searchResultsCount = document.getElementById('search-results-count');
        this.srAnnouncements = document.getElementById('srAnnouncements');

        this.keyboardManager = null;
        this.devPanel = null;
        this.initEventDelegation();
        this.initSearchListeners();
    }

    setKeyboardManager(keyboardManager) {
        this.keyboardManager = keyboardManager;
        this.modal.setKeyboardManager(keyboardManager);
    }

    /**
     * Set the dev panel reference
     * @param {DevPanel} devPanel - DevPanel instance
     */
    setDevPanel(devPanel) {
        this.devPanel = devPanel;
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
            } else if (action === 'download') {
                e.stopPropagation();
                const attIdx = parseInt(btn.dataset.attachmentIndex, 10);
                const attachments = this.modal.getAttachments();
                if (attachments?.[attIdx]) {
                    this.downloadAttachment(attachments[attIdx]);
                }
            }
        });
    }

    /**
     * Initialize search input event listeners
     */
    initSearchListeners() {
        if (!this.searchInput) return;

        // Search input handler with debounce
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            this.updateSearchUI(query);

            this.searchManager.searchDebounced(query, (results) => {
                this.messageList.renderFiltered(results);
                this.updateSearchResultsCount(results.length, query);
            });
        });

        // Keyboard navigation from search
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
                this.searchInput.blur();
            } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                // Jump to first result
                const filteredMessages = this.messageList.getFilteredMessages();
                if (filteredMessages.length > 0 && window.app) {
                    e.preventDefault();
                    const allMessages = this.messageHandler.getMessages();
                    const firstResultIndex = allMessages.indexOf(filteredMessages[0]);
                    window.app.showMessage(firstResultIndex);
                    this.searchInput.blur();
                    document.getElementById('messageItems')?.focus();
                }
            }
        });

        // Clear button handler
        this.searchClearBtn?.addEventListener('click', () => {
            this.clearSearch();
            this.searchInput.focus();
        });
    }

    /**
     * Update search UI elements (clear button visibility)
     * @param {string} query - Current search query
     */
    updateSearchUI(query) {
        if (this.searchClearBtn) {
            if (query.length > 0) {
                this.searchClearBtn.classList.remove('hidden');
            } else {
                this.searchClearBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Update search results count display
     * @param {number} count - Number of results
     * @param {string} query - Search query
     */
    updateSearchResultsCount(count, query) {
        if (!this.searchResultsCount) return;

        // Hide count if no query or no results (empty state handles "no results" display)
        if (!query || query.trim().length === 0 || count === 0) {
            this.searchResultsCount.classList.add('hidden');
            this.searchResultsCount.classList.remove('no-results');
        } else {
            this.searchResultsCount.classList.remove('hidden');
            this.searchResultsCount.classList.remove('no-results');
            this.searchResultsCount.textContent = `${count} ${count === 1 ? 'result' : 'results'} found`;
        }

        // Announce for screen readers
        this.announceSearchResults(count);
    }

    /**
     * Announce search results for screen readers
     * @param {number} count - Number of results
     */
    announceSearchResults(count) {
        if (!this.srAnnouncements) return;

        const message = count === 0
            ? 'No results found'
            : `${count} ${count === 1 ? 'result' : 'results'} found`;

        this.srAnnouncements.textContent = message;
        setTimeout(() => {
            this.srAnnouncements.textContent = '';
        }, 1000);
    }

    /**
     * Clear search and restore full message list
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.updateSearchUI('');
        const allMessages = this.searchManager.clearSearch();
        this.messageList.renderFiltered(allMessages);
        this.updateSearchResultsCount(0, '');
    }

    /**
     * Focus the search input
     */
    focusSearch() {
        this.searchInput?.focus();
    }

    /**
     * Check if search input is focused
     * @returns {boolean}
     */
    isSearchFocused() {
        return document.activeElement === this.searchInput;
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
        // If search is active, render filtered results, otherwise render all
        if (this.searchManager.isSearchActive()) {
            const results = this.searchManager.search(this.searchManager.getQuery());
            this.messageList.renderFiltered(results);
        } else {
            this.messageList.render();
        }
    }

    showMessage(msgInfo) {
        this.messageContent.render(msgInfo);
        this.updateMessageList();

        // Update dev panel with debug data if available or panel is visible
        if (this.devPanel && this.devPanel.isVisible) {
            if (msgInfo._debugData) {
                this.devPanel.setDebugData(msgInfo._debugData);
            } else if (msgInfo._rawBuffer && window.app?.reloadDebugData) {
                // Reload debug data on demand
                window.app.reloadDebugData(msgInfo);
            }
        }
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

    /**
     * Download an attachment using save dialog in Tauri or browser fallback
     * @param {Object} attachment - Attachment object with contentBase64 and fileName
     */
    async downloadAttachment(attachment) {
        if (isTauri()) {
            try {
                const saved = await saveFileWithDialog(
                    attachment.contentBase64,
                    attachment.fileName
                );
                if (saved) {
                    this.showInfo('File saved successfully');
                }
            } catch (error) {
                console.error('Failed to save file:', error);
                this.showError('Failed to save file');
            }
        } else {
            // Browser fallback: use traditional download
            const link = document.createElement('a');
            link.href = attachment.contentBase64;
            link.download = attachment.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
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
