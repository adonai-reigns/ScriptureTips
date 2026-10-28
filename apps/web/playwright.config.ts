import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the running dev stack (`./dev up`): run them in the toolbox, which
 * reaches the web app as `web:3000`. Screenshots go to test-results/ (not committed).
 */
export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  use: {
    baseURL: process.env["WEB_URL"] ?? "http://web:3000",
    ...devices["Desktop Chrome"],
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
