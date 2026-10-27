import { defineConfig } from "vite";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.CAPACITOR_BUILD === "true" ? "./" : "/weekend-tracker/",
  plugins: [
    react(),
    legacy({
      targets: ["Android >= 7", "Chrome >= 55"],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
});
