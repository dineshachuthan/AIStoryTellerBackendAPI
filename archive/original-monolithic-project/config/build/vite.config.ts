import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  css: {
    postcss: path.resolve(import.meta.dirname, "postcss.config.js"),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "..", "..", "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "..", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "..", "..", "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "..", "..", "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "react/jsx-runtime"],
    exclude: ["@replit/vite-plugin-runtime-error-modal", "@replit/vite-plugin-cartographer"],
    force: true,
  },
  define: {
    'process.env.NODE_ENV': '"development"',
  },
  esbuild: {
    jsx: 'automatic',
  },
});
