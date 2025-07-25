import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: ['localhost', '.replit.dev', '.replit.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep the /api path as-is
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['@tanstack/react-query', 'wouter'],
        },
      },
    },
  },
});