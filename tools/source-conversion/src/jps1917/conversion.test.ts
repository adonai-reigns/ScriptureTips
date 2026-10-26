/**
 * End-to-end check against the real transcription and witness, which live outside git in
 * ../source-texts (mounted at /source-texts in the toolbox). Skipped where they're absent.
 */

import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOKS } from "./books.ts";
import { CHAPTER_STARTS, CORRECTIONS, HYPHENATED_COMPOUNDS } from "./corrections.ts";
import { restoreHebrew } from "./hebrew.ts";
import { resolveLineEndHyphens, restoreCompounds } from "./hyphens.ts";
import { parseTranscription } from "./parse.ts";
import { applyCorrections, decodeSource } from "./source.ts";
import { bookWords, diffWords, readZip, usfmWords } from "./verify.ts";

const ROOT = "/source-texts/jps-tanakh-1917";
const SOURCE = `${ROOT}/opensiddur-wayback/Tanakh1917.txt`;
const WITNESS = `${ROOT}/engjps_usfm.zip`;

describe.skipIf(!existsSync(SOURCE) || !existsSync(WITNESS))("JPS 1917 conversion", () => {
  const corrected = applyCorrections(decodeSource(readFileSync(SOURCE)), CORRECTIONS);
  const { text } = resolveLineEndHyphens(
    restoreCompounds(corrected, HYPHENATED_COMPOUNDS),
    HYPHENATED_COMPOUNDS,
  );
  const books = parseTranscription(text, CHAPTER_STARTS).map(restoreHebrew);

  it("finds every book with the printing's verse counts and every footnote attached", () => {
    expect(books).toHaveLength(BOOKS.length);
    expect(books.flatMap((b) => b.issues)).toEqual([]);
  });

  it("restores all the lost Hebrew: portion names and every acrostic letter", () => {
    const events = books.flatMap((b) => b.events);
    expect(events.filter((e) => e.kind === "lost-hebrew")).toEqual([]);
    expect(events.filter((e) => e.kind === "heading" && e.style === "s2")).toHaveLength(49);
    expect(events.filter((e) => e.kind === "acrostic")).toHaveLength(238);
  });

  it("differs from the eBible witness only where the scan shows the witness is wrong", () => {
    const archive = readZip(readFileSync(WITNESS));
    let differences = 0;
    for (const book of books) {
      const name = [...archive.keys()].find((k) => k.endsWith(`${book.info.code}engjps.usfm`));
      const theirs = usfmWords(new TextDecoder().decode(archive.get(name as string)));
      differences += diffWords(bookWords(book), theirs).differences.length;
    }
    // Each checked on the scan, where the witness is wrong: EXO 6:3, LEV 1:1, LEV 18:15,
    // 2SA 15:14, 2SA 22:27, PSA 47:1, 55:3, 82:8, 100:3, 119:66, 119:142, JOB 27:19, RUT 1:12,
    // DAN 2:23.
    expect(differences).toBe(14);
  });
});
