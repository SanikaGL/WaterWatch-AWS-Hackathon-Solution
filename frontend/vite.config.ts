import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api to the local backend so the frontend never hard-codes localhost in code.
export default defineConfig({
  plugins: [react()],
  // amazon-cognito-identity-js references `global`; map it to the browser global.
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
