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

    // 🔥 MAIN FIX
    target: 'esnext',

    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react'],
          utils: ['bcryptjs']
        }
      }
    },

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
      'lucide-react',
      'bcryptjs'
    ]
  },

  // 🔥 REMOVE OLD TARGET ISSUE
  esbuild: {
    target: 'esnext',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
