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

test("a compilation is private to its owner", async ({ page }) => {
  await page.goto("/read/@someone/mine/genesis/1");
  await expect(page.getByText(/not found|could not be found/i).first()).toBeVisible();
});
