import { expect, test } from "@playwright/test";
import {
  arriveFromOwnAddress,
  codeFor,
  openNewCompilation,
  passBotCheck,
  shot,
  signUp,
} from "./support.ts";

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
  // Settled first: the field is script-driven, and what is typed before hydration is lost.
  await page.waitForLoadState("networkidle");
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
  await page.waitForLoadState("networkidle");
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
  isMobile,
}) => {
  test.setTimeout(60_000);
  const handle = await signUp(page);
  // The home page has no logo in its header, but the signed-in menu is there at the top right.
  await page.goto("/");
  await expect(page.getByRole("button", { name: `@${handle}` })).toBeVisible();
  // On a wide screen it's out of the header's flow, so it adds nothing to the header's height and
  // the panel stays at the golden-ratio place the home page's CSS gives it. On a phone it's in the
  // flow, so it pushes the panel down.
  await expect(page.locator(".site-header .account-menu")).toHaveCSS(
    "position",
    isMobile ? "relative" : "absolute",
  );
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
  // A page has just loaded after each item, so a first press can come before its script has run:
  // press again until the menu is open.
  const openMenu = () =>
    expect(async () => {
      await toggle.click();
      await expect(menu).toBeVisible({ timeout: 1_000 });
    }).toPass();
  // The items go where they say; Settings is the canon choice on the account page.
  await openMenu();
  await menu.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/account#settings$/);
  await openMenu();
  await menu.getByRole("menuitem", { name: "Compilations" }).click();
  await expect(page).toHaveURL(/\/compilations$/);
  // Sign out is in the footer.
  await openMenu();
  await menu.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("main").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("favourite translations: starred and dragged into order, and only favourites in menus", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90_000);
  await signUp(page);
  await page.goto("/account");
  await page.waitForLoadState("networkidle");
  const favourites = page.getByRole("region", { name: "Favourites" });
  const others = page.getByRole("region", { name: "Other translations" });
  // A new account starts with LEB, NET, GNV, KJV and YLT, in that order.
  const defaults = favourites.locator(".favorite-name");
  await expect(defaults).toHaveText([/^LEB:/, /^NET:/, /^GNV:/, /^KJV:/, /^YLT:/]);
  const names = [
    ...(await defaults.allTextContents()),
    ...(await others.locator(".favorite-name").allTextContents()),
  ];
  const [first, second, ...dropped] = await defaults.allTextContents();
  // Take the last three out, then drag the second above the first.
  for (const name of dropped)
    await favourites.getByRole("button", { name: `Remove ${name} from your favourites` }).click();
  await expect(defaults).toHaveText([first ?? "", second ?? ""]);
  const handle = favourites.getByRole("button", { name: `Move ${second}`, exact: true });
  const target = await favourites.locator(".favorite-row").first().boundingBox();
  const from = await handle.boundingBox();
  if (!target || !from) throw new Error("no boxes");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 20, target.y + 4, { steps: 12 });
  await page.mouse.up();
  await expect(favourites.locator(".favorite-name")).toHaveText([second ?? "", first ?? ""]);
  // The keyboard too: Space picks a row up, the arrows move it, Space drops it.
  const moving = favourites.getByRole("button", { name: `Move ${second}`, exact: true });
  await moving.focus();
  await page.keyboard.press("Space");
  await expect(moving).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect(favourites.locator(".favorite-name")).toHaveText([first ?? "", second ?? ""]);
  await page.screenshot(shot("account-favourites"));

  await page.getByRole("checkbox", { name: /Show only favourites in menus/ }).check();
  // Saving reloads the page: wait for that, or the next navigation can be cut off by it.
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "Save" }).click(),
  ]);
  await page.goto("/account");
  await expect(favourites.locator(".favorite-name")).toHaveText([first ?? "", second ?? ""]);
  await expect(page.getByRole("checkbox", { name: /Show only favourites in menus/ })).toBeChecked();

  // The home page starts from the first favourite, and lists only the favourites, until asked.
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const picker = page.getByRole("combobox", { name: "Translation" });
  await expect(picker).toHaveValue(/.+/);
  const labels = () => picker.locator("option").allTextContents();
  expect(await labels()).toEqual([first, second, "Show all translations…"]);
  expect(await picker.locator("option:checked").textContent()).toBe(first);
  // Chosen again until the list grows: a choice before the page's scripts have run is lost.
  await expect(async () => {
    await picker.selectOption({ label: "Show all translations…" });
    await expect
      .poll(async () => (await labels()).length, { timeout: 1_000 })
      .toBeGreaterThanOrEqual(names.length);
  }).toPass();
  expect((await labels()).slice(0, 2)).toEqual([first, second]);
  await page.screenshot(shot("home-all-translations"));

  // A book's translation menu follows it too: the favourites and the book's own source, then
  // everything on request.
  if (isMobile) return;
  await page.goto("/compilations");
  await page.waitForLoadState("networkidle");
  await openNewCompilation(page);
  await page.getByRole("textbox", { name: "Title" }).fill("Favourites");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Fav");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption({ label: first });
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/fav$/, { timeout: 15_000 });
  await page
    .getByRole("tabpanel")
    .getByRole("link", { name: /^Genesis/ })
    .hover();
  const items = page.getByRole("menuitem");
  // Pressed again until it opens: a press before the page's scripts have run is lost.
  await expect(async () => {
    await page.getByRole("button", { name: "Options for Genesis" }).click();
    await expect(items.first()).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText(first ?? "");
  await expect(items.nth(1)).toContainText(second ?? "");
  await page.getByRole("button", { name: "Show all translations…" }).click();
  await expect.poll(() => items.count()).toBeGreaterThan(2);
});
