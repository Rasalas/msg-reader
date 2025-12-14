/**
 * Tests for colorUtils.js
 */
import {
    parseColor,
    getLuminance,
    getContrastRatio,
    adjustColorForContrast,
    meetsContrastRequirement
} from '../src/js/colorUtils.js';

describe('colorUtils', () => {
    describe('parseColor', () => {
        test('returns null for invalid inputs', () => {
            expect(parseColor(null)).toBeNull();
            expect(parseColor('')).toBeNull();
            expect(parseColor('transparent')).toBeNull();
            expect(parseColor('inherit')).toBeNull();
        });

        test('parses rgb colors', () => {
            expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });
            expect(parseColor('rgb(0, 128, 255)')).toEqual({ r: 0, g: 128, b: 255 });
        });

        test('parses rgba colors (ignores alpha)', () => {
            expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0 });
        });

        test('parses hex colors', () => {
            expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
            expect(parseColor('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
            expect(parseColor('0000ff')).toEqual({ r: 0, g: 0, b: 255 });
        });

        test('parses short hex colors', () => {
            expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
            expect(parseColor('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
            expect(parseColor('00f')).toEqual({ r: 0, g: 0, b: 255 });
        });

        test('parses named colors', () => {
            expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 255 });
            expect(parseColor('navy')).toEqual({ r: 0, g: 0, b: 128 });
            expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
            expect(parseColor('BLUE')).toEqual({ r: 0, g: 0, b: 255 }); // case insensitive
        });

        test('returns null for unknown named colors', () => {
            expect(parseColor('unknowncolor')).toBeNull();
        });
    });

    describe('getLuminance', () => {
        test('returns 0 for black', () => {
            expect(getLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
        });

        test('returns 1 for white', () => {
            expect(getLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
        });

        test('returns correct luminance for gray', () => {
            const lum = getLuminance({ r: 128, g: 128, b: 128 });
            expect(lum).toBeGreaterThan(0);
            expect(lum).toBeLessThan(1);
        });

        test('green contributes most to luminance', () => {
            const redLum = getLuminance({ r: 255, g: 0, b: 0 });
            const greenLum = getLuminance({ r: 0, g: 255, b: 0 });
            const blueLum = getLuminance({ r: 0, g: 0, b: 255 });
            expect(greenLum).toBeGreaterThan(redLum);
            expect(greenLum).toBeGreaterThan(blueLum);
        });
    });

    describe('getContrastRatio', () => {
        test('returns 21:1 for black and white', () => {
            const black = { r: 0, g: 0, b: 0 };
            const white = { r: 255, g: 255, b: 255 };
            expect(getContrastRatio(black, white)).toBe(21);
        });

        test('returns 1:1 for same color', () => {
            const red = { r: 255, g: 0, b: 0 };
            expect(getContrastRatio(red, red)).toBe(1);
        });

        test('is symmetric', () => {
            const color1 = { r: 100, g: 50, b: 200 };
            const color2 = { r: 200, g: 100, b: 50 };
            expect(getContrastRatio(color1, color2)).toBe(getContrastRatio(color2, color1));
        });

        test('dark blue on dark gray has low contrast', () => {
            const darkBlue = { r: 0, g: 0, b: 139 };
            const darkGray = { r: 30, g: 41, b: 59 };
            const contrast = getContrastRatio(darkBlue, darkGray);
            expect(contrast).toBeLessThan(3);
        });
    });

    describe('adjustColorForContrast', () => {
        test('lightens colors on dark backgrounds', () => {
            const darkBg = { r: 30, g: 41, b: 59 };
            const darkBlue = { r: 0, g: 0, b: 139 };
            const adjusted = adjustColorForContrast(darkBlue, darkBg);
            expect(adjusted).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
            // Parse and check it's lighter
            const match = adjusted.match(/rgb\((\d+), (\d+), (\d+)\)/);
            const newR = parseInt(match[1]);
            const newG = parseInt(match[2]);
            const newB = parseInt(match[3]);
            expect(newB).toBeGreaterThan(darkBlue.b);
        });

        test('returns original color on light backgrounds', () => {
            const lightBg = { r: 255, g: 255, b: 255 };
            const color = { r: 100, g: 100, b: 100 };
            const adjusted = adjustColorForContrast(color, lightBg);
            expect(adjusted).toBe('rgb(100, 100, 100)');
        });
    });

    describe('meetsContrastRequirement', () => {
        test('black on white meets all requirements', () => {
            const black = { r: 0, g: 0, b: 0 };
            const white = { r: 255, g: 255, b: 255 };
            expect(meetsContrastRequirement(black, white, 3)).toBe(true);
            expect(meetsContrastRequirement(black, white, 4.5)).toBe(true);
            expect(meetsContrastRequirement(black, white, 7)).toBe(true);
        });

        test('similar colors fail requirements', () => {
            const gray1 = { r: 100, g: 100, b: 100 };
            const gray2 = { r: 120, g: 120, b: 120 };
            expect(meetsContrastRequirement(gray1, gray2, 3)).toBe(false);
        });

        test('uses default minimum ratio of 3', () => {
            const black = { r: 0, g: 0, b: 0 };
            const white = { r: 255, g: 255, b: 255 };
            expect(meetsContrastRequirement(black, white)).toBe(true);
        });
    });
});
