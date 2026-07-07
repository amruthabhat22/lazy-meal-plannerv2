import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/engine/**/*.test.ts", "src/utils/**/*.test.ts"],
    environment: "node",
  },
});
