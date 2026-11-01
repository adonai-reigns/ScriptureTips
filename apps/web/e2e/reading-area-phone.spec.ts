import { expect as baseExpect, type Locator, type Page, test } from "@playwright/test";
import {
  arriveFromOwnAddress,
  longPress,
  openNewCompilation,
  openStudy,
  shot,
  signUp,
  tapAt,
  touchDrag,
} from "./support.ts";

arriveFromOwnAddress();

// A phone's compare and edit modes: the desktop's table is replaced by one column.
test.skip(({ isMobile }) => !isMobile, "The phone layout only.");

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

const box = (page: Page, selector: string) =>
  page.locator(selector).evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });

/** Scrolls the chapter's first verse to just under the sticky head, where it's read from. */
const toVerses = (page: Page) =>
  page
    .locator(".compare-list")
    .evaluate((e) => window.scrollBy(0, e.getBoundingClientRect().top - 120));

/** Swipes a verse sideways with a finger (real touch events): `dx` < 0 is left. */
async function swipe(page: Page, verse: Locator, dx: number) {
  const r = await verse.boundingBox();
  if (!r) throw new Error("The verse isn't on screen.");
  const cdp = await page.context().newCDPSession(page);
  const y = r.y + r.height / 2;
  const x = r.x + r.width / 2 - dx / 2;
  const touch = (type: string, at: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: at, y }],
    });
  await touch("touchStart", x);
  for (let i = 1; i <= 8; i++) await touch("touchMove", x + (dx * i) / 8);
  await touch("touchEnd", x + dx);
  await cdp.detach();
}

test("vision §3.1: compare on a phone, one column, each verse swiped through the translations", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Pocket", "Pocket");
  await page.goto("/compilations/pocket?book=Gen&chapter=1&mode=compare");
  await page.waitForLoadState("networkidle");

  // One column of the compilation's verses; the table isn't shown, nor a footer.
  await expect(page.getByRole("table")).toBeHidden();
  const verses = page.locator(".compare-list-verse");
  await expect(verses).toHaveCount(31);
  await expect(verses.first()).toContainText("In the beginning God created the heaven");
  // Every verse names where it comes from: here, the base.
  await expect(verses.locator(".compare-list-source.own")).toHaveCount(31);
  await expect(verses.first().locator(".compare-list-source")).toHaveText("Pocket: KJV");
  await toVerses(page);
  await page.screenshot({ ...shot("reading-area-phone-compare"), fullPage: false });

  // Swiped left, a verse shows the next translation (ASV, BSB, DRA); the others keep theirs.
  const first = verses.first();
  await swipe(page, first, -120);
  await expect(first.locator(".compare-list-source")).toHaveText("ASV");
  await swipe(page, first, -120);
  await expect(first.locator(".compare-list-source")).toHaveText("BSB");
  await expect(first).toContainText("In the beginning God created the heavens");
  await expect(verses.nth(1)).not.toContainText("BSB");
  // Faded in where it was: it doesn't move with the finger.
  await expect.poll(() => first.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
  await expect(first).toHaveCSS("transform", "none");
  await page.screenshot({ ...shot("reading-area-phone-swiped"), fullPage: false });

  // Swiped right, the one before; a short drag changes nothing.
  await swipe(page, first, 120);
  await expect(first.locator(".compare-list-source")).toHaveText("ASV");
  await swipe(page, first, 20);
  await expect(first.locator(".compare-list-source")).toHaveText("ASV");

  // Round past the first, to the last; and round past the last, back to the compilation's.
  await swipe(page, verses.nth(2), 120);
  await expect(verses.nth(2).locator(".compare-list-source")).toHaveText("DRA");
  await expect(verses.nth(2)).toContainText("Be light made");
  await swipe(page, verses.nth(2), -120);
  await expect(verses.nth(2).locator(".compare-list-source.own")).toHaveText(/KJV$/);
  await expect(verses.nth(2)).toContainText("Let there be light");

  // The arrow keys turn a focused verse too.
  await verses.nth(3).focus();
  await page.keyboard.press("ArrowRight");
  await expect(verses.nth(3).locator(".compare-list-source")).toHaveText("ASV");
  await page.keyboard.press("ArrowLeft");
  await expect(verses.nth(3).locator(".compare-list-source.own")).toHaveText(/KJV$/);

  // Scrolled, the head stays at the top.
  await page.mouse.wheel(0, 1500);
  await expect.poll(async () => (await box(page, ".reading-head")).top).toBeLessThan(2);
});

