import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { type Book, BUILD_FILES, buildPrefix } from "@scripturetips/book";
import { type Database, translation, translationBook, verseText } from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { signIn, testAccounts } from "../auth/test-support.ts";
import { testBuilds } from "./test-support.ts";

let db: Database;
let drop: () => Promise<void>;
let app: NestFastifyApplication;
let owner: string;
let other: string;
const builds = testBuilds(3);

async function addTranslation(catalogId: string, verses: [number, number][], licenseKey: string) {
  const [t] = await db
    .insert(translation)
    .values({
      catalogId,
      abbreviation: catalogId.toUpperCase(),
      name: `The ${catalogId} translation`,
      language: "en",
      direction: "ltr",
      scheme: "kjv",
      licenseKey,
    })
    .returning();
  if (!t) throw new Error("no translation");
  await db
    .insert(translationBook)
    .values({ translationId: t.id, book: "Joel", usfm: "JOL", position: 0, names: {} });
  await db.insert(verseText).values(
    verses.map(([chapter, verse]) => {
      const start = 29 * 10_000_000 + chapter * 10_000 + verse * 10;
      return {
        translationId: t.id,
        book: "Joel",
        chapter,
        verse,
        canonical: [`Joel.${chapter}.${verse}`],
        mapping: "same",
        canonicalRange: { start, end: start + 9 },
        headings: [],
        content: [`${catalogId.toUpperCase()} ${chapter}:${verse}.`],
      };
    }),
  );
}

beforeAll(async () => {
  let url: string;
  ({ db, url, drop } = await testDatabase());
  await addTranslation(
    "kjv",
    [
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
    ],
    "public-domain",
  );
  await addTranslation("leb", [[1, 1]], "leb");
  const accounts = testAccounts();
  app = await createApp({ databaseUrl: url, accounts: accounts.settings, builds: builds.settings });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  owner = await signIn(app, accounts.sent, "builder@example.com");
  await call("PUT", "/api/account", { handle: "builder", name: "A Builder" });
  await call("POST", "/api/compilations", { title: "My Bible", abbreviation: "Mine", base: "kjv" });
  await call("POST", "/api/compilations/mine/rules", {
    scope: { reference: "Joel 1" },
    source: "leb",
  });
  other = await signIn(app, accounts.sent, "other@example.com");
  await call("PUT", "/api/account", { handle: "other", name: "Someone Else" }, other);
});

afterAll(async () => {
  await app?.close();
  await drop();
});

const call = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  payload?: object,
  cookie = owner,
) =>
  app.inject({ method, url, headers: cookie ? { cookie } : {}, ...(payload ? { payload } : {}) });
const list = async () => (await call("GET", "/api/compilations/mine/pdf-builds")).json().builds;
const stored = async (id: string) => {
  const file = await builds.store.get(`${buildPrefix(id)}book.json`);
  return JSON.parse(new TextDecoder().decode(file?.body)) as Book;
};
/** Plays the worker's part: stores the files a build makes, and finishes its job. */
async function finish(id: string, pages = 12) {
  for (const name of ["book.pdf", "cover.pdf", "book.typ", "cover.typ"] as const)
    await builds.store.put(`${buildPrefix(id)}${name}`, `${name} of ${id}`, BUILD_FILES[name]);
  builds.queue.finish(id, { pages, spine: 0.5 });
}

