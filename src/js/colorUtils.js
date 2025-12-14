/**
 * Color utility functions for contrast checking and adjustment
 * Based on WCAG 2.1 guidelines for accessibility
 */

/**
 * Common named colors that might cause contrast issues
 */
const NAMED_COLORS = {
    'blue': { r: 0, g: 0, b: 255 },
    'darkblue': { r: 0, g: 0, b: 139 },
    'navy': { r: 0, g: 0, b: 128 },
    'midnightblue': { r: 25, g: 25, b: 112 },
    'darkgreen': { r: 0, g: 100, b: 0 },
    'darkred': { r: 139, g: 0, b: 0 },
    'maroon': { r: 128, g: 0, b: 0 },
    'purple': { r: 128, g: 0, b: 128 },
    'indigo': { r: 75, g: 0, b: 130 },
    'black': { r: 0, g: 0, b: 0 },
    'dimgray': { r: 105, g: 105, b: 105 },
    'gray': { r: 128, g: 128, b: 128 }
};

/**
 * Parses a CSS color string to RGB values
 * @param {string} colorStr - CSS color string (hex, rgb, named)
 * @returns {Object|null} RGB object { r, g, b } or null if unparseable
 */
export function parseColor(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') return null;

    // Handle rgb/rgba
    const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbMatch) {
        return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
    }

    // Handle hex colors
    const hexMatch = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
        return { r: parseInt(hexMatch[1], 16), g: parseInt(hexMatch[2], 16), b: parseInt(hexMatch[3], 16) };
    }

    // Handle short hex
    const shortHexMatch = colorStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
    if (shortHexMatch) {
        return {
            r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
            g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
            b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16)
        };
    }

    // Check named colors
    const lowerColor = colorStr.toLowerCase().trim();
    return NAMED_COLORS[lowerColor] || null;
}

/**
 * Calculates relative luminance of a color (WCAG formula)
 * @param {Object} color - RGB color object { r, g, b }
 * @returns {number} Relative luminance (0-1)
 */
export function getLuminance(color) {
    const [rs, gs, bs] = [color.r / 255, color.g / 255, color.b / 255];
    const [r, g, b] = [rs, gs, bs].map(c =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates contrast ratio between two colors (WCAG formula)
 * @param {Object} color1 - First RGB color { r, g, b }
 * @param {Object} color2 - Second RGB color { r, g, b }
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Adjusts a color to have better contrast against a background
 * @param {Object} color - Original RGB color { r, g, b }
 * @param {Object} bgColor - Background RGB color { r, g, b }
 * @returns {string} Adjusted color as CSS rgb string
 */
export function adjustColorForContrast(color, bgColor) {
    const bgLuminance = getLuminance(bgColor);

    // For dark backgrounds, lighten the color
    if (bgLuminance < 0.5) {
        // Increase brightness while preserving hue
        const factor = 2.5;
        const r = Math.min(255, Math.max(100, color.r * factor));
        const g = Math.min(255, Math.max(100, color.g * factor));
        const b = Math.min(255, Math.max(100, color.b * factor));
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    // For light backgrounds, return original (shouldn't happen often in this context)
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Checks if a color meets minimum contrast requirements against a background
 * @param {Object} color - RGB color to check { r, g, b }
 * @param {Object} bgColor - Background RGB color { r, g, b }
 * @param {number} minRatio - Minimum contrast ratio (default: 3 for large text, 4.5 for normal)
 * @returns {boolean} True if contrast is sufficient
 */
export function meetsContrastRequirement(color, bgColor, minRatio = 3) {
    return getContrastRatio(color, bgColor) >= minRatio;
}
