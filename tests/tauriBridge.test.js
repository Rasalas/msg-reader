jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }));
jest.mock('@tauri-apps/api/event', () => ({ listen: jest.fn() }));

import { invoke } from '@tauri-apps/api/core';
import {
    isCurrentVersionAtLeastUpdate,
    parseReleaseVersion,
    printWebview
} from '../src/js/tauri-bridge.js';

describe('tauri-bridge printing', () => {
    const platform = Object.getOwnPropertyDescriptor(window.navigator, 'platform');
    const originalPrint = window.print;

    beforeEach(() => {
        window.print = jest.fn();
        invoke.mockReset();
        const pageMargins = document.createElement('style');
        pageMargins.id = 'printPageMargins';
        pageMargins.textContent = '@media print { @page { margin: 15mm; } }';
        document.head.appendChild(pageMargins);
        pageMargins.sheet.disabled = false;
        Object.defineProperty(window.navigator, 'platform', {
            configurable: true,
            value: 'MacIntel'
        });
    });

    afterEach(() => {
        delete window.__TAURI_INTERNALS__;
        window.print = originalPrint;
        document.getElementById('printPageMargins')?.remove();
        if (platform) {
            Object.defineProperty(window.navigator, 'platform', platform);
        } else {
            delete window.navigator.platform;
        }
    });

    test('web printing keeps CSS page margins and uses the browser dialog', async () => {
        await printWebview();

        expect(window.print).toHaveBeenCalledTimes(1);
        expect(invoke).not.toHaveBeenCalled();
        expect(document.getElementById('printPageMargins').sheet.disabled).toBe(false);
    });

    test('macOS removes CSS margins before requesting native pagination', async () => {
        window.__TAURI_INTERNALS__ = {};
        invoke.mockImplementation(() => {
            expect(document.getElementById('printPageMargins').sheet.disabled).toBe(true);
            return Promise.resolve();
        });

        await printWebview();
        await printWebview();

        expect(invoke).toHaveBeenCalledWith('print_message');
        expect(window.print).not.toHaveBeenCalled();
        // The native sheet opens asynchronously and still needs CSS margins disabled.
        expect(document.getElementById('printPageMargins').sheet.disabled).toBe(true);
    });

    test('restores CSS page margins when native printing cannot start', async () => {
        window.__TAURI_INTERNALS__ = {};
        invoke.mockRejectedValue(new Error('Print panel unavailable'));

        await expect(printWebview()).rejects.toThrow('Print panel unavailable');

        expect(document.getElementById('printPageMargins').sheet.disabled).toBe(false);
    });

    test('other desktop platforms retain their existing print implementation', async () => {
        window.__TAURI_INTERNALS__ = {};
        Object.defineProperty(window.navigator, 'platform', { value: 'Win32' });

        await printWebview();

        expect(window.print).toHaveBeenCalledTimes(1);
        expect(invoke).not.toHaveBeenCalled();
    });
});

describe('tauri-bridge version helpers', () => {
    test('parses release and git-describe versions', () => {
        expect(parseReleaseVersion('1.8.0')).toEqual({ major: 1, minor: 8, patch: 0 });
        expect(parseReleaseVersion('v1.8.0')).toEqual({ major: 1, minor: 8, patch: 0 });
        expect(parseReleaseVersion('v1.8.0-4-g5e7b327b')).toEqual({
            major: 1,
            minor: 8,
            patch: 0
        });
    });

    test('treats git-describe builds at the offered release as current', () => {
        expect(isCurrentVersionAtLeastUpdate('v1.8.0-4-g5e7b327b', '1.8.0')).toBe(true);
        expect(isCurrentVersionAtLeastUpdate('v1.8.1-1-g5e7b327b', '1.8.0')).toBe(true);
        expect(isCurrentVersionAtLeastUpdate('v1.7.9-4-g5e7b327b', '1.8.0')).toBe(false);
    });

    test('falls back to showing updates for unparseable versions', () => {
        expect(isCurrentVersionAtLeastUpdate('dev', '1.8.0')).toBe(false);
        expect(isCurrentVersionAtLeastUpdate('v1.8.0-rc.1', '1.8.0')).toBe(false);
    });
});
