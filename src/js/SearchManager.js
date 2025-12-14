/**
 * Manages email search functionality
 * Provides filtering, debouncing, and query highlighting
 */
export class SearchManager {
    /**
     * Creates a new SearchManager instance
     * @param {MessageHandler} messageHandler - Handler for message operations
     */
    constructor(messageHandler) {
        this.messageHandler = messageHandler;
        this.currentQuery = '';
        this.searchTerms = [];
        this.debounceTimer = null;
    }

    /**
     * Searches messages by query
     * @param {string} query - Search term
     * @returns {Array} Filtered messages
     */
    search(query) {
        this.currentQuery = query.toLowerCase().trim();
        // Split query into individual search terms
        this.searchTerms = this.currentQuery.split(/\s+/).filter(Boolean);

        if (!this.currentQuery) {
            return this.messageHandler.getMessages();
        }

        return this.messageHandler.getMessages().filter(message =>
            this.matchesQuery(message)
        );
    }

    /**
     * Checks if a message matches the current query
     * All search terms must be found somewhere in the message
     * @param {Object} message - Message object to check
     * @returns {boolean} True if message matches query
     */
    matchesQuery(message) {
        // Build searchable text from all relevant fields
        const searchableText = [
            // Subject
            message.subject,
            // Sender fields (MSG and EML formats)
            message.senderName,
            message.senderEmail,
            message.senderSmtpAddress,
            // Body content (various formats)
            message.body,
            message.bodyContent,
            // Strip HTML tags from HTML body for text search
            this.stripHtml(message.bodyContentHTML),
            // Recipients (support both 'email' and 'address' field names)
            message.recipients?.map(r =>
                `${r.name || ''} ${r.email || ''} ${r.address || ''}`
            ).join(' ')
        ].filter(Boolean).join(' ').toLowerCase();

        // Normalize the combined text for flexible matching
        const normalizedText = this.normalizeText(searchableText);

        // All search terms must be found (AND logic)
        return this.searchTerms.every(term => {
            const normalizedTerm = this.normalizeText(term);
            return searchableText.includes(term) ||
                   normalizedText.includes(normalizedTerm);
        });
    }

    /**
     * Normalizes text by replacing separators with spaces
     * Allows "ada lovelace" to match "ada.lovelace", "ada-lovelace", "ada_lovelace"
     * @param {string} text - Text to normalize
     * @returns {string} Normalized text
     */
    normalizeText(text) {
        if (!text) return '';
        return text.replace(/[.\-_@]/g, ' ').replace(/\s+/g, ' ');
    }

    /**
     * Strips HTML tags from a string for text search
     * @param {string} html - HTML string
     * @returns {string} Plain text
     */
    stripHtml(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    /**
     * Performs debounced search for input handlers
     * @param {string} query - Search term
     * @param {Function} callback - Callback with search results
     * @param {number} delay - Debounce delay in milliseconds
     */
    searchDebounced(query, callback, delay = 300) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            const results = this.search(query);
            callback(results);
        }, delay);
    }

    /**
     * Clears the current search and returns all messages
     * @returns {Array} All messages
     */
    clearSearch() {
        this.currentQuery = '';
        this.searchTerms = [];
        clearTimeout(this.debounceTimer);
        return this.messageHandler.getMessages();
    }

    /**
     * Gets the current search query
     * @returns {string} Current query
     */
    getQuery() {
        return this.currentQuery;
    }

    /**
     * Highlights search matches in text
     * @param {string} text - Text to highlight
     * @returns {string} Text with highlighted matches
     */
    highlightMatches(text) {
        if (!this.currentQuery || !text) return text;

        const regex = new RegExp(`(${this.escapeRegex(this.currentQuery)})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    /**
     * Escapes special regex characters in a string
     * @param {string} string - String to escape
     * @returns {string} Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Checks if there is an active search
     * @returns {boolean} True if search is active
     */
    isSearchActive() {
        return this.currentQuery.length > 0;
    }

    /**
     * Gets the count of search results
     * @returns {number} Number of matching messages
     */
    getResultCount() {
        if (!this.isSearchActive()) {
            return this.messageHandler.getMessages().length;
        }
        return this.search(this.currentQuery).length;
    }
}

export default SearchManager;
