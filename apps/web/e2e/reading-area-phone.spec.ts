import { expect as baseExpect, type Locator, type Page, test } from "@playwright/test";
import { arriveFromOwnAddress, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

// A phone's compare and edit modes: the desktop's table is replaced by one column.
test.skip(({ isMobile }) => !isMobile, "The phone layout only.");

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
  // Sprung back into place once let go.
  await expect
    .poll(() => first.evaluate((e) => getComputedStyle(e).transform))
    .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await page.screenshot({ ...shot("reading-area-phone-swiped"), fullPage: false });

  // Swiped right, the one before; a short drag springs back without changing.
  await swipe(page, first, 120);
  await expect(first.locator(".compare-list-source")).toHaveText("ASV");
  await swipe(page, first, 20);
  await expect(first.locator(".compare-list-source")).toHaveText("ASV");
  await expect.poll(() => first.evaluate((e) => e.style.transform)).toBe("");

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
