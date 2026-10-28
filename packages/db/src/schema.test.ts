import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./client.ts";
import { translation, translatorNote, verseText } from "./schema.ts";
import { testDatabase } from "./test-support/database.ts";

let db: Database;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await testDatabase());
});
afterAll(() => drop());

const addTranslation = async (catalogId: string) => {
  const [row] = await db
    .insert(translation)
    .values({
      catalogId,
      abbreviation: catalogId.toUpperCase(),
      name: catalogId,
      language: "en",
      direction: "ltr",
      scheme: "kjv",
      licenseKey: "public-domain",
    })
    .returning();
  if (!row) throw new Error("no row");
  return row;
};

const verse = (translationId: string, n: number, range: { start: number; end: number } | null) => ({
  translationId,
  book: "John",
  chapter: 3,
  verse: n,
  canonical: [`John.3.${n}`],
  mapping: "same",
  canonicalRange: range,
  headings: [],
  content: ["text"],
});

describe("domain-model §1.1: UUIDv7 keys", () => {
  it("are version 7, and sort by creation", async () => {
    const a = await addTranslation("uuid-a");
    const b = await addTranslation("uuid-b");
    expect(a.id[14]).toBe("7");
    expect(a.id < b.id).toBe(true);
  });
});

describe("domain-model §2.2: canonical ranges", () => {
  it("round-trip, and find the verses overlapping a passage", async () => {
    const t = await addTranslation("ranges");
    // John.3.16 as an ordinal is 43·10⁷ + 3·10⁴ + 16·10 = 430030160; a whole verse covers +9.
    await db
      .insert(verseText)
      .values([
        verse(t.id, 16, { start: 430030160, end: 430030169 }),
        verse(t.id, 17, { start: 430030170, end: 430030179 }),
        verse(t.id, 18, null),
      ]);
    const rows = await db
      .select({ verse: verseText.verse, range: verseText.canonicalRange })
      .from(verseText)
      .where(sql`${verseText.canonicalRange} && int4range(430030165, 430030172, '[]')`)
      .orderBy(verseText.verse);
    expect(rows).toEqual([
      { verse: 16, range: { start: 430030160, end: 430030169 } },
      { verse: 17, range: { start: 430030170, end: 430030179 } },
    ]);
  });
});

describe("domain-model §2.6: translator's notes", () => {
  it("belong to their verse and go with it", async () => {
    const t = await addTranslation("notes");
    const [v] = await db
      .insert(verseText)
      .values(verse(t.id, 1, null))
      .returning();
    if (!v) throw new Error("no verse");
    await db.insert(translatorNote).values({
      verseTextId: v.id,
      position: 0,
      kind: "footnote",
      marker: "f",
      caller: "+",
      span: "1",
      body: [{ type: "char", marker: "ft", content: ["Literally"] }],
    });
    await expect(
      db.insert(translatorNote).values({
        verseTextId: v.id,
        position: 0,
        kind: "footnote",
        marker: "f",
        caller: "+",
        body: [],
      }),
    ).rejects.toThrow();
    await db.delete(verseText).where(eq(verseText.id, v.id));
    expect(
      await db.select().from(translatorNote).where(eq(translatorNote.verseTextId, v.id)),
    ).toEqual([]);
  });
});
