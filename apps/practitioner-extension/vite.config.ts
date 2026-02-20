import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@cliniko-companion/cache",
        replacement: fileURLToPath(new URL("../../packages/cache/src/index.ts", import.meta.url)),
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
  plugins: [react()],
  server: {
    port: 5174,
  },
});
