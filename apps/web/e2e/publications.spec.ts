import { expect, test } from "@playwright/test";
import { arriveFromOwnAddress, shot, signUp } from "./support.ts";

arriveFromOwnAddress();

test("domain-model §2.3: publish unlisted, then publicly as version 2, each version at its own link", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const handle = await signUp(page);
  await page.goto("/compilations");
  await page.getByRole("textbox", { name: "Title" }).fill("Plain Words");
  await page.getByRole("textbox", { name: "Abbreviation" }).fill("Plain");
  await page.getByRole("combobox", { name: "Base translation" }).selectOption("eng-kjv");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/compilations\/plain$/);

  // Version 1, for anyone with the link.
  await expect(page.getByText("Not published yet.")).toBeVisible();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Published as version 1.", {
    timeout: 120_000,
  });
  const first = page.getByRole("link", { name: /^Version 1,/ });
  await expect(first).toBeVisible({ timeout: 15_000 });
  const v1 = (await first.getAttribute("href"))?.split("/").at(-1) ?? "";
  expect(v1).toMatch(/^[A-Za-z0-9]{10}$/);

  // A correction made after publishing stays private.
  await page.goto("/compilations/plain/verse?ref=Genesis%201:1");
  await page
    .getByRole("textbox", { name: "Wording", exact: true })
    .fill("In the beginning God created the heavens and the earth.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved as a correction.");

  // Someone signed out reads version 1 at its link, but nothing at the unlisted path.
  const visitor = await (
    await browser.newContext({ baseURL: test.info().project.use.baseURL })
  ).newPage();
  await visitor.goto(`/p/${handle}/plain/genesis/1/${v1}`);
  await expect(visitor.locator(".scripture")).toContainText("created the heaven and the earth.");
  await visitor.goto(`/p/${handle}/plain/genesis/1`);
  await expect(visitor.getByText(/not found|could not be found/i).first()).toBeVisible();

  // Version 2, for everyone.
  await page.goto("/compilations/plain");
  await page.getByRole("radio", { name: /^Everyone/ }).check();
  await page.getByRole("textbox", { name: "What changed (optional)" }).fill("Heavens, plural.");
  await page.getByRole("button", { name: "Publish a new version" }).click();
  await expect(page.getByRole("status")).toHaveText("Published as version 2.", {
    timeout: 120_000,
  });
  await expect(page.getByText("1 verse changed")).toBeVisible({ timeout: 15_000 });
  await page.screenshot(shot("compilation-publish"));

  await visitor.goto(`/p/${handle}/plain/genesis/1`);
  await expect(visitor.locator(".scripture")).toContainText("created the heavens and the earth.");
  await expect(visitor.getByText(/^Version 2, published/)).toBeVisible();
  await expect(
    visitor.getByText(`† Corrected by @${handle} from King James Version`),
  ).toBeVisible();
  await visitor.screenshot(shot("publication-reader"));
  // Version 1 hasn't changed, and points to the newer one.
  await visitor.goto(`/p/${handle}/plain/genesis/1/${v1}`);
  await expect(visitor.locator(".scripture")).toContainText("created the heaven and the earth.");
  await visitor.getByRole("link", { name: "A newer version is available: version 2." }).click();
  await expect(visitor).toHaveURL(new RegExp(`/p/${handle}/plain/genesis/1$`));
  // The book list opens to each book's chapters.
  await visitor.goto(`/p/${handle}/plain`);
  await visitor.getByText("Genesis", { exact: true }).click();
  await visitor.getByRole("link", { name: "Genesis 2", exact: true }).click();
  await expect(visitor).toHaveURL(new RegExp(`/p/${handle}/plain/genesis/2$`));
  await expect(visitor.getByRole("link", { name: "Next: Genesis 3" })).toBeVisible();
});
