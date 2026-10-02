import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  root: resolve(import.meta.dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: resolve(import.meta.dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, 'src/renderer/worlds-overlay.html') },
  },
});
