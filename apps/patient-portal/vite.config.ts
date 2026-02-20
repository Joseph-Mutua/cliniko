import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@cliniko-companion/cache": fileURLToPath(new URL("../../packages/cache/src/index.ts", import.meta.url)),
      "@cliniko-companion/forms": fileURLToPath(new URL("../../packages/forms/src/index.ts", import.meta.url)),
      "@cliniko-companion/ui": fileURLToPath(new URL("../../packages/ui/src/index.tsx", import.meta.url)),
      "@cliniko-companion/utils": fileURLToPath(new URL("../../packages/utils/src/index.ts", import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Cliniko Companion Portal",
        short_name: "Companion",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f7f4",
        theme_color: "#1a4d43",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
