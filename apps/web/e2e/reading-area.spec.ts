import { expect as baseExpect, type Page, test } from "@playwright/test";
import { arriveFromOwnAddress, openNewCompilation, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

// The desktop layout; a phone's compare and edit modes are in reading-area-phone.spec.ts.
test.skip(({ isMobile }) => isMobile, "Phones have their own layout and tests.");

// Chapter changes and saves wait on the API, which is slow while the whole suite runs at once.
const expect = baseExpect.configure({ timeout: 15_000 });

async function create(page: Page, title: string, abbreviation: string) {
  await signUp(page);
  await page.goto("/compilations");
  await openNewCompilation(page);
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
  await settled(page);
  // While the mode's content loads (held back here), its button spins and the chapter dims.
  let releaseMode = () => {};
  const heldMode = new Promise<void>((r) => {
    releaseMode = r;
  });
  await page.route("**/compilations/side?**", async (route) => {
    if (route.request().headers()["rsc"]) await heldMode;
    await route.continue();
  });
  const compare = page.getByRole("navigation", { name: "Reading mode" }).getByRole("link", {
    name: "Compare",
  });
  await compare.click();
  await expect(compare.locator(".link-pending")).toBeVisible();
  await expect
    .poll(() => page.locator(".reading-columns").evaluate((e) => getComputedStyle(e).opacity))
    .toBe("0.45");
  await page.screenshot({ ...shot("reading-area-mode-loading"), fullPage: false });
  releaseMode();
  await expect(page).toHaveURL(/mode=compare/, { timeout: 15_000 });
  await expect(page.locator(".link-pending")).toHaveCount(0, { timeout: 15_000 });
  await page.unroute("**/compilations/side?**");
  const table = page.getByRole("table", { name: "Genesis 1" });
  await expect(table.getByRole("columnheader")).toHaveCount(4);
  await expect(table.getByRole("columnheader").first()).toHaveText("Side");

  await settled(page);
  // While the new translation loads (held back here), its column is greyed with a status.
  let release = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/compilations/side**", async (route) => {
    if (route.request().headers()["rsc"]) await held;
    await route.continue();
  });
  const first = page.getByRole("combobox", { name: "Translation for column 1" });
  await first.selectOption("leb");
  const column = page.getByRole("table").getByRole("columnheader").nth(1);
  await expect(column.getByRole("status")).toHaveText("Loading…");
  await expect(column).toHaveClass(/compare-loading/);
  await expect(first).toHaveValue("leb");
  await expect(table.locator("td.compare-loading").first()).toBeVisible();
  await page.screenshot({ ...shot("reading-area-column-loading"), fullPage: false });
  release();
  await expect(column.getByRole("status")).toBeHidden({ timeout: 15_000 });
  await expect(table.locator(".compare-loading")).toHaveCount(0);
  await page.unroute("**/compilations/side**");
  await expect(first).toHaveValue("leb");
  await expect(column).toContainText("LEB");
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
  // The new column is drawn at once, greyed and loading, before it's saved and loaded.
  let releaseAdd = () => {};
  const heldAdd = new Promise<void>((r) => {
    releaseAdd = r;
  });
  await page.route("**/compilations/side**", async (route) => {
    if (route.request().headers()["rsc"]) await heldAdd;
    await route.continue();
  });
  await plus.click();
  await expect(table.getByRole("columnheader")).toHaveCount(5, { timeout: 1_000 });
  const added = table.getByRole("columnheader").nth(2);
  await expect(added).toHaveClass(/compare-adding/);
  await expect(added.getByRole("status")).toHaveText("Loading…");
  await page.screenshot({ ...shot("reading-area-column-adding"), fullPage: false });
  releaseAdd();
  await expect(table.locator(".compare-adding")).toHaveCount(0, { timeout: 15_000 });
  await page.unroute("**/compilations/side**");
  await expect(table.getByRole("columnheader")).toHaveCount(5);
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
  // Nothing covers it, even where it reaches over the sticky headings: each item shown is on top.
  for (const item of await page.getByRole("menuitem").all()) {
    const onTop = await item.evaluate((e) => {
      const r = e.getBoundingClientRect();
      const box = e.closest("[role=menu]")?.getBoundingClientRect();
      const y = r.top + r.height / 2;
      // Items scrolled out of the menu's own box aren't shown.
      if (!box || y <= box.top || y >= box.bottom) return true;
      return e.contains(document.elementFromPoint(r.left + r.width / 2, y));
    });
    expect(onTop).toBe(true);
  }
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

