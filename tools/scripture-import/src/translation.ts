/**
 * Imports one catalog entry: every book in its archive or folder, each verse converted to the
 * canonical scheme (domain-model §2.1), and the translation's verse counts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatOsisRef, type VerseRef, verseRef } from "@scripturetips/passage";
import { type MappingType, schemeById, toCanonical } from "@scripturetips/versification";
import { readZip } from "./archive.ts";
import type { ImportedBook, ImportedVerse } from "./book.ts";
import type { CatalogEntry } from "./catalog.ts";
import { importBook } from "./import-book.ts";
import type { Normalization } from "./usj.ts";

export interface CanonicalVerse extends ImportedVerse {
  /** The canonical verses this verse holds (OSIS); empty if the canonical scheme lacks it. */
  readonly canonical: readonly string[];
  readonly mapping: MappingType;
}

export interface TranslationBook extends Omit<ImportedBook, "chapters" | "issues"> {
  readonly chapters: readonly {
    readonly number: number;
    readonly label?: string;
    readonly verses: readonly CanonicalVerse[];
  }[];
}

/** First and last verse of each chapter, as the reference parser's `VerseCounts` reads them. */
export type VerseCountTable = Readonly<
  Record<string, Readonly<Record<number, { readonly first: number; readonly last: number }>>>
>;

export interface ImportedTranslation {
  readonly entry: CatalogEntry;
  readonly books: readonly TranslationBook[];
  readonly verseCounts: VerseCountTable;
  /** Anything wrong. A translation with issues isn't ready to load. */
  readonly issues: readonly string[];
  readonly normalizations: readonly (Normalization & { readonly book: string })[];
  /** Files that aren't books (front matter, glossary …), skipped. */
  readonly peripheral: readonly string[];
}

/** The USFM files of an entry's source: a zip archive or a folder, by file name. */
function sourceFiles(path: string): [string, string][] {
  const usfm = (name: string) => /\.u?sfm$/i.test(name);
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .filter(usfm)
      .sort()
      .map((name) => [name, readFileSync(join(path, name), "utf8")]);
  }
  const decoder = new TextDecoder();
  return [...readZip(readFileSync(path))]
    .filter(([name]) => usfm(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, data]) => [name, decoder.decode(data)]);
}

export function importTranslation(entry: CatalogEntry, sourceRoot: string): ImportedTranslation {
  const scheme = schemeById(entry.scheme);
  if (!scheme) throw new Error(`${entry.id}: unknown scheme ${entry.scheme}`);
  const books: TranslationBook[] = [];
  const issues: string[] = [];
  const normalizations: ImportedTranslation["normalizations"][number][] = [];
  const peripheral: string[] = [];
  const counts: Record<string, Record<number, { first: number; last: number }>> = {};

  for (const [name, text] of sourceFiles(join(sourceRoot, entry.source))) {
    const result = importBook(text);
    for (const n of result.normalizations) normalizations.push({ ...n, book: name });
    if (!result.book) {
      if (result.issues.length > 0) issues.push(...result.issues);
      else peripheral.push(name);
      continue;
    }
    const { chapters, issues: bookIssues, ...rest } = result.book;
    issues.push(...result.issues);
    if (bookIssues.length === 0 && result.issues.length === 0 && !scheme.books.has(rest.book)) {
      issues.push(`${rest.usfm}: the ${entry.scheme} scheme doesn't number ${rest.book}`);
      continue;
    }
    if (books.some((b) => b.book === rest.book)) {
      issues.push(`${rest.usfm}: the book appears twice (${name})`);
      continue;
    }

    const bookCounts: Record<number, { first: number; last: number }> = {};
    books.push({
      ...rest,
      chapters: chapters.map((chapter) => {
        const numbers = chapter.verses.flatMap((v) => [v.verse, v.to ?? v.verse]);
        if (numbers.length > 0)
          bookCounts[chapter.number] = { first: Math.min(...numbers), last: Math.max(...numbers) };
        checkSequence(rest.usfm, chapter.number, chapter.verses, issues);
        return {
          ...chapter,
          verses: chapter.verses.map((v) => withCanonical(entry, rest.book, v)),
        };
      }),
    });
    counts[rest.book] = bookCounts;
  }

  return { entry, books, verseCounts: counts, issues, normalizations, peripheral };
}

/** The verse's canonical verses: for a bridged verse ("3-4"), those of every verse it spans. */
function withCanonical(entry: CatalogEntry, book: string, v: ImportedVerse): CanonicalVerse {
  if (!schemeById(entry.scheme)?.books.has(book)) return { ...v, canonical: [], mapping: "added" };
  const refs: VerseRef[] = [];
  let mapping: MappingType = "same";
  for (let n = v.verse; n <= (v.to ?? v.verse); n++) {
    const result = toCanonical(entry.scheme, verseRef(book, v.chapter, n));
    refs.push(...result.refs);
    if (result.type !== "same") mapping = result.type;
  }
  if (v.to !== undefined && mapping === "same") mapping = "merged";
  const canonical = [...new Set(refs.map(formatOsisRef))];
  return { ...v, canonical, mapping: canonical.length === 0 ? "added" : mapping };
}

/** Verses out of order, repeated, or skipped are reported; the source decides, not us. */
function checkSequence(
  usfm: string,
  chapter: number,
  verses: readonly ImportedVerse[],
  issues: string[],
): void {
  let previous = -1;
  for (const v of verses) {
    if (v.verse <= previous)
      issues.push(`${usfm} ${chapter}:${v.verse}: out of order or repeated (after ${previous})`);
    previous = Math.max(previous, v.to ?? v.verse);
  }
}

/**
 * Verse numbers a chapter skips, e.g. Matt 17:21 in translations that leave it out. Reported,
 * not an issue: the translation decides which verses it has.
 */
export function skippedVerses(t: ImportedTranslation): string[] {
  const skipped: string[] = [];
  for (const book of t.books) {
    for (const chapter of book.chapters) {
      const count = t.verseCounts[book.book]?.[chapter.number];
      if (!count) continue;
      for (let n = Math.max(1, count.first); n <= count.last; n++) {
        if (!chapter.verses.some((v) => n >= v.verse && n <= (v.to ?? v.verse)))
          skipped.push(formatOsisRef(verseRef(book.book, chapter.number, n)));
      }
    }
  }
  return skipped;
}
