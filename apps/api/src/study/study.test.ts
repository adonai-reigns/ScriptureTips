import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { type Database, lemma } from "@scripturetips/db";
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
