/**
 * Writing references for display, in the numbering they're stored in: "John 3:16–18",
 * "Joel 2:28–3:1", "Psalm 23", "Psalms 1–3", "Jude 3", "Rev 13:1a", "Psalm 3:title–2".
 */

import type { Passage, VerseRef } from "@scripturetips/passage";
import { english } from "./english.ts";
import type { Language } from "./language.ts";
import { SINGLE_CHAPTER_BOOKS, type VerseCounts } from "./parse.ts";

export interface FormatOptions {
  readonly language?: Language;
  /** Full names ("1 Corinthians") or abbreviations ("1 Cor"). */
  readonly style?: "full" | "short";
  /** With verse counts, whole chapters and books are written as such ("Psalm 23"). */
  readonly verses?: VerseCounts;
}

/** En dash (U+2013), the typographic range dash. */
const DASH = "\u2013";

export function formatPassage(p: Passage, options: FormatOptions = {}): string {
  const language = options.language ?? english;
  const style = options.style ?? "full";
  const { start, end } = p;
  const book = start.book;
  const sameChapter = start.chapter === end.chapter;
  const name = language.name(book, style, sameChapter ? "one" : "several");
  const verse = (ref: VerseRef) =>
    `${ref.verse === 0 ? language.headingWords[0] : ref.verse}${ref.part === 0 ? "" : String.fromCharCode(96 + ref.part)}`;
  const same = (a: VerseRef, b: VerseRef) => a.verse === b.verse && a.part === b.part;

  const counts = options.verses;
  const wholeStart = start.part === 0 && start.verse === counts?.verses(book, start.chapter)?.first;
  const wholeEnd = end.part === 0 && end.verse === counts?.verses(book, end.chapter)?.last;
  if (wholeStart && wholeEnd) {
    const chapters = counts?.chapters(book);
    if (chapters?.first === start.chapter && chapters.last === end.chapter && !sameChapter)
      return language.name(book, style, "several");
    if (SINGLE_CHAPTER_BOOKS.has(book)) return name;
    return sameChapter
      ? `${name} ${start.chapter}`
      : `${name} ${start.chapter}${DASH}${end.chapter}`;
  }

  if (SINGLE_CHAPTER_BOOKS.has(book) && start.chapter === 1 && sameChapter) {
    // "Jude 3", but "Psalm 151:3", whose name ends in a number.
    const lead = /\d$/.test(name) ? `${name}:` : `${name} `;
    return same(start, end)
      ? `${lead}${verse(start)}`
      : `${lead}${verse(start)}${DASH}${verse(end)}`;
  }
  const opening = `${name} ${start.chapter}:${verse(start)}`;
  if (!sameChapter) return `${opening}${DASH}${end.chapter}:${verse(end)}`;
  return same(start, end) ? opening : `${opening}${DASH}${verse(end)}`;
}
