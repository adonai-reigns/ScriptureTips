/**
 * Imports one translation in its own process, for cli.ts: usfm-grammar's native parser keeps
 * memory that garbage collection can't free (about 4 GB for the ASV), so each translation
 * gets a process that returns it on exit.
 *
 *   node src/worker.ts <source-texts folder> <output folder> <translation id>
 *
 * Writes `<id>.json` and sends its report section to the parent process.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOG } from "./catalog.ts";
import { importTranslation, skippedVerses } from "./translation.ts";

export interface WorkerResult {
  readonly id: string;
  readonly summary: string;
  readonly report: readonly string[];
  readonly issues: number;
}

const [sourceRoot = "", outDir = "", id] = process.argv.slice(2);
const entry = CATALOG.find((e) => e.id === id);
if (!entry) throw new Error(`Not in the catalog: ${id}`);

const started = Date.now();
const t = importTranslation(entry, sourceRoot);
const verses = t.books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0);
const noCanonical = t.books.flatMap((b) =>
  b.chapters.flatMap((c) =>
    c.verses.filter((v) => v.canonical.length === 0).map((v) => `${b.book}.${c.number}.${v.verse}`),
  ),
);
const skipped = skippedVerses(t);
const seconds = ((Date.now() - started) / 1000).toFixed(1);

const report = [
  `${entry.id} (${entry.abbreviation}, ${entry.scheme} scheme): ${t.books.length} books, ${verses} verses, ${seconds} s`,
];
for (const issue of t.issues) report.push(`  issue: ${issue}`);
for (const n of t.normalizations) report.push(`  normalized: ${n.book}: ${n.rule} (${n.count})`);
if (t.peripheral.length > 0) report.push(`  not books: ${t.peripheral.join(", ")}`);
if (skipped.length > 0) report.push(`  verse numbers skipped: ${skipped.join(", ")}`);
if (noCanonical.length > 0) report.push(`  no canonical verse: ${noCanonical.join(", ")}`);
const spansWithoutNote = t.books.flatMap((b) => b.spansWithoutNote);
if (spansWithoutNote.length > 0)
  report.push(`  spans with no note right after them: ${spansWithoutNote.join(", ")}`);

writeFileSync(join(outDir, `${entry.id}.json`), JSON.stringify(t));
const result: WorkerResult = {
  id: entry.id,
  summary: `${entry.id}: ${t.books.length} books, ${t.issues.length} issues, ${seconds} s`,
  report,
  issues: t.issues.length,
};
process.send?.(result);