test("vision §3.1: on a phone, the book's name in the head opens the books", async ({ page }) => {
  test.setTimeout(90_000);
  await create(page, "Book Picker", "Picker");
  await page.goto("/compilations/picker?book=Gen&chapter=1&mode=edit");
  await page.waitForLoadState("networkidle");
  const head = page.locator(".reading-head");
  const picker = head.getByRole("navigation", { name: "Books" });
  await expect(picker).toBeHidden();
  await head.getByRole("button", { name: "Genesis" }).click();
  await expect(picker).toBeVisible();
  await page.screenshot({ ...shot("reading-area-phone-books"), fullPage: false });
  await picker.getByRole("tab", { name: "New Testament" }).click();
  await picker.getByRole("link", { name: /^Matthew/ }).click();
  await expect(page).toHaveURL(/book=Matt&chapter=1&mode=edit/);
  await expect(head.getByRole("button", { name: "Matthew" })).toBeVisible();
  await expect(picker).toBeHidden();
});

test("vision §3.1: on a phone, read mode's ⋮ names what's read, the compilation too", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Read Phone", "Glance");
  await page.goto("/compilations/glance?book=Gen&chapter=1&mode=read");
  await page.waitForLoadState("networkidle");
  const toggle = page.getByRole("button", { name: "Translation to read: reading the Glance" });
  await expect(toggle).toHaveText("Glance");
  await page.screenshot({ ...shot("reading-area-phone-read-choice"), fullPage: false });
  // Held back a moment, so the spinner can be seen while it loads.
  await page.route(/read=bsb/, async (route) => {
    await new Promise((done) => setTimeout(done, 1_000));
    await route.continue();
  });
  await toggle.click();
  await page.getByRole("menuitemradio", { name: /^BSB:/ }).click();
  const named = page.getByRole("button", { name: /^Translation to read/ });
  await expect(named.locator(".spinner")).toBeVisible();
  await expect(named).toHaveText("BSB");
  await expect(named.locator(".spinner")).toBeHidden();
});

