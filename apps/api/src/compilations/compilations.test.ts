import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  and,
  compilationVerseRevision,
  type Database,
  eq,
  translation,
  translationBook,
  translatorNote,
  verseText,
} from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { signIn, testAccounts } from "../auth/test-support.ts";

let db: Database;
let drop: () => Promise<void>;
let app: NestFastifyApplication;
let sent: ReturnType<typeof testAccounts>["sent"];
let owner: string;
let other: string;

/** A canonical ordinal range for one verse. Book 29 is Joel. */
const range = (chapter: number, verse: number) => {
  const start = 29 * 10_000_000 + chapter * 10_000 + verse * 10;
  return { start, end: start + 9 };
};

async function addTranslation(
  catalogId: string,
  scheme: string,
  licenseKey: string,
  /** [chapter, verse, canonical chapter, canonical verse, text] */
  verses: [number, number, number, number, string][],
) {
  const [t] = await db
    .insert(translation)
    .values({
      catalogId,
      abbreviation: catalogId.toUpperCase(),
      name: `The ${catalogId} translation`,
      language: "en",
      direction: "ltr",
      scheme,
      licenseKey,
    })
    .returning();
  if (!t) throw new Error("no translation");
  await db
    .insert(translationBook)
    .values({ translationId: t.id, book: "Joel", usfm: "JOL", position: 0, names: {} });
  const rows = await db
    .insert(verseText)
    .values(
      verses.map(([chapter, verse, cc, cv, text]) => ({
        translationId: t.id,
        book: "Joel",
        chapter,
        verse,
        canonical: [`Joel.${cc}.${cv}`],
        mapping: chapter === cc ? "same" : "renumbered",
        canonicalRange: range(cc, cv),
        headings: [],
        content: [text, { type: "note", position: 0 }],
      })),
    )
    .returning();
  await db.insert(translatorNote).values(
    rows.map((r) => ({
      verseTextId: r.id,
      position: 0,
      kind: "footnote" as const,
      marker: "f",
      caller: "+",
      body: [`${catalogId} note`],
    })),
  );
}

beforeAll(async () => {
  let url: string;
  ({ db, url, drop } = await testDatabase());
  // KJV Joel 2:28–32 is Joel 3:1–5 in the Hebrew (canonical) numbering, and KJV 3:1 is 4:1.
  await addTranslation("kjv", "kjv", "public-domain", [
    [2, 28, 3, 1, "KJV 2:28."],
    [2, 29, 3, 2, "KJV 2:29."],
    [2, 30, 3, 3, "KJV 2:30."],
    [3, 1, 4, 1, "KJV 3:1."],
    [3, 2, 4, 2, "KJV 3:2."],
  ]);
  // Hebrew numbering, and it lacks 4:2.
  await addTranslation("heb", "hebrew", "public-domain", [
    [3, 1, 3, 1, "HEB 3:1."],
    [3, 2, 3, 2, "HEB 3:2."],
    [3, 3, 3, 3, "HEB 3:3."],
    [4, 1, 4, 1, "HEB 4:1."],
  ]);
  await addTranslation("other", "kjv", "public-domain", [
    [2, 28, 3, 1, "OTHER 2:28."],
    [2, 29, 3, 2, "OTHER 2:29."],
    [2, 30, 3, 3, "OTHER 2:30."],
    [3, 1, 4, 1, "OTHER 3:1."],
    [3, 2, 4, 2, "OTHER 3:2."],
  ]);
  await addTranslation("unrecorded", "kjv", "terms-not-recorded", [[2, 28, 3, 1, "X."]]);

  const accounts = testAccounts();
  sent = accounts.sent;
  app = await createApp({ databaseUrl: url, accounts: accounts.settings });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  owner = await signIn(app, sent, "compiler@example.com");
  await put(owner, "/api/account", { handle: "compiler", name: "A Compiler" });
  other = await signIn(app, sent, "someone@example.com");
  await put(other, "/api/account", { handle: "someone", name: "Someone" });
});

