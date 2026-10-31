import { expect, test } from "@playwright/test";
import { shot, signUp } from "./support.ts";

test("the landing page offers translations and a passage box", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Translation" })).toBeVisible();
  await page.screenshot(shot("landing"));
});

test("the home search finds a passage, and picking it opens the reader", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Translation" }).selectOption("leb");
  const field = page.getByRole("combobox", { name: "Passage or words" });
  await field.fill("gen 2 18-25");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("listitem").filter({ hasText: "Genesis 2:18" }).first().click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2\/18-25$/);
  await expect(page.getByRole("heading", { level: 1, name: "Genesis 2:18–25" })).toBeVisible();
});

test("the home page has its search field in the page itself, and it reads a passage without scripts", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("textbox", { name: "Passage or words" }).fill("Genesis 1");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/read\/[^/]+\/genesis\/1$/);
  await context.close();
});

test("signed in, the home page has no header links; the book opens the account page", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await signUp(page);
  await page.goto("/");
  const header = page.locator(".site-header");
  await expect(header.getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await page.getByRole("link", { name: "Your account" }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("the home search opens with John 3:16 in the field, already searched", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Passage or words" })).toHaveValue("John 3:16");
  await expect(page.locator("st-search-results")).toContainText("John 3:16");
  // The verse shows whole, not cut after a few lines (the search is asked for a longer preview).
  await expect(page.locator("st-search-results")).toContainText("will have eternal life");
});

test("the home search lists verses with the words, narrowed to the translation chosen", async ({
  page,
}) => {
  await page.goto("/");
  // The search component has taken over from the stand-in field, and its scope follows the choice.
  await expect(page.getByRole("combobox", { name: "Passage or words" })).toBeVisible();
  await page.getByRole("combobox", { name: "Translation" }).selectOption("eng-kjv");
  await page.getByRole("combobox", { name: "Passage or words" }).fill("Cain");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const results = page.locator("st-search-results");
  await expect(results).toContainText("Genesis 4");
  await expect(results).not.toContainText("LEB");
});

test("the passage's title is edited in place, and the translation is chosen at the top", async ({
  page,
}) => {
  await page.goto("/read/leb/genesis/2/18-25");
  // No form fields above the chapter bar any more.
  await expect(page.getByRole("textbox", { name: "Passage" })).toHaveCount(0);
  await page.getByRole("button", { name: "Genesis 2:18–25" }).click();
  const field = page.getByRole("textbox", { name: "Passage" });
  await expect(field).toBeFocused();
  // Escape puts the title back.
  await page.keyboard.press("Escape");
  await expect(field).toHaveCount(0);
  // Leaving the field puts the title back; at rest it shows a pencil.
  await expect(page.locator(".passage-title-icon")).toBeVisible();
  await page.getByRole("button", { name: "Genesis 2:18–25" }).click();
  await page.locator("h2, .reading-bar").first().click();
  await expect(field).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Genesis 2:18–25" })).toBeVisible();
  await page.getByRole("button", { name: "Genesis 2:18–25" }).click();
  await field.fill("Psalm 23");
  await page.getByRole("button", { name: "Read", exact: true }).click();
  await expect(page).toHaveURL(/\/read\/leb\/psalms\/23$/);
  // Another translation: the same passage in it.
  await page.getByRole("combobox", { name: "Translation" }).selectOption("eng-kjv");
  await expect(page).toHaveURL(/\/read\/eng-kjv\/psalms\/23$/);
  await page.screenshot(shot("passage-title"));
});

test("a part of a chapter has a button for the verses around it, until it's the whole chapter", async ({
  page,
}) => {
  await page.goto("/read/leb/genesis/2/18-19");
  const more = page.getByRole("link", { name: "Show 3 more verses before and after" });
  await more.click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2\/15-22$/);
  await expect(page.locator(".verse", { hasText: "15" })).toBeVisible();
  // Each step adds three verses each side, until the chapter's start and end are reached.
  await more.click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2\/12-25$/);
  await more.click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2\/9-25$/);
  // The whole chapter in one press, from any part of it.
  await page.goto("/read/leb/genesis/2/18-19");
  await page.getByRole("link", { name: "Read the whole chapter" }).click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2$/);
  await expect(more).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Read the whole chapter" })).toHaveCount(0);
  await page.goto("/read/leb/genesis/1");
  await expect(more).toHaveCount(0);
});

