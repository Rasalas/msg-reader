/**
 * Keyboard shortcut definitions and help modal data
 * Centralized configuration for all keyboard shortcuts
 */

/**
 * Keyboard contexts determine which shortcuts are active
 */
export const KEYBOARD_CONTEXTS = {
    MAIN: 'main',
    MODAL: 'modal',
    INPUT: 'input'
};

/**
 * Shortcut definitions organized by category
 * Each shortcut contains:
 * - keys: array of trigger keys (can include modifiers like Ctrl, Cmd, Shift)
 * - action: string identifier for the action
 * - contexts: array of contexts where shortcut is active
 * - description: human-readable description for help modal
 */
export const SHORTCUTS = {
    navigation: [
        {
            keys: ['j', 'ArrowDown'],
            action: 'nextMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Next message'
        },
        {
            keys: ['k', 'ArrowUp'],
            action: 'prevMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Previous message'
        },
        {
            keys: ['Enter', 'o'],
            action: 'openMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Open message'
        },
        {
            keys: ['Home'],
            action: 'firstMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'First message'
        },
        {
            keys: ['End'],
            action: 'lastMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Last message'
        },
        {
            keys: ['PageDown', ' '],
            action: 'pageDown',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Page down (5 messages)'
        },
        {
            keys: ['PageUp'],
            action: 'pageUp',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Page up (5 messages)'
        }
    ],
    actions: [
        {
            keys: ['s'],
            action: 'togglePin',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Pin/unpin message'
        },
        {
            keys: ['Delete', 'Backspace'],
            action: 'deleteMessage',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Delete message'
        },
        {
            keys: ['Ctrl+o', 'Meta+o'],
            action: 'openFilePicker',
            contexts: [KEYBOARD_CONTEXTS.MAIN],
            description: 'Open file picker'
        }
    ],
    modal: [
        {
            keys: ['Escape'],
            action: 'closeModal',
            contexts: [KEYBOARD_CONTEXTS.MAIN, KEYBOARD_CONTEXTS.MODAL],
            description: 'Close modal'
        },
        {
            keys: ['ArrowLeft'],
            action: 'prevAttachment',
            contexts: [KEYBOARD_CONTEXTS.MODAL],
            description: 'Previous attachment'
        },
        {
            keys: ['ArrowRight'],
            action: 'nextAttachment',
            contexts: [KEYBOARD_CONTEXTS.MODAL],
            description: 'Next attachment'
        }
    ],
    help: [
        {
            keys: ['?'],
            action: 'showHelp',
            contexts: [KEYBOARD_CONTEXTS.MAIN, KEYBOARD_CONTEXTS.MODAL],
            description: 'Show keyboard shortcuts'
        }
    ]
};

/**
 * Help modal content structure
 * Groups shortcuts for display in the help modal
 */
export const HELP_MODAL_SECTIONS = [
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['j', '\u2193'], description: 'Next message' },
            { keys: ['k', '\u2191'], description: 'Previous message' },
            { keys: ['Enter', 'o'], description: 'Open message' },
            { keys: ['Home'], description: 'First message' },
            { keys: ['End'], description: 'Last message' },
            { keys: ['PageDown', 'Space'], description: 'Page down (5 messages)' },
            { keys: ['PageUp'], description: 'Page up (5 messages)' }
        ]
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: ['s'], description: 'Pin/unpin message' },
            { keys: ['Delete'], description: 'Delete message' },
            { keys: ['Ctrl/\u2318+O'], description: 'Open file picker' }
        ]
    },
    {
        title: 'Modal',
        shortcuts: [
            { keys: ['Esc'], description: 'Close modal' },
            { keys: ['\u2190', '\u2192'], description: 'Previous/next attachment' }
        ]
    },
    {
        title: 'Help',
        shortcuts: [
            { keys: ['?'], description: 'Show this help' }
        ]
    }
];

/**
 * Keys that should not trigger shortcuts when pressed
 * (typically function keys and system keys)
 */
export const IGNORED_KEYS = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Tab', 'CapsLock', 'Shift', 'Control', 'Alt', 'Meta'
];

/**
 * Modifier key names for cross-platform handling
 */
export const MODIFIERS = {
    ctrl: 'Ctrl',
    meta: 'Meta', // Cmd on Mac
    shift: 'Shift',
    alt: 'Alt'
};
