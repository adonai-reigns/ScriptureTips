import { expect, test } from "@playwright/test";
import { arriveFromOwnAddress, codeFor, passBotCheck, shot } from "./support.ts";

arriveFromOwnAddress();

test("vision §11: sign in with an emailed code, choose a handle and canon, sign out", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const stamp = `${Date.now()}${test.info().project.name}`;
  const email = `reader-${stamp}@example.com`;

  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await passBotCheck(page);
  await page.screenshot(shot("sign-in"));
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText(`We've sent a 6-digit code to ${email}`)).toBeVisible();

  await page.getByRole("textbox", { name: "Code" }).fill(await codeFor(page, email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Choose a handle, a display name and your canon")).toBeVisible();
  await page.screenshot(shot("account-new"));

  const handle = `reader-${stamp}`.slice(0, 30).replace(/-$/, "");
  await page.getByRole("textbox", { name: "Handle" }).fill(handle);
  await page.getByRole("textbox", { name: "Display name" }).fill("A Reader");
  await page.getByRole("radio", { name: /^Protestant/ }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: `@${handle}` })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Protestant/ })).toBeChecked();
  await page.screenshot(shot("account"));

  // vision §3.4: books outside the reader's canon are labelled, never mixed in silently.
  await page.goto("/read/eng-web/tobit/1");
  await expect(
    page.getByText("Additional writings: not counted as scripture in the Protestant canon."),
  ).toBeVisible();
  await page.screenshot(shot("reader-additional"));
  await page.goto("/read/eng-web/john/1");
  await expect(page.locator(".canon-note")).toHaveCount(0);
  await page.goto("/read/eng-web");
  await expect(
    page.getByRole("region", { name: "Additional writings" }).getByText("Tobit", { exact: true }),
  ).toBeVisible();
  await page.goto("/read/eng-web/malachi/4");
  await expect(page.getByRole("link", { name: "Next: Matthew 1" })).toBeVisible();

  await page.goto("/account");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("a wrong code is answered in words", async ({ page }) => {
  test.setTimeout(60_000);
  const email = `wrong-${Date.now()}${test.info().project.name}@example.com`;
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await passBotCheck(page);
  await page.getByRole("button", { name: "Send code" }).click();
  const code = await codeFor(page, email);
  await page.getByRole("textbox", { name: "Code" }).fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "That code isn't right. Check the email and try again.",
  );
});
