/**
 * Reading references: "John 3:16", "jn 3 16", "1 Jn 3:16a", "Rom 5:8-10, 12; 6:1", "Joel 2:28–3:1",
 * "Ps 23", "Gen 1-3", "Jude 3", "Ps 3:title". A reference is always read in the numbering of a
 * scheme (domain-model §2.2) and converted to the canonical scheme.
 */

import { type Passage, passage, toOrdinal, type VerseRef, verseRef } from "@scripturetips/passage";
import {
  passageToCanonical,
  type SchemeId,
  schemeById,
  toCanonical,
} from "@scripturetips/versification";
import { english } from "./english.ts";
import type { BookMatch, Language } from "./language.ts";

/** The verses of each chapter in a scheme (or translation), needed for whole chapters. */
export interface VerseCounts {
  /** The first and last chapter of a book, if known. */
  chapters(book: string): { readonly first: number; readonly last: number } | undefined;
  /** The first verse (0 where a Psalm has a heading, else 1) and the last, if known. */
  verses(
    book: string,
    chapter: number,
  ): { readonly first: number; readonly last: number } | undefined;
}

export interface ParseOptions {
  /** The numbering the reference is written in. */
  readonly scheme: SchemeId;
  readonly language?: Language;
  /** Needed for whole chapters and books, and to check that chapters and verses exist. */
  readonly verses?: VerseCounts;
}

export interface ParsedReference {
  /** The text read, and where it is in the input. */
  readonly text: string;
  readonly start: number;
  readonly end: number;
  /** The passage as written, in the scheme's numbering (`entered_ref`). */
  readonly entered: Passage;
  /** The same passage in the canonical scheme; undefined if it has no canonical counterpart. */
  readonly canonical: Passage | undefined;
}

export type ParseErrorCode =
  | "no-book"
  | "unknown-book"
  | "book-not-in-scheme"
  | "expected-chapter"
  | "no-such-chapter"
  | "no-such-verse"
  | "verse-counts-unknown"
  | "backwards-range"
  | "unexpected-text";

export interface ParseError {
  readonly code: ParseErrorCode;
  /** Where in the input the problem was found. */
  readonly index: number;
}

export type ParseResult =
  | { readonly ok: true; readonly references: readonly ParsedReference[] }
  | { readonly ok: false; readonly error: ParseError };

/** Books with one chapter, cited by verse alone ("Jude 3"). */
export const SINGLE_CHAPTER_BOOKS: ReadonlySet<string> = new Set([
  "Obad",
  "Phlm",
  "2John",
  "3John",
  "Jude",
  "EpJer",
  "PrAzar",
  "Sus",
  "Bel",
  "PrMan",
  "AddPs",
  "EpLao",
]);

/** A reference as read, before it is checked and converted. `null` verse: the whole chapter. */
interface Item {
  readonly book: string;
  readonly start: number;
  readonly end: number;
  readonly from: { chapter: number; verse: number | null; part: number };
  readonly to: { chapter: number; verse: number | null; part: number };
}

class Failure extends Error {
  readonly code: ParseErrorCode;
  readonly index: number;

  constructor(code: ParseErrorCode, index: number) {
    super(code);
    this.code = code;
    this.index = index;
  }
}

/** A hyphen, or any Unicode dash from U+2010 to U+2014 (hyphen, en dash, em dash …). */
const DASH = /\s*[-\u2010-\u2014]\s*/y;
const NUMBER = /\d{1,3}(?!\d)/y;
const PART = /[a-i](?!\p{L})/uy;

/**
 * Reads the text after a book name. `lookup` allows a space between chapter and verse
 * ("jn 3 16") and a book name alone; text found in a page is read more strictly.
 */
class Reader {
  readonly text: string;
  readonly language: Language;
  readonly lookup: boolean;
  pos: number;
  private readonly separator: RegExp;
  private readonly heading: RegExp;

  constructor(text: string, start: number, language: Language, lookup: boolean) {
    this.text = text;
    this.language = language;
    this.lookup = lookup;
    this.pos = start;
    this.separator = lookup ? /\s*(?::|\.|vv?\.?|\s)\s*/y : /\s*(?::|\.|vv?\.?)\s*/y;
    this.heading = new RegExp(
      `\\(?(?:${language.headingWords.map((w) => w.replace(/\s+/g, "\\s+")).join("|")})\\)?(?!\\p{L})`,
      "iuy",
    );
  }

  private take(pattern: RegExp): string | undefined {
    pattern.lastIndex = this.pos;
    const match = pattern.exec(this.text);
    if (!match) return undefined;
    this.pos += match[0].length;
    return match[0];
  }

  private attempt<T>(read: () => T | undefined): T | undefined {
    const saved = this.pos;
    const result = read();
    if (result === undefined) this.pos = saved;
    return result;
  }