afterAll(async () => {
  await app?.close();
  await drop();
});

const call = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  cookie: string,
  url: string,
  payload?: object,
) => app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
const put = (cookie: string, url: string, payload: object) => call("PUT", cookie, url, payload);
const post = (cookie: string, url: string, payload: object) => call("POST", cookie, url, payload);
const get = (cookie: string, url: string) => call("GET", cookie, url);

/** The text and source of each verse the compilation gives for `ref`. */
async function read(ref: string) {
  const res = await get(owner, `/api/compilations/mine/passages?ref=${encodeURIComponent(ref)}`);
  expect(res.statusCode).toBe(200);
  return res
    .json()
    .passages[0].verses.map(
      (v: {
        chapter: number;
        verse: number;
        content: string[];
        source: string;
        notes: { body: string[] }[];
      }) => `${v.chapter}:${v.verse} ${v.content[0]} (${v.source}; ${v.notes[0]?.body[0]})`,
    );
}

describe("domain-model §2.3: compilations", () => {
  it("are created on a base, private to their owner", async () => {
    const created = await post(owner, "/api/compilations", {
      title: "My Bible",
      abbreviation: "Mine",
      base: "kjv",
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: "@compiler/mine",
      slug: "mine",
      abbreviation: "Mine",
      base: { id: "kjv", abbreviation: "KJV" },
      scheme: "kjv",
      rules: [],
    });
    expect((await get(owner, "/api/compilations")).json().compilations).toHaveLength(1);
    expect((await get(other, "/api/compilations/mine")).statusCode).toBe(404);
    expect((await get(other, "/api/compilations")).json().compilations).toEqual([]);
    expect((await app.inject({ method: "GET", url: "/api/compilations" })).statusCode).toBe(401);
  });

  it("refuse a duplicate abbreviation, a translation's name, and a base whose terms aren't recorded", async () => {
    const again = await post(owner, "/api/compilations", {
      title: "Again",
      abbreviation: "MINE",
      base: "kjv",
    });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: "abbreviation-taken" });
    expect(
      (
        await post(owner, "/api/compilations", {
          title: "Mine 2",
          abbreviation: "KJV",
          base: "kjv",
        })
      ).json(),
    ).toMatchObject({ code: "name-of-translation" });
    expect(
      (
        await post(owner, "/api/compilations", {
          title: "Mine 3",
          abbreviation: "Mine3",
          base: "unrecorded",
        })
      ).json(),
    ).toMatchObject({ code: "base-not-allowed" });
  });

  it("read the base where no rule applies", async () => {
    expect(await read("Joel 2:28-3:2")).toEqual([
      "2:28 KJV 2:28. (kjv; kjv note)",
      "2:29 KJV 2:29. (kjv; kjv note)",
      "2:30 KJV 2:30. (kjv; kjv note)",
      "3:1 KJV 3:1. (kjv; kjv note)",
      "3:2 KJV 3:2. (kjv; kjv note)",
    ]);
  });

  it("take a book from another source, through the canonical numbering, falling back where it lacks a verse", async () => {
    const res = await post(owner, "/api/compilations/mine/rules", {
      scope: { reference: "Joel" },
      source: "heb",
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().rules).toMatchObject([
      { kind: "book", entered: "Joel.2.28-Joel.3.2", label: "Joel", source: { id: "heb" } },
    ]);
    expect(await read("Joel 2:28-3:2")).toEqual([
      "2:28 HEB 3:1. (heb; heb note)",
      "2:29 HEB 3:2. (heb; heb note)",
      "2:30 HEB 3:3. (heb; heb note)",
      "3:1 HEB 4:1. (heb; heb note)",
      // The Hebrew source lacks it: the base supplies it.
      "3:2 KJV 3:2. (kjv; kjv note)",
    ]);
  });

  it("let a narrower rule win, and removing it resets to the wider one", async () => {
    const added = await post(owner, "/api/compilations/mine/rules", {
      scope: { reference: "Joel 2:29-30" },
      source: "other",
    });
    expect(added.json().rules.map((r: { kind: string }) => r.kind)).toEqual(["book", "range"]);
    expect(await read("Joel 2:28-30")).toEqual([
      "2:28 HEB 3:1. (heb; heb note)",
      "2:29 OTHER 2:29. (other; other note)",
      "2:30 OTHER 2:30. (other; other note)",
    ]);
    const passage = await get(owner, "/api/compilations/mine/passages?ref=Joel%202:28-30");
    expect(passage.json().sources.map((s: { id: string }) => s.id)).toEqual(["heb", "other"]);
    expect(passage.json().translation).toMatchObject({
      id: "@compiler/mine",
      abbreviation: "Mine",
      name: "My Bible",
    });

    const rule = added.json().rules.find((r: { kind: string }) => r.kind === "range");
    const removed = await call("DELETE", owner, `/api/compilations/mine/rules/${rule.id}`);
    expect(removed.json().rules).toHaveLength(1);
    expect(await read("Joel 2:29")).toEqual(["2:29 HEB 3:2. (heb; heb note)"]);
  });

  it("refuse overlapping rules of one kind, single verses, sources whose terms aren't recorded, and scopes outside the base", async () => {
    const rule = (scope: object, source = "other") =>
      post(owner, "/api/compilations/mine/rules", { scope, source });
    expect((await rule({ reference: "Joel 2:28-29" })).statusCode).toBe(201);
    const overlap = await rule({ reference: "Joel 2:29-30" });
    expect(overlap.statusCode).toBe(409);
    expect(overlap.json()).toMatchObject({ code: "rule-overlaps" });
    expect((await rule({ reference: "Joel 2:30" })).json()).toMatchObject({ code: "single-verse" });
    expect((await rule({ reference: "Joel 3" }, "unrecorded")).json()).toMatchObject({
      code: "source-not-allowed",
    });
    expect((await rule({ section: "nt" })).json()).toMatchObject({ code: "not-in-base" });
    expect((await rule({ section: "ot" })).statusCode).toBe(201);
  });

  it("take a single verse from a source, ahead of every rule", async () => {
    const res = await post(owner, "/api/compilations/mine/verses", {
      reference: "Joel 2:30",
      source: "kjv",
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      choice: { entered: "Joel.2.30", label: "Joel 2:30", origin: "source", source: { id: "kjv" } },
      wordsChanged: 0,
    });
    expect(await read("Joel 2:30")).toEqual(["2:30 KJV 2:30. (kjv; kjv note)"]);
  });

  it("show a verse as the compilation has it, beside every translation's that may be taken", async () => {
    const res = await get(owner, "/api/compilations/mine/verses?ref=Joel%202:30");
    expect(res.json()).toMatchObject({
      label: "Joel 2:30",
      entered: "Joel.2.30",
      current: { source: { id: "kjv" }, edit: null, text: "KJV 2:30." },
      choice: { origin: "source" },
      options: [
        { translation: { id: "heb" }, text: "HEB 3:3.", modifiable: true, correctionLimit: 3 },
        { translation: { id: "kjv" }, text: "KJV 2:30." },
        { translation: { id: "other" }, text: "OTHER 2:30." },
      ],
    });
  });

  it("save a small change to a source's wording as a correction, keeping its notes", async () => {
    const res = await post(owner, "/api/compilations/mine/verses", {
      reference: "Joel 3:1",
      source: "kjv",
      text: "KJV 3:1 amended.",
      changeNote: "A word was missing.",
    });
    expect(res.json()).toMatchObject({
      choice: { origin: "edited", editKind: "correction", changeNote: "A word was missing." },
      wordsChanged: 1,
    });
    expect(await read("Joel 3:1")).toEqual(["3:1 KJV 3:1 amended. (kjv; kjv note)"]);
    const verse = (await get(owner, "/api/compilations/mine/passages?ref=Joel%203:1")).json()
      .passages[0].verses[0];
    expect(verse).toMatchObject({ source: "kjv", edit: "correction" });
  });

  it("save a larger change, or one the user calls so, as an adaptation", async () => {
    const save = (text: string, kind?: string) =>
      post(owner, "/api/compilations/mine/verses", {
        reference: "Joel 3:1",
        source: "kjv",
        text,
        ...(kind ? { kind } : {}),
      });
    expect((await save("Entirely new words for this verse.")).json()).toMatchObject({
      choice: { editKind: "adaptation" },
      wordsChanged: 6,
    });
    expect((await save("KJV 3:1 changed.", "adaptation")).json()).toMatchObject({
      choice: { editKind: "adaptation" },
      wordsChanged: 1,
    });
    // The source's own wording is a plain choice of that verse again.
    expect((await save("KJV 3:1.")).json()).toMatchObject({ choice: { origin: "source" } });
  });

  it("notice when an edited verse's source has changed since", async () => {
    await post(owner, "/api/compilations/mine/verses", {
      reference: "Joel 3:1",
      source: "kjv",
      text: "KJV 3:1 amended.",
    });
    const changed = () =>
      get(owner, "/api/compilations/mine").then(
        (r) =>
          r.json().verses.find((v: { entered: string }) => v.entered === "Joel.3.1").sourceChanged,
      );
    expect(await changed()).toBe(false);
    const [kjv] = await db.select().from(translation).where(eq(translation.catalogId, "kjv"));
    await db
      .update(verseText)
      .set({ content: ["KJV 3:1, re-imported.", { type: "note", position: 0 }] })
      .where(
        and(
          eq(verseText.translationId, kjv?.id ?? ""),
          eq(verseText.chapter, 3),
          eq(verseText.verse, 1),
        ),
      );
    expect(await changed()).toBe(true);
    // What the compilation shows is what was edited, not the new source text.
    expect(await read("Joel 3:1")).toEqual(["3:1 KJV 3:1 amended. (kjv; kjv note)"]);
  });

  it("refuse a verse the source lacks, and more than one verse", async () => {
    const save = (reference: string, source: string) =>
      post(owner, "/api/compilations/mine/verses", { reference, source });
    expect((await save("Joel 3:2", "heb")).json()).toMatchObject({ code: "not-in-source" });
    expect((await save("Joel 2:28-29", "kjv")).json()).toMatchObject({ code: "one-verse" });
    expect((await save("Joel 3:1", "unrecorded")).json()).toMatchObject({
      code: "source-not-allowed",
    });
  });

  it("reset a verse to inherited, keeping its history", async () => {
    const view = (await get(owner, "/api/compilations/mine")).json();
    const choice = view.verses.find((v: { entered: string }) => v.entered === "Joel.3.1");
    const res = await call("DELETE", owner, `/api/compilations/mine/verses/${choice.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().verses.map((v: { entered: string }) => v.entered)).toEqual(["Joel.2.30"]);
    expect(await read("Joel 3:1")).toEqual(["3:1 HEB 4:1. (heb; heb note)"]);
    const history = await db
      .select()
      .from(compilationVerseRevision)
      .where(eq(compilationVerseRevision.entered, "Joel.3.1"));
    expect(history.map((h) => h.origin)).toEqual([
      "edited",
      "edited",
      "edited",
      "source",
      "edited",
      null,
    ]);
    expect(
      (await call("DELETE", owner, `/api/compilations/mine/verses/${choice.id}`)).statusCode,
    ).toBe(404);
  });

  it("list the base's books, and are deleted with their rules", async () => {
    expect((await get(owner, "/api/compilations/mine/books")).json()).toEqual({
      books: [{ osis: "Joel", chapters: [2, 3] }],
    });
    expect((await call("DELETE", owner, "/api/compilations/mine")).statusCode).toBe(204);
    expect((await get(owner, "/api/compilations/mine")).statusCode).toBe(404);
  });
});
