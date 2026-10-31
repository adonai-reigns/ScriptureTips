import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  type Database,
  eq,
  lemma,
  lexicon,
  lexiconEntry,
  sourceText,
  token,
} from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { testAccounts } from "../auth/test-support.ts";
import { testBuilds } from "../pdf-builds/test-support.ts";

let db: Database;
let drop: () => Promise<void>;
let app: NestFastifyApplication;

beforeAll(async () => {
  let url: string;
  ({ db, url, drop } = await testDatabase());
  const row = (key: string, extra: Partial<typeof lemma.$inferInsert>) => ({
    language: key.startsWith("G") ? ("grc" as const) : ("heb" as const),
    strong: key.replace(/[A-Z]$/, ""),
    key,
    ...extra,
  });
  await db
    .insert(lemma)
    .values([
      row("H0430", { headword: "אֱלֹהִים", gloss: "God", partOfSpeech: "noun", nameKind: "other" }),
      row("H0085", { headword: "אַבְרָהָם", partOfSpeech: "noun", nameKind: "person" }),
      row("G2532", { headword: "καί", gloss: "and", partOfSpeech: "conjunction" }),
    ]);
  app = await createApp({
    databaseUrl: url,
    accounts: testAccounts().settings,
    builds: testBuilds().settings,
  });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(async () => {
  await app.close();
  await drop();
});

const post = (payload: unknown) =>
  app.inject({ method: "POST", url: "/api/study/words", payload: payload as never });

describe("vision §3.2: study mode's words", () => {
  it("gives each Strong's number its category and the word it is", async () => {
    const res = await post({ strongs: ["H0430", "H0085", "G2532"] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      words: {
        H0430: { category: "name", headword: "אֱלֹהִים", gloss: "God", partOfSpeech: "noun" },
        H0085: { category: "person", headword: "אַבְרָהָם", gloss: null, partOfSpeech: "noun" },
        G2532: {
          category: "conjunction",
          headword: "καί",
          gloss: "and",
          partOfSpeech: "conjunction",
        },
      },
    });
  });

  it("leaves out numbers it has no lemma for, and repeats once", async () => {
    const res = await post({ strongs: ["H9999", "H0430", "H0430"] });
    expect(Object.keys(res.json().words)).toEqual(["H0430"]);
  });

  it("answers an empty list, and refuses anything that isn't a number", async () => {
    expect((await post({ strongs: [] })).json()).toEqual({ words: {} });
    expect((await post({ strongs: ["not a number"] })).statusCode).toBe(400);
    expect((await post({})).statusCode).toBe(400);
  });
});

describe("vision §3.2: a word in full", () => {
  it("gives its dictionary entries, shortened, and how often it's used", async () => {
    const [source] = await db
      .insert(sourceText)
      .values({
        catalogId: "tahot-test",
        name: "TAHOT test",
        language: "heb",
        tradition: "Masoretic",
        licenseKey: "stepbible-data",
        report: {},
      })
      .returning({ id: sourceText.id });
    const [base] = await db.select().from(lemma).where(eq(lemma.key, "H0430"));
    const [extended] = await db
      .insert(lemma)
      .values({
        language: "heb",
        strong: "H0430",
        key: "H0430G",
        extendedStrong: "H0430G",
        baseLemmaId: base?.id ?? null,
        headword: "אֱלֹהִים",
      })
      .returning({ id: lemma.id });
    const word = (position: number, lemmaId: string | null | undefined) => ({
      sourceTextId: source?.id ?? "",
      book: "Gen",
      chapter: 1,
      verse: 1,
      position,
      reading: "L",
      surface: "אֱלֹהִים",
      lemmaId: lemmaId ?? null,
      morphology: "HNcmpa",
      canonical: ["Gen.1.1"],
      canonicalRange: null,
    });
    await db
      .insert(token)
      .values([word(1, base?.id), word(2, extended?.id), word(3, extended?.id)]);
    const [strongs, bdb] = await db
      .insert(lexicon)
      .values([
        {
          catalogId: "strongs-hebrew",
          name: "Strong's Hebrew",
          author: "J. Strong",
          language: "heb" as const,
          licenseKey: "oshb-lexicon",
          report: {},
        },
        {
          catalogId: "bdb",
          name: "BDB",
          author: "BDB",
          language: "heb" as const,
          licenseKey: "oshb-lexicon",
          report: {},
        },
      ])
      .returning({ id: lexicon.id });
    await db.insert(lexiconEntry).values([
      {
        lexiconId: bdb?.id ?? "",
        lemmaId: base?.id ?? "",
        entryRef: "a.ab",
        headword: "אֱלֹהִים",
        body: { text: "long text", definitions: ["God", "gods"] },
      },
      {
        lexiconId: strongs?.id ?? "",
        lemmaId: base?.id ?? "",
        entryRef: "",
        headword: "אֱלֹהִים",
        body: { meaning: "plural of eloah", usage: "God, gods, judges" },
      },
    ]);

    const res = await app.inject({ method: "GET", url: "/api/study/lemma/H0430" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("public, max-age=3600");
    expect(res.json()).toMatchObject({
      strong: "H0430",
      category: "name",
      headword: "אֱלֹהִים",
      gloss: "God",
      // The base lemma's word and both uses of its extended lemma.
      occurrences: 3,
    });
    // Strong's first, then the fuller dictionary.
    expect(res.json().entries).toEqual([
      {
        lexicon: "strongs-hebrew",
        name: "Strong's Hebrew",
        headword: "אֱלֹהִים",
        summary: "plural of eloah — God, gods, judges",
      },
      { lexicon: "bdb", name: "BDB", headword: "אֱלֹהִים", summary: "God; gods" },
    ]);
  });

  it("answers 404 for a number with no lemma, and 400 for one that isn't a number", async () => {
    expect((await app.inject({ method: "GET", url: "/api/study/lemma/H9999" })).statusCode).toBe(
      404,
    );
    expect((await app.inject({ method: "GET", url: "/api/study/lemma/abc" })).statusCode).toBe(400);
  });
});
