import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',

    // ✅ FINAL FIX
    target: 'esnext',

    // ❌ REMOVE manualChunks पूरी तरह
    // rollupOptions: {}

    chunkSizeWarningLimit: 1000
  },

  server: {
    port: 5173,
    host: true
  },

  preview: {
    port: 4173,
    host: true
  },

  define: {
    global: 'globalThis'
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'lucide-react'
    ]
  },

  esbuild: {
    target: 'esnext'
  }
});
