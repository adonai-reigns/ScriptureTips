import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { type Database, translation, translationBook, verseText } from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { signIn, testAccounts } from "../auth/test-support.ts";

let db: Database;
let drop: () => Promise<void>;
let app: NestFastifyApplication;
let owner: string;

async function addTranslation(catalogId: string, verses: [number, number, string][]) {
  const [t] = await db
    .insert(translation)
    .values({
      catalogId,
      abbreviation: catalogId.toUpperCase(),
      name: `The ${catalogId} translation`,
      language: "en",
      direction: "ltr",
      scheme: "kjv",
      licenseKey: "public-domain",
    })
    .returning();
  if (!t) throw new Error("no translation");
  await db
    .insert(translationBook)
    .values({ translationId: t.id, book: "Joel", usfm: "JOL", position: 0, names: {} });
  await db.insert(verseText).values(
    verses.map(([chapter, verse, text]) => {
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
        content: [text],
      };
    }),
  );
}

beforeAll(async () => {
  let url: string;
  ({ db, url, drop } = await testDatabase());
  await addTranslation("kjv", [
    [1, 1, "KJV 1:1."],
    [1, 2, "KJV 1:2."],
    [2, 1, "KJV 2:1."],
    [2, 2, "KJV 2:2."],
  ]);
  await addTranslation("other", [
    [1, 1, "OTHER 1:1."],
    [1, 2, "OTHER 1:2."],
    [2, 1, "OTHER 2:1."],
    [2, 2, "OTHER 2:2."],
  ]);
  const accounts = testAccounts();
  app = await createApp({ databaseUrl: url, accounts: accounts.settings });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  owner = await signIn(app, accounts.sent, "publisher@example.com");
  await call("PUT", "/api/account", { handle: "publisher", name: "A Publisher" });
  await call("POST", "/api/compilations", { title: "My Bible", abbreviation: "Mine", base: "kjv" });
});

afterAll(async () => {
  await app?.close();
  await drop();
});

/** A request as the owner; `cookie: ""` makes it as someone signed out. */
const call = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  payload?: object,
  cookie = owner,
) =>
  app.inject({ method, url, headers: cookie ? { cookie } : {}, ...(payload ? { payload } : {}) });
const publish = (payload: object) => call("POST", "/api/compilations/mine/publication", payload);
/** The verse texts a reader signed out gets for Joel 1, at the latest version or a pinned one. */
const read = async (version?: string) => {
  const res = await call(
    "GET",
    `/api/publications/publisher/mine/passages?ref=Joel%201${version ? `&version=${version}` : ""}`,
    undefined,
    "",
  );
  return res.statusCode === 200
    ? res.json().passages[0].verses.map((v: { content: string[] }) => v.content[0])
    : res.statusCode;
};

describe("domain-model §2.3: publications", () => {
  it("publish a compilation as numbered versions, each hash-chained to the one before", async () => {
    expect((await call("GET", "/api/compilations/mine/publication")).json()).toEqual({
      publication: null,
    });
    const first = (await publish({ visibility: "unlisted" })).json().publication;
    expect(first).toMatchObject({
      handle: "publisher",
      slug: "mine",
      visibility: "unlisted",
      status: "active",
      versions: [{ number: 1, previousHash: null, changedVerses: null, verseCount: 4 }],
    });
    const v1 = first.versions[0];
    expect(v1.id).toMatch(/^[A-Za-z0-9]{10}$/);

    // Unlisted: only its pinned link reads it, and needs no account.
    expect(await read()).toBe(404);
    expect(await read(v1.id)).toEqual(["KJV 1:1.", "KJV 1:2."]);

    // A change, published publicly as version 2.
    await call("POST", "/api/compilations/mine/verses", { reference: "Joel 1:2", source: "other" });
    const second = (
      await publish({ visibility: "public", changeNote: "Joel 1:2 from OTHER." })
    ).json().publication;
    expect(second.versions).toMatchObject([
      {
        number: 2,
        previousHash: v1.contentHash,
        changedVerses: 1,
        changeNote: "Joel 1:2 from OTHER.",
      },
      { id: v1.id, number: 1 },
    ]);
    expect(await read()).toEqual(["KJV 1:1.", "OTHER 1:2."]);
    // The earlier version never changes, and tells its reader a newer one exists.
    expect(await read(v1.id)).toEqual(["KJV 1:1.", "KJV 1:2."]);
    const pinned = (
      await call(
        "GET",
        `/api/publications/publisher/mine/passages?ref=Joel%201:2&version=${v1.id}`,
        undefined,
        "",
      )
    ).json();
    expect(pinned).toMatchObject({
      translation: { abbreviation: "Mine", name: "My Bible", license: "publication" },
      sources: [{ id: "kjv" }],
      publication: { version: { number: 1 }, latest: { id: second.versions[0].id, number: 2 } },
    });
    expect(pinned.passages[0].verses[0]).toMatchObject({ verse: 2, source: "kjv" });

    // Later edits stay private until published.
    await call("POST", "/api/compilations/mine/verses", { reference: "Joel 1:1", source: "other" });
    expect(await read()).toEqual(["KJV 1:1.", "OTHER 1:2."]);

    expect(
      (await call("GET", "/api/publications/publisher/mine/books", undefined, "")).json(),
    ).toMatchObject({ books: [{ osis: "Joel", chapters: [1, 2] }], publication: { slug: "mine" } });
  });

  it("refuse a version that isn't theirs, an unknown one, and a malformed one", async () => {
    expect(await read("ZZZZZZZZZZ")).toBe(404);
    expect(await read("short")).toBe(400);
    expect(
      (await call("GET", "/api/publications/nobody/mine/passages?ref=Joel%201", undefined, ""))
        .statusCode,
    ).toBe(404);
  });

  it("refuse to publish verses still pasted from outside", async () => {
    const j = (
      await call("POST", "/api/compilations/mine/journals", { reference: "Joel 2:1" })
    ).json();
    await call("POST", `/api/compilations/mine/journals/${j.id}/events`, {
      events: [{ kind: "paste", position: 0, removed: "", inserted: "Words from somewhere else." }],
    });
    expect(
      (
        await call("POST", "/api/compilations/mine/verses", {
          reference: "Joel 2:1",
          journal: j.id,
        })
      ).json(),
    ).toMatchObject({ choice: { origin: "pasted" } });
    expect((await publish({ visibility: "public" })).json()).toMatchObject({
      code: "pasted-verses",
      verses: ["Joel 2:1"],
    });
  });

  it("keep a publication, and its slug, when the compilation is deleted", async () => {
    const before = (await call("GET", "/api/compilations/mine/publication")).json().publication;
    expect((await call("DELETE", "/api/compilations/mine")).statusCode).toBe(204);
    expect(await read()).toEqual(["KJV 1:1.", "OTHER 1:2."]);
    await call("POST", "/api/compilations", {
      title: "Another",
      abbreviation: "Mine",
      base: "kjv",
    });
    expect((await publish({ visibility: "public" })).json()).toMatchObject({
      code: "slug-published",
    });
    expect(await read(before.versions[1].id)).toEqual(["KJV 1:1.", "KJV 1:2."]);
  });
});
