import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  type Database,
  translation,
  translationBook,
  translatorNote,
  verseText,
} from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";

let db: Database;
let drop: () => Promise<void>;
let app: NestFastifyApplication;

const range = (book: number, chapter: number, verse: number) => {
  const start = book * 10_000_000 + chapter * 10_000 + verse * 10;
  return { start, end: start + 9 };
};

beforeAll(async () => {
  let url: string;
  ({ db, url, drop } = await testDatabase());
  const [t] = await db
    .insert(translation)
    .values({
      catalogId: "kjv",
      abbreviation: "KJV",
      name: "King James Version",
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
  // KJV Joel 2:28–32 is Joel 3:1–5 in the Hebrew (canonical) numbering. Book 29 is Joel.
  const joel = [28, 29, 30, 31, 32].map((n, i) => ({
    translationId: t.id,
    book: "Joel",
    chapter: 2,
    verse: n,
    canonical: [`Joel.3.${i + 1}`],
    mapping: "renumbered",
    canonicalRange: range(29, 3, i + 1),
    headings: n === 28 ? [{ marker: "s1", content: ["The Spirit Poured Out"] }] : [],
    content: [`Verse ${n}.`, ...(n === 28 ? [{ type: "note", position: 0 }] : [])],
  }));
  const rows = await db.insert(verseText).values(joel).returning();
  await db.insert(translatorNote).values({
    verseTextId: rows[0]?.id ?? "",
    position: 0,
    kind: "footnote",
    marker: "f",
    caller: "+",
    body: ["A note."],
  });
  app = await createApp(url);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app?.close();
  await drop();
});

const get = (url: string) => app.inject({ method: "GET", url });

describe("GET /api/translations", () => {
  it("lists the translations with text", async () => {
    const res = await get("/api/translations");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      translations: [
        {
          id: "kjv",
          abbreviation: "KJV",
          name: "King James Version",
          language: "en",
          direction: "ltr",
          scheme: "kjv",
          license: "public-domain",
        },
      ],
    });
  });
});

describe("GET /api/translations/:translation/passages", () => {
  it("returns the verses in the translation's numbering, with their canonical refs and notes", async () => {
    const res = await get(
      `/api/translations/kjv/passages?ref=${encodeURIComponent("Joel 2:28-30")}`,
    );
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.passages).toHaveLength(1);
    const [p] = body.passages;
    expect(p.entered).toBe("Joel.2.28-Joel.2.30");
    expect(p.canonical).toBe("Joel.3.1-Joel.3.3");
    expect(p.label).toBe("Joel 2:28–30");
    expect(p.verses.map((v: { verse: number }) => v.verse)).toEqual([28, 29, 30]);
    expect(p.verses[0].headings).toEqual([{ marker: "s1", content: ["The Spirit Poured Out"] }]);
    expect(p.verses[0].notes).toEqual([
      { position: 0, kind: "footnote", caller: "+", category: null, span: null, body: ["A note."] },
    ]);
  });

  it("reads several references", async () => {
    const res = await get(
      `/api/translations/kjv/passages?ref=${encodeURIComponent("Joel 2:28; 2:32")}`,
    );
    expect(res.json().passages.map((p: { label: string }) => p.label)).toEqual([
      "Joel 2:28",
      "Joel 2:32",
    ]);
  });

  it("answers an unreadable reference with a code and where it went wrong", async () => {
    const res = await get(`/api/translations/kjv/passages?ref=${encodeURIComponent("Joel 9:1")}`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "no-such-chapter" });
  });

  it("answers an unknown translation with 404", async () => {
    const res = await get("/api/translations/nope/passages?ref=Joel%202:28");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: "unknown-translation" });
  });

  it("rejects a missing reference", async () => {
    const res = await get("/api/translations/kjv/passages");
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "invalid-request" });
  });
});
