import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Detect if building for Tauri (TAURI_ENV_PLATFORM is set during tauri build/dev)
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

export default defineConfig({
  root: '.',
  // Use root path for Tauri, /msg-reader/ for GitHub Pages
  base: isTauri ? '/' : '/msg-reader/',
  publicDir: 'res',
  plugins: [
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'events', 'process'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
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
  css: {
    postcss: './postcss.config.cjs',
  },
  // Tauri needs to know about env variables
  envPrefix: ['VITE_', 'TAURI_'],
});
