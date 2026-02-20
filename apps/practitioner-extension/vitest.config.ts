import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@cliniko-companion/cache": fileURLToPath(new URL("../../packages/cache/src/index.ts", import.meta.url)),
      "@cliniko-companion/ui": fileURLToPath(new URL("../../packages/ui/src/index.tsx", import.meta.url)),
      "@cliniko-companion/utils": fileURLToPath(new URL("../../packages/utils/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts?(x)"],
    exclude: ["tests/e2e/**"],
    environment: "node",
  },
});