test("vision §3.1: on a phone, the ⋮ beside the modes picks the translations compared with", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Chooser", "Chooser");
  await page.goto("/compilations/chooser?book=Gen&chapter=1&mode=compare");
  await page.waitForLoadState("networkidle");
  const head = page.locator(".reading-head");
  // Against the right edge, level with the head's bar.
  const toggle = head.getByRole("button", { name: "Translations to compare with" });
  const edge = async (l: Locator) => {
    const r = await l.boundingBox();
    return r ? Math.round(r.x + r.width) : 0;
  };
  expect(await edge(toggle)).toBe(await edge(head.locator(".reading-bar")));
  await toggle.click();
  const menu = page.getByRole("dialog", { name: /^Compare with/ });
  await expect(menu).toBeVisible();
  const box = (name: RegExp) => menu.getByRole("checkbox", { name });
  await expect(box(/^ASV:/)).toBeChecked();
  await expect(box(/^WEB:/)).not.toBeChecked();
  await page.screenshot({ ...shot("reading-area-phone-choice"), fullPage: false });

  // Checked, it's saved and compared with, last; cleared, it goes.
  await box(/^WEB:/).check();
  await expect(menu).toHaveAttribute("aria-busy", "false");
  await box(/^ASV:/).uncheck();
  await expect(menu).toHaveAttribute("aria-busy", "false");
  const first = page.locator(".compare-list-verse").first();
  for (const name of ["BSB", "DRA", "WEB"]) {
    await first.focus();
    await page.keyboard.press("ArrowRight");
    await expect(first.locator(".compare-list-source")).toHaveText(name);
  }

  // Kept with the compilation.
  await page.reload();
  await head.getByRole("button", { name: "Translations to compare with" }).click();
  await expect(box(/^WEB:/)).toBeChecked();
  await expect(box(/^ASV:/)).not.toBeChecked();

  // The last one can't be cleared.
  await box(/^BSB:/).uncheck();
  await expect(menu).toHaveAttribute("aria-busy", "false");
  await box(/^DRA:/).uncheck();
  await expect(menu).toHaveAttribute("aria-busy", "false");
  await expect(box(/^WEB:/)).toBeDisabled();

  // Escape closes it.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("vision §3.1: in edit mode on a phone, swiped verses are saved from the footer", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Swipe Save", "Swipes");
  await page.goto("/compilations/swipes?book=Gen&chapter=1&mode=edit");
  await page.waitForLoadState("networkidle");
  const verses = page.locator(".compare-list-verse");
  await toVerses(page);
  const footer = page.getByRole("region", { name: "Changes not saved" });
  await expect(footer).toBeHidden();

  // Two verses turned to the BSB: the footer counts them.
  for (const i of [0, 2]) {
    await verses.nth(i).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(verses.nth(i).locator(".compare-list-source")).toHaveText("BSB");
  }
  await expect(footer).toContainText("2 verses changed");
  const height = page.viewportSize()?.height ?? 0;
  expect(Math.abs((await box(page, ".compare-save")).bottom - height)).toBeLessThan(2);
  await page.screenshot({ ...shot("reading-area-phone-unsaved"), fullPage: false });

  // Undo puts them back.
  await footer.getByRole("button", { name: "Undo" }).click();
  await expect(footer).toBeHidden();
  await expect(verses.first()).toContainText("In the beginning God created the heaven and");

  // Saved, they're the compilation's own wording, and the footer goes.
  await verses.first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await footer.getByRole("button", { name: "Save" }).click();
  await expect(footer).toBeHidden();
  // Saved, the verse names where it comes from now.
  await expect(verses.first().locator(".compare-list-source.own")).toHaveText(/BSB$/);
  await expect(verses.first()).toContainText("In the beginning God created the heavens and");
  await page.reload();
  await expect(page.locator(".compare-list-verse").first()).toContainText(
    "In the beginning God created the heavens and",
  );
  await expect(page.locator(".compare-list-verse").first().locator(".own")).toHaveText(/BSB$/);
  await toVerses(page);
  await page.screenshot({ ...shot("reading-area-phone-saved"), fullPage: false });

  // In compare mode, swiping only reads: no footer.
  await page.goto("/compilations/swipes?book=Gen&chapter=1&mode=compare");
  await page.locator(".compare-list-verse").nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator(".compare-list-verse").nth(1).locator(".compare-list-source"),
  ).toHaveText("ASV");
  await expect(footer).toBeHidden();
});

test("vision §3.1: on a narrow phone, nothing runs off the right edge", async ({ page }) => {
  test.setTimeout(90_000);
  await create(page, "Narrow", "Narrow");
  // A small phone's width (iPhone SE, many Androids are 360).
  await page.setViewportSize({ width: 360, height: 740 });
  for (const mode of ["read", "compare", "edit"]) {
    await page.goto(`/compilations/narrow?book=Gen&chapter=1&mode=${mode}`);
    await page.waitForLoadState("networkidle");
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, mode).toBeLessThanOrEqual(360);
    for (const name of ["Publish", "Build PDF", "Delete"]) {
      const r = await page.getByRole("button", { name, exact: true }).boundingBox();
      expect((r?.x ?? 0) + (r?.width ?? 0), `${name} in ${mode}`).toBeLessThanOrEqual(360);
    }
  }
  await page.goto("/compilations/narrow?book=Gen&chapter=1&mode=read");
  await page.screenshot({ ...shot("reading-area-phone-narrow"), fullPage: false });
});

