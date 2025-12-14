import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Detect if building for Tauri (TAURI_ENV_PLATFORM is set during tauri build/dev)
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

// Get version from git tag or package.json
function getVersion() {
  try {
    return execSync('git describe --tags --always 2>/dev/null').toString().trim();
  } catch {
    // Fallback to package.json version
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    return pkg.version || 'dev';
  }
}

const version = getVersion();

export default defineConfig({
  root: '.',
  // Use root path for Tauri, /msg-reader/ for GitHub Pages
  base: isTauri ? '/' : '/msg-reader/',
  publicDir: 'res',
  plugins: [
    tailwindcss(),
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'events', 'process'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
    {
      name: 'html-version-replace',
      transformIndexHtml(html) {
        return html.replace(/__VERSION__/g, version);
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
    // Tauri needs ES modules, web build uses default
    target: isTauri ? 'esnext' : 'es2020',
  },
  server: {
    port: 8080,
    // Don't auto-open browser for Tauri dev
    open: !isTauri,
    strictPort: true,
  },
  // Tauri needs to know about env variables
  envPrefix: ['VITE_', 'TAURI_'],
});
