/**
 * Book names per language (vision §3.16): the data in `languages/`, compiled into a matcher for
 * finding book names in text and the names used when formatting.
 */

import { BOOKS } from "@scripturetips/passage";

export interface BookNames {
  /** The full name, e.g. "1 Samuel". */
  readonly name: string;
  /** The name for one chapter, where it differs ("Psalm"). */
  readonly singular?: string;
  /** The abbreviation used when formatting short references, e.g. "1 Sam". */
  readonly short: string;
  /** Other names and abbreviations. A numbered book's are given without its number. */
  readonly aliases: readonly string[];
  /** Names that are also common words: read when looking a reference up, not found in text. */
  readonly lookupOnly?: readonly string[];
}

export interface LanguageNames {
  readonly code: string;
  /** How each book number can be written, e.g. "1", "1st", "I", "First". */
  readonly numbers: Readonly<Record<1 | 2 | 3 | 4, readonly string[]>>;
  /** Words for a Psalm heading (verse 0); the first is used when formatting. */
  readonly heading: readonly string[];
  /** Keyed by OSIS book ID; every book in the registry must have names. */
  readonly books: Readonly<Record<string, BookNames>>;
}

export interface BookMatch {
  readonly book: string;
  readonly start: number;
  readonly end: number;
}

/** How a name is compared: case, spaces, full stops and brackets don't matter. */
const normalize = (text: string) => text.toLowerCase().replace(/[\s.()]+/g, "");

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A name as a pattern, allowing any spacing, full stops or brackets between its words. */
const namePattern = (name: string) =>
  name
    .split(/[\s()]+/)
    .filter((w) => w !== "")
    .map(escapeRegExp)
    .join("[\\s().]*") + (name.endsWith(")") ? "\\)" : "");

export class Language {
  readonly code: string;
  private readonly names: LanguageNames;
  /** Normalized name → OSIS book ID, for every name. */
  private readonly keys = new Map<string, string>();
  private readonly numberWords = new Map<string, number>();
  private readonly lookupPattern: RegExp;
  private readonly scanPattern: RegExp;

  constructor(names: LanguageNames) {
    this.code = names.code;
    this.names = names;
    const lookup: { pattern: string; length: number }[] = [];
    const scan: typeof lookup = [];

    for (const [n, forms] of Object.entries(names.numbers)) {
      for (const form of forms) this.numberWords.set(normalize(form), Number(n));
    }
    const prefix = (n: 1 | 2 | 3 | 4) =>
      `(?:${names.numbers[n]
        .map((form) =>
          /^\d/.test(form)
            ? `${escapeRegExp(form)}\\.?\\s*`
            : `${escapeRegExp(form)}(?:\\.\\s*|\\s+)`,
        )
        .join("|")})`;

    for (const book of BOOKS) {
      const entry = names.books[book.osis];
      if (!entry) throw new Error(`No ${names.code} names for ${book.osis}`);
      const number = /^[1-4]/.test(book.osis) ? (Number(book.osis[0]) as 1 | 2 | 3 | 4) : undefined;
      const unnumbered = (name: string) => (number ? name.replace(/^[1-4]\s*/, "") : name);
      const all = [entry.name, entry.short, entry.singular ?? "", ...entry.aliases]
        .map(unnumbered)
        .filter((a) => a !== "");
      const commonWords = new Set((entry.lookupOnly ?? []).map(normalize));

      for (const alias of new Set(all)) {
        const key = `${number ?? ""}${normalize(alias)}`;
        const existing = this.keys.get(key);
        if (existing && existing !== book.osis)
          throw new Error(`"${alias}" names both ${existing} and ${book.osis}`);
        this.keys.set(key, book.osis);
        const pattern = number ? `${prefix(number)}${namePattern(alias)}` : namePattern(alias);
        const item = { pattern, length: alias.length + (number ? 2 : 0) };
        lookup.push(item);
        if (!commonWords.has(normalize(alias))) scan.push(item);
      }
    }

    const compile = (items: typeof lookup, flags: string) =>
      new RegExp(
        `(?<![\\p{L}\\p{N}])(?:${[...new Set(items.sort((a, b) => b.length - a.length).map((i) => i.pattern))].join("|")})(?!\\p{L})\\.?`,
        flags,
      );
    this.lookupPattern = compile(lookup, "iuy");
    this.scanPattern = compile(scan, "iug");
  }

  /** The book whose name starts exactly at `index`, if any. */
  bookAt(text: string, index: number): BookMatch | undefined {
    this.lookupPattern.lastIndex = index;
    const match = this.lookupPattern.exec(text);
    return match ? this.resolve(match[0], index) : undefined;
  }

  /** Every book name in `text` that may begin a reference: capitalized, and not a common word. */
  *booksIn(text: string): Generator<BookMatch> {
    const pattern = new RegExp(this.scanPattern);
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      const found = this.resolve(match[0], match.index);
      const first = match[0][0] ?? "";
      if (found && (/\d/.test(first) || first !== first.toLowerCase())) yield found;
      else pattern.lastIndex = match.index + 1;
    }
  }

  /** The name of a book for formatting. */
  name(book: string, style: "full" | "short", chapters: "one" | "several"): string {
    const entry = this.names.books[book];
    if (!entry) throw new Error(`No ${this.code} names for ${book}`);
    if (style === "short") return entry.short;
    return chapters === "one" ? (entry.singular ?? entry.name) : entry.name;
  }

  get headingWords(): readonly string[] {
    return this.names.heading;
  }

  private resolve(matched: string, start: number): BookMatch | undefined {
    const key = normalize(matched);
    const end = start + matched.length;
    const direct = this.keys.get(key);
    if (direct) return { book: direct, start, end };
    // A number written as a word or Roman numeral ("I John", "First Samuel").
    for (const [word, n] of this.numberWords) {
      if (key.startsWith(word)) {
        const book = this.keys.get(`${n}${key.slice(word.length)}`);
        if (book) return { book, start, end };
      }
    }
    return undefined;
  }
}