  number(): number | undefined {
    const n = this.take(NUMBER);
    return n === undefined ? undefined : Number(n);
  }

  part(): number {
    const letter = this.take(PART);
    return letter ? letter.charCodeAt(0) - 96 : 0;
  }

  /** A verse after a chapter: "16", "16a", or a heading word (verse 0). */
  verseAfterSeparator(): { verse: number; part: number } | undefined {
    return this.attempt(() => {
      if (this.take(this.separator) === undefined) return undefined;
      if (this.take(this.heading) !== undefined) return { verse: 0, part: 0 };
      const verse = this.number();
      return verse === undefined ? undefined : { verse, part: this.part() };
    });
  }

  dash(): boolean {
    return this.take(DASH) !== undefined;
  }

  list(separator: "," | ";"): boolean {
    return this.take(separator === "," ? /\s*,\s*/y : /\s*;\s*/y) !== undefined;
  }

  bookHere(): BookMatch | undefined {
    const book = this.language.bookAt(this.text, this.pos);
    if (book) this.pos = book.end;
    return book;
  }

  colon(): void {
    this.take(/:\s*/y);
  }

  skipSpace(): void {
    this.take(/\s*/y);
  }

  attemptItem(read: () => Item | undefined): Item | undefined {
    return this.attempt(read);
  }
}

/**
 * The first reference after a book name: "3", "3:16a", "3:16-18", "2:28-3:1", "1-3", "1-2:3";
 * for a single-chapter book, "3" or "1:3" is a verse.
 */
function readFirst(r: Reader, book: string, start: number): Item | undefined {
  r.skipSpace();
  // "Psalm 151:3": a single-chapter book whose name ends in a number.
  if (SINGLE_CHAPTER_BOOKS.has(book)) r.colon();
  const n = r.number();
  if (n === undefined) return undefined;
  let from: Item["from"];
  if (SINGLE_CHAPTER_BOOKS.has(book)) {
    // "Jude 1:3" names chapter 1; otherwise the number is the verse.
    const after = n === 1 ? r.verseAfterSeparator() : undefined;
    from = after ? { chapter: 1, ...after } : { chapter: 1, verse: n, part: r.part() };
  } else {
    const after = r.verseAfterSeparator();
    from = after ? { chapter: n, ...after } : { chapter: n, verse: null, part: 0 };
  }
  const to = readRangeEnd(r, from) ?? from;
  return { book, start, end: r.pos, from, to };
}

/** After a dash: "18", "18b", "3:1" (another chapter), or for a chapter range "3" or "2:3". */
function readRangeEnd(r: Reader, from: Item["from"]): Item["to"] | undefined {
  const saved = r.pos;
  if (!r.dash()) return undefined;
  const n = r.number();
  if (n === undefined) {
    r.pos = saved;
    return undefined;
  }
  const after = r.verseAfterSeparator();
  if (after) return { chapter: n, ...after };
  if (from.verse === null) return { chapter: n, verse: null, part: 0 };
  return { chapter: from.chapter, verse: n, part: r.part() };
}

/** After a comma: a verse of the same chapter ("8, 10"), or a chapter ("Ps 1, 3") or "4:2". */
function readContinuation(r: Reader, previous: Item): Item | undefined {
  const start = r.pos;
  const n = r.number();
  if (n === undefined) return undefined;
  const after = r.verseAfterSeparator();
  const single = SINGLE_CHAPTER_BOOKS.has(previous.book);
  let from: Item["from"];
  if (after) from = { chapter: n, ...after };
  else if (previous.to.verse === null && !single) from = { chapter: n, verse: null, part: 0 };
  else from = { chapter: previous.to.chapter, verse: n, part: r.part() };
  const to = readRangeEnd(r, from) ?? from;
  return { book: previous.book, start, end: r.pos, from, to };
}

/** Reads a book name's references, as far as they go. */
function readItems(r: Reader, first: BookMatch): Item[] | Failure {
  const items: Item[] = [];
  const opening = r.attemptItem(() => readFirst(r, first.book, first.start));
  if (!opening) {
    if (!r.lookup) return new Failure("expected-chapter", r.pos);
    r.skipSpace();
    if (r.pos < r.text.length) return new Failure("expected-chapter", r.pos);
    // A book name alone: the whole book.
    return [
      {
        book: first.book,
        start: first.start,
        end: first.end,
        from: { chapter: 0, verse: null, part: 0 },
        to: { chapter: 0, verse: null, part: 0 },
      },
    ];
  }
  items.push(opening);

  for (;;) {
    const saved = r.pos;
    const previous = items.at(-1) as Item;
    let next: Item | undefined;
    if (r.list(",")) {
      next = r.attemptItem(() => readContinuation(r, previous));
    } else if (r.list(";")) {
      const start = r.pos;
      const book = r.bookHere();
      next = r.attemptItem(() =>
        book ? readFirst(r, book.book, start) : readFirst(r, previous.book, start),
      );
    }
    if (!next) {
      r.pos = saved;
      return items;
    }
    items.push(next);
  }
}

