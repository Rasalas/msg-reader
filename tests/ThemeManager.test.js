/**
 * Tests for ThemeManager.js
 */
import { ThemeManager, THEMES, EMAIL_THEMES } from '../src/js/ThemeManager.js';

describe('ThemeManager', () => {
    let themeManager;
    let mockMediaQuery;

    beforeEach(() => {
        // Mock matchMedia
        mockMediaQuery = {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        window.matchMedia = jest.fn(() => mockMediaQuery);

        // Mock document.documentElement
        document.documentElement.classList.remove('light', 'dark');
        delete document.documentElement.dataset.theme;
        delete document.documentElement.dataset.emailTheme;

        themeManager = new ThemeManager();
    });

    describe('THEMES constants', () => {
        test('has correct theme values', () => {
            expect(THEMES.LIGHT).toBe('light');
            expect(THEMES.DARK).toBe('dark');
            expect(THEMES.SYSTEM).toBe('system');
        });
    });

    describe('EMAIL_THEMES constants', () => {
        test('has correct email theme values', () => {
            expect(EMAIL_THEMES.LIGHT).toBe('light');
            expect(EMAIL_THEMES.DARK).toBe('dark');
            expect(EMAIL_THEMES.INHERIT).toBe('inherit');
        });
    });

    describe('getSavedTheme', () => {
        test('returns system as default when no theme saved', () => {
            expect(themeManager.getSavedTheme()).toBe(THEMES.SYSTEM);
        });

        test('returns saved theme from storage', () => {
            localStorage.setItem('msgReader_theme', JSON.stringify(THEMES.DARK));
            expect(themeManager.getSavedTheme()).toBe(THEMES.DARK);
        });
    });

    describe('getSavedEmailTheme', () => {
        test('returns inherit as default when no email theme saved', () => {
            expect(themeManager.getSavedEmailTheme()).toBe(EMAIL_THEMES.INHERIT);
        });

        test('returns saved email theme from storage', () => {
            localStorage.setItem('msgReader_emailTheme', JSON.stringify(EMAIL_THEMES.DARK));
            expect(themeManager.getSavedEmailTheme()).toBe(EMAIL_THEMES.DARK);
        });
    });

    describe('setTheme', () => {
        test('saves theme to storage', () => {
            themeManager.setTheme(THEMES.DARK);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'msgReader_theme',
                JSON.stringify(THEMES.DARK)
            );
        });

        test('applies theme to document', () => {
            themeManager.setTheme(THEMES.DARK);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.dataset.theme).toBe('dark');
        });

        test('ignores invalid theme values', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            themeManager.setTheme('invalid');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('notifies listeners on theme change', () => {
            const listener = jest.fn();
            themeManager.addListener(listener);
            themeManager.setTheme(THEMES.DARK);
            expect(listener).toHaveBeenCalledWith('app', THEMES.DARK);
        });
    });

    describe('setEmailTheme', () => {
        test('saves email theme to storage', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.DARK);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'msgReader_emailTheme',
                JSON.stringify(EMAIL_THEMES.DARK)
            );
        });

        test('applies email theme to document', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.DARK);
            expect(document.documentElement.dataset.emailTheme).toBe('dark');
        });

        test('ignores invalid email theme values', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            themeManager.setEmailTheme('invalid');
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('notifies listeners on email theme change', () => {
            const listener = jest.fn();
            themeManager.addListener(listener);
            themeManager.setEmailTheme(EMAIL_THEMES.DARK);
            expect(listener).toHaveBeenCalledWith('email', EMAIL_THEMES.DARK);
        });
    });

    describe('applyTheme', () => {
        test('adds light class for light theme', () => {
            themeManager.applyTheme(THEMES.LIGHT);
            expect(document.documentElement.classList.contains('light')).toBe(true);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        test('adds dark class for dark theme', () => {
            themeManager.applyTheme(THEMES.DARK);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(document.documentElement.classList.contains('light')).toBe(false);
        });

        test('resolves system theme to light when system prefers light', () => {
            mockMediaQuery.matches = false;
            themeManager.applyTheme(THEMES.SYSTEM);
            expect(document.documentElement.classList.contains('light')).toBe(true);
        });

        test('resolves system theme to dark when system prefers dark', () => {
            mockMediaQuery.matches = true;
            themeManager.applyTheme(THEMES.SYSTEM);
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('applyEmailTheme', () => {
        test('applies light email theme', () => {
            themeManager.applyEmailTheme(EMAIL_THEMES.LIGHT);
            expect(document.documentElement.dataset.emailTheme).toBe('light');
        });

        test('applies dark email theme', () => {
            themeManager.applyEmailTheme(EMAIL_THEMES.DARK);
            expect(document.documentElement.dataset.emailTheme).toBe('dark');
        });

        test('inherits from app theme when set to inherit', () => {
            // Set app to dark first (use setTheme to persist)
            themeManager.setTheme(THEMES.DARK);
            themeManager.applyEmailTheme(EMAIL_THEMES.INHERIT);
            expect(document.documentElement.dataset.emailTheme).toBe('dark');
        });
    });

    describe('resolveTheme', () => {
        test('returns light for light theme', () => {
            expect(themeManager.resolveTheme(THEMES.LIGHT)).toBe('light');
        });

        test('returns dark for dark theme', () => {
            expect(themeManager.resolveTheme(THEMES.DARK)).toBe('dark');
        });

        test('returns light for system theme when system prefers light', () => {
            mockMediaQuery.matches = false;
            expect(themeManager.resolveTheme(THEMES.SYSTEM)).toBe('light');
        });

        test('returns dark for system theme when system prefers dark', () => {
            mockMediaQuery.matches = true;
            expect(themeManager.resolveTheme(THEMES.SYSTEM)).toBe('dark');
        });
    });

    describe('getActiveTheme', () => {
        test('returns resolved theme based on saved preference', () => {
            themeManager.setTheme(THEMES.DARK);
            expect(themeManager.getActiveTheme()).toBe('dark');
        });

        test('returns resolved system theme', () => {
            mockMediaQuery.matches = true;
            themeManager.setTheme(THEMES.SYSTEM);
            expect(themeManager.getActiveTheme()).toBe('dark');
        });
    });

    describe('getActiveEmailTheme', () => {
        test('returns saved email theme when not inherit', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.LIGHT);
            expect(themeManager.getActiveEmailTheme()).toBe('light');
        });

        test('returns app theme when email theme is inherit', () => {
            themeManager.setTheme(THEMES.DARK);
            themeManager.setEmailTheme(EMAIL_THEMES.INHERIT);
            expect(themeManager.getActiveEmailTheme()).toBe('dark');
        });
    });

    describe('toggleTheme', () => {
        test('cycles from system to light', () => {
            themeManager.setTheme(THEMES.SYSTEM);
            const result = themeManager.toggleTheme();
            expect(result).toBe(THEMES.LIGHT);
        });

        test('cycles from light to dark', () => {
            themeManager.setTheme(THEMES.LIGHT);
            const result = themeManager.toggleTheme();
            expect(result).toBe(THEMES.DARK);
        });

        test('cycles from dark to system', () => {
            themeManager.setTheme(THEMES.DARK);
            const result = themeManager.toggleTheme();
            expect(result).toBe(THEMES.SYSTEM);
        });
    });

    describe('toggleEmailTheme', () => {
        test('cycles from inherit to light', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.INHERIT);
            const result = themeManager.toggleEmailTheme();
            expect(result).toBe(EMAIL_THEMES.LIGHT);
        });

        test('cycles from light to dark', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.LIGHT);
            const result = themeManager.toggleEmailTheme();
            expect(result).toBe(EMAIL_THEMES.DARK);
        });

        test('cycles from dark to inherit', () => {
            themeManager.setEmailTheme(EMAIL_THEMES.DARK);
            const result = themeManager.toggleEmailTheme();
            expect(result).toBe(EMAIL_THEMES.INHERIT);
        });
    });

    describe('listeners', () => {
        test('addListener adds a listener', () => {
            const listener = jest.fn();
            themeManager.addListener(listener);
            themeManager.setTheme(THEMES.DARK);
            expect(listener).toHaveBeenCalled();
        });

        test('removeListener removes a listener', () => {
            const listener = jest.fn();
            themeManager.addListener(listener);
            themeManager.removeListener(listener);
            themeManager.setTheme(THEMES.DARK);
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('getThemeLabel', () => {
        test('returns correct labels for themes', () => {
            expect(themeManager.getThemeLabel(THEMES.LIGHT)).toBe('Light');
            expect(themeManager.getThemeLabel(THEMES.DARK)).toBe('Dark');
            expect(themeManager.getThemeLabel(THEMES.SYSTEM)).toBe('System');
            expect(themeManager.getThemeLabel(EMAIL_THEMES.INHERIT)).toBe('Same as App');
        });

        test('returns theme value for unknown themes', () => {
            expect(themeManager.getThemeLabel('unknown')).toBe('unknown');
        });
    });

    describe('init', () => {
        test('applies saved theme on init', () => {
            localStorage.setItem('msgReader_theme', JSON.stringify(THEMES.DARK));
            themeManager.init();
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        test('applies saved email theme on init', () => {
            localStorage.setItem('msgReader_emailTheme', JSON.stringify(EMAIL_THEMES.LIGHT));
            themeManager.init();
            expect(document.documentElement.dataset.emailTheme).toBe('light');
        });

        test('sets up system theme listener', () => {
            themeManager.init();
            expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith(
                'change',
                expect.any(Function)
            );
        });
    });
});
