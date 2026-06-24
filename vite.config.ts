import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Splits a handful of large, broadly/eagerly-used vendor groups into
        // their own cacheable chunks so they don't bloat the main entry
        // bundle. Everything else is left to Rollup's automatic chunking
        // (no return value): several heavy libs (jspdf, html2canvas, xlsx)
        // are only ever reached from lazy-loaded routes or dynamic import()
        // calls, and giving them all the same fixed catch-all name would
        // merge them into one chunk and force that chunk into the eager
        // modulepreload set, undoing their existing lazy-loading.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes(`${path.sep}react${path.sep}`) || id.includes(`${path.sep}react-dom${path.sep}`) || id.includes(`${path.sep}scheduler${path.sep}`)) return "vendor-react";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes(`${path.sep}zod${path.sep}`)) return "vendor-forms";
        },
      },
    },
  },
}));
