import { expect, type Page, test } from "@playwright/test";

/** Mailpit, which catches the stack's email (compose.yaml). */
const MAILPIT = process.env["MAILPIT_URL"] ?? "http://mailpit:8025";

const shot = (name: string) => ({
  path: `test-results/screens/${test.info().project.name}-${name}.png`,
  fullPage: true,
});

/** The sign-in code in the newest email to `to`. */
async function codeFor(page: Page, to: string): Promise<string> {
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

test("vision §11: sign in with an emailed code, choose a handle, sign out", async ({ page }) => {
  test.setTimeout(60_000);
  const stamp = `${Date.now()}${test.info().project.name}`;
  const email = `reader-${stamp}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByText("I'm not a robot").click();
  await expect(page.locator('input[name="altcha"]')).not.toHaveValue("", { timeout: 30_000 });
  await page.screenshot(shot("sign-in"));
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(`We've sent a 6-digit code to ${email}`)).toBeVisible();

  await page.getByRole("textbox", { name: "Code" }).fill(await codeFor(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Choose a handle and a display name")).toBeVisible();
  await page.screenshot(shot("account-new"));

  const handle = `reader-${stamp}`.slice(0, 30).replace(/-$/, "");
  await page.getByRole("textbox", { name: "Handle" }).fill(handle);
  await page.getByRole("textbox", { name: "Display name" }).fill("A Reader");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: `@${handle}` })).toBeVisible();
  await page.screenshot(shot("account"));

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("a wrong code is answered in words", async ({ page }) => {
  test.setTimeout(60_000);
  const email = `wrong-${Date.now()}${test.info().project.name}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByText("I'm not a robot").click();
  await expect(page.locator('input[name="altcha"]')).not.toHaveValue("", { timeout: 30_000 });
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await codeFor(page, email);
  await page.getByRole("textbox", { name: "Code" }).fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "That code isn't right. Check the email and try again.",
  );
});
