import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from 'vite';

import checker from 'vite-plugin-checker'

// Plugin personnalisé pour gérer les routes SPA
const spaFallback = (): Plugin => {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        
        // Si c'est une requête pour un fichier statique, continuer
        if (
          url.includes('.') || 
          url.startsWith('/api') || 
          url.startsWith('/uploads') ||
          url.startsWith('/@') || // Vite special routes
          url.startsWith('/node_modules')
        ) {
          return next();
        }
        
        // Pour toutes les autres routes, servir index.html
        req.url = '/index.html';
        next();
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Proxy pour éviter les problèmes CORS en développement
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    checker({
      typescript: true,
      overlay: {
        initialIsOpen: true,
        position: 'tr'
      }
    }),
    spaFallback(), // Utiliser notre plugin personnalisé
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  optimizeDeps: {
    include: ['axios', 'moment', 'react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
  build: {
    // Augmenter la limite d'avertissement
    chunkSizeWarningLimit: 1000,
    
    // Optimiser la taille de sortie
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Supprimer console.log en production
        drop_debugger: true,
      },
    },
    
    rollupOptions: {
      output: {
        // Configuration manuelle des chunks pour une meilleure séparation
        manualChunks: (id) => {
          // Dépendances React
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor';
            }
            
            // UI Libraries
            if (id.includes('@radix-ui') || id.includes('sonner') || id.includes('react-hot-toast')) {
              return 'ui-vendor';
            }
            
            // Data fetching & state
            if (id.includes('@tanstack') || id.includes('axios')) {
              return 'data-vendor';
            }
            
            // Utilitaires
            if (id.includes('moment') || id.includes('date-fns') || id.includes('lodash')) {
              return 'utils-vendor';
            }
            
            // Internationalisation
            if (id.includes('i18n') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
          }
          
          // Services
          if (id.includes('/services/')) {
            return 'services';
          }
          
          // Composants partagés
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
        },
        
        // Nommer les chunks de manière plus claire
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/${chunkInfo.name || facadeModuleId}-[hash].js`;
        },
        
        // Nommer les assets
        assetFileNames: (assetInfo) => {
          // Vérifier que le nom existe
          if (!assetInfo.name) {
            return `assets/[hash][extname]`;
          }
          
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Générer un rapport de taille
    reportCompressedSize: true,
  },
  
  // Configuration pour la production
  ...(mode === 'production' && {
    esbuild: {
      drop: ['console', 'debugger'],
    },
  }),
}));