# msgReader Architecture

## Overview

msgReader is a single-page application for reading .msg (Outlook) and .eml email files. It runs entirely in the browser with no server-side processing, ensuring privacy. A native desktop app is available via Tauri.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla JavaScript (ES Modules) |
| **Build** | Vite |
| **Styling** | Tailwind CSS v4 |
| **Desktop** | Tauri 2.x (Rust) |
| **Testing** | Jest |
| **Sanitization** | DOMPurify |
| **MSG Parsing** | @kenjiuno/msgreader |

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            App                                   │
│                       (main.js)                                  │
│                     Orchestration                                │
└──────┬──────────────┬─────────────────┬────────────────┬────────┘
       │              │                 │                │
┌──────▼──────┐ ┌─────▼─────┐  ┌────────▼────────┐ ┌─────▼─────┐
│ FileHandler │ │ UIManager │  │ KeyboardManager │ │  Storage  │
│   (Input)   │ │  (Output) │  │    (Input)      │ │(Persist)  │
└──────┬──────┘ └─────┬─────┘  └─────────────────┘ └───────────┘
       │              │
       │        ┌─────┴──────────────────────────────┐
       │        │         UIManager Delegates         │
       │        ├──────────────┬──────────────────────┤
       │        │              │                      │
       │  ┌─────▼──────┐ ┌─────▼──────────┐ ┌────────▼────────┐
       │  │MessageList │ │MessageContent  │ │AttachmentModal  │
       │  │ Renderer   │ │  Renderer      │ │   Manager       │
       │  └────────────┘ └───────┬────────┘ └─────────────────┘
       │                         │
       │                   ┌─────▼─────┐
       │                   │ Sanitizer │
       │                   │(DOMPurify)│
       │                   └───────────┘
       │
┌──────▼──────┐
│   Parser    │
│ (MSG/EML)   │
└──────┬──────┘
       │
┌──────▼──────────┐
│ MessageHandler  │
│  (State/Store)  │
└─────────────────┘
```

## Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| **App** | Application entry point, orchestrates all components |
| **MessageHandler** | State management for messages, pinning, sorting |
| **UIManager** | Coordinates UI rendering through sub-managers |
| **FileHandler** | File input via drag-drop, file picker, and Tauri file associations |
| **KeyboardManager** | Keyboard shortcuts and accessibility |
| **Storage** | localStorage abstraction with error handling |
| **Sanitizer** | XSS protection via DOMPurify |

## Data Flow

1. **File Input**: User drops file or selects via file picker
2. **FileHandler**: Reads file as ArrayBuffer
3. **Parser**: `extractMsg()` or `extractEml()` parses the email
4. **MessageHandler**: `addMessage()` stores with hash and timestamp
5. **UIManager**: Triggers re-render of message list and content
6. **MessageContentRenderer**: Sanitizes HTML via DOMPurify before DOM insertion
7. **Storage**: Pinned messages persisted to localStorage

```
User Action → FileHandler → Parser → MessageHandler → UIManager → Sanitizer → DOM
                                           ↓
                                       Storage
```

## Desktop Integration (Tauri)

The `tauri-bridge.js` module provides:

- **File associations**: Double-click .msg/.eml files to open
- **Native drag & drop**: System-level file drop handling
- **Auto-updates**: Checks for and prompts about new versions
- **Pending files**: Files passed on app startup

When running in Tauri, the web file APIs are augmented with native filesystem access for better performance and UX.

## Security Model

1. **No network requests**: All processing happens locally
2. **HTML Sanitization**: All email HTML is sanitized via DOMPurify before rendering
3. **URL Sanitization**: Only http://, https://, mailto:, and data:image/ URLs are allowed
4. **CSP**: Content Security Policy headers in production
5. **Forbidden elements**: script, iframe, form, input, etc. are stripped

## Directory Structure

```
src/
├── js/
│   ├── main.js              # App entry point
│   ├── MessageHandler.js    # Message state management
│   ├── FileHandler.js       # File input handling
│   ├── KeyboardManager.js   # Keyboard shortcuts
│   ├── KeyboardShortcuts.js # Shortcut configuration
│   ├── storage.js           # localStorage abstraction
│   ├── sanitizer.js         # XSS protection
│   ├── utils.js             # MSG/EML parsing utilities
│   ├── cidReplacer.js       # CID URL replacement for inline images
│   ├── tauri-bridge.js      # Tauri API integration
│   ├── constants.js         # App constants
│   ├── icons.js             # SVG icon definitions
│   ├── helpers.js           # Helper functions
│   ├── errorHandler.js      # Error handling utilities
│   └── ui/
│       ├── UIManager.js         # Main UI coordinator
│       ├── MessageListRenderer.js    # Message sidebar
│       ├── MessageContentRenderer.js # Email content display
│       ├── AttachmentModalManager.js # Attachment preview modal
│       ├── ToastManager.js          # Toast notifications
│       ├── VirtualList.js           # Virtual scrolling for large lists
│       └── index.js                 # UI module exports
├── styles.css               # Tailwind CSS entry point
src-tauri/
├── src/
│   └── main.rs              # Rust backend for Tauri
├── Cargo.toml               # Rust dependencies
└── tauri.conf.json          # Tauri configuration
```
