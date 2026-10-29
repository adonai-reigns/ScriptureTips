import { expect, test } from "@playwright/test";
import { shot } from "./support.ts";

test("the landing page offers translations and a passage box", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Translation" })).toBeVisible();
  await page.screenshot(shot("landing"));
});

test("the search form reads a reference and opens its passage", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Translation" }).selectOption("leb");
  await page.getByRole("textbox", { name: "Passage" }).fill("gen 2 18-25");
  await page.getByRole("button", { name: "Read" }).click();
  await expect(page).toHaveURL(/\/read\/leb\/genesis\/2\/18-25$/);
  await expect(page.getByRole("heading", { level: 1, name: "Genesis 2:18–25" })).toBeVisible();
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
  const varies = page.getByRole("region", { name: "In some traditions" });
  await expect(varies.getByText("Tobit")).toBeVisible();
  await page.getByText("Genesis", { exact: true }).click();
  await page.screenshot(shot("books"));

  await page.getByRole("link", { name: "Genesis 1", exact: true }).click();
  await expect(page).toHaveURL(/\/read\/eng-web\/genesis\/1$/);
  await page.getByRole("link", { name: "Next: Genesis 2" }).click();
  await expect(page).toHaveURL(/\/genesis\/2$/);
  await expect(page.getByRole("link", { name: "Previous: Genesis 1" })).toBeVisible();

  // Without a canon, the Old Testament runs on into the New.
  await page.goto("/read/eng-web/malachi/4");
  await expect(page.getByRole("link", { name: "Next: Matthew 1" })).toBeVisible();
  await page.getByRole("link", { name: "Books" }).click();
  await expect(page).toHaveURL(/\/read\/eng-web$/);
});

test("the credits page names every asset and data source (branding.md §1)", async ({ page }) => {
  await page.goto("/credits");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Credits" })).toBeVisible();
  await expect(main.getByRole("link", { name: "The Big Username Blocklist" })).toBeVisible();
  await expect(main.getByRole("link", { name: "shouldbee/reserved-usernames" })).toBeVisible();
  await page.screenshot(shot("credits"));
});
