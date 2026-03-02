import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {},
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@nestjs/swagger": path.resolve(__dirname, "./src/utils/swagger-stub.ts"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    cors: true,
    allowedHosts: [
      "localhost",
      "app.local",
      "staging.template.io",
    ],
    
  },
});
