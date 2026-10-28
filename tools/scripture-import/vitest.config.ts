import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Integration tests (load.test.ts) clone their databases from a migrated template.
    globalSetup: ["@scripturetips/db/test-support/global-setup"],
  },
});