test("domain-model §2.3: on a phone, compare remembers which translation each verse was swiped to", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await create(page, "Remember", "Remember");
  await page.goto("/compilations/remember?book=Gen&chapter=1&mode=compare");
  await page.waitForLoadState("networkidle");
  const verses = page.locator(".compare-list-verse");
  await verses.nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(verses.nth(1).locator(".compare-list-source")).toHaveText("BSB");
  await verses.nth(4).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(verses.nth(4).locator(".compare-list-source")).toHaveText("DRA");
  const saved = page.waitForResponse((r) => r.url().endsWith("/compare-shown"));
  await saved;
  await page.waitForLoadState("networkidle");

  // Opened again (another visit, as on another device): the verses come back as they were left.
  const again = await browser.newContext({
    ...test.info().project.use,
    storageState: await page.context().storageState(),
  });
  const other = await again.newPage();
  await other.goto("/compilations/remember?book=Gen&chapter=1&mode=compare");
  const back = other.locator(".compare-list-verse");
  await expect(back.nth(1).locator(".compare-list-source")).toHaveText("BSB");
  await expect(back.nth(4).locator(".compare-list-source")).toHaveText("DRA");
  await expect(back.nth(0).locator(".compare-list-source.own")).toHaveText(/KJV$/);

  // Edit mode starts from the compilation's wording: nothing waits to be saved.
  await other.goto("/compilations/remember?book=Gen&chapter=1&mode=edit");
  await expect(back.nth(1).locator(".compare-list-source.own")).toHaveText(/KJV$/);
  await expect(other.getByRole("region", { name: "Changes not saved" })).toBeHidden();

  // Swiped back to the compilation's own wording, it's forgotten.
  await other.goto("/compilations/remember?book=Gen&chapter=1&mode=compare");
  await back.nth(1).focus();
  for (let i = 0; i < 2; i++) await other.keyboard.press("ArrowLeft");
  await expect(back.nth(1).locator(".compare-list-source.own")).toHaveText(/KJV$/);
  await other.waitForResponse((r) => r.url().endsWith("/compare-shown"));
  await page.reload();
  await expect(verses.nth(1).locator(".compare-list-source.own")).toHaveText(/KJV$/);
  await expect(verses.nth(4).locator(".compare-list-source")).toHaveText("DRA");
  await again.close();
});

