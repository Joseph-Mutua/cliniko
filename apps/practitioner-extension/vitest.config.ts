import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

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
  test: {
    include: ["src/**/*.test.ts?(x)"],
    exclude: ["tests/e2e/**"],
    environment: "node",
  },
});
