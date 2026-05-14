import { MessageListRenderer } from './MessageListRenderer.js';
import { MessageContentRenderer } from './MessageContentRenderer.js';
import { AttachmentModalManager } from './AttachmentModalManager.js';
import { ToastManager } from './ToastManager.js';
import { SearchManager } from '../SearchManager.js';
import { isTauri, saveFileWithDialog } from '../tauri-bridge.js';
import {
    getExportFileName,
    getOriginalMessageMimeType,
    messageToEml,
    messageToHtmlDocument
} from '../messageExport.js';
import { BULK_EXPORT_FORMATS, createBulkExportZipBlob } from '../bulkExport.js';

// Debounce time for attachment clicks (Windows double-click interval)
const ATTACHMENT_CLICK_DEBOUNCE_MS = 500;

/**
 * Manages the user interface for the email reader application
 * Delegates to specialized sub-managers
 */
class UIManager {
    constructor(messageHandler) {
        this.messageHandler = messageHandler;
        this.lastAttachmentClickTime = 0;
        this.isBulkExporting = false;
        this.isSelectionMode = false;
        this.selectionAnchorMessage = null;
        this.longPressTimer = null;
        this.ignoreNextMessageClick = false;

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
        this.initBulkActionsMenu();
        this.selectionToolbar = document.getElementById('selectionToolbar');
        this.selectionToolbarCount = document.getElementById('selectionToolbarCount');
        this.selectionToolbarClear = document.getElementById('selectionToolbarClear');
        this.srAnnouncements = document.getElementById('srAnnouncements');

        this.keyboardManager = null;
        this.devPanel = null;
        this.initEventDelegation();
        this.initSearchListeners();
        this.updateBulkActions();
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

    /**
     * Creates the header download menu next to the settings menu.
     */
    initBulkActionsMenu() {
        let bulkMenu = document.getElementById('bulkMenu');
        let bulkActions = document.getElementById('bulkActions');
        const themeMenu = document.getElementById('themeMenu');

        if (!bulkMenu && themeMenu?.parentElement) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'app-actions';
            themeMenu.parentElement.insertBefore(actionsContainer, themeMenu);
            actionsContainer.appendChild(themeMenu);

            bulkMenu = document.createElement('div');
            bulkMenu.id = 'bulkMenu';
            bulkMenu.className = 'bulk-menu';
            bulkMenu.innerHTML = `
                <button id="bulkActionsToggle" class="theme-toggle bulk-toggle" aria-label="Download emails" aria-haspopup="dialog" aria-expanded="false" title="Download emails">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                </button>
                <div id="bulkActions" class="bulk-actions-menu" aria-live="polite"></div>
            `;
            actionsContainer.insertBefore(bulkMenu, themeMenu);
            bulkActions = bulkMenu.querySelector('#bulkActions');
        }

        this.bulkMenu = bulkMenu;
        this.bulkActions = bulkActions;
        this.bulkActionsToggle = document.getElementById('bulkActionsToggle');
    }

    initEventDelegation() {
        const messageItems = document.getElementById('messageItems');

        // Message item clicks
        messageItems?.addEventListener('click', (e) => {
            if (this.ignoreNextMessageClick) {
                e.preventDefault();
                e.stopPropagation();
                this.ignoreNextMessageClick = false;
                return;
            }

            const selectionControl = e.target.closest('[data-selection-toggle]');
            const item = e.target.closest('[data-message-index]');
            if (!item) return;

            const index = parseInt(item.dataset.messageIndex, 10);
            const message = this.messageHandler.getMessages()[index];
            if (!message) return;

            const isModifiedSelection = e.metaKey || e.ctrlKey || e.shiftKey;
            if (selectionControl || isModifiedSelection || this.isSelectionMode) {
                e.preventDefault();
                e.stopPropagation();
                this.handleMessageSelection(message, {
                    range: e.shiftKey
                });
                return;
            }

            if (item && window.app) {
                window.app.showMessage(index);
            }
        });

        messageItems?.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || e.pointerType === 'mouse') return;
            const item = e.target.closest('[data-message-index]');
            if (!item || e.target.closest('[data-selection-toggle]')) return;

