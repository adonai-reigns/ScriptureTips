/**
 * Converts the Lexham English Bible's XML (LEB.xml, the 2020 download; sources.md §3.4) to USFM.
 *
 *   node src/leb/cli.ts <LEB.xml> <output directory>
 *
 * Writes one USFM file per book and `conversion-report.txt`. Exits with status 1 if the
 * conversion has issues, or if any book's words differ from the XML's.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bookToUsfm } from "./usfm.ts";
import { firstDifference, usfmWords, xmlWords } from "./verify.ts";
import { parseXml, type XmlElement } from "./xml.ts";

const IDENTIFICATION = "Lexham English Bible (LEB.xml, downloaded 2020-02-09)";

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("Usage: node src/leb/cli.ts <LEB.xml> <output directory>");
  process.exit(2);
}

const books = parseXml(readFileSync(input, "utf8")).children.filter(
  (c): c is XmlElement => typeof c !== "string" && c.name === "book",
);
mkdirSync(outDir, { recursive: true });

const issues: string[] = [];
const totals: Record<string, number> = {};
books.forEach((element, i) => {
  const book = bookToUsfm(element, IDENTIFICATION);
  issues.push(...book.issues);
  const lost = firstDifference(xmlWords(element), usfmWords(book.usfm));
  if (lost) issues.push(`${book.code}: words differ from the XML: ${lost}`);
  for (const [what, n] of Object.entries(book.counts)) totals[what] = (totals[what] ?? 0) + n;
  writeFileSync(join(outDir, `${String(i + 1).padStart(2, "0")}-${book.code}.usfm`), book.usfm);
});

const report = [
  `Books: ${books.length}`,
  `Issues: ${issues.length}`,
  ...issues.map((issue) => `ISSUE ${issue}`),
  ...Object.entries(totals).map(([what, n]) => `${what}: ${n}`),
];
writeFileSync(join(outDir, "conversion-report.txt"), `${report.join("\n")}\n`);
console.log(report.slice(0, 2).join("\n"));
process.exit(issues.length > 0 ? 1 : 0);
