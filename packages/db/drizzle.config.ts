import { defineConfig } from "drizzle-kit";

/** `pnpm generate` writes a migration for every schema change; never edit applied ones. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
});
