import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works from any sub-path or inside a native wrapper.
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    // Phaser alone is ~1.2 MB minified; that is expected for this stack.
    chunkSizeWarningLimit: 1600,
  },
});
