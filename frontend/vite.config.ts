import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
    // AJOUT DU PROXY POUR REDIRIGER VERS LE BACKEND
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',  // Utiliser 127.0.0.1 au lieu de localhost
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',  // Utiliser 127.0.0.1 au lieu de localhost
        changeOrigin: true,
        secure: false,
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "src/styles/variables.scss";`
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})