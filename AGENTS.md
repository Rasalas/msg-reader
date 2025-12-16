# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

msgReader is a cross-platform email viewer for .msg (Microsoft Outlook) and .eml files. It runs as both a web app (GitHub Pages) and native desktop app (Windows, macOS, Linux) built with Tauri 2.

## Commands

**Development:**
```bash
npm run dev           # Dev server at localhost:8080
npm run build         # Production build
npm run tauri:dev     # Desktop app with hot-reload
npm run tauri:build   # Desktop app production build
```

**Testing & Quality:**
```bash
npm test              # Run Jest tests
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix linting
npm run format        # Prettier format
```

**Makefile shortcuts:**
```bash
make dev              # Development mode
make test             # Run all tests
make mocks            # Generate test email files
make tauri-dev        # Tauri development
```

## Architecture

### Core Modules (src/js/)

- **main.js** - App entry point, orchestrates all managers
- **MessageHandler.js** - Email state management (collection, pinning, sorting, selection)
- **FileHandler.js** - Drag-drop handling, delegates parsing to injected parsers
- **utils.js** - MSG/EML parsing logic using `@kenjiuno/msgreader` and custom MIME parser
- **tauri-bridge.js** - IPC layer for native features (file ops, dialogs, system viewer)

### UI Layer (src/js/ui/)

- **UIManager.js** - Delegates to specialized sub-managers
- **MessageListRenderer.js** - Sidebar list with virtual scrolling
- **MessageContentRenderer.js** - Email body with HTML sanitization and inline images
- **AttachmentModalManager.js** - Attachment preview/download with system viewer support
- **VirtualList.js** - Performance optimization for large email lists

### Desktop App (src-tauri/)

- **lib.rs** - Tauri commands: file reading, system viewer, Save As dialog
- Single-instance enforcement, file associations (.msg, .eml), auto-update

## Key Patterns

- **Dependency Injection**: Parsers (extractMsg, extractEml) injected into FileHandler
- **Platform Abstraction**: tauri-bridge.js abstracts web vs native differences
- **Security**: DOMPurify sanitizes all email HTML; filename sanitization prevents path traversal
- **MD5 Deduplication**: Messages identified by content hash for pin persistence

## Code Style

- 4-space indentation, single quotes, no trailing commas
- ESLint enforces security rules (no-eval, no-script-url)
- Run `npm run format` before commits
