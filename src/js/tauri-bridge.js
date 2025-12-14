/**
 * Tauri Bridge Module
 * Handles communication between Tauri backend and frontend
 * This module is designed to work in both browser and Tauri environments.
 */

/**
 * Check if running in Tauri environment
 * @returns {boolean} True if running in Tauri
 */
export function isTauri() {
    return (
        typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined
    );
}

// Lazy-loaded Tauri APIs to avoid errors in browser context
let tauriApis = null;

/**
 * Get Tauri APIs (lazy loaded)
 * @returns {Promise<{invoke: Function, listen: Function}|null>}
 */
async function getTauriApis() {
    if (!isTauri()) return null;
    if (tauriApis) return tauriApis;

    const [{ invoke }, { listen }] = await Promise.all([
        import('@tauri-apps/api/core'),
        import('@tauri-apps/api/event'),
    ]);

    tauriApis = { invoke, listen };
    return tauriApis;
}

/**
 * Read a file from the filesystem using Tauri
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<ArrayBuffer>} File contents as ArrayBuffer
 */
export async function readFileFromPath(filePath) {
    const apis = await getTauriApis();
    if (!apis) {
        throw new Error('Tauri API not available');
    }

    // Call Rust command to read file bytes
    const bytes = await apis.invoke('read_file_as_bytes', { path: filePath });
    // Convert array to ArrayBuffer
    return new Uint8Array(bytes).buffer;
}

/**
 * Get files that were passed to app on startup
 * @returns {Promise<string[]>} Array of file paths
 */
export async function getPendingFiles() {
    const apis = await getTauriApis();
    if (!apis) return [];

    return await apis.invoke('get_pending_files');
}

/**
 * Listen for file open events from Tauri
 * @param {function(string): void} callback - Called with file path
 * @returns {Promise<function(): void>} Unlisten function
 */
export async function onFileOpen(callback) {
    const apis = await getTauriApis();
    if (!apis) return () => {};

    return await apis.listen('file-open', (event) => {
        if (event.payload) {
            callback(event.payload);
        }
    });
}

/**
 * Extract filename from a file path
 * @param {string} filePath - Full file path
 * @returns {string} Just the filename
 */
export function getFileName(filePath) {
    // Handle both Windows and Unix paths
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1];
}

/**
 * Open a file with the system's default application (Tauri only)
 * Saves the file to a temp location and opens it
 * @param {string} base64Data - Base64 data URL (data:mime/type;base64,...)
 * @param {string} fileName - Original filename
 * @returns {Promise<void>}
 */
export async function openWithSystemViewer(base64Data, fileName) {
    if (!isTauri()) {
        throw new Error('openWithSystemViewer is only available in Tauri');
    }

    const { invoke } = await import('@tauri-apps/api/core');

    // Extract the base64 content (remove data:mime/type;base64, prefix)
    const base64Content = base64Data.split(',')[1];

    // Call Rust command to save and open the file
    await invoke('open_file_with_system', {
        base64Content,
        fileName,
    });
}

/**
 * Check for app updates and prompt user to install
 * @returns {Promise<void>}
 */
export async function checkForUpdates() {
    if (!isTauri()) return;

    try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const { ask } = await import('@tauri-apps/plugin-dialog');

        const update = await check();

        if (update) {
            const yes = await ask(
                `Version ${update.version} is available!\n\nWould you like to update now?`,
                {
                    title: 'Update available',
                    kind: 'info',
                    okLabel: 'Update',
                    cancelLabel: 'Later',
                }
            );

            if (yes) {
                await update.downloadAndInstall();
                // Restart the app after update
                const { relaunch } = await import('@tauri-apps/plugin-process');
                await relaunch();
            }
        }
    } catch (error) {
        console.error('Update check failed:', error);
    }
}

/**
 * Listen for file drop events from Tauri (drag & drop)
 * @param {Object} callbacks - Callback functions for drag events
 * @param {function(string[]): void} callbacks.onDrop - Called with array of file paths when dropped
 * @param {function(): void} [callbacks.onEnter] - Called when drag enters the window
 * @param {function(): void} [callbacks.onLeave] - Called when drag leaves the window
 * @returns {Promise<function(): void>} Unlisten function
 */
export async function onFileDrop(callbacks) {
    if (!isTauri()) return () => {};

    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const webview = getCurrentWebviewWindow();

    return await webview.onDragDropEvent((event) => {
        switch (event.payload.type) {
            case 'enter':
            case 'over':
                if (callbacks.onEnter) {
                    callbacks.onEnter();
                }
                break;
            case 'leave':
                if (callbacks.onLeave) {
                    callbacks.onLeave();
                }
                break;
            case 'drop': {
                if (callbacks.onLeave) {
                    callbacks.onLeave(); // Hide overlay on drop
                }
                const paths = event.payload.paths;
                if (paths && paths.length > 0 && callbacks.onDrop) {
                    callbacks.onDrop(paths);
                }
                break;
            }
        }
    });
}
