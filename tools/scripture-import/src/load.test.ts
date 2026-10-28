import { type Database, translationImport, translatorNote, verseText } from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CatalogEntry } from "./catalog.ts";
import { importBook } from "./import-book.ts";
import { canonicalRange, extractNotes, loadTranslation } from "./load.ts";
import type { ImportedTranslation } from "./translation.ts";

let db: Database;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await testDatabase());
});
afterAll(() => drop());

const entry: CatalogEntry = {
  id: "test",
  abbreviation: "TST",
  name: "Test",
  language: "en",
  direction: "ltr",
  scheme: "kjv",
  license: "public-domain",
  source: "test/converted",
};

/** One book, read by the real import, with canonical refs given by hand. */
const translationOf = (usfm: string, issues: string[] = []): ImportedTranslation => {
  const { book } = importBook(usfm);
  if (!book) throw new Error("no book");
  const { issues: _, ...rest } = book;
  return {
    entry,
    books: [
      {
        ...rest,
        chapters: book.chapters.map((c) => ({
          ...c,
          verses: c.verses.map((v) => ({
            ...v,
            canonical: [`${book.book}.${c.number}.${v.verse}`],
            mapping: "same" as const,
          })),
        })),
      },
    ],
    verseCounts: {},
    issues,
    normalizations: [],
    peripheral: [],
  };
};

const GENESIS = [
  "\\id GEN test",
  "\\c 2",
  "\\s1 The Woman",
  '\\q1 \\v 23 “\\w She is now|x-idiom="1"\\w*\\f + \\ft Literally\\f* bone\\x - \\xt Gen 1:1\\x*',
  "\\q1 \\v 24 Therefore a man.",
].join("\n");

describe("extractNotes (domain-model §2.6)", () => {
  it("leaves a mark where each note was, counting headings first", () => {
    const note = { type: "note" as const, marker: "f", caller: "+", content: ["n"] };
    const out = extractNotes(
      [{ marker: "s1", content: ["Head", note] }],
      ["a", { type: "span", span: "1", content: ["b", note] }, note],
    );
    expect(out.headings).toEqual([
      { marker: "s1", content: ["Head", { type: "note", position: 0 }] },
    ]);
    expect(out.content).toEqual([
      "a",
      { type: "span", span: "1", content: ["b", { type: "note", position: 1 }] },
      { type: "note", position: 2 },
    ]);
    expect(out.notes.map((n) => n.position)).toEqual([0, 1, 2]);
  });
});

describe("canonicalRange (domain-model §2.2)", () => {
  it("covers every part of the last whole verse", () => {
    expect(canonicalRange(["John.3.16", "John.3.17"])).toEqual({
      start: 430030160,
      end: 430030179,
    });
    expect(canonicalRange([])).toBeNull();
  });
});

describe("loadTranslation", () => {
  it("loads verses with their headings, and notes linked to their spans", async () => {
    const result = await loadTranslation(db, translationOf(GENESIS));
    expect(result).toEqual({ books: 1, verses: 2, notes: 2, withheld: [] });

    const [v23] = await db.select().from(verseText).where(eq(verseText.verse, 23));
    expect(v23?.headings).toEqual([{ marker: "s1", content: ["The Woman"] }]);
    expect(v23?.content).toContainEqual({ type: "note", position: 0 });
    const notes = await db
      .select()
      .from(translatorNote)
      .where(eq(translatorNote.verseTextId, v23?.id ?? ""))
      .orderBy(asc(translatorNote.position));
    expect(notes.map((n) => [n.position, n.kind, n.span])).toEqual([
      [0, "footnote", "1"],
      [1, "cross_reference", null],
    ]);
  });

  it("replaces the earlier load, and records each load", async () => {
    await loadTranslation(db, translationOf(GENESIS));
    expect(await db.select().from(verseText)).toHaveLength(2);
    expect(await db.select().from(translatorNote)).toHaveLength(2);
    expect(await db.select().from(translationImport)).toHaveLength(2);
  });

  it("withholds a book the import reported issues in", async () => {
    const result = await loadTranslation(db, translationOf(GENESIS, ["GEN 2:23: something"]));
    expect(result).toEqual({ books: 0, verses: 0, notes: 0, withheld: ["GEN"] });
    expect(await db.select().from(verseText)).toHaveLength(0);
  });
});
