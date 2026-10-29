import { readFileSync } from "node:fs";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { arriveFromOwnAddress, openEditorDialog, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

/** A book's link in the book tabs: its name, then its translation's abbreviation. */
const bookLink = (panel: Locator, name: string) =>
  panel.locator("li > a").filter({ hasText: new RegExp(`^${name} `) });

/**
 * Takes a section, book, chapter or passage from another translation through the API (the
 * editor no longer has a form for it), then reloads the page.
 */
async function addRule(
  page: Page,
  slug: string,
  scope: { section: string } | { reference: string },
  source: string,
) {
  const status = await page.evaluate(
    async ([url, body]) =>
      (
        await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        })
      ).status,
    [`/api/compilations/${slug}/rules`, JSON.stringify({ scope, source })] as const,
  );
  expect(status).toBe(201);
  await page.reload();
}

test("domain-model §2.3: build a compilation in layers, read it, and delete it", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const handle = await signUp(page);

  await page.getByRole("link", { name: "Compilations" }).click();
  await expect(page.getByText("You haven't made a compilation yet.")).toBeVisible();
  await page.getByRole("textbox", { name: "Title" }).fill("My Study Bible");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Mine");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/mine$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "My Study Bible Mine", level: 1 })).toBeVisible();

  // Genesis 1 from the LEB, and the New Testament from the WEB.
  await addRule(page, "mine", { reference: "Genesis 1" }, "leb");
  await addRule(page, "mine", { section: "nt" }, "eng-web");
  const panel = page.getByRole("tabpanel");
  await expect(bookLink(panel, "Genesis")).toHaveText("Genesis KJV");
  await page.getByRole("tab", { name: "New Testament" }).click();
  await expect(bookLink(panel, "Matthew")).toHaveText("Matthew WEB");
  await expect(page.getByRole("figure").getByRole("listitem")).toHaveText(
    [/^KJV/, /^WEB/, /^LEB/],
    { timeout: 30_000 },
  );
  await page.screenshot(shot("compilation-editor"));

  // Reading it: each verse from its layer, credited.
  await page.goto(`/read/@${handle}/mine/genesis/1`);
  await expect(page.getByText("My Study Bible, compiled from Lexham English Bible.")).toBeVisible();
  await page.screenshot(shot("compilation-reader"));
  await page.getByRole("link", { name: "Next: Genesis 2" }).click();
  await expect(page.getByText(/^My Study Bible, compiled from King James Version/)).toBeVisible();
  await page.goto(`/read/@${handle}/mine`);
  await expect(page.getByRole("heading", { name: "Books of the Mine" })).toBeVisible();

  // Giving Genesis the base again drops the passage taken from elsewhere.
  await page.goto("/compilations/mine");
  const genesis = bookLink(page.getByRole("tabpanel"), "Genesis");
  await genesis.hover();
  await page.getByRole("button", { name: "Options for Genesis" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("menuitem", { name: /^KJV:/ }).click();
  await expect(page.getByRole("figure").getByRole("listitem")).toHaveText([/^KJV/, /^WEB/], {
    timeout: 30_000,
  });

  // Deleting asks for the phrase to be typed first.
  const dialog = await openEditorDialog(page, "Delete", "Delete this compilation");
  await expect(dialog).toContainText("This can't be undone.");
  const confirm = dialog.getByRole("button", { name: "Delete this compilation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox", { name: /^Type/ }).fill("delete this");
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox", { name: /^Type/ }).fill("delete this compilation");
  await page.screenshot(shot("compilation-delete"));
  await confirm.click();
  await expect(page).toHaveURL(/\/compilations$/);
  await expect(page.getByText("You haven't made a compilation yet.")).toBeVisible();
});

test("domain-model §2.3: take a single verse, correct one and adapt another, credited in the reader", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const handle = await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Verse Study");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Verses");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/verses$/, { timeout: 15_000 });

  // One verse from the LEB.
  await page.goto("/compilations/verses/verse?ref=Genesis%201:3");
  await expect(page.getByRole("heading", { name: "Genesis 1:3", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Use the LEB's wording" }).click();
  await expect(page.getByText("From the LEB.")).toBeVisible({ timeout: 15_000 });

  // A one-word correction of the KJV.
  await page.goto("/compilations/verses/verse?ref=Genesis%201:1");
  const wording = page.getByRole("textbox", { name: "Wording", exact: true });
  await expect(wording).toHaveValue("In the beginning God created the heaven and the earth.");
  await wording.fill("In the beginning God created the heavens and the earth.");
  await page
    .getByRole("textbox", { name: "Why you changed it (optional)" })
    .fill("Plural in Hebrew.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Saving resolves the verse against every translation; slow when the whole suite runs at once.
  await expect(page.getByRole("status")).toHaveText("Saved as a correction.", { timeout: 30_000 });
  await expect(page.getByText("Corrected from the KJV.")).toBeVisible({ timeout: 15_000 });
  await page.screenshot(shot("compilation-verse"));

  // A bigger change can't be a correction.
  await page.goto("/compilations/verses/verse?ref=Genesis%201:2");
  await page
    .getByRole("textbox", { name: "Wording", exact: true })
    .fill("The earth had no shape and was empty.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    /^Saved as an adaptation: \d+ changes to words or punctuation, more than a correction allows\.$/,
    { timeout: 15_000 },
  );

  // The reader marks and credits each change.
  await page.goto(`/read/@${handle}/verses/genesis/1`);
  await expect(page.locator(".scripture")).toContainText("God created the heavens and the earth.");
  await expect(page.locator(".scripture")).toContainText("“Let there be light!”");
  await expect(page.locator(".scripture")).toContainText("The earth had no shape and was empty. ");
  await expect(page.locator(".scripture")).not.toContainText("without form");
  await expect(page.getByText(`† Corrected by @${handle} from King James Version`)).toBeVisible();
  await expect(page.getByText(`‡ Adapted by @${handle} from King James Version`)).toBeVisible();
  await expect(page.locator(".verse.edited")).toHaveCount(2);
  await page.screenshot(shot("compilation-reader-edited"));

  // Resetting a verse, in its editor, returns it to the base.
  await page.goto("/compilations/verses/verse?ref=Genesis%201:1");
  await expect(page.getByText("Corrected from the KJV.")).toBeVisible();
  await page.getByRole("button", { name: "Reset Genesis 1:1 to inherited" }).click();
  await expect(page.getByText("Corrected from the KJV.")).toHaveCount(0, { timeout: 15_000 });
});

test.describe("in the reader's own time zone", () => {
  // Dates are held in UTC and shown in the browser's zone; UTC+14 is a day ahead of UTC for most of the day.
  test.use({ timezoneId: "Pacific/Kiritimati" });

  test("domain-model §2.3.1: write an own rendering with its evidence, and declare text pasted from outside", async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const handle = await signUp(page);
    await page.goto("/compilations");
    await page.getByRole("textbox", { name: "Title" }).fill("Own Words");
    await page.getByRole("textbox", { name: "Abbreviation" }).fill("Own");
    await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/compilations\/own$/, { timeout: 15_000 });

    // Typed in the editor, then declared.
    await page.goto("/compilations/own/verse?ref=Genesis%201:1");
    const own = page.getByRole("textbox", { name: /^Your wording/ });
    await expect(own).toBeEditable();
    await own.click();
    await own.pressSequentially("In the beginning God made the skies", { delay: 5 });
    await own.press("End");
    await own.pressSequentially(" and the land.", { delay: 5 });
    const save = page.getByRole("button", { name: "Save my rendering" });
    await save.click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Tick the declaration to save it as your own." }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /^I declare/ }).check();
    await save.click();
    await expect(page.getByRole("status")).toHaveText("Saved as your own rendering.");
    await expect(page.getByText("Your own rendering.")).toBeVisible({ timeout: 15_000 });
    const evidence = page.locator(".evidence");
    await expect(evidence).toContainText("The record is intact.");
    await expect(evidence).toContainText(
      `You declared it your own on ${new Intl.DateTimeFormat("en-NZ", { dateStyle: "long", timeZone: "Pacific/Kiritimati" }).format(new Date())}.`,
    );
    await expect(evidence).toContainText(/\d+% similar to the KJV/);
    await page.screenshot(shot("compilation-own"));

    // The evidence downloads as a file, its journal intact.
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download the evidence (JSON)" }).click();
    const file = await (await download).path();
    const bundle = JSON.parse(readFileSync(file, "utf8"));
    expect(bundle).toMatchObject({
      verse: { origin: "own", text: "In the beginning God made the skies and the land." },
    });
    expect(bundle.journals[0].verified).toBe(true);
    expect(bundle.journals[0].events.length).toBeGreaterThan(0);

    // Pasted from outside: saved as pasted until it's declared.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/compilations/own/verse?ref=Genesis%201:2");
    await expect(own).toBeEditable();
    await own.click();
    await page.evaluate(() => navigator.clipboard.writeText("Words copied from another book."));
    await own.press("ControlOrMeta+V");
    await expect(own).toHaveValue("Words copied from another book.");
    await save.click();
    await expect(page.getByRole("status")).toHaveText(
      "Saved as pasted text. Declare it your own when you're ready.",
    );
    await expect(page.getByText(/^Pasted from outside ScriptureTips\./)).toBeVisible({
      timeout: 15_000,
    });
    await expect(evidence).toContainText("1 paste from outside");
    await evidence.getByRole("checkbox", { name: /^I declare/ }).check();
    await evidence.getByRole("button", { name: "Declare it my own" }).click();
    await expect(page.getByText("Your own rendering.")).toBeVisible({ timeout: 15_000 });

    // The reader marks and credits the user's own wording.
    await page.goto(`/read/@${handle}/own/genesis/1`);
    await expect(page.locator(".scripture")).toContainText("God made the skies and the land.");
    await expect(page.locator(".scripture")).toContainText("Words copied from another book.");
    await expect(page.getByText(`§ Translated by @${handle}.`)).toBeVisible();
    await expect(page.locator(".verse.edited")).toHaveCount(2);
    await page.screenshot(shot("compilation-reader-own"));
  });
});

test("domain-model §2.3: reword a translation's note, editing its verse, and add one's own, credited in the reader", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const handle = await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Noted");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Noted");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-web");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/noted$/, { timeout: 15_000 });

  // A note belongs to its verse: rewording the WEB's note makes the verse a correction of it.
  await page.goto("/compilations/noted/verse?ref=Genesis%201:1");
  await expect(page.getByText(/^A note belongs to its verse/)).toBeVisible();
  await expect(page.getByText("The WEB's note, unchanged.")).toBeVisible();

  const first = page.getByRole("textbox", { name: "Note 1" });
  await expect(first).toHaveValue("The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).");
  await first.fill("The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim), a plural form.");
  await page.getByRole("button", { name: "Save note 1" }).click();
  await expect(page.getByText("Adapted from the WEB's note:")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Corrected from the WEB.")).toBeVisible();
  await expect(page.getByText(/^A note belongs to its verse/)).toHaveCount(0);

  await page.getByRole("textbox", { name: "New note" }).fill("Or the heavens.");
  await page
    .getByRole("combobox", { name: "Mark it after" })
    .selectOption({ label: "heavens (word 7)" });
  await page.getByRole("button", { name: "Add the note" }).click();
  await expect(page.getByText("Your note.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("textbox", { name: "Note 2" })).toHaveValue("Or the heavens.");
  await page.screenshot(shot("compilation-notes"));

  // The reader shows both, credited.
  await page.goto(`/read/@${handle}/noted/genesis/1`);
  const notes = page.locator(".notes");
  await expect(notes).toContainText("(Elohim), a plural form. Note adapted from the WEB.");
  await expect(notes).toContainText("Or the heavens. Note added in this compilation.");
  await expect(page.locator(".scripture")).toContainText(
    // Each note's letter is marked where it belongs: after "God" and after "heavens".
    /In the beginning, God\s*a created the heavens\s*b and the earth\./,
  );
  await page.screenshot(shot("compilation-reader-notes"));

  // Left out, then restored as the WEB has it.
  await page.goto("/compilations/noted/verse?ref=Genesis%201:1");
  await page.getByRole("button", { name: "Remove note 1" }).click();
  await expect(page.getByText("The WEB's note, left out:")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Restore the WEB's note 1" }).click();
  await expect(page.getByText("The WEB's note, unchanged.")).toBeVisible({ timeout: 15_000 });
});

test("a compilation is private to its owner", async ({ page }) => {
  await page.goto("/read/@someone/mine/genesis/1");
  await expect(page.getByText(/not found|could not be found/i).first()).toBeVisible();
});

test("vision §3.1: rename a compilation in place, its title and its abbreviation, checked as when created", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Draft Words");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Draft");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/draft$/, { timeout: 15_000 });
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/Draft Words\s*Draft/);
  await page.screenshot(shot("compilation-heading"));

  // The title: click, type, Enter.
  await heading.getByRole("button", { name: "Draft Words" }).click();
  const title = page.getByRole("textbox", { name: "Title" });
  await expect(title).toBeFocused();
  await title.fill("Final Words");
  await title.press("Enter");
  await expect(heading.getByRole("button", { name: "Final Words" })).toBeVisible();

  // Escape leaves it as it was.
  await heading.getByRole("button", { name: "Final Words" }).click();
  await page.getByRole("textbox", { name: "Title" }).fill("Not this");
  await page.getByRole("textbox", { name: "Title" }).press("Escape");
  await expect(heading.getByRole("button", { name: "Final Words" })).toBeVisible();

  // The abbreviation keeps the create form's rules: a published translation's is refused.
  await heading.getByRole("button", { name: "Draft", exact: true }).click();
  const abbreviation = page.getByRole("textbox", { name: "Abbreviation" });
  await abbreviation.fill("KJV");
  await abbreviation.press("Enter");
  await expect(heading.getByRole("alert")).toHaveText(/name of a published translation/);
  await page.screenshot(shot("compilation-heading-error"));

  // A new one moves the compilation to its new link.
  await abbreviation.fill("Final");
  await abbreviation.press("Enter");
  await expect(page).toHaveURL(/\/compilations\/final$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Final Words\s*Final/);
});

