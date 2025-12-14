/**
 * Minimum viewport height used when container has no height (e.g., in tests)
 * This ensures at least some items are rendered even in headless environments
 */
const MIN_VIEWPORT_HEIGHT = 500;

/**
 * Virtual list implementation for efficient rendering of large lists
 * Only renders visible items plus a buffer for smooth scrolling
 */
export class VirtualList {
    /**
     * Creates a new VirtualList instance
     * @param {HTMLElement} container - The scrollable container element
     * @param {Object} options - Configuration options
     * @param {number} options.itemHeight - Fixed height of each item in pixels
     * @param {number} [options.buffer=3] - Number of extra items to render above/below viewport
     * @param {Function} options.renderItem - Function that returns HTML string for an item
     * @param {Function} [options.onItemClick] - Click handler for items
     */
    constructor(container, options) {
        this.container = container;
        this.itemHeight = options.itemHeight;
        this.buffer = options.buffer ?? 3;
        this.renderItem = options.renderItem;
        this.onItemClick = options.onItemClick;
        this.items = [];

        // Internal state
        this.scrollTop = 0;
        this.viewportHeight = 0;
        this.visibleStartIndex = 0;
        this.visibleEndIndex = 0;
        this.ticking = false;

        // Create internal structure
        this.setupDOM();
        this.setupScrollListener();
        this.setupResizeObserver();
    }

    /**
     * Sets up the internal DOM structure for virtual scrolling
     */
    setupDOM() {
        // Guard against null container
        if (!this.container) return;

        // Create the scroll content wrapper
        this.scrollContent = document.createElement('div');
        this.scrollContent.className = 'virtual-list-content';
        this.scrollContent.style.position = 'relative';
        this.scrollContent.style.width = '100%';

        // Create the visible items container
        this.visibleContainer = document.createElement('div');
        this.visibleContainer.className = 'virtual-list-visible';
        this.visibleContainer.style.position = 'absolute';
        this.visibleContainer.style.width = '100%';
        this.visibleContainer.style.left = '0';

        this.scrollContent.appendChild(this.visibleContainer);

        // Clear container and add our structure
        this.container.innerHTML = '';
        this.container.appendChild(this.scrollContent);

        // Setup click delegation
        this.container.addEventListener('click', (e) => {
            const item = e.target.closest('[data-message-index]');
            if (item && this.onItemClick) {
                const index = parseInt(item.dataset.messageIndex, 10);
                this.onItemClick(index, this.items[index]);
            }
        });
    }

