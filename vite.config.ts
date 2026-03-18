import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      '@riptheai/webgl-video': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3333,
    open: true,
    watch: {
      // Root is demo/ so we must explicitly watch src/ for HMR on library changes
      ignored: ['!**/src/**'],
    },
  },
});
