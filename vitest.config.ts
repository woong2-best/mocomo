import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "src/lib/marketplace/__tests__/**/*.test.ts",
      "src/lib/settlement-moco/__tests__/**/*.test.ts",
      "src/lib/__tests__/api-idempotency.test.ts",
      "src/lib/__tests__/error-text.test.ts",
      "src/lib/wiki/__tests__/editorUtils.test.ts",
    ],
  },
});
