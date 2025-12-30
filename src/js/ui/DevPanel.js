/**
 * DevPanel UI Component
 * Displays debug information about parsed email content
 * Shows all intermediate steps of the parsing pipeline
 */
export class DevPanel {
    constructor(containerElement) {
        this.container = containerElement;
        this.debugData = null;
        this.activeTab = 'headers';
        this.isVisible = false;

        // Tab definitions
        this.tabs = [
            { id: 'raw', label: 'Raw', icon: this.getIcon('binary') },
            { id: 'headers', label: 'Headers', icon: this.getIcon('headers') },
            { id: 'rtf', label: 'RTF', icon: this.getIcon('code'), condition: (data) => data?.decompressedRtf },
            { id: 'html', label: 'HTML', icon: this.getIcon('code') },
            { id: 'sanitized', label: 'Sanitized', icon: this.getIcon('shield') },
            { id: 'text', label: 'Text', icon: this.getIcon('text') },
            { id: 'mime', label: 'MIME', icon: this.getIcon('tree'), condition: (data) => data?.mimeStructure },
            { id: 'debug', label: 'Debug', icon: this.getIcon('json') }
        ];
    }

    /**
     * Get SVG icon for tab
     * @param {string} type - Icon type
     * @returns {string} SVG string
     */
    getIcon(type) {
        const icons = {
            binary: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
            </svg>`,
            headers: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>`,
            code: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>`,
            shield: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>`,
            text: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>`,
            tree: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>`,
            json: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
            </svg>`,
            copy: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>`,
            close: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>`
        };
        return icons[type] || '';
    }

    /**
     * Set debug data and re-render
     * @param {Object} debugData - Debug data from parsing
     */
    setDebugData(debugData) {
        this.debugData = debugData;
        if (this.isVisible) {
            this.render();
        }
    }

    /**
     * Show the panel
     */
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.render();
    }

    /**
     * Hide the panel
     */
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Render the panel content
     */
    render() {
        if (!this.container || !this.debugData) {
            this.container.innerHTML = `
                <div class="dev-panel-empty">
                    <p>No debug data available. Load an email file to see parsing details.</p>
                </div>
            `;
            return;
        }

        const availableTabs = this.tabs.filter(tab =>
            !tab.condition || tab.condition(this.debugData)
        );

        // Ensure active tab is available
        if (!availableTabs.find(t => t.id === this.activeTab)) {
            this.activeTab = availableTabs[0]?.id || 'headers';
        }

        const tabsHtml = availableTabs.map(tab => `
            <button class="dev-panel-tab ${tab.id === this.activeTab ? 'active' : ''}"
                    data-tab="${tab.id}"
                    title="${tab.label}">
                ${tab.icon}
                <span class="dev-panel-tab-label">${tab.label}</span>
            </button>
        `).join('');

        const contentHtml = this.renderTabContent(this.activeTab);

        this.container.innerHTML = `
            <div class="dev-panel-header">
                <div class="dev-panel-title">
                    <span class="dev-panel-badge">${this.debugData.fileType?.toUpperCase()}</span>
                    <span>Debug Panel</span>
                    <span class="dev-panel-size">${this.formatSize(this.debugData.rawSize)}</span>
                </div>
                <div class="dev-panel-actions">
                    <button class="dev-panel-copy" title="Copy to clipboard">
                        ${this.getIcon('copy')}
                    </button>
                    <button class="dev-panel-close" title="Close panel">
                        ${this.getIcon('close')}
                    </button>
                </div>
            </div>
            <div class="dev-panel-tabs">
                ${tabsHtml}
            </div>
            <div class="dev-panel-content">
                ${contentHtml}
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Render content for the active tab
     * @param {string} tabId - Tab identifier
     * @returns {string} HTML content
     */
    renderTabContent(tabId) {
        const data = this.debugData;
        if (!data) return '<p>No data</p>';

        switch (tabId) {
            case 'raw':
                return this.renderRawContent(data);
            case 'headers':
                return this.renderHeadersContent(data);
            case 'rtf':
                return this.renderRtfContent(data);
            case 'html':
                return this.renderHtmlContent(data);
            case 'sanitized':
                return this.renderSanitizedContent(data);
            case 'text':
                return this.renderTextContent(data);
            case 'mime':
                return this.renderMimeContent(data);
            case 'debug':
                return this.renderDebugContent(data);
            default:
                return '<p>Unknown tab</p>';
        }
    }

    /**
     * Render raw binary/text content
     */
    renderRawContent(data) {
        const preview = data.rawString
            ? this.escapeHtml(data.rawString.substring(0, 5000))
            : '[Binary data - ArrayBuffer]';

        const truncated = data.rawString && data.rawString.length > 5000;

        return `
            <div class="dev-panel-info">
                <span>Size: ${this.formatSize(data.rawSize)}</span>
                <span>Type: ${data.fileType?.toUpperCase()}</span>
                ${truncated ? '<span class="dev-panel-truncated">Truncated (showing first 5000 chars)</span>' : ''}
            </div>
            <pre class="dev-panel-code">${preview}</pre>
        `;
    }

    /**
     * Render headers content
     */
    renderHeadersContent(data) {
        if (data.headersParsed) {
            // EML file - parsed headers
            const headers = Object.entries(data.headersParsed)
                .map(([key, value]) => `<span class="dev-header-key">${this.escapeHtml(key)}:</span> ${this.escapeHtml(value)}`)
                .join('\n');
            return `<pre class="dev-panel-code dev-panel-headers">${headers}</pre>`;
        } else if (data.msgInfoRaw) {
            // MSG file - show relevant header fields
            const info = data.msgInfoRaw;
            const headers = [
                `<span class="dev-header-key">Subject:</span> ${this.escapeHtml(info.subject || '')}`,
                `<span class="dev-header-key">From:</span> ${this.escapeHtml(info.senderName || '')} &lt;${this.escapeHtml(info.senderEmail || '')}&gt;`,
                `<span class="dev-header-key">Date:</span> ${this.escapeHtml(info.messageDeliveryTime || '')}`,
                `<span class="dev-header-key">Internet Codepage:</span> ${info.internetCodepage || 'N/A'}`,
                `<span class="dev-header-key">Message Class:</span> ${this.escapeHtml(info.messageClass || 'N/A')}`,
            ].join('\n');
            return `<pre class="dev-panel-code dev-panel-headers">${headers}</pre>`;
        }
        return '<p>No headers available</p>';
    }

    /**
     * Render RTF content (MSG files with RTF body)
     */
    renderRtfContent(data) {
        if (!data.decompressedRtf) {
            return '<p>No RTF content available</p>';
        }

        const rtf = this.escapeHtml(data.decompressedRtf.substring(0, 10000));
        const truncated = data.decompressedRtf.length > 10000;

        return `
            <div class="dev-panel-info">
                <span>Source: Compressed RTF</span>
                <span>Decompressed size: ${this.formatSize(data.decompressedRtf.length)}</span>
                ${truncated ? '<span class="dev-panel-truncated">Truncated</span>' : ''}
            </div>
            <pre class="dev-panel-code">${rtf}</pre>
        `;
    }

    /**
     * Render HTML before sanitization
     */
    renderHtmlContent(data) {
        const html = data.htmlBeforeCid || data.htmlAfterCid || '';
        if (!html) {
            return '<p>No HTML content available</p>';
        }

        const escaped = this.escapeHtml(html.substring(0, 20000));
        const truncated = html.length > 20000;

        return `
            <div class="dev-panel-info">
                <span>Source: ${data.htmlSource || 'unknown'}</span>
                <span>Size: ${this.formatSize(html.length)}</span>
                ${data.charset ? `<span>Charset: ${data.charset}</span>` : ''}
                ${truncated ? '<span class="dev-panel-truncated">Truncated</span>' : ''}
            </div>
            <pre class="dev-panel-code dev-panel-html">${escaped}</pre>
        `;
    }

    /**
     * Render sanitized HTML
     */
    renderSanitizedContent(data) {
        const html = data.htmlFinal || '';
        if (!html) {
            return '<p>No sanitized content available</p>';
        }

        const escaped = this.escapeHtml(html.substring(0, 20000));
        const truncated = html.length > 20000;

        return `
            <div class="dev-panel-info">
                <span>Final HTML (after CID replacement & sanitization)</span>
                <span>Size: ${this.formatSize(html.length)}</span>
                ${truncated ? '<span class="dev-panel-truncated">Truncated</span>' : ''}
            </div>
            <pre class="dev-panel-code dev-panel-html">${escaped}</pre>
        `;
    }

    /**
     * Render plain text content
     */
    renderTextContent(data) {
        const text = data.plainText || '';
        if (!text) {
            return '<p>No plain text content available</p>';
        }

        const escaped = this.escapeHtml(text.substring(0, 10000));
        const truncated = text.length > 10000;

        return `
            <div class="dev-panel-info">
                <span>Plain text body</span>
                <span>Size: ${this.formatSize(text.length)}</span>
                ${truncated ? '<span class="dev-panel-truncated">Truncated</span>' : ''}
            </div>
            <pre class="dev-panel-code">${escaped}</pre>
        `;
    }

    /**
     * Render MIME structure tree
     */
    renderMimeContent(data) {
        if (!data.mimeStructure) {
            return '<p>No MIME structure available (single-part email)</p>';
        }

        return `
            <div class="dev-panel-info">
                <span>MIME Structure</span>
                <span>Boundary: ${this.escapeHtml(data.mimeStructure.boundary || 'N/A')}</span>
            </div>
            <div class="dev-panel-tree">
                ${this.renderMimeTree(data.mimeStructure)}
            </div>
        `;
    }

    /**
     * Recursively render MIME tree
     */
    renderMimeTree(structure, depth = 0) {
        if (!structure || !structure.parts) return '';

        let html = '';

        structure.parts.forEach((part, index) => {
            const typeClass = part.contentType.startsWith('text/html') ? 'mime-html'
                : part.contentType.startsWith('text/') ? 'mime-text'
                    : part.contentType.startsWith('image/') ? 'mime-image'
                        : part.contentType.startsWith('multipart/') ? 'mime-multipart' : '';

            html += `
                <div class="mime-part ${typeClass}" style="margin-left: ${depth * 20}px">
                    <span class="mime-index">[${index}]</span>
                    <span class="mime-type">${this.escapeHtml(part.contentType)}</span>
                    ${part.filename ? `<span class="mime-filename">${this.escapeHtml(part.filename)}</span>` : ''}
                    ${part.contentId ? `<span class="mime-cid">cid:${this.escapeHtml(part.contentId)}</span>` : ''}
                    <span class="mime-size">${this.formatSize(part.size)}</span>
                </div>
            `;

            if (part.nested) {
                html += this.renderMimeTree(part.nested, depth + 1);
            }
        });

        return html;
    }

    /**
     * Render raw debug JSON
     */
    renderDebugContent(data) {
        // Create a clean version for display (exclude large binary data)
        const cleanData = { ...data };
        delete cleanData.rawBuffer;
        delete cleanData.rawString;
        delete cleanData.htmlRawBytes;
        delete cleanData.compressedRtf;

        // Truncate large strings
        const truncateStrings = (obj, maxLen = 500) => {
            if (typeof obj === 'string' && obj.length > maxLen) {
                return obj.substring(0, maxLen) + `... [${obj.length - maxLen} more chars]`;
            }
            if (Array.isArray(obj)) {
                return obj.map(item => truncateStrings(item, maxLen));
            }
            if (obj && typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    result[key] = truncateStrings(value, maxLen);
                }
                return result;
            }
            return obj;
        };

        const displayData = truncateStrings(cleanData);
        const json = JSON.stringify(displayData, null, 2);

        return `
            <div class="dev-panel-info">
                <span>Full debug object (large values truncated)</span>
            </div>
            <pre class="dev-panel-code dev-panel-json">${this.escapeHtml(json)}</pre>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Tab clicks
        this.container.querySelectorAll('.dev-panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.activeTab = tab.dataset.tab;
                this.render();
            });
        });

        // Copy button
        const copyBtn = this.container.querySelector('.dev-panel-copy');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyCurrentContent());
        }

        // Close button
        const closeBtn = this.container.querySelector('.dev-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
    }

    /**
     * Copy current tab content to clipboard
     */
    async copyCurrentContent() {
        const codeElement = this.container.querySelector('.dev-panel-code');
        if (codeElement) {
            try {
                await navigator.clipboard.writeText(codeElement.textContent);
                this.showCopyFeedback();
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    }

    /**
     * Show copy feedback
     */
    showCopyFeedback() {
        const copyBtn = this.container.querySelector('.dev-panel-copy');
        if (copyBtn) {
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>`;
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = originalHtml;
                copyBtn.classList.remove('copied');
            }, 1500);
        }
    }

    /**
     * Format byte size to human readable
     */
    formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default DevPanel;
