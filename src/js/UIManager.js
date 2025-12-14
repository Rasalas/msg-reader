/**
 * UIManager - Facade for UI components
 *
 * This module has been refactored into smaller, focused components:
 * - ToastManager: Toast notifications
 * - AttachmentModalManager: Attachment preview modal
 * - MessageListRenderer: Message list sidebar
 * - MessageContentRenderer: Message content display
 *
 * This file re-exports the UIManager facade for backward compatibility.
 * See src/js/ui/ for the individual modules.
 */

export { default } from './ui/UIManager.js';
