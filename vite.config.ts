import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages deployment uses repo name or relative base path
  base: process.env.VITE_BASE_PATH || './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          vendor: ['react', 'react-dom', 'zod', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