describe("PDF builds (book-designer.md §8, §9)", () => {
  let first: string;

  it("describe the compilation, store its book.json, and queue it for the worker", async () => {
    const res = await call("POST", "/api/compilations/mine/pdf-builds", {});
    expect(res.statusCode).toBe(201);
    const { build } = res.json();
    first = build.id;
    expect(build).toMatchObject({ scope: null, status: "queued", files: [] });
    expect(builds.queue.jobs.get(first)).toEqual({ state: "waiting" });

    const book = await stored(first);
    expect(book).toMatchObject({ title: "My Bible", subtitle: "Mine" });
    expect(book.body.map((e) => e.type)).toEqual(["title", "credits", "scripture"]);
    // The LEB verse carries its designation, and the credits page its statement.
    const runs = JSON.stringify(book.body[2]);
    expect(runs).toContain('"LEB 1:1."},{"t":"designation","text":"LEB"}');
    expect(book.credits.some((c) => c.includes("Lexham English Bible"))).toBe(true);
  });

  it("allow one build at a time per user", async () => {
    const res = await call("POST", "/api/compilations/mine/pdf-builds", {});
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("build-in-progress");
  });

  it("follow the queue: building, then done with its page count and every file", async () => {
    expect((await list())[0]).toMatchObject({ id: first, status: "queued" });
    await finish(first, 12);
    const [done] = await list();
    expect(done).toMatchObject({ id: first, status: "done", pages: 12, spine: 0.5 });
    expect(done.files).toEqual(Object.keys(BUILD_FILES));
    expect(done.finishedAt).toEqual(expect.any(String));
  });

  it("hand out a finished build's files: the PDFs, book.json and the Typst sources", async () => {
    const pdf = await call("GET", `/api/compilations/mine/pdf-builds/${first}/book.pdf`);
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers["content-type"]).toBe("application/pdf");
    expect(pdf.headers["content-disposition"]).toBe('attachment; filename="mine-book.pdf"');
    expect(pdf.body).toBe(`book.pdf of ${first}`);
    const json = await call("GET", `/api/compilations/mine/pdf-builds/${first}/book.json`);
    expect(json.json()).toMatchObject({ title: "My Bible" });
    const typ = await call("GET", `/api/compilations/mine/pdf-builds/${first}/cover.typ`);
    expect(typ.headers["content-type"]).toContain("text/plain");
  });

  it("build only the books and chapters a scope names", async () => {
    const res = await call("POST", "/api/compilations/mine/pdf-builds", { scope: "Joel 2" });
    expect(res.statusCode).toBe(201);
    const { build } = res.json();
    expect(build.scope).toBe("Joel 2");
    const book = await stored(build.id);
    expect(book.subtitle).toBe("Joel 2");
    const el = book.body[2];
    expect(el?.type === "scripture" && el.chapters.map((c) => c.number)).toEqual([2]);
    // Only the sources the scope draws on are credited.
    expect(book.credits.some((c) => c.includes("Lexham"))).toBe(false);
    builds.queue.fail(build.id, "typst: error");
  });

  it("report a failed build, keeping its book.json", async () => {
    const [failed] = await list();
    expect(failed).toMatchObject({ status: "failed", error: "typst: error", files: ["book.json"] });
    const pdf = await call("GET", `/api/compilations/mine/pdf-builds/${failed.id}/book.pdf`);
    expect(pdf.statusCode).toBe(404);
    expect(pdf.json().code).toBe("file-not-ready");
  });

  it("mark a build the queue has lost as failed, so it doesn't block the next", async () => {
    const { build } = (await call("POST", "/api/compilations/mine/pdf-builds", {})).json();
    builds.queue.lose(build.id);
    expect((await list())[0]).toMatchObject({ id: build.id, status: "failed", error: "lost" });
  });

  it("refuse a scope that isn't a reference", async () => {
    const res = await call("POST", "/api/compilations/mine/pdf-builds", { scope: "Nowhere 3" });
    expect(res.statusCode).toBe(400);
  });

  it("stop at the daily limit (vision §7.1)", async () => {
    const res = await call("POST", "/api/compilations/mine/pdf-builds", {});
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: "daily-build-limit", limit: 3 });
  });

  it("are private to the compilation's owner", async () => {
    const res = await call("GET", "/api/compilations/mine/pdf-builds", undefined, other);
    expect(res.statusCode).toBe(404);
    const file = await call(
      "GET",
      `/api/compilations/mine/pdf-builds/${first}/book.pdf`,
      undefined,
      other,
    );
    expect(file.statusCode).toBe(404);
    expect((await call("GET", "/api/compilations/mine/pdf-builds", undefined, "")).statusCode).toBe(
      401,
    );
  });

  it("go with their compilation, files and all", async () => {
    expect(await builds.store.list(buildPrefix(first))).toHaveLength(5);
    expect((await call("DELETE", "/api/compilations/mine")).statusCode).toBe(204);
    expect(await builds.store.list("pdf-builds/")).toEqual([]);
  });
});
