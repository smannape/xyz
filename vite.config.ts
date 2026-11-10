import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps every asset path relative so dist/ works from any path,
// including a Netlify drag-and-drop deploy or a folder opened locally.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
});
