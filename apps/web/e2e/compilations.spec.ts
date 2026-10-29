import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { arriveFromOwnAddress, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

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
  await expect(page).toHaveURL(/\/compilations\/mine$/);
  await expect(page.getByRole("heading", { name: "My Study Bible (Mine)" })).toBeVisible();

  // Genesis 1 from the LEB, and the New Testament from the WEB.
  await page.getByRole("textbox", { name: "Book, chapter or passage" }).fill("Genesis 1");
  await page.getByRole("combobox", { name: "From" }).selectOption("leb");
  await page.getByRole("button", { name: "Add" }).click();
  // The editor refreshes from the server after each change.
  await expect(page.getByText("Genesis 1 from the LEB")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: "A whole section" }).check();
  await page.getByRole("combobox", { name: "Section" }).selectOption("nt");
  await page.getByRole("combobox", { name: "From" }).selectOption("eng-web");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("New Testament from the WEB")).toBeVisible({ timeout: 15_000 });

  // The same passage again is refused, in words.
  await page.getByRole("radio", { name: "A book, chapter or passage" }).check();
  await page.getByRole("textbox", { name: "Book, chapter or passage" }).fill("Genesis 1");
  await page.getByRole("combobox", { name: "From" }).selectOption("eng-web");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "That overlaps a choice you've already made. Remove that one first, or choose a narrower passage.",
  );
  await expect(page.locator(".book-sources li", { hasText: "Genesis" })).toContainText(
    "and 1 passage from elsewhere",
  );
  await expect(page.locator(".book-sources li", { hasText: "Matthew" })).toContainText("WEB");
  await page.screenshot(shot("compilation-editor"));

  // Reading it: each verse from its layer, credited.
  await page.goto(`/read/@${handle}/mine/genesis/1`);
  await expect(page.getByText("My Study Bible, compiled from Lexham English Bible.")).toBeVisible();
  await page.screenshot(shot("compilation-reader"));
  await page.getByRole("link", { name: "Next: Genesis 2" }).click();
  await expect(page.getByText(/^My Study Bible, compiled from King James Version/)).toBeVisible();
  await page.goto(`/read/@${handle}/mine`);
  await expect(page.getByRole("heading", { name: "Books of the Mine" })).toBeVisible();

  // Removing a choice resets its verses to the base.
  await page.goto("/compilations/mine");
  await page.getByRole("button", { name: "Remove Genesis 1 from the LEB" }).click();
  await expect(page.getByText("Genesis 1 from the LEB")).toHaveCount(0);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete this compilation" }).click();
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
  await expect(page).toHaveURL(/\/compilations\/verses$/);

  // One verse from the LEB.
  await page.getByRole("textbox", { name: /^Verse/ }).fill("Genesis 1:3");
  await page.getByRole("button", { name: "Open" }).click();
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
  await expect(page.getByRole("status")).toHaveText("Saved as a correction.");
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

  // Resetting a verse returns it to the base.
  await page.goto("/compilations/verses");
  await expect(page.getByText("Genesis 1:1, corrected from the KJV")).toBeVisible();
  await expect(page.getByText("Genesis 1:2, adapted from the KJV")).toBeVisible();
  await expect(page.getByText("Genesis 1:3 from the LEB")).toBeVisible();
  await page.getByRole("button", { name: "Reset Genesis 1:1 to inherited" }).click();
  await expect(page.getByText("Genesis 1:1, corrected from the KJV")).toHaveCount(0, {
    timeout: 15_000,
  });
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
    await expect(page).toHaveURL(/\/compilations\/own$/);

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

test("domain-model §2.3: reword a translation's note on an edited verse and add one's own, credited in the reader", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const handle = await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Noted");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Noted");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-web");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/noted$/);

  // Taken unchanged, the WEB's notes can't be changed; edited, they can.
  await page.goto("/compilations/noted/verse?ref=Genesis%201:1");
  await expect(
    page.getByText(
      "To change this verse's notes, correct or adapt its wording, or write your own.",
    ),
  ).toBeVisible();
  const wording = page.getByRole("textbox", { name: "Wording", exact: true });
  await expect(wording).toHaveValue("In the beginning, God created the heavens and the earth.");
  await wording.fill("In the beginning, God created the skies and the earth.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved as a correction.");
  await expect(page.getByText("The WEB's note, unchanged.")).toBeVisible({ timeout: 15_000 });

  const first = page.getByRole("textbox", { name: "Note 1" });
  await expect(first).toHaveValue("The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim).");
  await first.fill("The Hebrew word rendered “God” is “אֱלֹהִ֑ים” (Elohim), a plural form.");
  await page.getByRole("button", { name: "Save note 1" }).click();
  await expect(page.getByText("Adapted from the WEB's note:")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("textbox", { name: "New note" }).fill("Or the heavens.");
  await page
    .getByRole("combobox", { name: "Mark it after" })
    .selectOption({ label: "skies (word 7)" });
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
    // Each note's letter is marked where it belongs: after "God" and after "skies".
    /In the beginning, God\s*a created the skies\s*b and the earth\./,
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
