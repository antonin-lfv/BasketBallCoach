import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// L'app vit sous /app/ (la landing statique occupe la racine)
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
