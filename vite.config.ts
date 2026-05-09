import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '.',
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      $convex: path.resolve('./src/convex')
    }
  },
  server: {
    fs: {
      allow: [path.resolve('.')]
    }
  }
});
