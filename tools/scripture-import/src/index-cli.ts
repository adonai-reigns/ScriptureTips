/**
 * Writes the plain text search uses (`verse_text.plain`) for verses loaded before it existed
 * (the import writes it from now on). Safe to run again: it only fills what's missing.
 *
 *   node src/index-cli.ts            every translation
 *   node src/index-cli.ts eng-kjv …  these (catalog IDs)
 */

import {
  and,
  connect,
  databaseUrl,
  inArray,
  isNull,
  sql,
  translation,
  verseText,
} from "@scripturetips/db";
import { plainText } from "./plain.ts";

const CHUNK = 2000;
const ids = process.argv.slice(2);

const { db, close } = connect(databaseUrl());
try {
  const translations = await db
    .select({ id: translation.id, catalogId: translation.catalogId })
    .from(translation)
    .where(ids.length > 0 ? inArray(translation.catalogId, ids) : undefined);
  for (const t of translations) {
    const started = Date.now();
    let done = 0;
    for (;;) {
      const rows = await db
        .select({ id: verseText.id, content: verseText.content })
        .from(verseText)
        .where(and(sql`${verseText.translationId} = ${t.id}`, isNull(verseText.plain)))
        .limit(CHUNK);
      if (rows.length === 0) break;
      const values = rows.map((r) => sql`(${r.id}::uuid, ${plainText(r.content as unknown[])})`);
      await db.execute(
        sql`update verse_text set plain = v.plain from (values ${sql.join(values, sql`, `)}) as v(id, plain) where verse_text.id = v.id`,
      );
      done += rows.length;
    }
    console.log(`${t.catalogId}: ${done} verses, ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }
} finally {
  await close();
}
