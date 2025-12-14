# Deployment Guide

This guide covers deploying msgReader as a web application and as native desktop applications.

## Web Deployment (GitHub Pages)

### Quick Deploy

```bash
npm run deploy
```

This builds the app and deploys to GitHub Pages automatically.

### Manual Deploy

```bash
# Build for production
npm run build

# Build for GitHub Pages (includes version injection)
npm run build-gh-pages

# Deploy the .gh-pages directory
gh-pages -d .gh-pages
```

### What Happens

1. Vite builds the app to `dist/`
2. Files are copied to `.gh-pages/`
3. Version string is injected into `index.html`
4. `gh-pages` pushes to the `gh-pages` branch

---

## Desktop Deployment (Tauri)

### Prerequisites

- [Rust](https://rustup.rs/) toolchain installed
- Platform-specific build tools (see below)

### Build Commands

```bash
# Development build (faster, debug symbols)
npm run tauri:dev

# Production build
npm run tauri:build

# Debug production build (for troubleshooting)
npm run tauri:build:debug
```

### Platform-Specific Setup

#### macOS

```bash
# Install Xcode command line tools
xcode-select --install

# Build
npm run tauri:build
```

**Output**: `src-tauri/target/release/bundle/dmg/msgReader_*.dmg`

**Code Signing**: See [macos-code-signing.md](./macos-code-signing.md) for notarization instructions.

#### Windows

```bash
# Requires Visual Studio Build Tools with "Desktop development with C++"
npm run tauri:build
```

**Output**:
- `src-tauri/target/release/bundle/msi/msgReader_*.msi`
- `src-tauri/target/release/bundle/nsis/msgReader_*.exe`

#### Linux

```bash
# Install dependencies (Debian/Ubuntu)
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

npm run tauri:build
```

**Output**:
- `src-tauri/target/release/bundle/appimage/msgReader_*.AppImage`
- `src-tauri/target/release/bundle/deb/msgReader_*.deb`

---

## Release Process

### 1. Run Tests

```bash
make test
```

All tests must pass before release.

### 2. Update Version

Use make targets for version bumping:

```bash
# Patch release (1.0.0 -> 1.0.1)
make release-patch

# Minor release (1.0.0 -> 1.1.0)
make release-minor

# Major release (1.0.0 -> 2.0.0)
make release-major
```

These commands:
1. Verify you're on `main` branch
2. Run tests
3. Create git tag
4. Push tag to origin

### 3. GitHub Actions

Pushing a tag triggers the release workflow:

1. Builds web version and deploys to GitHub Pages
2. Builds desktop apps for all platforms
3. Creates GitHub Release with binaries

### 4. Manual Release (if needed)

```bash
# Build all platforms (on respective machines)
npm run tauri:build

# Create GitHub release
gh release create v1.2.3 \
  src-tauri/target/release/bundle/dmg/*.dmg \
  src-tauri/target/release/bundle/msi/*.msi \
  src-tauri/target/release/bundle/appimage/*.AppImage \
  --title "v1.2.3" \
  --notes "Release notes here"
```

---

## Auto-Updates

The desktop app checks for updates on startup via the Tauri updater plugin.

### Configuration

Updates are configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/Rasalas/msg-reader/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### Update JSON Format

GitHub releases must include a `latest.json` file:

```json
{
  "version": "1.2.3",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/.../msgReader_1.2.3_aarch64.dmg.tar.gz",
      "signature": "..."
    },
    "darwin-x86_64": { ... },
    "windows-x86_64": { ... },
    "linux-x86_64": { ... }
  }
}
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Private key for update signatures |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for signing key |
| `APPLE_CERTIFICATE` | macOS code signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password |
| `APPLE_SIGNING_IDENTITY` | Certificate identity |
| `APPLE_ID` | Apple ID for notarization |
| `APPLE_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

---

## Troubleshooting

### "App is damaged" on macOS

Users can remove the quarantine flag:

```bash
xattr -cr /Applications/msgReader.app
```

### Windows SmartScreen Warning

Click "More info" then "Run anyway". This only appears on first run.

### Linux AppImage Won't Run

```bash
chmod +x msgReader_*.AppImage
./msgReader_*.AppImage
```
