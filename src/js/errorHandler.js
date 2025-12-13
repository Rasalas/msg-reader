/**
 * Error Handler Module
 * Centralized error handling with optional user-facing notifications
 */

/**
 * Error severity levels
 */
export const ErrorLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * Centralized error handler
 */
export class ErrorHandler {
    constructor() {
        this.uiManager = null;
        this.logLevel = ErrorLevel.WARNING;
    }

    /**
     * Sets the UI manager for displaying user-facing errors
     * @param {UIManager} uiManager - The UI manager instance
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Sets the minimum log level
     * @param {string} level - One of ErrorLevel values
     */
    setLogLevel(level) {
        this.logLevel = level;
    }

    /**
     * Handles an error
     * @param {Error|string} error - The error or error message
     * @param {string} context - Where the error occurred
     * @param {Object} options - Additional options
     * @param {boolean} [options.silent=false] - Don't show to user
     * @param {string} [options.userMessage] - Message to show to user
     * @param {string} [options.level='error'] - Error severity level
     * @returns {null} Always returns null for chaining
     */
    handle(error, context, options = {}) {
        const {
            silent = false,
            userMessage = null,
            level = ErrorLevel.ERROR
        } = options;

        const errorMessage = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : null;

        // Log to console based on level
        this.log(level, `[${context}] ${errorMessage}`, stack);

        // Show to user if not silent and we have a UI manager
        if (!silent && this.uiManager && userMessage) {
            if (level === ErrorLevel.WARNING) {
                this.uiManager.showWarning(userMessage);
            } else {
                this.uiManager.showError(userMessage);
            }
        }

        return null;
    }

    /**
     * Logs a message at the specified level
     * @param {string} level - Log level
     * @param {string} message - Message to log
     * @param {string} [stack] - Optional stack trace
     */
    log(level, message, stack = null) {
        const levels = Object.values(ErrorLevel);
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        if (messageLevelIndex < currentLevelIndex) {
            return; // Skip logs below current level
        }

        switch (level) {
            case ErrorLevel.DEBUG:
            case ErrorLevel.INFO:
                console.log(`[${level.toUpperCase()}] ${message}`);
                break;
            case ErrorLevel.WARNING:
                console.warn(`[${level.toUpperCase()}] ${message}`);
                break;
            case ErrorLevel.ERROR:
            case ErrorLevel.CRITICAL:
                console.error(`[${level.toUpperCase()}] ${message}`);
                if (stack) {
                    console.error(stack);
                }
                break;
        }
    }

    /**
     * Wraps a function with error handling
     * @param {Function} fn - Function to wrap
     * @param {string} context - Context for error messages
     * @param {Object} options - Error handling options
     * @returns {Function} Wrapped function
     */
    wrap(fn, context, options = {}) {
        return (...args) => {
            try {
                const result = fn(...args);
                // Handle promises
                if (result && typeof result.then === 'function') {
                    return result.catch(error => this.handle(error, context, options));
                }
                return result;
            } catch (error) {
                return this.handle(error, context, options);
            }
        };
    }

    /**
     * Creates a try-catch wrapper for async functions
     * @param {Function} fn - Async function to wrap
     * @param {string} context - Context for error messages
     * @param {Object} options - Error handling options
     * @returns {Function} Wrapped async function
     */
    wrapAsync(fn, context, options = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                return this.handle(error, context, options);
            }
        };
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
