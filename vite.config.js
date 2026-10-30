import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: Vite (5173) leitet /api und /ws an den Node-Server (3001) weiter.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:3001", "/ws": { target: "ws://localhost:3001", ws: true } } },
});
