import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const backendUrl = process.env.VITE_API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});