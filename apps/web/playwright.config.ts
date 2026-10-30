import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the running dev stack (`./dev up`): run them in the toolbox, which
 * reaches the web app as `web:3000`. Screenshots go to test-results/ (not committed).
 */
/**
 * The browser opens the app as `localhost:3000`, which Chromium maps to the `web` container,
 * over HTTPS with the dev stack's self-signed certificate (accepted here).
 */
const baseURL = "https://localhost:3000";
const webHost = process.env["WEB_HOST"] ?? "web";

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    ...devices["Desktop Chrome"],
    launchOptions: { args: [`--host-resolver-rules=MAP localhost ${webHost}`] },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
});
