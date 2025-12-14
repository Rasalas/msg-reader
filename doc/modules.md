# Module Documentation

This document describes the main modules in msgReader and their APIs.

---

## MessageHandler

**Path**: `src/js/MessageHandler.js`

**Responsibility**: State management for email messages. Handles adding, deleting, sorting, pinning, and tracking the current message.

### Constructor

```javascript
new MessageHandler(storageInstance?)
```

- `storageInstance` - Optional Storage instance for dependency injection (testing)

### API

| Method | Description |
|--------|-------------|
| `addMessage(msgInfo, fileName)` | Add a parsed message. Returns message with hash and timestamp. |
| `deleteMessage(index)` | Delete message at index. Returns next message or null. |
| `togglePin(index)` | Toggle pin status. Returns the message. |
| `isPinned(msgInfo)` | Check if message is pinned. |
| `setCurrentMessage(message)` | Set the currently displayed message. |
| `getCurrentMessage()` | Get the currently displayed message. |
| `getMessages()` | Get all loaded messages (sorted by date). |
| `sortMessages()` | Re-sort messages by timestamp (descending). |

### Persistence

Pinned message hashes are stored in localStorage under `pinnedMessages`.

---

## UIManager

**Path**: `src/js/ui/UIManager.js`

**Responsibility**: Coordinates UI rendering by delegating to specialized sub-managers.

### Constructor

```javascript
new UIManager(messageHandler)
```

### Sub-Managers

| Manager | Responsibility |
|---------|----------------|
| `MessageListRenderer` | Renders the message sidebar list |
| `MessageContentRenderer` | Renders email content (headers, body, attachments) |
| `AttachmentModalManager` | Handles attachment preview modal |
| `ToastManager` | Toast notifications |

### API

| Method | Description |
|--------|-------------|
| `showWelcomeScreen()` | Show the welcome/drop screen |
| `showAppContainer()` | Show the main app interface |
| `updateMessageList()` | Re-render the message list |
| `showMessage(msgInfo)` | Display a message in the viewer |
| `showDropOverlay()` | Show drag-drop overlay |
| `hideDropOverlay()` | Hide drag-drop overlay |
| `showToast(message, type, duration)` | Show toast notification |
| `showError(message, duration?)` | Show error toast |
| `showWarning(message, duration?)` | Show warning toast |
| `showInfo(message, duration?)` | Show info toast |
| `openAttachmentModal(attachment)` | Open attachment preview |
| `closeAttachmentModal()` | Close attachment preview |
| `setKeyboardManager(manager)` | Connect keyboard manager for context switching |

---

## FileHandler

**Path**: `src/js/FileHandler.js`

**Responsibility**: Handles file input from drag-drop, file picker, and Tauri file associations.

### Constructor

```javascript
new FileHandler(messageHandler, uiManager, parsers)
```

- `parsers.extractMsg` - MSG file parser function
- `parsers.extractEml` - EML file parser function

### API

| Method | Description |
|--------|-------------|
| `handleFiles(FileList)` | Process multiple files from input |
| `handleFile(File)` | Process a single file |
| `handleFileFromPath(filePath)` | Process file from path (Tauri only) |

### Events

Automatically sets up listeners for:
- `dragover`, `dragleave`, `drop` on document
- `change` on `#fileInput` and `#fileInputInApp`

---

## KeyboardManager

**Path**: `src/js/KeyboardManager.js`

**Responsibility**: Centralized keyboard event handling with context awareness.

### Constructor

```javascript
new KeyboardManager(app)
```

### API

| Method | Description |
|--------|-------------|
| `setContext(context)` | Set keyboard context (MAIN, MODAL) |
| `announce(message)` | Announce message for screen readers |
| `showHelpModal()` | Display keyboard shortcuts help |
| `closeHelpModal()` | Close help modal |
| `destroy()` | Remove event listeners |

### Contexts

- `MAIN` - Normal message list navigation
- `MODAL` - Attachment modal navigation

### Default Shortcuts

| Key | Action |
|-----|--------|
| `j` / `ArrowDown` | Next message |
| `k` / `ArrowUp` | Previous message |
| `Enter` | Open/focus message |
| `g` | First message |
| `G` | Last message |
| `p` | Toggle pin |
| `d` | Delete message |
| `o` / `Ctrl+o` | Open file picker |
| `Escape` | Close modal |
| `?` | Show help |

---

## Storage

**Path**: `src/js/storage.js`

**Responsibility**: Abstraction layer for localStorage with error handling.

### Constructor

```javascript
new Storage(backend?)
```

### API

| Method | Description |
|--------|-------------|
| `get(key, defaultValue?)` | Get value (JSON parsed) |
| `set(key, value)` | Set value (JSON stringified) |
| `remove(key)` | Remove key |
| `has(key)` | Check if key exists |
| `clear()` | Clear all storage |

### Singleton

```javascript
import { storage } from './storage.js';
storage.get('pinnedMessages', []);
```

---

## Sanitizer

**Path**: `src/js/sanitizer.js`

**Responsibility**: XSS protection for email HTML content.

### API

| Function | Description |
|----------|-------------|
| `sanitizeHTML(html)` | Sanitize HTML, returns safe string |
| `escapeHTML(text)` | Escape special characters |
| `sanitizeURL(url)` | Validate URL protocol |

### Allowed Protocols

- `http://`
- `https://`
- `mailto:`
- `data:image/` (for embedded images)

---

## Utils (Parsers)

**Path**: `src/js/utils.js`

**Responsibility**: MSG and EML file parsing.

### API

| Function | Description |
|----------|-------------|
| `extractMsg(arrayBuffer)` | Parse MSG file, returns message object |
| `extractEml(arrayBuffer)` | Parse EML file, returns message object |

### Message Object

```javascript
{
  subject: string,
  senderName: string,
  senderEmail: string,
  recipients: string,
  messageDeliveryTime: Date,
  body: string,           // HTML or plain text
  attachments: Array<{
    fileName: string,
    content: ArrayBuffer,
    contentType: string,
    contentId?: string    // For inline images
  }>
}
```

---

## Tauri Bridge

**Path**: `src/js/tauri-bridge.js`

**Responsibility**: Abstraction for Tauri APIs with web fallbacks.

### API

| Function | Description |
|----------|-------------|
| `isTauri()` | Check if running in Tauri |
| `getPendingFiles()` | Get files passed on app launch |
| `onFileOpen(callback)` | Listen for file open events |
| `onFileDrop(handlers)` | Listen for drag-drop events |
| `readFileFromPath(path)` | Read file from filesystem |
| `getFileName(path)` | Extract filename from path |
| `checkForUpdates()` | Check for app updates |

---

## CID Replacer

**Path**: `src/js/cidReplacer.js`

**Responsibility**: Replace CID (Content-ID) URLs with data URLs for inline images.

### API

| Function | Description |
|----------|-------------|
| `replaceCidUrls(html, attachments)` | Replace `cid:` URLs with base64 data URLs |

Handles both formats:
- `cid:image001.png@01D...`
- `cid:image001.png`
