import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O Vite gera a SPA em ./dist, que o Cloudflare Pages serve estaticamente.
// O diretório /functions é detectado automaticamente pelo Pages (sem config extra).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
  },
});