test("vision §3.1: read mode's ⋮ reads another translation whole, and back", async ({ page }) => {
  test.setTimeout(90_000);
  await create(page, "Reading Others", "Others");
  await page.goto("/compilations/others?book=Gen&chapter=1&mode=read");
  // Settled, so the ⋮ answers a click.
  await page.waitForLoadState("networkidle");
  const area = reading(page);
  await expect(area).toContainText("In the beginning God created the heaven and the earth.");

  // The ⋮ names the compilation while it's read.
  const toggle = page.getByRole("button", { name: /^Translation to read/ });
  await expect(toggle).toHaveText("Others");
  await toggle.click();
  const menu = page.getByRole("menu", { name: "Read" });
  await expect(
    menu.getByRole("menuitemradio", { name: /^Others: Reading Others/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot(shot("reading-area-read-choice"));
  // Held back a moment, so the spinner can be seen while it loads.
  await page.route(/read=bsb/, async (route) => {
    await new Promise((done) => setTimeout(done, 1_000));
    await route.continue();
  });
  await menu.getByRole("menuitemradio", { name: /^BSB:/ }).click();
  await expect(menu).toBeHidden();
  await expect(toggle.locator(".spinner")).toBeVisible();
  await expect(page).toHaveURL(/book=Gen&chapter=1&mode=read&read=bsb/);
  await expect(toggle.locator(".spinner")).toBeHidden();
  await page.unroute(/read=bsb/);
  await expect(area).toContainText("In the beginning God created the heavens and the earth.");
  // The ⋮ names it.
  await expect(
    page.getByRole("button", { name: "Translation to read: reading the BSB" }),
  ).toHaveText("BSB");

  // The chapter links and the book tabs keep reading it; compare and edit don't.
  await page.getByRole("link", { name: "Next: Genesis 2" }).click();
  await expect(page).toHaveURL(/chapter=2&mode=read&read=bsb/);
  await expect(page.getByRole("link", { name: /^Exodus/ }).first()).toHaveAttribute(
    "href",
    /read=bsb/,
  );
  await expect(
    page.getByRole("navigation", { name: "Reading mode" }).getByRole("link", { name: "Compare" }),
  ).not.toHaveAttribute("href", /read=/);

  // Back to the compilation.
  await page.getByRole("button", { name: /^Translation to read/ }).click();
  await menu.getByRole("menuitemradio", { name: /^Others:/ }).click();
  await expect(page).toHaveURL(/chapter=2&mode=read$/);
  await expect(
    page.getByRole("button", { name: "Translation to read: reading the Others" }),
  ).toHaveText("Others");
});

test("vision §3.1: in edit mode, a click on the compilation's verse changes its wording in place", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "In Place", "Place");
  await page.goto("/compilations/place?book=Gen&chapter=1&mode=edit");
  const own = page.locator("td.compare-own");
  await own.first().getByRole("button").click();
  const box = page.getByRole("textbox", { name: "The wording of Genesis 1:1" });
  await expect(box).toHaveValue("In the beginning God created the heaven and the earth.");
  await expect(box).toBeFocused();
  // The other verses fade while it's changed, and come back after.
  const rows = page.locator(".compare-grid tbody tr");
  await expect(rows.first()).toHaveCSS("opacity", "1");
  await expect(rows.nth(1)).toHaveCSS("opacity", "0.5");
  // Its number stays, and the first line starts after it.
  await expect(own.first().locator(".verse-in-place-number")).toHaveText(/^1/);
  expect(
    await box.evaluate((el) => Number.parseFloat(getComputedStyle(el).textIndent)),
  ).toBeGreaterThan(0);
  await page.screenshot(shot("reading-area-edit-in-place"));

  // Escape leaves it as it was.
  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect(rows.nth(1)).toHaveCSS("opacity", "1");

  // Unchanged, leaving it saves nothing.
  await own.first().getByRole("button").click();
  await expect(box).toBeFocused();
  await page.getByRole("heading", { name: "Genesis 1" }).click();
  await expect(box).toBeHidden();
  await expect(own.first()).not.toContainText("Corrected");

  // A one-word change, saved by leaving it, is a correction of the KJV.
  await own.first().getByRole("button").click();
  await box.fill("In the beginning God created the heavens and the earth.");
  await page.getByRole("heading", { name: "Genesis 1" }).click();
  await expect(box).toBeHidden();
  await expect(own.first()).toContainText("created the heavens and the earth.");
  await expect(own.first()).toContainText("Corrected from the KJV");

  await own.nth(2).getByRole("button").click();
  const third = page.getByRole("textbox", { name: "The wording of Genesis 1:3" });
  // A bigger change, saved with Enter, is an adaptation.
  await third.fill("Then God spoke: Let light shine out, and light shone.");
  await third.press("Enter");
  await expect(own.nth(2)).toContainText("Let light shine out");
  await expect(own.nth(2)).toContainText("Adapted from the KJV");

  // Compare mode only reads.
  await page.goto("/compilations/place?book=Gen&chapter=1&mode=compare");
  await expect(own.first().getByRole("button")).toHaveCount(0);
});

test("vision §3.2: study mode paints each tagged word by its kind, and moves nothing", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Study Words", "Lexis");
  await page.goto("/compilations/lexis?book=Gen&chapter=4&mode=compare");
  await settled(page);
  const own = page.locator("td.compare-own");
  await expect(own.first()).toContainText("Adam knew Eve his wife");
  await expect(page.locator("td .study-word")).toHaveCount(0);

  // Where everything is, before.
  const boxes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("td.compare-own, .compare-grid")].map((e) => {
        const r = e.getBoundingClientRect();
        // Where it is on the page, not in the window: the click may scroll.
        return [
          Math.round(r.x + window.scrollX),
          Math.round(r.y + window.scrollY),
          Math.round(r.width),
          Math.round(r.height),
        ];
      }),
    );
  const before = await boxes();

  // The Study button opens a menu with the switch.
  const toggle = page.getByRole("button", { name: "Study", exact: true });
  await toggle.click();
  const menu = page.getByRole("dialog", { name: "Study" });
  await expect(menu).toBeVisible();
  const studySwitch = menu.getByRole("switch", { name: "Show word types" });
  await expect(studySwitch).not.toBeChecked();
  await studySwitch.click();
  await expect(page).toHaveURL(/mode=compare&study=1/);
  await expect(studySwitch).toBeChecked();
  // The key beside the switch is in color while word hints are on.
  const chip = menu.locator(".study-legend .study-word").first();
  await expect(chip).toHaveCSS("opacity", "1");

  // The compilation's own column has its tagged words as pieces, by kind.
  const words = own.first().locator(".study-word");
  await expect(words.first()).toBeVisible();
  await expect(own.first().locator('.study-word[data-category="person"]').first()).toContainText(
    "Eve",
  );
  await expect(own.first().locator('.study-word[data-category="verb"]').first()).toBeVisible();
  await expect(page.locator('.study-word[data-category="conjunction"]').first()).toBeVisible();
  // A word carries what it is: its number, and the word in the original language.
  await expect(own.first().locator('.study-word[data-strong="H3045"]').first()).toHaveAttribute(
    "title",
    /יָדַע · H3045/,
  );
  // What the colors mean is in the menu, which stays open: its words flow along in a row.
  const legend = menu.getByRole("list", { name: /^What the .{6,7} mean$/ });
  await expect(legend).toBeVisible();
  const chips = legend.getByRole("listitem");
  const [first, second] = [await chips.nth(0).boundingBox(), await chips.nth(1).boundingBox()];
  if (!first || !second) throw new Error("The legend isn't on screen.");
  expect(Math.abs(first.y - second.y)).toBeLessThan(3);
  expect(second.x).toBeGreaterThan(first.x);
  // It stays open until it's closed: moving away or clicking elsewhere doesn't close it.
  await page.mouse.move(5, 400);
  await page.mouse.click(5, 400);
  await expect(menu).toBeVisible();
  // Only the KJV family's words are marked: the ASV's tags don't line up with the original.
  const asv = page.locator("td").filter({ hasText: "the man knew Eve" }).first();
  await expect(asv).toBeVisible();
  await expect(asv.locator(".study-word")).toHaveCount(0);

  // Only paint: no text, row or column moved.
  expect(await boxes()).toEqual(before);
  // The colors are backgrounds, not the text's.
  const verb = own.first().locator('.study-word[data-category="verb"]').first();
  expect(await verb.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(
    "rgba(0, 0, 0, 0)",
  );
  expect(await verb.evaluate((e) => getComputedStyle(e).color)).toBe(
    await own.first().evaluate((e) => getComputedStyle(e).color),
  );
  await page.screenshot(shot("reading-area-study"));

  // Words that are one piece of the Hebrew ("freely eat") share a dashed outline.
  await page.goto("/compilations/lexis?book=Gen&chapter=2&mode=compare&study=1");
  const unit = page.locator("td.compare-own .c-study-unit").first();
  await expect(unit).toContainText("freely eat");
  expect(await unit.evaluate((e) => getComputedStyle(e).outlineStyle)).toBe("dashed");
  // The chapter links and the modes keep study mode.
  await expect(page.getByRole("link", { name: "Next: Genesis 3" })).toHaveAttribute(
    "href",
    /study=1/,
  );
  await expect(
    page.getByRole("navigation", { name: "Reading mode" }).getByRole("link", { name: "Edit" }),
  ).toHaveAttribute("href", /mode=edit&study=1/);
  await expect(
    page.getByRole("navigation", { name: "Reading mode" }).getByRole("link", { name: "Read" }),
  ).not.toHaveAttribute("href", /study/);

  // Off again, the marks are gone; the menu closes with its ×.
  await page.getByRole("button", { name: "Study", exact: true }).click();
  const again = page.getByRole("dialog", { name: "Study" });
  await again.getByRole("switch", { name: "Show word types" }).click();
  await expect(page.locator("td .study-word")).toHaveCount(0);
  // And the key goes grey and faded.
  await expect(again.locator(".study-legend .study-word").first()).toHaveCSS("opacity", "0.45");
  await expect(again).toBeVisible();
  await again.getByRole("button", { name: "Close" }).click();
  await expect(again).toBeHidden();
});