test("LEB Genesis 2: idiom brackets, verse numbers and the translator's notes", async ({
  page,
}) => {
  await page.goto("/read/leb/genesis/2/18-25");
  const idiom = page.locator(".idiom").first();
  await expect(idiom).toContainText("⸤");
  await expect(page.locator(".verse", { hasText: "23" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Translator's notes" }).locator("li").first(),
  ).toBeVisible();
  // licenses.md §3.1: "(LEB)" after the quotation and the credit statement, linked.
  await expect(page.locator(".scripture .designation")).toHaveText(" (LEB)");
  await expect(page.locator(".designation a")).toHaveAttribute(
    "href",
    "http://www.lexhamenglishbible.com",
  );
  await expect(page.locator(".attribution")).toContainText(
    "Scripture quotations marked (LEB) are from the Lexham English Bible.",
  );
  await expect(page.getByRole("link", { name: "Logos Bible Software" }).first()).toHaveAttribute(
    "href",
    "http://www.logos.com",
  );
  await page.screenshot(shot("leb-genesis-2"));
});

test("a note mark links to its note", async ({ page }) => {
  await page.goto("/read/leb/genesis/2/18-25");
  const mark = page.locator(".note-mark a").first();
  const target = await mark.getAttribute("href");
  await mark.click();
  await expect(page.locator(`${target}`)).toBeInViewport();
});

test("KJV Psalm 23: poetry lines and a Psalm title", async ({ page }) => {
  await page.goto("/read/eng-kjv/psalms/23");
  await expect(page.locator(".scripture .b-q1, .scripture .b-q2").first()).toBeVisible();
  await page.screenshot(shot("kjv-psalm-23"));
});

test("an unknown book is answered in words", async ({ page }) => {
  await page.goto("/read?t=leb&ref=Hezekiah%201");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "We couldn't find a book by that name.",
  );
  await page.screenshot(shot("error"));
});

test("vision §3.4: without a canon, books the traditions disagree on are labelled", async ({
  page,
}) => {
  await page.goto("/read/eng-web/tobit/1");
  await expect(
    page.getByText("Counted as scripture in some traditions, not in others."),
  ).toBeVisible();
  await page.goto("/read/eng-web/ruth/1");
  await expect(page.locator(".canon-note")).toHaveCount(0);
});

test("vision §3.4: the book list, then chapter by chapter", async ({ page }) => {
  await page.goto("/read/eng-web");
  await expect(page.getByRole("heading", { name: "Books of the WEB" })).toBeVisible();
  await expect(page.getByText("Sign in and choose your canon")).toBeVisible();
  // The books are the editor's tabs: a section at a time (Old Testament first), the books of
  // the one chosen below. Tobit is in the tab for books the traditions disagree on.
  const tabs = page.getByRole("tablist", { name: "Books by section" });
  await expect(tabs.getByRole("tab", { name: "Old Testament" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await tabs.getByRole("tab", { name: "In some traditions" }).click();
  await expect(page.getByRole("link", { name: /^Tobit/ })).toBeVisible();
  await tabs.getByRole("tab", { name: "Old Testament" }).click();
  await page.screenshot(shot("books"));
  await page.getByRole("link", { name: /^Genesis/ }).click();
  await expect(page).toHaveURL(/\/read\/eng-web\/genesis\/1$/);
  // The passage page has the same tabs, on the book being read, and the chapter bar over the text.
  await expect(page.locator(".reading-bar .chapter-button")).toHaveText("1");
  // The bar stays at the top of the window while the chapter scrolls.
  await page.mouse.wheel(0, 1500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
  expect((await page.locator(".reading-bar").boundingBox())?.y).toBeLessThan(40);
  await expect(
    page.getByRole("tablist", { name: "Books by section" }).getByRole("tab", {
      name: "Old Testament",
    }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: /^Genesis/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // The book being read is highlighted in the list.
  await expect(page.getByRole("link", { name: /^Genesis/ })).toHaveCSS(
    "background-color",
    "rgb(198, 233, 250)",
  );
  await page.getByRole("link", { name: "Next: Genesis 2" }).click();
  await expect(page).toHaveURL(/\/genesis\/2$/);
  await expect(page.getByRole("link", { name: "Previous: Genesis 1" })).toBeVisible();

  // Without a canon, the Old Testament runs on into the New.
  await page.goto("/read/eng-web/malachi/4");
  await expect(page.getByRole("link", { name: "Next: Matthew 1" })).toBeVisible();
});

test("the credits page names every asset and data source (branding.md §1)", async ({ page }) => {
  await page.goto("/credits");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Credits" })).toBeVisible();
  await expect(main.getByRole("link", { name: "The Big Username Blocklist" })).toBeVisible();
  await expect(main.getByRole("link", { name: "shouldbee/reserved-usernames" })).toBeVisible();
  // The original-language data's credit, as its CC BY licenses require.
  await expect(main.getByRole("link", { name: "STEPBible-Data" })).toHaveAttribute(
    "href",
    "https://www.STEPBible.org",
  );
  await expect(main.getByText("descriptions of the names were written by an AI")).toBeVisible();
  await expect(
    main.getByRole("link", { name: "Open Scriptures Hebrew Bible Project" }),
  ).toBeVisible();
  await page.screenshot(shot("credits"));
});
