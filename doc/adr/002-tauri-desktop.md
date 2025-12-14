# ADR 002: Tauri for Desktop Distribution

## Status
Accepted

## Context
Users requested a desktop application for opening .msg and .eml files with file associations (double-click to open). Options included Electron, Tauri, and PWA.

## Decision
Use Tauri 2.x for the desktop application.

## Rationale

1. **Bundle Size**: Tauri produces ~10MB binaries vs Electron's ~150MB+. Uses system WebView instead of bundling Chromium.

2. **Performance**: Native Rust backend with system WebView provides better performance and lower memory usage.

3. **Security**: Rust's memory safety and Tauri's security model (explicit permissions, CSP) align with handling potentially malicious email files.

4. **Features**: Native file associations, auto-updates, and system tray are available through plugins.

5. **Cross-Platform**: Single codebase builds for Windows (.msi, .exe), macOS (.dmg), and Linux (.AppImage, .deb).

## Consequences

### Positive
- Small installer sizes (~8-15MB depending on platform)
- Native file association for .msg and .eml
- Built-in auto-update mechanism
- Low memory footprint
- System-native WebView rendering

### Negative
- Requires Rust toolchain for building
- WebView behavior varies slightly across platforms
- Smaller ecosystem than Electron
- Code signing complexity (especially for macOS notarization)

## Implementation Notes

- `tauri-bridge.js` abstracts all Tauri APIs behind feature detection
- Web version works identically without Tauri dependencies
- Auto-updates check GitHub releases for new versions
- File associations configured in `tauri.conf.json`

## Alternatives Considered

| Option | Reason for Rejection |
|--------|---------------------|
| Electron | Large bundle size (150MB+), high memory usage |
| PWA | No file associations, limited OS integration |
| Neutralino | Less mature, smaller community |
