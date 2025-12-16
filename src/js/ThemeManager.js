/**
 * ThemeManager - Manages application and email content themes
 * Supports light, dark, and system themes with persistence
 */

import { storage } from './storage.js';

/**
 * Available theme options
 */
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
};

/**
 * Available email theme options
 */
export const EMAIL_THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    INHERIT: 'inherit' // Follows app theme
};

/**
 * Storage keys for theme preferences
 */
const STORAGE_KEYS = {
    APP_THEME: 'msgReader_theme',
    EMAIL_THEME: 'msgReader_emailTheme'
};

/**
 * ThemeManager class handles theme switching and persistence
 */
export class ThemeManager {
    /**
     * Creates a new ThemeManager instance
     */
    constructor() {
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.listeners = new Set();
    }

    /**
     * Initializes the theme manager
     * Applies saved theme and sets up system theme listener
     */
    init() {
        // Apply saved themes
        this.applyTheme(this.getSavedTheme());
        this.applyEmailTheme(this.getSavedEmailTheme());

        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', () => {
            if (this.getSavedTheme() === THEMES.SYSTEM) {
                this.applyTheme(THEMES.SYSTEM);
            }
            if (this.getSavedEmailTheme() === EMAIL_THEMES.INHERIT) {
                this.applyEmailTheme(EMAIL_THEMES.INHERIT);
            }
        });
    }

    /**
     * Gets the saved app theme from storage
     * @returns {string} The saved theme or 'system' as default
     */
    getSavedTheme() {
        return storage.get(STORAGE_KEYS.APP_THEME, THEMES.SYSTEM);
    }

    /**
     * Gets the saved email theme from storage
     * @returns {string} The saved email theme or 'inherit' as default
     */
    getSavedEmailTheme() {
        return storage.get(STORAGE_KEYS.EMAIL_THEME, EMAIL_THEMES.INHERIT);
    }

    /**
     * Sets and applies the app theme
     * @param {string} theme - One of THEMES values
     */
    setTheme(theme) {
        if (!Object.values(THEMES).includes(theme)) {
            console.warn(`ThemeManager: Invalid theme '${theme}'`);
            return;
        }
        storage.set(STORAGE_KEYS.APP_THEME, theme);
        this.applyTheme(theme);

        // Update email theme if it inherits from app
        if (this.getSavedEmailTheme() === EMAIL_THEMES.INHERIT) {
            this.applyEmailTheme(EMAIL_THEMES.INHERIT);
        }

        this.notifyListeners('app', theme);
    }

    /**
     * Sets and applies the email content theme
     * @param {string} theme - One of EMAIL_THEMES values
     */
    setEmailTheme(theme) {
        if (!Object.values(EMAIL_THEMES).includes(theme)) {
            console.warn(`ThemeManager: Invalid email theme '${theme}'`);
            return;
        }
        storage.set(STORAGE_KEYS.EMAIL_THEME, theme);
        this.applyEmailTheme(theme);
        this.notifyListeners('email', theme);
    }

    /**
     * Applies the app theme to the document
     * @param {string} theme - Theme to apply
     */
    applyTheme(theme) {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        const effectiveTheme = this.resolveTheme(theme);
        root.classList.add(effectiveTheme);
        root.dataset.theme = effectiveTheme;
    }

    /**
     * Applies the email content theme
     * @param {string} theme - Email theme to apply
     */
    applyEmailTheme(theme) {
        const root = document.documentElement;
        let effectiveTheme;

        if (theme === EMAIL_THEMES.INHERIT) {
            effectiveTheme = this.getActiveTheme();
        } else {
            effectiveTheme = theme;
        }

        root.dataset.emailTheme = effectiveTheme;
    }

    /**
     * Resolves 'system' theme to actual theme based on user preference
     * @param {string} theme - Theme to resolve
     * @returns {string} 'light' or 'dark'
     */
    resolveTheme(theme) {
        if (theme === THEMES.SYSTEM) {
            return this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
        }
        return theme;
    }

    /**
     * Gets the currently active theme (resolved, not 'system')
     * @returns {string} 'light' or 'dark'
     */
    getActiveTheme() {
        return this.resolveTheme(this.getSavedTheme());
    }

    /**
     * Gets the currently active email theme (resolved, not 'inherit')
     * @returns {string} 'light' or 'dark'
     */
    getActiveEmailTheme() {
        const emailTheme = this.getSavedEmailTheme();
        if (emailTheme === EMAIL_THEMES.INHERIT) {
            return this.getActiveTheme();
        }
        return emailTheme;
    }

    /**
     * Cycles through app themes: light -> dark -> system
     * @returns {string} The new theme
     */
    toggleTheme() {
        const currentTheme = this.getSavedTheme();
        const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setTheme(nextTheme);
        return nextTheme;
    }

    /**
     * Cycles through email themes: inherit -> light -> dark
     * @returns {string} The new email theme
     */
    toggleEmailTheme() {
        const currentTheme = this.getSavedEmailTheme();
        const themes = [EMAIL_THEMES.INHERIT, EMAIL_THEMES.LIGHT, EMAIL_THEMES.DARK];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setEmailTheme(nextTheme);
        return nextTheme;
    }

    /**
     * Adds a listener for theme changes
     * @param {Function} callback - Called with (type: 'app'|'email', theme: string)
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Removes a theme change listener
     * @param {Function} callback - The callback to remove
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notifies all listeners of a theme change
     * @param {string} type - 'app' or 'email'
     * @param {string} theme - The new theme
     */
    notifyListeners(type, theme) {
        this.listeners.forEach(callback => callback(type, theme));
    }

    /**
     * Gets a human-readable label for a theme
     * @param {string} theme - Theme value
     * @returns {string} Localized label
     */
    getThemeLabel(theme) {
        const labels = {
            [THEMES.LIGHT]: 'Light',
            [THEMES.DARK]: 'Dark',
            [THEMES.SYSTEM]: 'System',
            [EMAIL_THEMES.INHERIT]: 'Same as App'
        };
        return labels[theme] || theme;
    }
}

// Export singleton instance
export const themeManager = new ThemeManager();
