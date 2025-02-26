import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc';
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/',
    server: {
      host: "::",
      port: 8080
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, "./src"),
        "components": path.resolve(__dirname, "./src/components"),
        "pages": path.resolve(__dirname, "./src/pages"),
        "contexts": path.resolve(__dirname, "./src/contexts"),
        "integrations": path.resolve(__dirname, "./src/integrations"),
      }
    },
    define: {
      'process.env': env
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: true,
      rollupOptions: {
        external: [
          '@supabase/auth-helpers-react'
        ],
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          format: 'es',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000,
      manifest: true,
      cssCodeSplit: true
    }
  }
});