    /**
     * Sets up the scroll listener with requestAnimationFrame for performance
     */
    setupScrollListener() {
        if (!this.container) return;

        this.container.addEventListener('scroll', () => {
            if (!this.ticking) {
                requestAnimationFrame(() => {
                    this.onScroll();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        }, { passive: true });
    }

    /**
     * Sets up a resize observer to handle container size changes
     */
    setupResizeObserver() {
        if (!this.container) return;

        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.viewportHeight = Math.max(this.container.clientHeight, MIN_VIEWPORT_HEIGHT);
                this.render();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    /**
     * Handles scroll events
     */
    onScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }

    /**
     * Sets the items to display
     * @param {Array} items - Array of items to render
     */
    setItems(items) {
        this.items = items;
        // Use actual height or minimum for headless/test environments
        this.viewportHeight = Math.max(this.container.clientHeight, MIN_VIEWPORT_HEIGHT);
        this.render();
    }

    /**
     * Calculates which items should be visible
     * @returns {Object} Start and end indices for visible items
     */
    calculateVisibleRange() {
        const startIndex = Math.max(0,
            Math.floor(this.scrollTop / this.itemHeight) - this.buffer
        );
        const endIndex = Math.min(this.items.length,
            Math.ceil((this.scrollTop + this.viewportHeight) / this.itemHeight) + this.buffer
        );

        return { startIndex, endIndex };
    }

    /**
     * Renders only the visible items
     */
    render() {
        if (!this.container || this.items.length === 0) {
            this.scrollContent.style.height = '0px';
            this.visibleContainer.innerHTML = '';
            return;
        }

        // Calculate total height for scroll bar
        const totalHeight = this.items.length * this.itemHeight;
        this.scrollContent.style.height = `${totalHeight}px`;

        // Calculate visible range
        const { startIndex, endIndex } = this.calculateVisibleRange();
        this.visibleStartIndex = startIndex;
        this.visibleEndIndex = endIndex;

        // Calculate offset for visible container
        const offsetY = startIndex * this.itemHeight;
        this.visibleContainer.style.top = `${offsetY}px`;

        // Render visible items
        const visibleItems = this.items.slice(startIndex, endIndex);
        this.visibleContainer.innerHTML = visibleItems.map((item, i) =>
            this.renderItem(item, startIndex + i)
        ).join('');

        // Update ARIA attributes for accessibility
        this.updateAriaAttributes(startIndex, endIndex);
    }

    /**
     * Updates ARIA attributes for screen reader accessibility
     * @param {number} startIndex - First visible index
     * @param {number} endIndex - Last visible index
     */
    updateAriaAttributes(startIndex, endIndex) {
        // Update container ARIA attributes
        this.container.setAttribute('aria-rowcount', this.items.length.toString());

        // Update each visible item's ARIA attributes
        const items = this.visibleContainer.querySelectorAll('[data-message-index]');
        items.forEach((item, i) => {
            const actualIndex = startIndex + i;
            item.setAttribute('aria-setsize', this.items.length.toString());
            item.setAttribute('aria-posinset', (actualIndex + 1).toString());
        });
    }

    /**
     * Scrolls an item into view
     * @param {number} index - Index of the item to scroll to
     * @param {Object} [options] - Scroll options
     * @param {string} [options.behavior='smooth'] - Scroll behavior
     * @param {string} [options.block='nearest'] - Vertical alignment
     */
    scrollToIndex(index, options = {}) {
        if (index < 0 || index >= this.items.length) return;

        const targetTop = index * this.itemHeight;
        const targetBottom = targetTop + this.itemHeight;
        const viewportTop = this.scrollTop;
        const viewportBottom = viewportTop + this.viewportHeight;

        let newScrollTop = null;

        // Determine if we need to scroll
        const block = options.block || 'nearest';

        if (block === 'center') {
            newScrollTop = targetTop - (this.viewportHeight - this.itemHeight) / 2;
        } else if (block === 'start') {
            newScrollTop = targetTop;
        } else if (block === 'end') {
            newScrollTop = targetBottom - this.viewportHeight;
        } else { // 'nearest'
            if (targetTop < viewportTop) {
                newScrollTop = targetTop;
            } else if (targetBottom > viewportBottom) {
                newScrollTop = targetBottom - this.viewportHeight;
            }
        }

        if (newScrollTop !== null) {
            newScrollTop = Math.max(0, Math.min(newScrollTop,
                this.items.length * this.itemHeight - this.viewportHeight));

            // Use scrollTo if available, otherwise fall back to scrollTop
            if (typeof this.container.scrollTo === 'function') {
                this.container.scrollTo({
                    top: newScrollTop,
                    behavior: options.behavior || 'smooth'
                });
            } else {
                this.container.scrollTop = newScrollTop;
            }

            // Trigger render update for environments without scroll events
            this.scrollTop = newScrollTop;
            this.render();
        }
    }

    /**
     * Gets the DOM element for a specific index if it's currently rendered
     * @param {number} index - Item index
     * @returns {HTMLElement|null}
     */
    getItemElement(index) {
        return this.visibleContainer.querySelector(`[data-message-index="${index}"]`);
    }

    /**
     * Checks if an item is currently in the visible range
     * @param {number} index - Item index
     * @returns {boolean}
     */
    isItemVisible(index) {
        return index >= this.visibleStartIndex && index < this.visibleEndIndex;
    }

    /**
     * Updates a single item without re-rendering the entire list
     * @param {number} index - Index of the item to update
     * @param {*} newItem - Updated item data
     */
    updateItem(index, newItem) {
        this.items[index] = newItem;

        // Only re-render if the item is currently visible
        if (this.isItemVisible(index)) {
            const element = this.getItemElement(index);
            if (element) {
                const newHtml = this.renderItem(newItem, index);
                const temp = document.createElement('div');
                temp.innerHTML = newHtml;
                element.replaceWith(temp.firstElementChild);
            }
        }
    }

    /**
     * Gets the current scroll position info
     * @returns {Object} Scroll info including top, height, and visible range
     */
    getScrollInfo() {
        return {
            scrollTop: this.scrollTop,
            viewportHeight: this.viewportHeight,
            totalHeight: this.items.length * this.itemHeight,
            visibleStartIndex: this.visibleStartIndex,
            visibleEndIndex: this.visibleEndIndex
        };
    }

    /**
     * Cleans up resources
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.innerHTML = '';
        this.items = [];
    }
}

export default VirtualList;