/** Turns an item into passages, checking it against the scheme and the verse counts. */
function resolve(item: Item, text: string, options: ParseOptions): ParsedReference | Failure {
  const scheme = schemeById(options.scheme);
  if (!scheme?.books.has(item.book)) return new Failure("book-not-in-scheme", item.start);
  const counts = options.verses;
  let { from, to } = item;

  if (from.chapter === 0) {
    const chapters = counts?.chapters(item.book);
    if (!chapters) return new Failure("verse-counts-unknown", item.start);
    from = { chapter: chapters.first, verse: null, part: 0 };
    to = { chapter: chapters.last, verse: null, part: 0 };
  }

  const ref = (end: Item["from"], side: "start" | "end"): VerseRef | Failure => {
    const chapters = counts?.chapters(item.book);
    if (chapters && (end.chapter < chapters.first || end.chapter > chapters.last))
      return new Failure("no-such-chapter", item.start);
    const verses = counts?.verses(item.book, end.chapter);
    if (end.verse === null) {
      if (!verses) return new Failure("verse-counts-unknown", item.start);
      return verseRef(item.book, end.chapter, side === "start" ? verses.first : verses.last);
    }
    if (verses && (end.verse < verses.first || end.verse > verses.last))
      return new Failure("no-such-verse", item.start);
    return verseRef(item.book, end.chapter, end.verse, end.part);
  };

  const start = ref(from, "start");
  if (start instanceof Failure) return start;
  const end = ref(to, "end");
  if (end instanceof Failure) return end;
  if (toOrdinal(start) > toOrdinal(end)) return new Failure("backwards-range", item.start);

  const entered = passage(start, end);
  return {
    text: text.slice(item.start, item.end),
    start: item.start,
    end: item.end,
    entered,
    canonical: canonicalOf(options.scheme, entered),
  };
}

/**
 * The canonical passage. "Psalm 151" names its own book, but a scheme that numbers it as
 * Psalm 151 (the Greek) maps it from there.
 */
function canonicalOf(scheme: SchemeId, entered: Passage): Passage | undefined {
  const canonical = passageToCanonical(scheme, entered);
  if (canonical || entered.start.book !== "AddPs" || !schemeById(scheme)?.books.has("Ps"))
    return canonical;
  const asPsalm = (ref: VerseRef) => verseRef("Ps", 151, ref.verse, ref.part);
  if (toCanonical(scheme, asPsalm(entered.start)).refs.length === 0) return undefined;
  return passageToCanonical(scheme, passage(asPsalm(entered.start), asPsalm(entered.end)));
}

/** Reads one reference, or a list of them ("Rom 5:8, 10; 6:1"), filling the whole input. */
export function parseReference(text: string, options: ParseOptions): ParseResult {
  const language = options.language ?? english;
  const leading = text.length - text.trimStart().length;
  const book = language.bookAt(text, leading);
  if (!book) {
    const code = /^\s*$/.test(text) ? "no-book" : "unknown-book";
    return { ok: false, error: { code, index: leading } };
  }
  const r = new Reader(text, book.end, language, true);
  const items = readItems(r, book);
  if (items instanceof Failure) return failed(items);
  r.skipSpace();
  if (r.pos < text.length) return { ok: false, error: { code: "unexpected-text", index: r.pos } };

  const references: ParsedReference[] = [];
  for (const item of items) {
    const resolved = resolve(item, text, options);
    if (resolved instanceof Failure) return failed(resolved);
    references.push(resolved);
  }
  return { ok: true, references };
}

const failed = (f: Failure): ParseResult => ({
  ok: false,
  error: { code: f.code, index: f.index },
});

/**
 * Finds the references in a piece of text (a forum post, a sermon, a pasted list). Only
 * capitalized book names followed by a chapter count, and a reference that doesn't check out
 * (e.g. "John 99:1") is left alone.
 */
export function findReferences(text: string, options: ParseOptions): ParsedReference[] {
  const language = options.language ?? english;
  const found: ParsedReference[] = [];
  let after = 0;
  for (const book of language.booksIn(text)) {
    if (book.start < after) continue;
    const r = new Reader(text, book.end, language, false);
    const items = readItems(r, book);
    if (items instanceof Failure) continue;
    for (const item of items) {
      const resolved = resolve(item, text, options);
      if (resolved instanceof Failure) break;
      found.push(resolved);
      after = item.end;
    }
  }
  return found;
}
