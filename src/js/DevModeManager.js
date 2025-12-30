/**
 * DevMode Manager
 * Manages developer mode state and debug data for email parsing
 * Activated via ?dev URL parameter or hidden D keyboard shortcut
 */
class DevModeManager {
    constructor() {
        // Check URL for ?dev parameter
        this.enabled = this.checkUrlParam();
        // Store debug data per message (keyed by message hash or index)
        this.debugDataMap = new Map();
        // Panel visibility state
        this.panelVisible = false;
        // Listeners for state changes
        this.listeners = [];
    }

    /**
     * Check if ?dev is present in URL
     * @returns {boolean}
     */
    checkUrlParam() {
        if (typeof window === 'undefined') return false;
        const params = new URLSearchParams(window.location.search);
        return params.has('dev');
    }

    /**
     * Check if dev mode is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Enable dev mode (called by hidden keyboard shortcut)
     */
    enable() {
        if (!this.enabled) {
            this.enabled = true;
            this.notifyListeners();
        }
    }

    /**
     * Toggle dev mode on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.panelVisible = false;
        }
        this.notifyListeners();
    }

    /**
     * Toggle panel visibility
     */
    togglePanel() {
        if (this.enabled) {
            this.panelVisible = !this.panelVisible;
            this.notifyListeners();
        }
    }

    /**
     * Show the dev panel
     */
    showPanel() {
        if (this.enabled) {
            this.panelVisible = true;
            this.notifyListeners();
        }
    }

    /**
     * Hide the dev panel
     */
    hidePanel() {
        this.panelVisible = false;
        this.notifyListeners();
    }

    /**
     * Check if panel is visible
     * @returns {boolean}
     */
    isPanelVisible() {
        return this.enabled && this.panelVisible;
    }

    /**
     * Store debug data for a message
     * @param {string} messageId - Unique identifier for the message
     * @param {Object} debugData - Debug data object
     */
    setDebugData(messageId, debugData) {
        this.debugDataMap.set(messageId, debugData);
    }

    /**
     * Get debug data for a message
     * @param {string} messageId - Unique identifier for the message
     * @returns {Object|null} Debug data or null if not found
     */
    getDebugData(messageId) {
        return this.debugDataMap.get(messageId) || null;
    }

    /**
     * Clear debug data for a message
     * @param {string} messageId - Unique identifier for the message
     */
    clearDebugData(messageId) {
        this.debugDataMap.delete(messageId);
    }

    /**
     * Clear all debug data
     */
    clearAllDebugData() {
        this.debugDataMap.clear();
    }

    /**
     * Add a listener for state changes
     * @param {Function} callback - Callback function
     */
    addListener(callback) {
        this.listeners.push(callback);
    }

    /**
     * Remove a listener
     * @param {Function} callback - Callback function to remove
     */
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(callback => callback({
            enabled: this.enabled,
            panelVisible: this.panelVisible
        }));
    }
}

// Create singleton instance
export const devModeManager = new DevModeManager();
export default DevModeManager;