/** Drags the mouse across a locator's text, as a person selects it. */
async function dragAcross(page: Page, target: import("@playwright/test").Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Nothing to select.");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 1, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, y, { steps: 6 });
  await page.mouse.up();
}

test("vision §3.2: selecting words in study mode opens a tooltip with what they are", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Pick Words", "Pickup");
  await page.goto("/compilations/pickup?book=Gen&chapter=4&mode=compare&study=1");
  await settled(page);
  const own = page.locator("td.compare-own").first();
  const tip = page.getByRole("dialog", { name: "The selected words" });
  await expect(tip).toBeHidden();

  // Let go of the mouse after selecting a word: the tooltip opens by it.
  await dragAcross(page, own.locator('.study-word[data-strong="H2332"]').first());
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Eve");
  await expect(tip).toContainText("H2332");
  await expect(tip).toContainText(/[\u0590-\u05FF]{3}/);
  await expect(tip).toContainText(/Used \d+ times? in the original text/);
  await page.screenshot(shot("reading-area-study-tip"));
  // The dictionaries' entries open from it, and a click in it keeps the selection.
  await tip.getByRole("button", { name: "Dictionary" }).click();
  await expect(tip.locator("dt").first()).toBeVisible();
  await expect(tip).toBeVisible();
  // Escape, or a click elsewhere, closes it.
  await page.keyboard.press("Escape");
  await expect(tip).toBeHidden();

  // Words that aren't marked (another translation's column) say so.
  const asv = page.locator("td").filter({ hasText: "the man knew Eve" }).first();
  // Words in another translation's column, dragged across on its first line.
  const box = await asv.boundingBox();
  if (!box) throw new Error("No ASV column.");
  await page.mouse.move(box.x + 24, box.y + 14);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 24, box.y + 14, { steps: 6 });
  await page.mouse.up();
  await expect(tip).toContainText("No marked words in this selection");
  await page.mouse.click(5, 5);
  await expect(tip).toBeHidden();

  // In edit mode, selecting the compilation's text isn't a click that changes its wording.
  await page.goto("/compilations/pickup?book=Gen&chapter=4&mode=edit&study=1");
  await settled(page);
  const verse = page.locator("td.compare-own").first();
  await dragAcross(page, verse.locator('.study-word[data-strong="H2332"]').first());
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("Eve");
  await expect(page.getByRole("textbox", { name: /^The wording of/ })).toHaveCount(0);
  // With the tooltip open, a click on a verse only closes it: it isn't a take or an edit.
  const asvCell = page.locator("td").filter({ hasText: "the man knew Eve" }).first();
  await asvCell.getByRole("button").first().click();
  await expect(tip).toBeHidden();
  // And it stays closed: the old selection doesn't open it again a moment later.
  await page.evaluate(() => new Promise((done) => setTimeout(done, 300)));
  await expect(tip).toBeHidden();
  await expect(verse).toContainText("Adam knew Eve");
  await expect(page.getByRole("textbox", { name: /^The wording of/ })).toHaveCount(0);
  await dragAcross(page, verse.locator('.study-word[data-strong="H2332"]').first());
  await expect(tip).toBeVisible();
  await verse.getByRole("button").first().click();
  await expect(tip).toBeHidden();
  await expect(page.getByRole("textbox", { name: /^The wording of/ })).toHaveCount(0);
  // With it closed, a plain click still changes the wording.
  await verse.getByRole("button").first().click();
  await expect(page.getByRole("textbox", { name: /^The wording of/ })).toBeVisible();
});