test("vision §3.1: on a phone, a long press on a book or a section opens its menu as a dialog", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Presses", "Presses");
  await page.goto("/compilations/presses?book=Gen&chapter=1&mode=read");
  await page.waitForLoadState("networkidle");
  const width = page.viewportSize()?.width ?? 0;
  const panel = page.getByRole("tabpanel").first();
  const book = (name: string) =>
    panel.locator("li > a").filter({ hasText: new RegExp(`^${name} `) });

  // No ⋮ shows: it's there only for screen readers.
  const icon = page.getByRole("button", { name: "Options for Genesis", exact: true });
  expect((await icon.locator("..").boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);

  // A long press opens the book's menu, on screen, and doesn't follow the link.
  for (const name of ["Genesis", "Ecclesiastes"]) {
    const dialog = page.getByRole("dialog", { name: `Change the translation of ${name}` });
    // Pressed again if the page's scripts weren't ready for the first.
    await expect(async () => {
      if (!(await dialog.isVisible())) await longPress(page, book(name));
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass();
    // It stays open once the finger lifts.
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();
    const r = await dialog.boundingBox();
    expect(r?.x ?? -1, name).toBeGreaterThanOrEqual(0);
    expect((r?.x ?? 0) + (r?.width ?? 0), name).toBeLessThanOrEqual(width);
    await expect(dialog.getByRole("button", { name: /\(current\)/ })).toHaveText(/^KJV:/);
    if (name === "Genesis") {
      await page.screenshot({ ...shot("reading-area-phone-book-dialog"), fullPage: false });
      // Its × closes it.
      await dialog.getByRole("button", { name: "Close" }).tap();
    } else {
      // So does a tap on the page behind it.
      await tapAt(page, 8, 8);
    }
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/book=Gen&chapter=1/);
  }

  // A quick tap still opens the book.
  await book("Exodus").tap();
  await expect(page).toHaveURL(/book=Exod/);

  // A section's tab opens the section's menu; choosing a translation, after the warning, gives
  // the whole section the new base.
  const section = page.getByRole("dialog", {
    name: "Change the translation of the Old Testament",
  });
  await expect(async () => {
    if (!(await section.isVisible()))
      await longPress(page, page.getByRole("tab", { name: "Old Testament" }).first());
    await expect(section).toBeVisible({ timeout: 1_000 });
  }).toPass();
  page.once("dialog", (d) => d.accept());
  await section.getByRole("button", { name: /^WEB:/ }).tap();
  await expect(section).toBeHidden({ timeout: 15_000 });
  await expect(book("Genesis")).toHaveText("Genesis WEB", { timeout: 15_000 });
});

/** Two quick taps on a verse (real touch events). */
async function doubleTap(page: Page, verse: Locator) {
  const r = await verse.boundingBox();
  if (!r) throw new Error("The verse isn't on screen.");
  const cdp = await page.context().newCDPSession(page);
  const at = [{ x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 30) }];
  for (let i = 0; i < 2; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  await cdp.detach();
}

test("vision §3.1: in edit mode on a phone, a double tap changes a verse's wording in place", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Tap Edit", "Taps");
  await page.goto("/compilations/taps?book=Gen&chapter=1&mode=edit");
  await page.waitForLoadState("networkidle");
  await toVerses(page);
  const verses = page.locator(".compare-list > li");

  // One tap does nothing; two edit the wording shown (here, the compilation's KJV).
  await verses.first().locator(".compare-list-verse").tap();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await doubleTap(page, verses.first().locator(".compare-list-verse"));
  const box = page.getByRole("textbox", { name: "The wording of Genesis 1:1" });
  await expect(box).toHaveValue("In the beginning God created the heaven and the earth.");
  // Its label stays, so the verse doesn't move.
  await expect(verses.first().locator(".compare-list-source")).toBeVisible();
  // The other verses fade while it's changed.
  await expect(verses.first()).toHaveCSS("opacity", "1");
  await expect(verses.nth(1)).toHaveCSS("opacity", "0.5");
  await page.screenshot({ ...shot("reading-area-phone-edit-in-place"), fullPage: false });
  // Saved by tapping elsewhere.
  await box.fill("In the beginning God created the heavens and the earth.");
  await page.locator(".reading-bar").tap();
  await expect(box).toBeHidden();
  await expect(verses.nth(1)).toHaveCSS("opacity", "1");
  await expect(verses.first()).toContainText("created the heavens and the earth.");
  await expect(verses.first().locator(".own")).toHaveText(/Corrected from the KJV$/);

  // A verse swiped to another translation starts from that one's wording, and saving takes it.
  const second = verses.nth(1).locator(".compare-list-verse");
  await second.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(second.locator(".compare-list-source")).toHaveText("BSB");
  await page.keyboard.press("Enter");
  const two = page.getByRole("textbox", { name: "The wording of Genesis 1:2" });
  await expect(two).toHaveValue(/^Now the earth was formless and void/);
  await expect(verses.nth(1).locator(".compare-list-source")).toHaveText("BSB");
  // Its number stays too.
  await expect(verses.nth(1).locator(".verse-in-place-number")).toHaveText(/^2/);
  // Only the editor saves it: the footer leaves it out.
  await expect(page.getByRole("region", { name: "Changes not saved" })).toBeHidden();
  await two.fill((await two.inputValue()).replace("formless", "shapeless"));
  await two.press("Enter");
  await expect(verses.nth(1)).toContainText("shapeless");
  await expect(verses.nth(1).locator(".own")).toHaveText(/Corrected from the BSB$/);
  await expect(page.getByRole("region", { name: "Changes not saved" })).toBeHidden();

  // Compare mode doesn't edit.
  await page.goto("/compilations/taps?book=Gen&chapter=1&mode=compare");
  await toVerses(page);
  await doubleTap(page, page.locator(".compare-list-verse").first());
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("vision §3.1: on a phone, quick turns of a verse each count", async ({ page }) => {
  test.setTimeout(90_000);
  await create(page, "Quick Turns", "Quick");
  await page.goto("/compilations/quick?book=Gen&chapter=1&mode=compare");
  await page.waitForLoadState("networkidle");
  const verse = page.locator(".compare-list-verse").first();
  // Three turns sent at once, before the page can redraw: ASV, BSB, then DRA.
  await verse.evaluate((el) => {
    for (let i = 0; i < 3; i++)
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  });
  await expect(verse.locator(".compare-list-source")).toHaveText("DRA");
});

test("vision §3.2: study mode on a phone paints the verses' tagged words, and moves nothing", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Study Phone", "Lexis");
  await page.goto("/compilations/lexis?book=Gen&chapter=4&mode=compare");
  await page.waitForLoadState("networkidle");
  const verses = page.locator(".compare-list-verse");
  await expect(verses.first()).toContainText("Adam knew Eve");
  await expect(page.locator(".compare-list .study-word")).toHaveCount(0);
  const boxes = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".compare-list-verse")].slice(0, 8).map((e) => {
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

  const opened = await openStudy(page);
  await expect(opened.getByRole("switch")).toBeChecked();
  await expect(page).toHaveURL(/mode=compare&study=1/);
  await expect(verses.first().locator('.study-word[data-category="person"]').first()).toContainText(
    "Eve",
  );
  expect(await boxes()).toEqual(before);
  // Nothing runs off the right edge with the button there.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await toVerses(page);
  await page.screenshot({ ...shot("reading-area-phone-study"), fullPage: false });
});

test("vision §3.2: on a phone, words can be selected in study mode, and the tooltip opens for a finger's selection", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Hold Words", "Hold");
  // Off, a verse is for swiping and can't be selected; in study mode it can (a long press then
  // selects a word, with handles to stretch the selection).
  await page.goto("/compilations/hold?book=Gen&chapter=4&mode=compare");
  await page.waitForLoadState("networkidle");
  const verse = page.locator(".compare-list-verse").first();
  await expect(verse).toBeVisible();
  expect(await verse.evaluate((e) => getComputedStyle(e).userSelect)).toBe("none");
  await page.goto("/compilations/hold?book=Gen&chapter=4&mode=compare&study=1");
  await page.waitForLoadState("networkidle");
  await expect(verse).toBeVisible();
  expect(await verse.evaluate((e) => getComputedStyle(e).userSelect)).toBe("text");

  // The phone makes the selection (the test's browser can't: it has no touch selection), after a
  // finger was put down; the tooltip opens once the selection has settled.
  const eve = verse.locator('.study-word[data-strong="H2332"]').first();
  // The scripts have taken over the page (the Study button works).
  await expect(page.getByRole("button", { name: "Study", exact: true })).toBeEnabled();
  // A finger goes down on the word, as it would to start the selection.
  await eve.scrollIntoViewIfNeeded();
  await eve.tap();
  await eve.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  // Not a pop-up over the selection (where the phone's own menu is): a bar along the bottom.
  const tip = page.getByRole("toolbar", { name: "The selected words" });
  await expect(tip).toBeVisible();
  const bar = await tip.boundingBox();
  const size = page.viewportSize();
  expect(bar && size && Math.abs(bar.y + bar.height - size.height) < 2).toBe(true);
  // Explain opens what the words are, above the buttons, and closes again.
  await tip.getByRole("button", { name: "Explain" }).tap();
  await expect(tip).toContainText("Eve");
  // The handles would show through the bar: the selection is let go, and the words are held.
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  expect(
    await page.evaluate(() =>
      [...(CSS.highlights.get("study-selection") ?? [])].map((range) => range.toString()),
    ),
  ).toEqual(["Eve"]);
  await tip.getByRole("button", { name: "Explain" }).tap();
  await expect(tip).not.toContainText("Eve");
  // Tapping a button in the tooltip works: it isn't taken for the selection going.
  await tip.getByRole("button", { name: "Search", exact: true }).tap();
  await expect(tip).toBeHidden();
  const study = page.getByRole("dialog", { name: "Study" });
  await expect(study).toBeVisible();
  // The browser's selection is let go, so a phone's handles and toolbar don't show over the window;
  // the words are held, and drawn as a highlight, for what works on them next.
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
  expect(
    await page.evaluate(() =>
      [...(CSS.highlights.get("study-selection") ?? [])].map((range) => range.toString()),
    ),
  ).toEqual(["Eve"]);
  await expect(study.getByRole("combobox", { name: "Search" })).toHaveValue("Eve");
});

