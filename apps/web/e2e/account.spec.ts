import { expect, test } from "@playwright/test";
import { arriveFromOwnAddress, codeFor, passBotCheck, shot, signUp } from "./support.ts";

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
  await expect(page.getByRole("button", { name: `@${handle}` })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^Protestant/ })).toBeChecked();
  await page.screenshot(shot("account"));

  // A country that isn't on the list: what was typed carries over, and Save sends it for review.
  await page.getByRole("combobox", { name: "Location" }).fill("Free Lands of the World");
  await page.getByRole("button", { name: "My country isn't listed" }).click();
  await expect(page.getByRole("textbox", { name: "Location" })).toHaveValue(
    "Free Lands of the World",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("We've noted “Free Lands of the World”")).toBeVisible();

  // vision §3.4: books outside the reader's canon are labelled, never mixed in silently.
  await page.goto("/read/eng-web/tobit/1");
  await expect(
    page.getByText("Additional writings: not counted as scripture in the Protestant canon."),
  ).toBeVisible();
  await page.screenshot(shot("reader-additional"));
  await page.goto("/read/eng-web/john/1");
  await expect(page.locator(".canon-note")).toHaveCount(0);
  await page.goto("/read/eng-web");
  // The books are tabs by section: Tobit is under Additional writings in the Protestant canon.
  await page.getByRole("tab", { name: "Additional writings" }).click();
  await expect(page.getByRole("link", { name: /^Tobit/ })).toBeVisible();
  await page.goto("/read/eng-web/malachi/4");
  await expect(page.getByRole("link", { name: "Next: Matthew 1" })).toBeVisible();

  await page.goto("/account");
  // Settled, so the menu answers a click.
  await page.waitForLoadState("networkidle");

  // Sign out is in the user menu, not on the account page.
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await page.getByRole("button", { name: `@${handle}` }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  // Back at the home page, whose own Sign in button is in the main content.
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
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

test("the handle at the top right opens a menu: profile, compilations, settings, and sign out in its footer", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const handle = await signUp(page);
  // The home page has no logo in its header, but the signed-in menu is there at the top right.
  await page.goto("/");
  await expect(page.getByRole("button", { name: `@${handle}` })).toBeVisible();
  // It's out of the header's flow, so it adds nothing to the header's height and the panel stays
  // at the golden-ratio place the home page's CSS gives it.
  await expect(page.locator(".site-header .account-menu")).toHaveCSS("position", "absolute");
  await expect(page.locator(".site-header .brand")).toBeHidden();
  await page.screenshot(shot("home-signed-in"));
  await page.goto("/read/eng-web");
  const toggle = page.getByRole("button", { name: `@${handle}` });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  const menu = page.getByRole("menu", { name: `@${handle}` });
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Profile",
    "Compilations",
    "Settings",
    "Sign out",
  ]);
  // Escape closes it, and a press outside does too.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await toggle.click();
  // The bottom left corner of the screen: on a phone the open menu covers the page's heading.
  await page.mouse.click(2, (page.viewportSize()?.height ?? 600) - 2);
  await expect(menu).toBeHidden();
  // The items go where they say; Settings is the canon choice on the account page.
  await toggle.click();
  await menu.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/account#settings$/);
  await toggle.click();
  await menu.getByRole("menuitem", { name: "Compilations" }).click();
  await expect(page).toHaveURL(/\/compilations$/);
  // Sign out is in the footer. The page has just loaded, so a first press can come before its
  // script has run: press again until the menu is open.
  await expect(async () => {
    await toggle.click();
    await expect(menu).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await menu.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
});
