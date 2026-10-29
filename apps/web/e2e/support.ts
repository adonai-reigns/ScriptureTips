/** Shared steps for the end-to-end tests. */

import { expect, type Page, test } from "@playwright/test";

/** Mailpit, which catches the stack's email (compose.yaml). */
export const MAILPIT = process.env["MAILPIT_URL"] ?? "http://mailpit:8025";

export const shot = (name: string) => ({
  path: `test-results/screens/${test.info().project.name}-${name}.png`,
  fullPage: true,
  // Hiding the caret styles the focused input, which React reports as a hydration mismatch
  // when the shot is taken before the page has hydrated.
  caret: "initial" as const,
});

/**
 * Each test arrives from its own address (a documentation range), as separate users would, so
 * the per-address limits (apps/api `CODE_REQUESTS_PER_IP_PER_HOUR`) don't add up across runs.
 */
export function arriveFromOwnAddress(): void {
  test.beforeEach(async ({ page }) => {
    const address = `198.51.100.${1 + Math.floor(Math.random() * 254)}`;
    await page.setExtraHTTPHeaders({ "x-forwarded-for": address });
  });
}

/** The sign-in code in the newest email to `to`. */
export async function codeFor(page: Page, to: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const found = await (
        await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
      ).json();
      const id = found.messages?.[0]?.ID;
      if (!id) return undefined;
      const message = await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
      code = /\b(\d{6})\b/.exec(message.Text ?? "")?.[1];
      return code;
    })
    .toBeTruthy();
  return code ?? "";
}

/**
 * Signs up a new account through the pages (email code, handle, display name, canon) and
 * returns its handle.
 */
export async function signUp(page: Page, canon = "Protestant"): Promise<string> {
  // The worker index keeps two tests that start in the same millisecond apart.
  const stamp = `${Date.now()}w${test.info().workerIndex}${test.info().project.name}`;
  const email = `new-${stamp}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await passBotCheck(page);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByRole("textbox", { name: "Code" }).fill(await codeFor(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const handle = `u-${stamp}`.slice(0, 30).replace(/-$/, "");
  await page.getByRole("textbox", { name: "Handle" }).fill(handle);
  await page.getByRole("textbox", { name: "Display name" }).fill("A Reader");
  await page.getByRole("radio", { name: new RegExp(`^${canon}`) }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: `@${handle}` })).toBeVisible();
  return handle;
}

/**
 * Waits for the sign-in form's bot check to pass. It starts when the form gets focus
 * (`auto="onfocus"`) and may finish at once; if the widget loaded too late to see the focus,
 * tick its box.
 */
export async function passBotCheck(page: Page): Promise<void> {
  const solution = page.locator('input[name="altcha"]');
  await expect(async () => {
    if ((await solution.inputValue({ timeout: 500 }).catch(() => "")) === "") {
      const box = page.getByText("I'm not a robot");
      if (await box.isVisible()) await box.click({ timeout: 1_000 }).catch(() => undefined);
    }
    await expect(solution).not.toHaveValue("", { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}

/** Opens one of the compilation editor's dialogs (Publish, Build PDF) and returns it. */
export async function openEditorDialog(page: Page, button: string, title: string) {
  await page.locator(".book-tabs-actions").getByRole("button", { name: button }).click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  return dialog;
}