test("vision §3.2: on a phone, the study window stays on screen and its corner can be dragged", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await create(page, "Size Window", "Sizer");
  await page.goto("/compilations/sizer?book=Gen&chapter=4&mode=compare");
  await page.waitForLoadState("networkidle");
  const study = await openStudy(page);
  // The search is loaded once the window has it.
  await expect(study.getByRole("combobox", { name: "Search" })).toBeVisible();
  // A search that fills the window with results: it must not run off the bottom of the screen.
  await page.evaluate(() =>
    (
      window as unknown as {
        ScriptureTipsSearch: { get(n: string): { setQuery(q: string, o: object): unknown } };
      }
    ).ScriptureTipsSearch.get("study").setQuery("love", { search: true }),
  );
  await expect(study.getByRole("heading", { name: "Verses" })).toBeVisible();
  const view = page.viewportSize();
  const before = await study.boundingBox();
  const handle = study.locator(".study-menu-resize");
  const grip = await handle.boundingBox();
  if (!view || !before || !grip) throw new Error("The window isn't on screen.");
  expect(before.y + before.height).toBeLessThanOrEqual(view.height);
  expect(grip.y + grip.height).toBeLessThanOrEqual(view.height);
  expect(grip.x + grip.width).toBeLessThanOrEqual(view.width);
  // A thumb-sized area to grab.
  expect(grip.width).toBeGreaterThanOrEqual(40);

  // Drag the corner up and in: the window gets smaller, as the finger moves.
  const corner = { x: grip.x + grip.width - 12, y: grip.y + grip.height - 12 };
  await touchDrag(page, corner, { x: corner.x - 70, y: corner.y - 120 });
  await expect
    .poll(async () => (await study.boundingBox())?.height ?? 0)
    .toBeLessThan(before.height - 60);
  const after = await study.boundingBox();
  expect(after?.width ?? 0).toBeLessThan(before.width - 40);
  // And the results scroll inside it.
  const results = study.locator("st-search-results");
  expect(await results.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await page.screenshot({ ...shot("reading-area-phone-study-window"), fullPage: false });
});