            const index = parseInt(item.dataset.messageIndex, 10);
            const message = this.messageHandler.getMessages()[index];
            if (!message) return;

            this.longPressTimer = setTimeout(() => {
                this.ignoreNextMessageClick = true;
                this.handleMessageSelection(message, {
                    range: false
                });
            }, 550);
        });

        ['pointerup', 'pointerleave', 'pointercancel'].forEach((eventName) => {
            messageItems?.addEventListener(eventName, () => this.clearLongPressTimer());
        });

        this.bulkActionsToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleBulkMenu();
        });

        this.selectionToolbarClear?.addEventListener('click', () => {
            this.messageHandler.clearSelection();
            this.setSelectionMode(false);
            this.refreshSelectionDom();
            this.updateBulkActions();
        });

        this.bulkActions?.addEventListener('click', (e) => {
            const button = e.target.closest('[data-bulk-action]');
            if (!button) return;

            const action = button.dataset.bulkAction;
            if (action === 'select-visible') {
                const visibleMessages = this.messageList.getFilteredMessages();
                this.messageHandler.selectMessages(visibleMessages);
                this.selectionAnchorMessage = visibleMessages[0] || null;
                this.setSelectionMode(visibleMessages.length > 0);
                this.refreshSelectionDom();
                this.updateBulkActions();
            } else if (action === 'clear-selection') {
                this.messageHandler.clearSelection();
                this.setSelectionMode(false);
                this.refreshSelectionDom();
                this.updateBulkActions();
            } else if (action === 'download-zip') {
                this.downloadBulkZip(button.dataset.format);
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.message-export-menu')) {
                this.closeExportMenus();
            }
            if (!e.target.closest('#bulkMenu')) {
                this.closeBulkMenu();
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
            else if (action === 'toggle-export-menu') {
                e.stopPropagation();
                this.toggleExportMenu(btn);
            } else if (action === 'export-message') {
                const message = this.messageHandler.getMessages()[index];
                if (message) {
                    this.exportMessage(message, btn.dataset.format);
                }
                this.closeExportMenus();
            } else if (action === 'preview' || action === 'download') {
                // Debounce attachment clicks to prevent double-open from Outlook habits
                const now = Date.now();
                if (now - this.lastAttachmentClickTime < ATTACHMENT_CLICK_DEBOUNCE_MS) {
                    return;
                }
                this.lastAttachmentClickTime = now;

                const attIdx = parseInt(btn.dataset.attachmentIndex, 10);
                const attachments = this.modal.getAttachments();
                if (!attachments?.[attIdx]) return;

                if (action === 'preview') {
                    this.modal.open(attachments[attIdx]);
                } else {
                    e.stopPropagation();
                    this.downloadAttachment(attachments[attIdx]);
                }
            }
        });
    }

    /**
     * Clears pending long-press selection activation.
     */
    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /**
     * Opens or closes the header bulk menu.
     */
    toggleBulkMenu() {
        const isActive = this.bulkMenu?.classList.toggle('active') || false;
        this.bulkActionsToggle?.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }

    /**
     * Closes the header bulk menu.
     */
    closeBulkMenu() {
        this.bulkMenu?.classList.remove('active');
        this.bulkActionsToggle?.setAttribute('aria-expanded', 'false');
    }

    /**
     * Enables or disables the visible multi-selection mode.
     * @param {boolean} enabled - Whether the list should show selection controls
     */
    setSelectionMode(enabled) {
        this.isSelectionMode = enabled;
        if (!enabled) {
            this.selectionAnchorMessage = null;
        }
        this.messageList.setSelectionMode(enabled);
    }

    /**
     * Keeps list selection rendering in sync with current state.
     */
    syncSelectionMode() {
        const hasSelection = (this.messageHandler.getSelectedMessages?.() || []).length > 0;
        this.isSelectionMode = hasSelection;
        this.messageList.setSelectionMode(hasSelection);
    }

    /**
     * Updates the `.selected` class and checkbox `checked` state on rendered message
     * items in place. Used instead of a full re-render so CSS transitions on the
     * selection-mode reveal can run on existing DOM nodes.
     */
    refreshSelectionDom() {
        const messages = this.messageHandler.getMessages();
        const container = this.messageList.container;
        if (!container) return;

        container.querySelectorAll('[data-message-index]').forEach((itemEl) => {
            const index = parseInt(itemEl.dataset.messageIndex, 10);
            const msg = messages[index];
            if (!msg) return;

            const isSelected = this.messageHandler.isSelected?.(msg) || false;
            itemEl.classList.toggle('selected', isSelected);
            const input = itemEl.querySelector('.message-select-input');
            if (input) {
                input.checked = isSelected;
            }
        });
    }

    /**
     * Handles row selection gestures.
     * @param {Object} message - Message to select or toggle
     * @param {Object} options - Selection options
     * @param {boolean} options.range - Whether to select a range from the anchor
     */
    handleMessageSelection(message, { range = false } = {}) {
        const selectedMessages = this.messageHandler.getSelectedMessages?.() || [];
        const isEnteringSelectionMode = selectedMessages.length === 0 && !this.isSelectionMode;

        if (range) {
            const anchor =
                this.selectionAnchorMessage || this.messageHandler.getCurrentMessage() || message;
            this.selectMessageRange(anchor, message);
        } else {
            const currentMessage = this.messageHandler.getCurrentMessage?.();
            const visibleMessages = this.messageList.getFilteredMessages();
            if (
                isEnteringSelectionMode &&
                currentMessage &&
                currentMessage !== message &&
                visibleMessages.includes(currentMessage)
            ) {
                this.messageHandler.selectMessages([currentMessage, message]);
            } else {
                this.messageHandler.toggleSelection(message);
            }
            this.selectionAnchorMessage = message;
        }

        const hasSelection = (this.messageHandler.getSelectedMessages?.() || []).length > 0;
        this.setSelectionMode(hasSelection);
        this.refreshSelectionDom();
        this.updateBulkActions();
    }

    /**
     * Selects all visible messages between two messages, inclusive.
     * @param {Object} anchorMessage - Range start
     * @param {Object} targetMessage - Range end
     */
    selectMessageRange(anchorMessage, targetMessage) {
        const visibleMessages = this.messageList.getFilteredMessages();
        const anchorIndex = visibleMessages.indexOf(anchorMessage);
        const targetIndex = visibleMessages.indexOf(targetMessage);

        if (anchorIndex === -1 || targetIndex === -1) {
            this.messageHandler.toggleSelection(targetMessage);
            this.selectionAnchorMessage = targetMessage;
            return;
        }

        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        this.messageHandler.selectMessages(visibleMessages.slice(start, end + 1));
        this.selectionAnchorMessage = anchorMessage;
    }

    /**
     * Extends the current selection to a visible message, used by Shift+Arrow navigation.
     * @param {Object} targetMessage - Message to extend the range to
     */
    extendSelectionToMessage(targetMessage) {
        if (!targetMessage) return;

        this.setSelectionMode(true);
        const anchor =
            this.selectionAnchorMessage || this.messageHandler.getCurrentMessage() || targetMessage;
        this.selectMessageRange(anchor, targetMessage);
        this.refreshSelectionDom();
        this.updateBulkActions();
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
                this.updateBulkActions();
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

        const message =
            count === 0
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
        this.updateBulkActions();
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

    /**
     * Updates the selection toolbar that sits above the message list.
     * Visible whenever at least one message is selected.
     * @param {Array} selectedMessages - Currently selected messages
     */
    updateSelectionToolbar(selectedMessages) {
        if (!this.selectionToolbar) return;

        const count = selectedMessages.length;
        if (count > 0 && this.selectionToolbarCount) {
            this.selectionToolbarCount.textContent = String(count);
        }
        this.selectionToolbar.classList.toggle('visible', count > 0);
        this.selectionToolbar.setAttribute('aria-hidden', count > 0 ? 'false' : 'true');
    }

    /**
     * Renders the contextual bulk download popup in the app header
     */
    updateBulkActions() {
        if (!this.bulkActions) return;

        const selectedMessages = this.messageHandler.getSelectedMessages?.() || [];
        this.updateSelectionToolbar(selectedMessages);
        const scope = this.getBulkExportScope();

        if (!scope) {
            this.bulkActions.innerHTML = `
                <div class="bulk-actions-empty">No emails loaded</div>
            `;
            return;
        }

        const scopeLabel = this.getBulkScopeLabel(scope, selectedMessages.length);
        const headerAction = this.renderBulkHeaderAction(scope);
        const itemsDisabled = scope.messages.length === 0 || this.isBulkExporting;
        const canDownloadOriginal = scope.messages.some((msg) => msg?._rawBuffer && msg?._fileType);

        const body = this.isBulkExporting
            ? '<div class="bulk-actions-status">Preparing ZIP…</div>'
            : Object.keys(BULK_EXPORT_FORMATS)
                .map((format) => {
                    const disabled =
                        itemsDisabled || (format === 'original' && !canDownloadOriginal);
                    return `
                <button type="button"
                        class="bulk-export-item"
                        data-bulk-action="download-zip"
                        data-format="${format}"
                        ${disabled ? 'disabled' : ''}>
                    <span>${this.getBulkItemLabel(format)}</span>
                    <span class="bulk-export-item-ext" aria-hidden="true">ZIP</span>
                </button>
            `;
                })
                .join('');

        const tip =
            !this.isBulkExporting && scope.type === 'all'
                ? '<div class="bulk-actions-tip">Select rows or use search to narrow this list</div>'
                : '';

        this.bulkActions.innerHTML = `
            <div class="bulk-actions-header">
                <span>${scopeLabel}</span>
                ${headerAction}
            </div>
            ${body}
            ${tip}
        `;
    }

    /**
     * Builds the secondary action shown in the bulk menu header.
     * Selection clearing lives in the dedicated toolbar above the list, so the
     * dropdown only exposes the search-bound "Select all N" affordance.
     * @param {{type: string, messages: Array}} scope - Active export scope
     * @returns {string} HTML for the header action (may be empty)
     */
    renderBulkHeaderAction(scope) {
        if (scope.type === 'visible' && scope.messages.length > 0) {
            return `<button type="button" class="bulk-actions-link" data-bulk-action="select-visible">Select all ${scope.messages.length}</button>`;
        }

        return '';
    }

    /**
     * Returns the menu label for a bulk export format.
     * @param {string} format - One of the BULK_EXPORT_FORMATS keys
     * @returns {string} Menu label
     */
    getBulkItemLabel(format) {
        if (format === 'eml') return 'Export as EML';
        if (format === 'html') return 'Export as HTML';
        if (format === 'original') return 'Download originals';
        return BULK_EXPORT_FORMATS[format]?.label || format;
    }

    /**
     * Gets the scope label shown at the top of the bulk menu.
     * @param {{type: string, messages: Array}} scope - Active export scope
     * @param {number} selectedCount - Number of selected messages
     * @returns {string} Scope label
     */
    getBulkScopeLabel(scope, selectedCount) {
        if (scope.type === 'selected') {
            return `${selectedCount} selected`;
        }

        if (scope.type === 'visible') {
            return `${scope.messages.length} visible`;
        }

        return `All ${scope.messages.length} ${scope.messages.length === 1 ? 'email' : 'emails'}`;
    }

    /**
     * Gets the active bulk export scope. Explicit selections take priority over search results,
     * then all loaded messages.
     * @returns {{type: string, messages: Array}|null} Bulk scope or null when no scope is active
     */
    getBulkExportScope() {
        const selectedMessages = this.messageHandler.getSelectedMessages?.() || [];
        if (selectedMessages.length > 0) {
            return {
                type: 'selected',
                messages: selectedMessages
            };
        }

        if (this.searchManager.isSearchActive()) {
            return {
                type: 'visible',
                messages: this.messageList.getFilteredMessages()
            };
        }

        const allMessages = this.messageHandler.getMessages();
        if (allMessages.length > 0) {
            return {
                type: 'all',
                messages: allMessages
            };
        }

        return null;
    }

    /**
     * Exports the current bulk scope as a ZIP archive
     * @param {string} [format='eml'] - One of the BULK_EXPORT_FORMATS keys
     */
    async downloadBulkZip(format = 'eml') {
        const scope = this.getBulkExportScope();
        if (!scope || scope.messages.length === 0 || this.isBulkExporting) return;

        const exportFormat = BULK_EXPORT_FORMATS[format] ? format : 'eml';
        this.isBulkExporting = true;
        this.updateBulkActions();

        try {
            const result = await createBulkExportZipBlob(scope.messages, exportFormat, {
                scope: scope.type
            });

            if (!result.blob || result.exportedCount === 0) {
                this.showError('No emails are available for this export');
                return;
            }

            await this.downloadBlob(
                result.blob,
                result.fileName,
                'ZIP exported successfully',
                'Failed to export ZIP'
            );

            if (result.skippedCount > 0) {
                this.showWarning(`${result.skippedCount} email(s) could not be included`);
            }
        } catch (error) {
            console.error('Failed to export ZIP:', error);
            this.showError('Failed to export ZIP');
        } finally {
            this.isBulkExporting = false;
            this.updateBulkActions();
        }
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
        this.syncSelectionMode();
        // If search is active, render filtered results, otherwise render all
        if (this.searchManager.isSearchActive()) {
            const results = this.searchManager.search(this.searchManager.getQuery());
            this.messageList.renderFiltered(results);
        } else {
            this.messageList.render();
        }
        this.updateBulkActions();
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
     * Closes all export menus in the message viewer
     */
    closeExportMenus() {
        document.querySelectorAll('.message-export-menu.active').forEach((menu) => {
            menu.classList.remove('active');
        });
    }

    /**
     * Toggles a message export menu
     * @param {HTMLElement} button - Toggle button inside the export menu
     */
    toggleExportMenu(button) {
        const menu = button.closest('.message-export-menu');
        if (!menu) return;

        const isActive = menu.classList.contains('active');
        this.closeExportMenus();
        if (!isActive) {
            menu.classList.add('active');
        }
    }

    /**
     * Converts a text string into a Blob
     * @param {string} text - Text content
     * @param {string} mimeType - MIME type
     * @returns {Blob}
     */
    createTextBlob(text, mimeType) {
        return new Blob([text], { type: `${mimeType};charset=utf-8` });
    }

    /**
     * Converts a Blob into a data URL for Tauri file saving
     * @param {Blob} blob - Blob to convert
     * @returns {Promise<string>}
     */
    async blobToDataUrl(blob) {
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error || new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Saves or downloads a blob depending on runtime
     * @param {Blob} blob - Blob to download
     * @param {string} fileName - File name
     * @param {string} successMessage - Toast text on successful Tauri save
     * @param {string} errorMessage - Toast text on failure
     */
    async downloadBlob(blob, fileName, successMessage, errorMessage) {
        if (isTauri()) {
            try {
                const dataUrl = await this.blobToDataUrl(blob);
                const saved = await saveFileWithDialog(dataUrl, fileName);
                if (saved) {
                    this.showInfo(successMessage);
                }
            } catch (error) {
                console.error(`Failed to save ${fileName}:`, error);
                this.showError(errorMessage);
            }
            return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
    }

    /**
     * Exports a message in the requested format
     * @param {Object} message - Message object
     * @param {string} format - Export format
     */
    async exportMessage(message, format) {
        if (format === 'original') {
            if (!message?._rawBuffer || !message?._fileType) {
                this.showError('Original email file is not available');
                return;
            }

            const originalBlob = new Blob([message._rawBuffer], {
                type: getOriginalMessageMimeType(message)
            });

            await this.downloadBlob(
                originalBlob,
                getExportFileName(message, 'original'),
                'Email saved successfully',
                'Failed to save original email'
            );
            return;
        }

        if (format === 'eml') {
            await this.downloadBlob(
                this.createTextBlob(messageToEml(message), 'message/rfc822'),
                getExportFileName(message, 'eml'),
                'EML exported successfully',
                'Failed to export EML'
            );
            return;
        }

        if (format === 'html') {
            await this.downloadBlob(
                this.createTextBlob(messageToHtmlDocument(message), 'text/html'),
                getExportFileName(message, 'html'),
                'HTML exported successfully',
                'Failed to export HTML'
            );
        }
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
