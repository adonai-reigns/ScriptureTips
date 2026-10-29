import { expect, test } from "@playwright/test";
import { arriveFromOwnAddress, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

test("book-designer.md §9: build a PDF of part of a compilation, and download the book and its sources", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Printed Words");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Print");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/print$/, { timeout: 15_000 });

  await expect(page.getByText("No PDFs built yet.")).toBeVisible();
  await page.getByRole("textbox", { name: "Books or chapters (optional)" }).fill("Ruth");
  await page.getByRole("button", { name: "Build a PDF" }).click();
  const builds = page.locator(".pdf-builds");
  await expect(builds).toContainText(/Waiting to be built|Building…/);
  // One at a time: the button waits for this build.
  await expect(page.getByRole("button", { name: "Build a PDF" })).toBeDisabled();

  // The worker builds it; the page follows without a reload.
  await expect(builds).toContainText(/Ready: \d+ pages, spine [\d.]+ mm/, { timeout: 120_000 });
  await page.screenshot(shot("pdf-builds"));

  // Fetched from the page, which reaches the web app as the browser does (with the session).
  const download = (name: string) =>
    builds.getByRole("link", { name }).evaluate(async (a: HTMLAnchorElement) => {
      const res = await fetch(a.href);
      const bytes = new Uint8Array(await res.arrayBuffer());
      return {
        status: res.status,
        type: res.headers.get("content-type"),
        start: new TextDecoder().decode(bytes.subarray(0, 200)),
      };
    });
  const pdf = await download("Book (PDF)");
  expect(pdf).toMatchObject({ status: 200, type: "application/pdf" });
  expect(pdf.start.startsWith("%PDF-")).toBe(true);
  const json = await download("Book description (JSON)");
  expect(json.start).toContain('"title":"Printed Words","subtitle":"Ruth"');
  await expect(builds.getByRole("link", { name: "Cover (PDF)" })).toBeVisible();
  await expect(builds.getByRole("link", { name: "Book layout (Typst source)" })).toBeVisible();
});
