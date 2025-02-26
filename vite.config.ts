
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  base: '/skilldirectory/',
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "components": path.resolve(__dirname, "./src/components"),
      "pages": path.resolve(__dirname, "./src/pages"),
      "contexts": path.resolve(__dirname, "./src/contexts"),
      "integrations": path.resolve(__dirname, "./src/integrations"),
    }
  },
  build: {
    rollupOptions: {
      external: [
        '@supabase/auth-helpers-react'
      ],
    },
  },
}));
