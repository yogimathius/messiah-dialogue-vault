/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    alias: {
      "@vault/core": path.resolve(__dirname, "./packages/core/src/index.ts"),
      "@vault/db": path.resolve(__dirname, "./packages/db/src/index.ts"),
      "@vault/embeddings": path.resolve(__dirname, "./packages/embeddings/src/index.ts"),
      "@vault/mcp": path.resolve(__dirname, "./packages/mcp/src/index.ts"),
    },
  },
});
