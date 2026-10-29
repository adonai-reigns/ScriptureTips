import { expect as baseExpect, type Page, test } from "@playwright/test";
import { arriveFromOwnAddress, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

// The reading area isn't laid out for phones yet (the owner will design that separately).
test.skip(({ isMobile }) => isMobile, "The reading area's phone layout isn't designed yet.");

// Chapter changes and saves wait on the API, which is slow while the whole suite runs at once.
const expect = baseExpect.configure({ timeout: 15_000 });

async function create(page: Page, title: string, abbreviation: string) {
  await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await page.getByRole("textbox", { name: "Abbreviation" }).fill(abbreviation);
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(new RegExp(`/compilations/${abbreviation.toLowerCase()}$`), {
    timeout: 15_000,
  });
}

/** Waits until the page's scripts have run, so a select's change reaches them. */
const settled = (page: Page) => page.waitForLoadState("networkidle");

/** An element's left edge in the window. */
const leftOf = (l: import("@playwright/test").Locator) =>
  l.evaluate((e) => Math.round(e.getBoundingClientRect().left));

const reading = (page: Page) => page.getByRole("region", { name: /\d$/ });

test("vision §3.1: read a compilation a chapter at a time, chosen from its books", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Reading Plan", "Plan");
  // The first chapter of the first book, read.
  await expect(reading(page).getByRole("heading", { name: "Genesis 1", level: 2 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read" })).toHaveAttribute("aria-current", "page");
  await expect(reading(page)).toContainText("In the beginning God created the heaven");
  await page.screenshot(shot("reading-area-read"));

  // A book from the tabs opens at chapter 1; the chapter controls move through it.
  await page
    .getByRole("tabpanel")
    .locator("li > a")
    .filter({ hasText: /^Exodus / })
    .click();
  await expect(page).toHaveURL(/\?book=Exod&chapter=1&mode=read$/);
  await expect(reading(page).getByRole("heading", { name: "Exodus 1" })).toBeVisible();
  // Moving between chapters swaps the chapter without reloading the page.
  await settled(page);
  await page.evaluate(() => {
    (window as { stayed?: boolean }).stayed = true;
  });
  await page.getByRole("link", { name: "Next: Exodus 2" }).click();
  await expect(page).toHaveURL(/chapter=2/);
  await expect(reading(page).getByRole("heading", { name: "Exodus 2" })).toBeVisible();
  // Hovering the chapter number (or focusing it) lists every chapter.
  const list = page.getByRole("navigation", { name: "Chapters" });
  await expect(list).toBeHidden();
  await reading(page).getByRole("button", { name: "2", exact: true }).hover();
  await expect(list).toBeVisible();
  await expect(list.getByRole("link", { name: "2", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.screenshot(shot("reading-area-chapters"));
  await list.getByRole("link", { name: "20", exact: true }).click();
  await expect(page).toHaveURL(/chapter=20/);
  await expect(reading(page).getByRole("heading", { name: "Exodus 20" })).toBeVisible();
  expect(await page.evaluate(() => (window as { stayed?: boolean }).stayed)).toBe(true);
  await expect(list).toBeHidden();
  await expect(reading(page).getByRole("heading", { name: "Exodus 20" })).toBeVisible();
  await page.getByRole("link", { name: "Previous: Exodus 19" }).click();
  await expect(reading(page).getByRole("heading", { name: "Exodus 19" })).toBeVisible();
  // The address keeps the place.
  await page.reload();
  await expect(reading(page).getByRole("heading", { name: "Exodus 19" })).toBeVisible();
});

test("vision §3.1: compare a chapter verse by verse beside translations remembered with it", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Side by Side", "Side");
  await page.getByRole("link", { name: "Compare" }).click();
  await expect(page).toHaveURL(/mode=compare/);
  const table = page.getByRole("table", { name: "Genesis 1" });
  await expect(table.getByRole("columnheader")).toHaveCount(4);
  await expect(table.getByRole("columnheader").first()).toHaveText("Side");

  await settled(page);
  const first = page.getByRole("combobox", { name: "Translation for column 1" });
  await first.selectOption("leb");
  await expect(first).toHaveValue("leb");
  await expect(page.getByRole("table").getByRole("columnheader").nth(1)).toContainText("LEB");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Translation for column 1" })).toHaveValue("leb");

  // Each row starts level across the columns.
  const row = table.getByRole("row").nth(3);
  const tops = await row
    .getByRole("cell")
    .evaluateAll((cells) => cells.map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await expect(row.getByRole("cell").nth(1)).toContainText("3");
  await page.screenshot(shot("reading-area-compare"));

  // A fourth translation: the table scrolls sideways, the compilation's column held at the left.
  // Its + adds a column after it, with the first translation not shown yet.
  const plus = table.getByRole("button", { name: /^Add a column after the / }).first();
  await expect(plus).toHaveAttribute("title", "Add a column after this one");
  await plus.click();
  await expect(table.getByRole("columnheader")).toHaveCount(5, { timeout: 15_000 });
  await expect(page.getByRole("combobox", { name: "Translation for column 1" })).toHaveValue("leb");
  await expect(page.getByRole("combobox", { name: "Translation for column 2" })).not.toHaveValue(
    "leb",
  );
  const pane = page.locator(".compare-pane");
  const overflows = () =>
    pane.evaluate((e) => (e.querySelector("table")?.offsetWidth ?? 0) > e.clientWidth);
  expect(await overflows()).toBe(true);
  // A scrollbar above the table, always shown, slides it; the compilation's column stays put.
  const scrollbar = page.locator(".compare-scrollbar");
  await expect(scrollbar).toBeVisible();
  const ownLeft = () => leftOf(table.getByRole("columnheader").first());
  const nextLeft = () => leftOf(table.getByRole("columnheader").nth(1));
  const [own, next] = [await ownLeft(), await nextLeft()];
  // (With four columns it slides by at most a quarter of the box: 300px here.)
  await scrollbar.evaluate((e) => e.scrollTo(150, 0));
  await expect.poll(nextLeft).toBe(next - 150);
  expect(await ownLeft()).toBe(own);
  // A sideways wheel over the table slides it too, and the page doesn't scroll down inside it.
  await table.getByRole("row").nth(1).hover();
  await page.mouse.wheel(100, 0);
  await expect.poll(nextLeft).toBe(next - 250);
  expect(await pane.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
  await page.screenshot({ ...shot("reading-area-compare-four"), fullPage: false });
  await page.reload();
  await expect(table.getByRole("columnheader")).toHaveCount(5);
  await settled(page);
  // Tabbing to the last column slides it into view.
  const lastSelect = table.getByRole("combobox", { name: "Translation for column 4" });
  await lastSelect.focus();
  await expect
    .poll(async () => {
      const r = await lastSelect.boundingBox();
      const box = await pane.boundingBox();
      return r && box ? r.x + r.width <= box.x + box.width : false;
    })
    .toBe(true);
  // Removing it goes back to three, which fit.
  await expect(
    table.getByRole("button", { name: /^Remove the .* column$/ }).last(),
  ).toHaveAttribute("title", "Remove this column");
  await table
    .getByRole("button", { name: /^Remove the .* column$/ })
    .last()
    .click();
  await expect(table.getByRole("columnheader")).toHaveCount(4, { timeout: 15_000 });
  expect(await overflows()).toBe(false);

  // Scrolled down, the modes and the chapter bar stay at the top, the headings under them.
  await table.getByRole("row").nth(20).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  const top = (l: import("@playwright/test").Locator) =>
    l.evaluate((e) => Math.round(e.getBoundingClientRect().top));
  const bar = page.locator(".reading-bar");
  expect(await top(page.getByRole("navigation", { name: "Reading mode" }))).toBeLessThan(20);
  expect(await top(bar)).toBeLessThan(80);
  const barBottom = await bar.evaluate((e) => e.getBoundingClientRect().bottom);
  const headTop = await top(table.getByRole("columnheader").first());
  expect(headTop).toBeGreaterThanOrEqual(Math.floor(barBottom));
  expect(headTop - barBottom).toBeLessThan(20);
  await page.screenshot({ ...shot("reading-area-compare-scrolled"), fullPage: false });
});

test("vision §3.1: take verses into the compilation by click and Shift-click", async ({ page }) => {
  test.setTimeout(120_000);
  await create(page, "Taking Verses", "Take");
  await page
    .getByRole("navigation", { name: "Reading mode" })
    .getByRole("link", { name: "Edit" })
    .click();
  await settled(page);
  await page.getByRole("combobox", { name: "Translation for column 1" }).selectOption("leb");
  const table = page.getByRole("table", { name: "Genesis 1" });
  await expect(table.getByRole("button", { name: /^Take from the LEB/ }).first()).toBeVisible();
  const own = (verse: number) => table.getByRole("row").nth(verse).getByRole("cell").first();
  const leb = (verse: number) =>
    table
      .getByRole("row")
      .nth(verse)
      .getByRole("button", { name: /^Take from the LEB/ });

  // A click takes the verse at once.
  await leb(1).click();
  await expect(own(1)).toContainText("LEB", { timeout: 30_000 });
  await expect(reading(page).getByRole("status")).toContainText("Took 1 verse.");

  await leb(3).click();
  await expect(own(3)).toContainText("LEB", { timeout: 30_000 });
  await expect(own(2)).not.toContainText("LEB");

  // With Shift held, the first and last of a run, taken when Shift is let go.
  await page.keyboard.down("Shift");
  await leb(6).click();
  await expect(leb(6)).toHaveAttribute("aria-pressed", "true");
  await expect(own(6)).not.toContainText("LEB");
  await leb(8).click();
  await expect(leb(7)).toHaveAttribute("aria-pressed", "true");
  await page.screenshot(shot("reading-area-edit-picked"));
  await page.keyboard.up("Shift");
  for (const v of [6, 7, 8]) await expect(own(v)).toContainText("LEB", { timeout: 30_000 });
  await expect(own(9)).not.toContainText("LEB");

  // Escape drops what's picked.
  await page.keyboard.down("Shift");
  await leb(10).click();
  await expect(leb(10)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.keyboard.up("Shift");
  await expect(leb(10)).toHaveAttribute("aria-pressed", "false");
  await expect(own(10)).not.toContainText("LEB");

  // The composition counts them.
  await expect(page.getByRole("figure").getByRole("listitem")).toHaveText([/^KJV/, /^LEB/], {
    timeout: 30_000,
  });
  await page.screenshot(shot("reading-area-edit"));
});

test("vision §3.1: give the chapter in edit mode a new translation from its menu, after a warning", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Whole Chapter", "Chap");
  await page
    .getByRole("navigation", { name: "Reading mode" })
    .getByRole("link", { name: "Edit" })
    .click();
  const table = page.getByRole("table", { name: "Genesis 1" });
  const own = (verse: number) => table.getByRole("row").nth(verse).getByRole("cell").first();
  const menu = table.getByRole("button", { name: "Options for Genesis 1" });
  await expect(menu).toBeVisible();
  await settled(page);

  // Dismissing the warning changes nothing.
  await menu.click();
  await expect(
    page.getByRole("menu", { name: "Change the translation of Genesis 1" }),
  ).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /^KJV:.*\(current\)$/ })).toBeVisible();
  // Of the window only: a full-page shot resizes it, which closes the menu.
  await page.screenshot({ ...shot("reading-area-chapter-menu"), fullPage: false });
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("menuitem", { name: /^LEB:/ }).click();
  await expect(own(1)).not.toContainText("LEB");

  // Accepting it gives every verse of the chapter the new translation.
  page.once("dialog", (d) => {
    expect(d.message()).toContain("Use the LEB: Lexham English Bible for the whole of Genesis 1?");
    void d.accept();
  });
  await page.getByRole("menuitem", { name: /^LEB:/ }).click();
  await expect(page.getByRole("menu")).toBeHidden();
  for (const v of [1, 15, 31]) await expect(own(v)).toContainText("LEB", { timeout: 30_000 });
  await menu.click();
  await expect(page.getByRole("menuitem", { name: /^LEB:.*\(current\)$/ })).toBeVisible();
  // The book tabs still show Genesis from its book's source.
  await expect(
    page
      .getByRole("tabpanel")
      .locator("li > a")
      .filter({ hasText: /^Genesis / }),
  ).toHaveText("Genesis KJV");
});
