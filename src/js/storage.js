/**
 * Storage Module
 * Provides an abstraction layer for localStorage with error handling
 * Makes the application more testable and allows swapping storage backends
 */

export class Storage {
    /**
     * Creates a new Storage instance
     * @param {Storage} [backend=localStorage] - The storage backend to use
     */
    constructor(backend = null) {
        this.backend = backend || (typeof localStorage !== 'undefined' ? localStorage : null);
    }

    /**
     * Retrieves a value from storage
     * @param {string} key - The key to retrieve
     * @param {*} [defaultValue=null] - Default value if key doesn't exist or on error
     * @returns {*} The stored value (parsed from JSON) or defaultValue
     */
    get(key, defaultValue = null) {
        if (!this.backend) {
            return defaultValue;
        }

        try {
            const item = this.backend.getItem(key);
            if (item === null) {
                return defaultValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.error(`Storage: Error reading '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Stores a value in storage
     * @param {string} key - The key to store under
     * @param {*} value - The value to store (will be JSON stringified)
     * @returns {boolean} True if successful, false on error
     */
    set(key, value) {
        if (!this.backend) {
            return false;
        }

        try {
            this.backend.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage: Error writing '${key}':`, error);
            return false;
        }
    }

    /**
     * Removes a value from storage
     * @param {string} key - The key to remove
     * @returns {boolean} True if successful, false on error
     */
    remove(key) {
        if (!this.backend) {
            return false;
        }

        try {
            this.backend.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage: Error removing '${key}':`, error);
            return false;
        }
    }

    /**
     * Checks if a key exists in storage
     * @param {string} key - The key to check
     * @returns {boolean} True if key exists
     */
    has(key) {
        if (!this.backend) {
            return false;
        }

        try {
            return this.backend.getItem(key) !== null;
        } catch {
            return false;
        }
    }

    /**
     * Clears all storage data
     * @returns {boolean} True if successful, false on error
     */
    clear() {
        if (!this.backend) {
            return false;
        }

        try {
            this.backend.clear();
            return true;
        } catch (error) {
            console.error('Storage: Error clearing storage:', error);
            return false;
        }
    }
}

// Export singleton instance for convenience
export const storage = new Storage();