test("vision §3.1: the editor shows where the verses come from, and each section's books", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Mixed Sources");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Mixed");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/mixed$/, { timeout: 15_000 });
  // Until the first count arrives, a skeleton and a spinner.
  let release = () => {};
  const held = new Promise<void>((r) => {
    release = r;
  });
  await page.route("**/composition", async (route) => {
    await held;
    // A request the reload aborted is already done with.
    await route.continue().catch(() => {});
  });
  await addRule(page, "mixed", { reference: "Genesis" }, "leb");
  await expect(page.locator(".composition .skeleton")).toBeVisible();
  await expect(page.locator(".composition .spinner")).toBeVisible();
  await page.screenshot(shot("compilation-composition-loading"));
  release();
  await page.unroute("**/composition");

  // The chart loads after the page; its legend names each source and its share.
  const chart = page.getByRole("figure");
  await expect(
    chart.getByRole("img", { name: "Where this compilation's verses come from" }),
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(chart.getByRole("listitem")).toHaveText([
    /^KJV\s*\d+(\.\d)?%$/,
    /^LEB\s*\d+(\.\d)?%$/,
  ]);

  // Each section is a tab showing its books; the Old Testament first.
  const tabs = page.getByRole("tablist", { name: "Books by section" });
  const panel = page.getByRole("tabpanel");
  await expect(tabs.getByRole("tab", { name: "Old Testament" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(bookLink(panel, "Genesis")).toBeVisible();
  await expect(bookLink(panel, "Matthew")).toHaveCount(0);
  await tabs.getByRole("tab", { name: "New Testament" }).click();
  await expect(bookLink(panel, "Matthew")).toBeVisible();
  await expect(bookLink(panel, "Genesis")).toHaveCount(0);
  // The arrow keys move between tabs.
  await page.keyboard.press("ArrowLeft");
  await expect(tabs.getByRole("tab", { name: "Old Testament" })).toBeFocused();
  await expect(bookLink(panel, "Genesis")).toBeVisible();
  // Tab moves from the tabs into the books.
  await page.keyboard.press("Tab");
  await expect(bookLink(panel, "Genesis")).toBeFocused();
  await page.screenshot(shot("compilation-top"));
});

test("vision §3.1: give a whole book a new base from its menu, after a warning", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Book Bases");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Bases");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/bases$/, { timeout: 15_000 });
  await addRule(page, "bases", { reference: "Genesis 1" }, "leb");
  await page.goto("/compilations/bases/verse?ref=Genesis%202:1");
  await page.getByRole("button", { name: "Use the LEB's wording" }).click();
  await expect(page.getByText("From the LEB.")).toBeVisible({ timeout: 15_000 });
  await page.goto("/compilations/bases");

  // Tab goes through each book and then its menu.
  const panel = page.getByRole("tabpanel");
  await page.getByRole("tab", { name: "Old Testament" }).focus();
  await page.keyboard.press("Tab");
  await expect(bookLink(panel, "Genesis")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Options for Genesis" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(bookLink(panel, "Exodus")).toBeFocused();

  // The menu's first item lists the translations; declining the warning changes nothing.
  await bookLink(panel, "Genesis").hover();
  const options = panel.getByRole("button", { name: "Options for Genesis" });
  await options.click();
  // Escape closes it, back to its icon.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(options).toBeFocused();
  await options.click();
  await page.screenshot(shot("compilation-book-menu"));
  const web = page.getByRole("menuitem", { name: /^WEB:/ });
  const legend = page.getByRole("figure").getByRole("listitem");
  page.once("dialog", (d) => d.dismiss());
  await web.click();
  await expect(bookLink(panel, "Genesis")).toHaveText("Genesis KJV");
  await expect(legend).toHaveText([/^KJV/, /^LEB/], { timeout: 30_000 });

  // Accepting it gives Genesis the WEB, and throws away the choices within it.
  page.once("dialog", (d) => {
    expect(d.message()).toContain("This throws away every change you've made within Genesis");
    d.accept();
  });
  await web.click();
  await expect(bookLink(panel, "Genesis")).toHaveText("Genesis WEB", { timeout: 15_000 });
  // The bar counts again by itself: the LEB's passage has gone, and the WEB has Genesis.
  await expect(page.getByRole("figure").getByRole("listitem")).toHaveText(
    [/^KJV\s*[\d.]+%$/, /^WEB\s*[\d.]+%$/],
    { timeout: 30_000 },
  );
  await expect(page.getByRole("menu")).toHaveCount(0);
});
