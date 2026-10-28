/**
 * Loads imported translations into the database (DATABASE_URL):
 *
 *   node src/load-cli.ts <imported folder> [translation id …]
 *
 * Reads the `<id>.json` files the import wrote, in catalog order; with IDs, only those.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { connect, databaseUrl } from "@scripturetips/db";
import { CATALOG } from "./catalog.ts";
import { loadTranslation } from "./load.ts";
import type { ImportedTranslation } from "./translation.ts";

const [folder = "", ...ids] = process.argv.slice(2);
const entries = CATALOG.filter((e) => (ids.length > 0 ? ids.includes(e.id) : !e.held));

const { db, close } = connect(databaseUrl());
try {
  for (const entry of entries) {
    const file = join(folder, `${entry.id}.json`);
    if (!existsSync(file)) {
      console.log(`${entry.id}: not imported (no ${file})`);
      continue;
    }
    const started = Date.now();
    const t = JSON.parse(readFileSync(file, "utf8")) as ImportedTranslation;
    const r = await loadTranslation(db, t);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const withheld =
      r.withheld.length > 0 ? `, withheld (import issues): ${r.withheld.join(", ")}` : "";
    console.log(
      `${entry.id}: ${r.books} books, ${r.verses} verses, ${r.notes} notes, ${seconds} s${withheld}`,
    );
  }
} finally {
  await close();
}
