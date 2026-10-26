/**
 * Converts Open Siddur's JPS 1917 transcription to USFM.
 *
 *   node src/jps1917/cli.ts <Tanakh1917.txt> <output directory> [engjps_usfm.zip]
 *
 * Writes one USFM file per book and `conversion-report.txt`. Exits with status 1 if the
 * conversion has issues (wrong verse counts, unattached footnotes). With eBible's `engjps`
 * archive, also writes `witness-report.txt`: every word difference from that second witness,
 * and verse starts that don't line up with it.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BOOKS } from "./books.ts";
import { CHAPTER_STARTS, CORRECTIONS, HYPHENATED_COMPOUNDS } from "./corrections.ts";
import { restoreHebrew } from "./hebrew.ts";
import { resolveLineEndHyphens, restoreCompounds } from "./hyphens.ts";
import { parseTranscription } from "./parse.ts";
import { applyCorrections, decodeSource } from "./source.ts";
import { toUsfm } from "./usfm.ts";
import { bookWords, boundaryMismatches, diffWords, readZip, usfmWords } from "./verify.ts";

const IDENTIFICATION =
  "JPS 1917 - The Holy Scriptures according to the Masoretic Text (Open Siddur transcription, corrected against the 1917 printing)";

const [input, outDir, witnessZip] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("Usage: node src/jps1917/cli.ts <Tanakh1917.txt> <output directory>");
  process.exit(2);
}

const corrected = applyCorrections(decodeSource(readFileSync(input)), CORRECTIONS);
const { text, decisions } = resolveLineEndHyphens(
  restoreCompounds(corrected, HYPHENATED_COMPOUNDS),
  HYPHENATED_COMPOUNDS,
);
const books = parseTranscription(text, CHAPTER_STARTS).map(restoreHebrew);
mkdirSync(outDir, { recursive: true });

const report: string[] = [];
let issueCount = 0;
books.forEach((book, i) => {
  const { usfm, lostHebrew } = toUsfm(book, IDENTIFICATION);
  const position = String(i + 2).padStart(2, "0");
  writeFileSync(join(outDir, `${position}-${book.info.code}.usfm`), usfm);
  issueCount += book.issues.length;
  for (const issue of book.issues) report.push(`ISSUE ${issue}`);
  for (const lost of lostHebrew) report.push(`LOST-HEBREW ${lost.ref} ${lost.source}`);
});
// Hyphens the text gives no evidence for either way are kept; listed for review.
for (const d of decisions) {
  if (d.solid === 0 && d.hyphenated === 0) report.push(`HYPHEN kept ${d.left}-${d.right}`);
}
report.unshift(
  `Books: ${books.length} of ${BOOKS.length}`,
  `Corrections applied: ${CORRECTIONS.length}`,
  `Issues: ${issueCount}`,
);
writeFileSync(join(outDir, "conversion-report.txt"), `${report.join("\n")}\n`);
console.log(report.slice(0, 3).join("\n"));

if (witnessZip) {
  const archive = readZip(readFileSync(witnessZip));
  const lines: string[] = [];
  let differences = 0;
  for (const book of books) {
    const name = [...archive.keys()].find((k) => k.endsWith(`${book.info.code}engjps.usfm`));
    if (!name) {
      lines.push(`${book.info.code}: not in the witness`);
      continue;
    }
    const theirs = usfmWords(new TextDecoder().decode(archive.get(name)));
    const ours = bookWords(book);
    const { differences: diffs, alignment } = diffWords(ours, theirs);
    for (const d of diffs) {
      differences++;
      const show = (ws: readonly { word: string }[]) =>
        ws
          .map((w) => w.word)
          .join(" ")
          .slice(0, 300);
      lines.push(
        `DIFF ${book.info.code} ${d.ref} (witness ${d.witnessRef}): ${d.before} [${show(d.ours)}] -> [${show(d.theirs)}] ${d.after}`,
      );
    }
    for (const b of boundaryMismatches(ours, theirs, alignment)) {
      lines.push(`BOUNDARY ${book.info.code} ${b}`);
    }
  }
  lines.unshift(`Word differences: ${differences}`);
  writeFileSync(join(outDir, "witness-report.txt"), `${lines.join("\n")}\n`);
  console.log(lines[0]);
}
process.exit(issueCount > 0 ? 1 : 0);
