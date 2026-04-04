import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


import { cloudflare } from "@cloudflare/vite-plugin";


export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    hmr: {
      host: "localhost",
      port: 8080,
      protocol: "ws",
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));