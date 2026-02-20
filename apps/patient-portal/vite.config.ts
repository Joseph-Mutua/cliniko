import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@cliniko-companion/cache",
        replacement: fileURLToPath(new URL("../../packages/cache/src/index.ts", import.meta.url)),
      },
      {
        find: "@cliniko-companion/forms",
        replacement: fileURLToPath(new URL("../../packages/forms/src/index.ts", import.meta.url)),
      },
      {
        find: "@cliniko-companion/ui/theme.css",
        replacement: fileURLToPath(new URL("../../packages/ui/theme.css", import.meta.url)),
      },
      {
        find: "@cliniko-companion/ui",
        replacement: fileURLToPath(new URL("../../packages/ui/src/index.tsx", import.meta.url)),
      },
      {
        find: "@cliniko-companion/utils",
        replacement: fileURLToPath(new URL("../../packages/utils/src/index.ts", import.meta.url)),
      },
    ],
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
