import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Base path para GitHub Pages (repo project page)
  base: '/geradorbom/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