test("vision §3.2: on a phone, study mode moves the modes into the ⋮ menu, and starts the window as a bar", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await create(page, "Study Menu", "Modes");
  await page.goto("/compilations/modes?book=Gen&chapter=1&mode=compare");
  await page.waitForLoadState("networkidle");
  const head = page.locator(".reading-head");
  const modes = head.getByRole("navigation", { name: "Reading mode" });
  // Without study mode the modes stay in the head.
  await expect(modes).toBeVisible();

  await page.getByRole("button", { name: "Study", exact: true }).click();
  const study = page.getByRole("dialog", { name: "Study" });
  await expect(study.getByRole("button", { name: "Expand the study window" })).toBeVisible();
  // The head has room for the bar, at its far left; the modes have left it.
  await expect(modes).toBeHidden();
  await expect
    .poll(async () => {
      const [bar, area, button] = [
        await study.boundingBox(),
        await head.boundingBox(),
        await head.getByRole("button", { name: "Study", exact: true }).boundingBox(),
      ];
      return (
        !!bar &&
        !!area &&
        !!button &&
        Math.abs(bar.x - area.x) < 3 &&
        Math.round(bar.width) === 176 &&
        button.x >= bar.x + bar.width - 1
      );
    })
    .toBe(true);
  await page.screenshot({ ...shot("reading-area-phone-study-bar"), fullPage: false });

  // They are in the ⋮ menu, which closes when one is chosen.
  await head.getByRole("button", { name: "Translations to compare with" }).click();
  const menu = page.locator(".compare-choice");
  const inMenu = menu.getByRole("navigation", { name: "Reading mode" });
  await expect(inMenu.getByRole("link")).toHaveText(["Read", "Compare", "Edit"]);
  await expect(inMenu.getByRole("link", { name: "Compare" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.screenshot({ ...shot("reading-area-phone-study-menu"), fullPage: false });
  await inMenu.getByRole("link", { name: "Edit" }).click();
  await expect(page).toHaveURL(/mode=edit&study=1/);
  await expect(menu).toBeHidden();

  // Study mode off: the modes are back in the head.
  await page.getByRole("button", { name: "Study", exact: true }).click();
  await expect(page).not.toHaveURL(/study=1/);
  await expect(modes).toBeVisible();
});
