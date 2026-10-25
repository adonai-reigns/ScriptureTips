import { bookByNumber, bookByOsis } from "./books.ts";

/**
 * One verse, or part of a verse, in the canonical versification (domain model §2.1).
 *
 * - `verse` 0 is a Psalm heading.
 * - `part` 0 is the whole verse; 1, 2 … are parts `a`, `b` … of a split verse.
 */
export interface VerseRef {
  readonly book: string;
  readonly chapter: number;
  readonly verse: number;
  readonly part: number;
}

export const MAX_CHAPTER = 999;
export const MAX_VERSE = 999;
export const MAX_PART = 9;

const PART_LETTERS = "abcdefghi";

export class PassageError extends RangeError {
  override name = "PassageError";
}

function checkInteger(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new PassageError(`${label} must be an integer from ${min} to ${max}, got ${value}`);
  }
}

/** Builds a verse reference, checking only structural bounds (not whether the verse exists). */
export function verseRef(book: string, chapter: number, verse: number, part = 0): VerseRef {
  if (!bookByOsis(book)) {
    throw new PassageError(`Unknown OSIS book ID: ${book}`);
  }
  checkInteger(chapter, 1, MAX_CHAPTER, "Chapter");
  checkInteger(verse, 0, MAX_VERSE, "Verse");
  checkInteger(part, 0, MAX_PART, "Part");
  return Object.freeze({ book, chapter, verse, part });
}

/**
 * Sortable integer for a verse reference: `book·10⁷ + chapter·10⁴ + verse·10 + part`
 * (domain model §2.2). Fits in a PostgreSQL int4.
 */
export function toOrdinal(ref: VerseRef): number {
  const book = bookByOsis(ref.book);
  if (!book) {
    throw new PassageError(`Unknown OSIS book ID: ${ref.book}`);
  }
  return book.number * 10_000_000 + ref.chapter * 10_000 + ref.verse * 10 + ref.part;
}

export function fromOrdinal(ordinal: number): VerseRef {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0) {
    throw new PassageError(`Invalid ordinal: ${ordinal}`);
  }
  const bookNumber = Math.floor(ordinal / 10_000_000);
  const book = bookByNumber(bookNumber);
  if (!book) {
    throw new PassageError(`Invalid ordinal ${ordinal}: no book number ${bookNumber}`);
  }
  const chapter = Math.floor(ordinal / 10_000) % 1_000;
  const verse = Math.floor(ordinal / 10) % 1_000;
  const part = ordinal % 10;
  return verseRef(book.osis, chapter, verse, part);
}

export function compareRefs(a: VerseRef, b: VerseRef): number {
  return toOrdinal(a) - toOrdinal(b);
}

/** Formats as OSIS, e.g. `Isa.53.4`, or `Isa.53.4!a` for part of a verse. */
export function formatOsisRef(ref: VerseRef): string {
  const base = `${ref.book}.${ref.chapter}.${ref.verse}`;
  return ref.part === 0 ? base : `${base}!${PART_LETTERS[ref.part - 1]}`;
}

const OSIS_REF = /^([1-4]?[A-Za-z]+)\.(\d{1,3})\.(\d{1,3})(?:!([a-i]))?$/;

export function parseOsisRef(text: string): VerseRef {
  const match = OSIS_REF.exec(text);
  if (!match) {
    throw new PassageError(`Not an OSIS verse reference: ${text}`);
  }
  const [, book = "", chapter = "", verse = "", partLetter] = match;
  const part = partLetter === undefined ? 0 : PART_LETTERS.indexOf(partLetter) + 1;
  return verseRef(book, Number(chapter), Number(verse), part);
}
