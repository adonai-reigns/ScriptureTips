/** One USFM book, from source text to checked verse records. */

import { bookByUsfm } from "@scripturetips/passage";
import { type ImportedBook, readBook } from "./book.ts";
import { bookWords, firstDifference, isVerseText, usfmWords, usjWords } from "./integrity.ts";
import { type Normalization, parseUsfm } from "./usj.ts";

export interface BookResult {
  /** Undefined for a peripheral file (front matter, glossary …). */
  readonly book: ImportedBook | undefined;
  /** Anything wrong: parser errors, unknown markers, lost words. The book isn't usable if any. */
  readonly issues: readonly string[];
  readonly normalizations: readonly Normalization[];
}

export function importBook(source: string): BookResult {
  const usfm = source.replace(/^\uFEFF/, "");
  const { usj, errors, normalizations } = parseUsfm(usfm);
  const book = readBook(usj);
  if (!book) {
    // The parser returns nothing at all for some files it can't read: a book's \id in the
    // source then means a failed book, not a peripheral file.
    const code = /^\\id\s+(\S+)/m.exec(usfm)?.[1] ?? "";
    if (!bookByUsfm(code)) return { book, issues: [], normalizations };
    const shown = errors.slice(0, 5).map((e) => `${code}: parser: ${e.slice(0, 200)}`);
    return {
      book,
      issues: [`${code}: the parser returned no content (${errors.length} errors)`, ...shown],
      normalizations,
    };
  }

  const issues = [...errors.map((e) => `${book.usfm}: parser: ${e}`), ...book.issues];
  const lostByParser = firstDifference(usfmWords(usfm), usjWords(usj.content ?? []));
  if (lostByParser) issues.push(`${book.usfm}: the parser lost words: ${lostByParser}`);
  const lostByImport = firstDifference(usjWords(usj.content ?? [], isVerseText), bookWords(book));
  if (lostByImport) issues.push(`${book.usfm}: the import lost words: ${lostByImport}`);
  return { book, issues, normalizations };
}
