import { TOAST_COLORS, TOAST_DURATIONS } from '../constants.js';

/**
 * Manages toast notifications
 * Handles creation, display, and auto-dismissal of toast messages
 */
export class ToastManager {
    constructor() {
        this.container = null;
        this.initEventDelegation();
    }

    /**
     * Initializes event delegation for toast close buttons
     */
    initEventDelegation() {
        document.body.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-action="close-toast"]');
            if (closeButton) {
                const toast = closeButton.closest('.toast');
                if (toast) {
                    toast.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }
            }
        });
    }

    /**
     * Gets or creates the toast container
     * @returns {HTMLElement} The toast container element
     */
    getContainer() {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
        }
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type: 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms
     */
    show(message, type = 'info', duration = TOAST_DURATIONS[type] || 3000) {
        const container = this.getContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
        toast.className += ` ${TOAST_COLORS[type] || TOAST_COLORS.info}`;

        const icons = {
            error: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            warning: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            info: '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="grow">${message}</span>
            <button class="ml-2 hover:opacity-75 focus:outline-none" data-action="close-toast">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        });

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Shows an error toast notification
     * @param {string} message - Error message to display
     * @param {number} [duration=5000] - Duration in ms before auto-dismiss
     */
    error(message, duration = TOAST_DURATIONS.error) {
        this.show(message, 'error', duration);
    }

    /**
     * Shows a warning toast notification
     * @param {string} message - Warning message to display
     * @param {number} [duration=4000] - Duration in ms before auto-dismiss
     */
    warning(message, duration = TOAST_DURATIONS.warning) {
        this.show(message, 'warning', duration);
    }

    /**
     * Shows an info toast notification
     * @param {string} message - Info message to display
     * @param {number} [duration=3000] - Duration in ms before auto-dismiss
     */
    info(message, duration = TOAST_DURATIONS.info) {
        this.show(message, 'info', duration);
    }
}

export default ToastManager;
