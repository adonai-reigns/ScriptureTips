// cspell:ignore Standardisation

/**
 * Reads the expanded section of STEPBible's TVTMS (Translators Versification Traditions with
 * Methodology for Standardisation). Each row maps one verse of a versification tradition (its
 * `SourceType`, e.g. "Hebrew" or "Eng-KJV+Latin") to the equivalent verse in TVTMS's standard,
 * which is KJV numbering.
 */

import { bookByUsfm, type VerseRef, verseRef } from "@scripturetips/passage";

export interface TvtmsRow {
  /** The traditions the row applies to: "Eng-KJV+Hebrew" → ["Eng-KJV", "Hebrew"]. */
  readonly traditions: readonly string[];
  readonly source: VerseRef;
  /** The equivalent verse in KJV numbering; `part` marks a part of a KJV verse ("!a"). */
  readonly standard: VerseRef;
  readonly action: string;
  /**
   * Which alternative of the tradition the row belongs to: the row's type and its tests, less
   * the first test (that the row's own verse exists). Some traditions have alternatives, e.g.
   * editions of the Greek that end a chapter at different verses; TVTMS's tests tell them apart.
   */
  readonly alternative: string;
}

export interface ParseResult {
  readonly rows: readonly TvtmsRow[];
  /** Rows left out, by reason, with an example of each. */
  readonly skipped: ReadonlyMap<string, { count: number; example: string }>;
}

/** TVTMS book codes that differ from the USFM code in upper case. */
const BOOK_CODES: ReadonlyMap<string, string> = new Map([["Esg", "ESG"]]);

const REF = /^([1-4]?[A-Za-z][A-Za-z0-9]{1,2})\.(\d+):(\d+|Title)(?:!([a-z]|\d+))?$/;

/** Parses "Gen.32:1", "Psa.3:Title" (verse 0), "3Jn.1:14!a" (part 1) or "Jos.9:2!3" (part 3). */
export function parseTvtmsRef(text: string): VerseRef | string {
  const match = REF.exec(text.trim());
  if (!match) return "unparsable reference";
  const [, code = "", chapter = "", verse = "", part] = match;
  const book = bookByUsfm(BOOK_CODES.get(code) ?? code.toUpperCase());
  if (!book) return `book not in the registry (${code})`;
  let partNumber = 0;
  if (part !== undefined) {
    partNumber = /\d/.test(part) ? Number(part) : part.charCodeAt(0) - 96;
    if (partNumber > 9) return "subverse beyond part 9";
  }
  return verseRef(book.osis, Number(chapter), verse === "Title" ? 0 : Number(verse), partNumber);
}

/** Parses the rows between `#DataStart(Expanded)` and `#DataEnd(Expanded)`. */
export function parseTvtms(text: string): ParseResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith("#DataStart(Expanded)"));
  const end = lines.findIndex((l) => l.startsWith("#DataEnd(Expanded)"));
  if (start < 0 || end < start) throw new Error("No expanded data section in the TVTMS file");

  const rows: TvtmsRow[] = [];
  const skipped = new Map<string, { count: number; example: string }>();
  const skip = (reason: string, line: string) => {
    const entry = skipped.get(reason) ?? {
      count: 0,
      example: line.split("\t").slice(0, 4).join(" | "),
    };
    entry.count++;
    skipped.set(reason, entry);
  };

  for (const line of lines.slice(start + 1, end)) {
    if (line.trim() === "" || /^['#]|^SourceType\t/.test(line)) continue;
    const cells = line.split("\t");
    const [type = "", sourceText = "", standardText = "", actionText = ""] = cells;
    const action = actionText.trim().replace(/\*$/, "");
    // A summary of the rows that follow it, which give the same mapping verse by verse.
    if (action === "Concatenation") continue;
    // Applies to every Bible: a verse kept, perhaps empty. Each tradition's own rows say more.
    if (type.trim() === "AllBibles") continue;
    // Keeps an empty slot where a tradition lacks the verse; the tradition's other rows map it.
    if (action === "IfEmpty verse") continue;
    const source = parseTvtmsRef(sourceText);
    const standard = parseTvtmsRef(standardText);
    if (typeof source === "string" || typeof standard === "string") {
      skip(typeof source === "string" ? source : (standard as string), line);
      continue;
    }
    rows.push({
      traditions: type.split("+").map((t) => t.trim()),
      source,
      standard,
      action,
      alternative: `${type.trim()} ${sourceText.split(":")[0]} ${(cells[8] ?? "").split("&").slice(1).join("&").trim()}`,
    });
  }
  return { rows, skipped };
}
