import { isTauri, openWithSystemViewer, saveFileWithDialog } from '../tauri-bridge.js';
import { extractEml } from '../utils.js';
import { dataUrlToArrayBuffer, decodeDataUrlText, getDataUrlBase64 } from '../encoding.js';
import { formatContact, getContactEmail } from '../addressUtils.js';

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
        this.attachmentModalBackdrop = this.attachmentModal?.querySelector(
            '.attachment-modal-backdrop'
        );
        this.attachmentModalClose = document.getElementById('attachmentModalClose');
        this.attachmentModalDownload = document.getElementById('attachmentModalDownload');
        this.attachmentModalFilename = document.getElementById('attachmentModalFilename');
        this.attachmentModalContent = document.getElementById('attachmentModalContent');
        this.attachmentModalPrev = document.getElementById('attachmentModalPrev');
        this.attachmentModalNext = document.getElementById('attachmentModalNext');
        this.attachmentModalZoomControls = document.getElementById('attachmentModalZoomControls');
        this.attachmentModalZoomOut = document.getElementById('attachmentModalZoomOut');
        this.attachmentModalZoomReset = document.getElementById('attachmentModalZoomReset');
        this.attachmentModalZoomIn = document.getElementById('attachmentModalZoomIn');
        this.attachmentModalZoomValue = document.getElementById('attachmentModalZoomValue');
        this.attachmentModalSourceLink = document.getElementById('attachmentModalSourceLink');

        // Modal state
        this.currentAttachmentIndex = 0;
        this.previewableAttachments = [];
        this.currentAttachments = [];
        this.imageZoomLevel = 1;
        this.currentImagePreview = null;
        this.minImageZoom = 1;
        this.maxImageZoom = 6;
        this.imageZoomStep = 0.25;
        this.imageViewerFallbackWidth = 960;
        this.imageViewerFallbackHeight = 720;
        this.inlineImageMetadataBySource = new Map();

        // Navigation stack for nested content (e.g., attachments within nested emails)
        this.navigationStack = [];
        this.attachmentModalBack = document.getElementById('attachmentModalBack');

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
     * Finds an image attachment by its rendered source URL
     * @param {string} source - Image source URL or data URI
     * @returns {Object|null} Matching attachment or null
     */
    findAttachmentBySource(source) {
        if (!source) return null;

        return (
            this.currentAttachments.find(
                (attachment) =>
                    this.isPreviewableImage(attachment.attachMimeTag) &&
                    attachment.contentBase64 === source
            ) || null
        );
    }

    /**
     * Opens an inline image in the existing attachment preview modal
     * Falls back to a synthetic image attachment when the source is not part of attachments
     * @param {Object} options
     * @param {string} options.source - Rendered image source URL or data URI
     * @param {string} [options.fileName] - Suggested file name for the modal header/download
     * @returns {boolean} True when an image source was provided
     */
    openInlineImage({ source, fileName = 'inline-image', linkHref = '' }) {
        if (!source) return false;

        if (linkHref) {
            this.setInlineImageMetadata(source, { linkHref });
        }

        const matchedAttachment = this.findAttachmentBySource(source);
        const attachment = matchedAttachment || this.createInlineImageAttachment(source, fileName);

        if (!matchedAttachment) {
            this.setAttachments([attachment]);
        }

        this.open(attachment);
        return true;
    }

    /**
     * Stores metadata for inline images so preview entry-points can share context
     * @param {string} source - Rendered image source URL or data URI
     * @param {Object} metadata - Metadata associated with the inline image
     */
    setInlineImageMetadata(source, metadata = {}) {
        if (!source) return;

        const existingMetadata = this.inlineImageMetadataBySource.get(source) || {};
        this.inlineImageMetadataBySource.set(source, {
            ...existingMetadata,
            ...metadata
        });
    }

    /**
     * Creates a temporary attachment model for inline images that are not in the attachment list
     * @param {string} source - Rendered image source URL or data URI
     * @param {string} fileName - Suggested file name
     * @returns {Object} Attachment-like object for modal preview
     */
    createInlineImageAttachment(source, fileName) {
        const mimeType = this.inferInlineImageMimeType(source);

        return {
            fileName: this.normalizeInlineImageFileName(fileName, mimeType),
            attachMimeTag: mimeType,
            contentBase64: source,
            contentLength: 0
        };
    }

    /**
     * Infers an image MIME type from a data URI or file extension
     * @param {string} source - Rendered image source URL or data URI
     * @returns {string} Best-effort image MIME type
     */
    inferInlineImageMimeType(source) {
        if (typeof source !== 'string') return 'image/png';

        const dataUrlMatch = source.match(/^data:(image\/[^;]+);/i);
        if (dataUrlMatch) {
            return dataUrlMatch[1].toLowerCase();
        }

        const sourceWithoutQuery = source.split('?')[0].split('#')[0];
        const extension = sourceWithoutQuery.split('.').pop()?.toLowerCase();
        const mimeTypesByExtension = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            bmp: 'image/bmp'
        };

        return mimeTypesByExtension[extension] || 'image/png';
    }

    /**
     * Ensures synthetic inline-image downloads keep a sensible file extension
     * @param {string} fileName - Suggested file name
     * @param {string} mimeType - Inferred MIME type
     * @returns {string} Normalized file name
     */
    normalizeInlineImageFileName(fileName, mimeType) {
        const normalizedFileName = (fileName || 'inline-image').trim() || 'inline-image';
        if (/\.[a-z0-9]+$/i.test(normalizedFileName)) {
            return normalizedFileName;
        }

        const extensionsByMimeType = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg',
            'image/bmp': 'bmp'
        };

        return `${normalizedFileName}.${extensionsByMimeType[mimeType] || 'png'}`;
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

        // Back button for nested navigation
        this.attachmentModalBack?.addEventListener('click', () => this.navigateBack());

        // Download button - intercept clicks for Tauri save dialog
        this.attachmentModalDownload?.addEventListener('click', (e) => {
            if (isTauri()) {
                e.preventDefault();
                this.downloadCurrentAttachment();
            }
            // In browser, let the default href/download behavior work
        });

        this.attachmentModalZoomOut?.addEventListener('click', () => this.zoomOut());
        this.attachmentModalZoomReset?.addEventListener('click', () => this.resetZoom());
        this.attachmentModalZoomIn?.addEventListener('click', () => this.zoomIn());
        this.attachmentModalContent?.addEventListener(
            'wheel',
            (event) => this.handleModalWheel(event),
            { passive: false }
        );
    }

    /**
     * Downloads the current attachment using save dialog in Tauri or browser fallback
     */
    async downloadCurrentAttachment() {
        const attachment = this.previewableAttachments[this.currentAttachmentIndex];
        if (!attachment) return;

        await this.downloadAttachment(attachment);
    }

    /**
     * Downloads an attachment using save dialog in Tauri or browser fallback
     * @param {Object} attachment - Attachment object with contentBase64 and fileName
     */
    async downloadAttachment(attachment) {
        if (isTauri()) {
            try {
                const saved = await saveFileWithDialog(
                    attachment.contentBase64,
                    attachment.fileName
                );
                if (saved && this.showToast) {
                    this.showToast('File saved successfully', 'info');
                }
            } catch (error) {
                console.error('Failed to save file:', error);
                if (this.showToast) {
                    this.showToast('Failed to save file', 'error');
                }
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

    /**
     * Checks if a MIME type is a previewable image format
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the MIME type is a previewable image
     */
    isPreviewableImage(mimeType) {
        if (!mimeType) return false;
        return mimeType.toLowerCase().startsWith('image/');
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
        return (
            normalizedMime.startsWith('text/') ||
            normalizedMime.startsWith('application/text') ||
            normalizedMime === 'application/json' ||
            normalizedMime === 'application/xml' ||
            normalizedMime === 'application/javascript' ||
            normalizedMime === 'application/x-diff'
        );
    }

    /**
     * Checks if a MIME type is a nested email (message/rfc822)
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the MIME type is a nested email
     */
    isPreviewableEml(mimeType) {
        if (!mimeType) return false;
        return mimeType.toLowerCase() === 'message/rfc822';
    }

    /**
     * Checks if an attachment can be previewed in the modal
     * @param {string} mimeType - MIME type to check
     * @returns {boolean} True if the attachment is previewable
     */
    isPreviewable(mimeType) {
        return (
            this.isPreviewableImage(mimeType) ||
            this.isPdf(mimeType) ||
            this.isText(mimeType) ||
            this.isPreviewableEml(mimeType)
        );
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
        openWithSystemViewer(attachment.contentBase64, attachment.fileName).catch((err) => {
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

        // Clear navigation stack when opening a new attachment
        this.clearNavigationStack();

        // In Tauri, open PDFs with system viewer (WebKit has issues with data: URLs)
        if (this._shouldOpenWithSystemViewer(attachment)) {
            this._openPdfWithSystemViewer(attachment);
            return;
        }

        // Build list of previewable attachments if not already set
        if (this.currentAttachments) {
            this.previewableAttachments = this.currentAttachments.filter((att) =>
                this.isPreviewable(att.attachMimeTag)
            );
        }

        // Find the index in previewable attachments
        this.currentAttachmentIndex = this.previewableAttachments.findIndex(
            (att) =>
                att.fileName === attachment.fileName &&
                att.contentBase64 === attachment.contentBase64
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
        this.resetImagePreviewState();

        // Set filename with breadcrumb if navigating from nested content
        this.updateFilenameWithBreadcrumb(attachment.fileName);
        this.updateSourceLink(
            this.inlineImageMetadataBySource.get(attachment.contentBase64)?.linkHref || ''
        );

        // Set download link
        this.attachmentModalDownload.href = attachment.contentBase64;
        this.attachmentModalDownload.download = attachment.fileName;

        // Clear previous content
        this.attachmentModalContent.innerHTML = '';
        this.attachmentModalContent.classList.remove('attachment-modal-content--image');

        // Render appropriate preview
        if (this.isPreviewableImage(attachment.attachMimeTag)) {
            this.renderImagePreview(attachment);
        } else if (this.isPdf(attachment.attachMimeTag)) {
            // Use object tag for better PDF compatibility with data: URLs
            const pdfObject = document.createElement('object');
            pdfObject.data = attachment.contentBase64;
            pdfObject.type = 'application/pdf';
            pdfObject.innerHTML = `<p class="text-center p-4">PDF cannot be displayed. <a href="${attachment.contentBase64}" download="${attachment.fileName}" class="text-blue-500 underline">Download here</a></p>`;
            this.attachmentModalContent.appendChild(pdfObject);
        } else if (this.isText(attachment.attachMimeTag)) {
            try {
                const base64Data = getDataUrlBase64(attachment.contentBase64);
                if (!base64Data) {
                    throw new Error('Invalid base64 data format');
                }
                const textContent = decodeDataUrlText(attachment.contentBase64);

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
        } else if (this.isPreviewableEml(attachment.attachMimeTag)) {
            // Render nested email preview
            this.renderNestedEmailPreview(attachment);
        }

        // Update navigation buttons
        this.updateNavButtons();
    }

    /**
     * Renders an image preview with zoom support inside a fixed viewer area
     * @param {Object} attachment - Image attachment to preview
     */
    renderImagePreview(attachment) {
        const viewer = document.createElement('div');
        viewer.className = 'attachment-image-viewer';

        const stage = document.createElement('div');
        stage.className = 'attachment-image-stage';

        const img = document.createElement('img');
        img.src = attachment.contentBase64;
        img.alt = attachment.fileName;
        img.className = 'attachment-preview-image';
        img.draggable = false;

        stage.appendChild(img);
        viewer.appendChild(stage);
        this.attachmentModalContent.classList.add('attachment-modal-content--image');
        this.attachmentModalContent.appendChild(viewer);

        this.currentImagePreview = { viewer, stage, image: img };
        this.updateZoomControls();

        img.addEventListener(
            'load',
            () => {
                this.applyImageZoom({ preserveViewport: false });
            },
            { once: true }
        );

        if (img.complete) {
            queueMicrotask(() => this.applyImageZoom({ preserveViewport: false }));
        }
    }

    /**
     * Handles Ctrl/Cmd + wheel zoom for image previews
     * @param {WheelEvent} event
     */
    handleModalWheel(event) {
        if (!this.currentImagePreview || (!event.ctrlKey && !event.metaKey)) {
            return;
        }

        event.preventDefault();
        if (event.deltaY < 0) {
            this.zoomIn();
        } else if (event.deltaY > 0) {
            this.zoomOut();
        }
    }

    /**
     * Zooms the current image in
     */
    zoomIn() {
        this.setImageZoom(this.imageZoomLevel + this.imageZoomStep);
    }

    /**
     * Zooms the current image out
     */
    zoomOut() {
        this.setImageZoom(this.imageZoomLevel - this.imageZoomStep);
    }

    /**
     * Resets the current image zoom to fit the viewer
     */
    resetZoom() {
        this.setImageZoom(this.minImageZoom, { preserveViewport: false });
    }

    /**
     * Updates the current image zoom level and re-renders the preview
     * @param {number} nextZoomLevel - Requested zoom level
     * @param {Object} [options]
     * @param {boolean} [options.preserveViewport=true] - Keep current viewport center while zooming
     */
    setImageZoom(nextZoomLevel, { preserveViewport = true } = {}) {
        if (!this.currentImagePreview) return;

        const clampedZoom = Math.min(this.maxImageZoom, Math.max(this.minImageZoom, nextZoomLevel));
        if (clampedZoom === this.imageZoomLevel && this.currentImagePreview.image?.style.width) {
            this.updateZoomControls();
            return;
        }

        this.imageZoomLevel = clampedZoom;
        this.applyImageZoom({ preserveViewport });
    }

    /**
     * Recomputes the image preview dimensions for the current zoom level
     * @param {Object} [options]
     * @param {boolean} [options.preserveViewport=true] - Keep current viewport center while zooming
     */
    applyImageZoom({ preserveViewport = true } = {}) {
        if (!this.currentImagePreview) return;

        const { viewer, stage, image } = this.currentImagePreview;
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        if (!naturalWidth || !naturalHeight) {
            this.updateZoomControls();
            return;
        }

        const { width: viewerWidth, height: viewerHeight } = this.getImageViewerSize(viewer);
        const fitScale = Math.min(viewerWidth / naturalWidth, viewerHeight / naturalHeight);
        const baseWidth = Math.max(1, Math.round(naturalWidth * fitScale));
        const baseHeight = Math.max(1, Math.round(naturalHeight * fitScale));

        const previousStageWidth = stage.scrollWidth || stage.clientWidth || viewerWidth;
        const previousStageHeight = stage.scrollHeight || stage.clientHeight || viewerHeight;
        const centerRatioX = preserveViewport
            ? (viewer.scrollLeft + viewerWidth / 2) / previousStageWidth
            : 0.5;
        const centerRatioY = preserveViewport
            ? (viewer.scrollTop + viewerHeight / 2) / previousStageHeight
            : 0.5;

        const scaledWidth = Math.max(1, Math.round(baseWidth * this.imageZoomLevel));
        const scaledHeight = Math.max(1, Math.round(baseHeight * this.imageZoomLevel));
        const stageWidth = Math.max(viewerWidth, scaledWidth);
        const stageHeight = Math.max(viewerHeight, scaledHeight);

        image.style.width = `${scaledWidth}px`;
        image.style.height = `${scaledHeight}px`;
        stage.style.width = `${stageWidth}px`;
        stage.style.height = `${stageHeight}px`;

        if (preserveViewport) {
            viewer.scrollLeft = Math.max(
                0,
                Math.round(centerRatioX * stageWidth - viewerWidth / 2)
            );
            viewer.scrollTop = Math.max(
                0,
                Math.round(centerRatioY * stageHeight - viewerHeight / 2)
            );
        } else {
            viewer.scrollLeft = Math.max(0, Math.round((stageWidth - viewerWidth) / 2));
            viewer.scrollTop = Math.max(0, Math.round((stageHeight - viewerHeight) / 2));
        }

        this.updateZoomControls();
    }

    /**
     * Returns the current image viewer dimensions with test-friendly fallbacks
     * @param {HTMLElement} viewer - Viewer element
     * @returns {{width: number, height: number}}
     */
    getImageViewerSize(viewer) {
        return {
            width: viewer?.clientWidth || this.imageViewerFallbackWidth,
            height: viewer?.clientHeight || this.imageViewerFallbackHeight
        };
    }

    /**
     * Updates the optional source-link action for linked inline images
     * @param {string} linkHref - Original link target wrapping the inline image
     */
    updateSourceLink(linkHref) {
        if (!this.attachmentModalSourceLink) return;

        if (!linkHref) {
            this.attachmentModalSourceLink.hidden = true;
            this.attachmentModalSourceLink.removeAttribute('href');
            return;
        }

        this.attachmentModalSourceLink.href = linkHref;
        this.attachmentModalSourceLink.hidden = false;
    }

    /**
     * Resets image-specific preview state
     */
    resetImagePreviewState() {
        this.imageZoomLevel = this.minImageZoom;
        this.currentImagePreview = null;
        this.updateZoomControls();
    }

    /**
     * Updates the zoom controls visibility and disabled state
     */
    updateZoomControls() {
        const hasImagePreview = Boolean(this.currentImagePreview);

        if (this.attachmentModalZoomControls) {
            this.attachmentModalZoomControls.hidden = !hasImagePreview;
        }

        if (this.attachmentModalZoomValue) {
            this.attachmentModalZoomValue.textContent = `${Math.round(this.imageZoomLevel * 100)}%`;
        }

        if (this.attachmentModalZoomOut) {
            this.attachmentModalZoomOut.disabled =
                !hasImagePreview || this.imageZoomLevel <= this.minImageZoom;
        }

        if (this.attachmentModalZoomReset) {
            this.attachmentModalZoomReset.disabled =
                !hasImagePreview || this.imageZoomLevel === this.minImageZoom;
        }

        if (this.attachmentModalZoomIn) {
            this.attachmentModalZoomIn.disabled =
                !hasImagePreview || this.imageZoomLevel >= this.maxImageZoom;
        }
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
     * Pushes current attachment to navigation stack for back navigation
     * @param {Object} attachment - Current attachment to save
     */
    pushToStack(attachment) {
        this.navigationStack.push(attachment);
        this.updateBackButton();
    }

    /**
     * Navigates back to the previous attachment in the stack
     */
    navigateBack() {
        if (this.navigationStack.length > 0) {
            const previousAttachment = this.navigationStack.pop();
            this.renderAttachmentPreview(previousAttachment);
            this.updateBackButton();
        }
    }

    /**
     * Updates the visibility of the back button based on stack state
     */
    updateBackButton() {
        if (this.attachmentModalBack) {
            this.attachmentModalBack.style.display =
                this.navigationStack.length > 0 ? 'flex' : 'none';
        }
    }

    /**
     * Clears the navigation stack
     */
    clearNavigationStack() {
        this.navigationStack = [];
        this.updateBackButton();
    }

    /**
     * Updates the filename display with breadcrumb navigation
     * Shows parent > child format when navigating nested content
     * Parent items are clickable to navigate back
     * @param {string} currentFileName - The current attachment filename
     */
    updateFilenameWithBreadcrumb(currentFileName) {
        // Clear existing content
        this.attachmentModalFilename.innerHTML = '';

        if (this.navigationStack.length > 0) {
            // Build clickable breadcrumb from stack
            this.navigationStack.forEach((att, index) => {
                const link = document.createElement('button');
                link.type = 'button';
                link.className = 'breadcrumb-link';
                link.textContent = att.fileName;
                link.addEventListener('click', () => {
                    // Navigate back to this level by popping until we reach it
                    while (this.navigationStack.length > index) {
                        this.navigationStack.pop();
                    }
                    this.renderAttachmentPreview(att);
                    this.updateBackButton();
                });
                this.attachmentModalFilename.appendChild(link);

                // Add separator
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = ' › ';
                this.attachmentModalFilename.appendChild(separator);
            });

            // Add current (non-clickable) filename
            const current = document.createElement('span');
            current.className = 'breadcrumb-current';
            current.textContent = currentFileName;
            this.attachmentModalFilename.appendChild(current);
        } else {
            this.attachmentModalFilename.textContent = currentFileName;
        }
    }

    /**
     * Renders a nested email preview in the modal
     * @param {Object} attachment - Attachment object containing the nested email
     */
    renderNestedEmailPreview(attachment) {
        try {
            const base64Data = getDataUrlBase64(attachment.contentBase64);
            if (!base64Data) {
                throw new Error('Invalid base64 data format');
            }

            const emailData = extractEml(dataUrlToArrayBuffer(attachment.contentBase64));

            // Create structured email preview
            const emailContainer = document.createElement('div');
            emailContainer.className = 'nested-email-preview';

            // Email header section
            const headerSection = document.createElement('div');
            headerSection.className = 'nested-email-header';

            const headerFields = [
                {
                    label: 'From',
                    value: formatContact(emailData.senderName || '', emailData.senderEmail || '')
                },
                { label: 'To', value: this.formatRecipients(emailData.recipients, 'to') },
                { label: 'CC', value: this.formatRecipients(emailData.recipients, 'cc') },
                { label: 'Subject', value: emailData.subject },
                {
                    label: 'Date',
                    value: emailData.messageDeliveryTime
                        ? new Date(emailData.messageDeliveryTime).toLocaleString()
                        : ''
                }
            ];

            headerFields.forEach((field) => {
                if (field.value) {
                    const row = document.createElement('div');
                    row.className = 'nested-email-header-row';
                    row.innerHTML = `<span class="nested-email-label">${field.label}:</span> <span class="nested-email-value">${this.escapeHtml(field.value)}</span>`;
                    headerSection.appendChild(row);
                }
            });

            emailContainer.appendChild(headerSection);

            // Email body section
            const bodySection = document.createElement('div');
            bodySection.className = 'nested-email-body';

            if (emailData.bodyContentHTML) {
                // Create a sandboxed iframe for HTML content
                const iframe = document.createElement('iframe');
                iframe.className = 'nested-email-iframe';
                iframe.sandbox = 'allow-same-origin';
                bodySection.appendChild(iframe);

                // Write content after iframe is in DOM
                setTimeout(() => {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; margin: 1rem; color: #333; }
                                img { max-width: 100%; height: auto; }
                            </style>
                        </head>
                        <body>${emailData.bodyContentHTML}</body>
                        </html>
                    `);
                    doc.close();
                }, 0);
            } else if (emailData.bodyContent) {
                const pre = document.createElement('pre');
                pre.className = 'nested-email-text';
                pre.textContent = emailData.bodyContent;
                bodySection.appendChild(pre);
            }

            emailContainer.appendChild(bodySection);

            // Attachments section (if any)
            if (emailData.attachments && emailData.attachments.length > 0) {
                const attachmentsSection = document.createElement('div');
                attachmentsSection.className = 'nested-email-attachments';
                attachmentsSection.innerHTML = `<div class="nested-email-attachments-title">Attachments (${emailData.attachments.length})</div>`;

                const attachmentsList = document.createElement('div');
                attachmentsList.className = 'nested-email-attachments-list';

                emailData.attachments.forEach((att) => {
                    const isPreviewable = this.isPreviewable(att.attachMimeTag);
                    const isImage = this.isPreviewableImage(att.attachMimeTag);
                    const isPdf = this.isPdf(att.attachMimeTag);
                    const isText = this.isText(att.attachMimeTag);
                    const isEml = this.isPreviewableEml(att.attachMimeTag);

                    // Icon selection helper
                    const getIcon = () => {
                        if (isImage) {
                            return `<img src="${att.contentBase64}" alt="Attachment" class="w-10 h-10 object-cover">`;
                        } else if (isPdf) {
                            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-500">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>`;
                        } else if (isText) {
                            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 attachment-icon">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>`;
                        } else if (isEml) {
                            return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-blue-500">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>`;
                        }
                        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 attachment-icon">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>`;
                    };

                    const downloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>`;

                    if (isPreviewable) {
                        // Clickable card for previewable attachments
                        const attItem = document.createElement('div');
                        attItem.className =
                            'nested-email-attachment-item nested-email-attachment-previewable cursor-pointer';
                        attItem.title = 'Click to preview';
                        attItem.innerHTML = `
                            <div class="attachment-thumbnail w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden">
                                ${getIcon()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="attachment-filename">${this.escapeHtml(att.fileName)}</p>
                                <p class="attachment-meta">${att.attachMimeTag} - ${this.formatFileSize(att.contentLength)}</p>
                            </div>
                            <button class="ml-auto pl-2 attachment-download-btn nested-download-btn"
                                    title="Download">
                                ${downloadIcon}
                            </button>
                        `;
                        // Click on card opens preview (except download button)
                        attItem.addEventListener('click', (e) => {
                            const downloadBtn = e.target.closest('.nested-download-btn');
                            if (downloadBtn) {
                                e.stopPropagation();
                                this.downloadAttachment(att);
                            } else if (this._shouldOpenWithSystemViewer(att)) {
                                // PDF in Tauri: open with system viewer instead of modal preview
                                this._openPdfWithSystemViewer(att);
                            } else {
                                this.pushToStack(attachment);
                                this.renderAttachmentPreview(att);
                            }
                        });
                        attachmentsList.appendChild(attItem);
                    } else {
                        // Clickable card for non-previewable attachments (download on click)
                        const attItem = document.createElement('div');
                        attItem.className = 'nested-email-attachment-item cursor-pointer';
                        attItem.title = 'Click to download';
                        attItem.innerHTML = `
                            <div class="attachment-thumbnail w-10 h-10 shrink-0 flex items-center justify-center">
                                ${getIcon()}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="attachment-filename">${this.escapeHtml(att.fileName)}</p>
                                <p class="attachment-meta">${att.attachMimeTag} - ${this.formatFileSize(att.contentLength)}</p>
                            </div>
                            <div class="ml-auto pl-2 attachment-download-btn">
                                ${downloadIcon}
                            </div>
                        `;
                        attItem.addEventListener('click', () => {
                            this.downloadAttachment(att);
                        });
                        attachmentsList.appendChild(attItem);
                    }
                });

                attachmentsSection.appendChild(attachmentsList);
                emailContainer.appendChild(attachmentsSection);
            }

            this.attachmentModalContent.appendChild(emailContainer);
        } catch (error) {
            console.error('Error rendering nested email:', error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-center p-4 text-gray-500';
            errorDiv.textContent = 'Unable to preview this email file';
            this.attachmentModalContent.appendChild(errorDiv);
        }
    }

    /**
     * Formats recipients of a specific type for display
     * @param {Array} recipients - Array of recipient objects
     * @param {string} type - Recipient type ('to' or 'cc')
     * @returns {string} Formatted recipient string
     */
    formatRecipients(recipients, type) {
        if (!recipients || !Array.isArray(recipients)) return '';
        return recipients
            .filter((recipient) => recipient.recipType === type)
            .map((recipient) => {
                const name = recipient.name || '';
                return formatContact(name, getContactEmail(recipient));
            })
            .join(', ');
    }

    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Formats file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Handles Escape key press - navigates back if in nested content, otherwise closes
     * @returns {boolean} True if handled (navigated back), false if modal should close
     */
    handleEscape() {
        if (this.navigationStack.length > 0) {
            this.navigateBack();
            return true;
        }
        return false;
    }

    /**
     * Closes the attachment preview modal and restores page scroll
     */
    close() {
        if (!this.attachmentModal) return;

        this.attachmentModal.classList.remove('active');
        this.attachmentModalContent.innerHTML = '';
        this.attachmentModalContent.classList.remove('attachment-modal-content--image');
        this.clearNavigationStack();
        this.resetImagePreviewState();
        this.updateSourceLink('');

        // Restore body scroll
        document.body.style.overflow = '';

        // Notify keyboard manager of context change
        if (this.keyboardManager) {
            this.keyboardManager.setContext('main');
        }
    }
}

export default AttachmentModalManager;
