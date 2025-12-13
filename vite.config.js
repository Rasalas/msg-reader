import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  root: '.',
  base: '/msg-reader/',
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
  },
  server: {
    port: 8080,
    open: true,
  },
  css: {
    postcss: './postcss.config.cjs',
  },
});
