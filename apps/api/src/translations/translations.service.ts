import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  eq,
  inArray,
  sql,
  translation,
  translationBook,
  translatorNote,
  verseText,
} from "@scripturetips/db";
import {
  bookByOsis,
  formatOsisPassage,
  type OrdinalRange,
  type Passage,
} from "@scripturetips/passage";
import {
  formatPassage,
  type ParseError,
  parseReference,
  type VerseCounts,
} from "@scripturetips/reference";
import type { SchemeId } from "@scripturetips/versification";
import { DATABASE, type Database } from "../database.ts";

/**
 * Most verses one request returns. A whole book is more than a reader view shows at once.
 * Per-translation display limits (`max_verses_per_display`, domain-model §7) come with the
 * license module; none of the translations loaded so far has one.
 */
export const MAX_VERSES = 500;

export interface TranslationSummary {
  readonly id: string;
  readonly abbreviation: string;
  readonly name: string;
  readonly language: string;
  readonly direction: "ltr" | "rtl";
  readonly scheme: string;
  readonly license: string;
}

export interface PassageVerse {
  readonly chapter: number;
  readonly verse: number;
  readonly to: number | null;
  readonly published: string | null;
  readonly canonical: readonly string[];
  readonly headings: unknown;
  readonly content: unknown;
  /** Translator's notes (domain-model §2.6), by their `position` mark in the content. */
  readonly notes: readonly {
    readonly position: number;
    readonly kind: string;
    readonly caller: string;
    readonly category: string | null;
    readonly span: string | null;
    readonly body: unknown;
  }[];
}

/** A verse with its canonical ordinal range, for matching across translations (not sent). */
export type StoredVerse = PassageVerse & { readonly range: OrdinalRange | null };

export interface PassageResult {
  /** As written, in the translation's numbering (OSIS). */
  readonly entered: string;
  /** The same passage in the canonical scheme; null if it has none. */
  readonly canonical: string | null;
  /** For display: "Joel 2:28–32", "Psalm 23". */
  readonly label: string;
  /** True when the passage is whole chapters ("Psalm 23", "Ruth 1–2"): paths use the short form. */
  readonly wholeChapters: boolean;
  readonly verses: readonly PassageVerse[];
}

/** A book a translation has text for, and its chapters (in the translation's numbering). */
export interface TranslationBookSummary {
  readonly osis: string;
  readonly chapters: readonly number[];
}

export type PassageOutcome =
  | {
      readonly ok: true;
      readonly translation: TranslationSummary;
      readonly passages: PassageResult[];
    }
  | { readonly ok: false; readonly reason: "unknown-translation" }
  | { readonly ok: false; readonly reason: "invalid-reference"; readonly error: ParseError }
  | { readonly ok: false; readonly reason: "too-many-verses"; readonly limit: number };

@Injectable()
export class TranslationsService {
  /** Each translation's verse counts, read once: the reference parser needs them. */
  private readonly counts = new Map<string, Promise<VerseCounts>>();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(): Promise<TranslationSummary[]> {
    const rows = await this.db
      .select()
      .from(translation)
      .where(
        sql`exists (select 1 from ${translationBook} where ${translationBook.translationId} = ${translation.id})`,
      )
      .orderBy(asc(translation.name));
    return rows.map(summary);
  }

  /** The books with text, in registry order (the reader arranges them by canon); null if unknown. */
  async books(catalogId: string): Promise<TranslationBookSummary[] | null> {
    const [row] = await this.db
      .select({ id: translation.id })
      .from(translation)
      .where(eq(translation.catalogId, catalogId));
    if (!row) return null;
    const rows = await this.db
      .select({
        book: verseText.book,
        chapters: sql<
          number[]
        >`array_agg(distinct ${verseText.chapter} order by ${verseText.chapter})`,
      })
      .from(verseText)
      .where(eq(verseText.translationId, row.id))
      .groupBy(verseText.book);
    const number = (osis: string) => bookByOsis(osis)?.number ?? Number.MAX_SAFE_INTEGER;
    return rows
      .map((r) => ({ osis: r.book, chapters: r.chapters.map(Number) }))
      .sort((a, b) => number(a.osis) - number(b.osis));
  }

  async passage(catalogId: string, reference: string): Promise<PassageOutcome> {
    const [row] = await this.db
      .select()
      .from(translation)
      .where(eq(translation.catalogId, catalogId));
    if (!row) return { ok: false, reason: "unknown-translation" };
    const verses = await this.verseCounts(row.id);
    const parsed = parseReference(reference, { scheme: row.scheme as SchemeId, verses });
    if (!parsed.ok) return { ok: false, reason: "invalid-reference", error: parsed.error };

    const passages: PassageResult[] = [];
    let total = 0;
    for (const ref of parsed.references) {
      const found = (await this.versesIn(row.id, ref.entered)).map(({ range: _, ...v }) => v);
      total += found.length;
      if (total > MAX_VERSES) return { ok: false, reason: "too-many-verses", limit: MAX_VERSES };
      passages.push({
        entered: formatOsisPassage(ref.entered),
        canonical: ref.canonical ? formatOsisPassage(ref.canonical) : null,
        label: formatPassage(ref.entered, { verses }),
        wholeChapters: wholeChapters(ref.entered, verses),
        verses: found,
      });
    }
    return { ok: true, translation: summary(row), passages };
  }

  /** The verses a passage covers, in the translation's numbering; a bridged verse counts once. */
  async versesIn(translationId: string, p: Passage): Promise<StoredVerse[]> {
    const { start, end } = p;
    return this.withNotes(
      await this.db
        .select()
        .from(verseText)
        .where(
          and(
            eq(verseText.translationId, translationId),
            eq(verseText.book, start.book),
            sql`(${verseText.chapter}, coalesce(${verseText.toVerse}, ${verseText.verse})) >= (${start.chapter}, ${start.verse})`,
            sql`(${verseText.chapter}, ${verseText.verse}) <= (${end.chapter}, ${end.verse})`,
          ),
        )
        .orderBy(asc(verseText.chapter), asc(verseText.verse))
        .limit(MAX_VERSES + 1),
    );
  }

  /** Every verse of a book, in order: for a publication snapshot, not a reader's request. */
  async bookVerses(translationId: string, book: string): Promise<StoredVerse[]> {
    return this.withNotes(
      await this.db
        .select()
        .from(verseText)
        .where(and(eq(verseText.translationId, translationId), eq(verseText.book, book)))
        .orderBy(asc(verseText.chapter), asc(verseText.verse)),
    );
  }

  /** A translation's verses whose canonical verses overlap `range` (compilation sources). */
  async versesOverlapping(
    translationId: string,
    range: OrdinalRange,
    limit = MAX_VERSES * 2,
  ): Promise<StoredVerse[]> {
    return this.withNotes(
      await this.db
        .select()
        .from(verseText)
        .where(
          and(
            eq(verseText.translationId, translationId),
            sql`${verseText.canonicalRange} && int4range(${range.start}, ${range.end}, '[]')`,
          ),
        )
        .orderBy(asc(verseText.chapter), asc(verseText.verse))
        .limit(limit),
    );
  }

  private async withNotes(rows: (typeof verseText.$inferSelect)[]): Promise<StoredVerse[]> {
    const notes =
      rows.length === 0
        ? []
        : await this.db
            .select()
            .from(translatorNote)
            .where(
              inArray(
                translatorNote.verseTextId,
                rows.map((r) => r.id),
              ),
            )
            .orderBy(asc(translatorNote.position));
    return rows.map((r) => ({
      chapter: r.chapter,
      verse: r.verse,
      to: r.toVerse,
      published: r.published,
      canonical: r.canonical,
      range: r.canonicalRange,
      headings: r.headings,
      content: r.content,
      notes: notes
        .filter((n) => n.verseTextId === r.id)
        .map((n) => ({
          position: n.position,
          kind: n.kind,
          caller: n.caller,
          category: n.category,
          span: n.span,
          body: n.body,
        })),
    }));
  }

  /** A translation's chapters and verses, read once: the reference parser needs them. */
  verseCounts(translationId: string): Promise<VerseCounts> {
    let counts = this.counts.get(translationId);
    if (!counts) {
      counts = this.readCounts(translationId);
      this.counts.set(translationId, counts);
      // A failed read isn't kept, so the next request tries again.
      counts.catch(() => this.counts.delete(translationId));
    }
    return counts;
  }

  private async readCounts(translationId: string): Promise<VerseCounts> {
    const rows = await this.db
      .select({
        book: verseText.book,
        chapter: verseText.chapter,
        first: sql<number>`min(${verseText.verse})`,
        last: sql<number>`max(coalesce(${verseText.toVerse}, ${verseText.verse}))`,
      })
      .from(verseText)
      .where(eq(verseText.translationId, translationId))
      .groupBy(verseText.book, verseText.chapter);
    const chapters = new Map<string, { first: number; last: number }>();
    const verses = new Map<string, { first: number; last: number }>();
    for (const r of rows) {
      verses.set(`${r.book}.${r.chapter}`, { first: Number(r.first), last: Number(r.last) });
      const c = chapters.get(r.book);
      chapters.set(r.book, {
        first: Math.min(c?.first ?? r.chapter, r.chapter),
        last: Math.max(c?.last ?? r.chapter, r.chapter),
      });
    }
    return {
      chapters: (book) => chapters.get(book),
      verses: (book, chapter) => verses.get(`${book}.${chapter}`),
    };
  }
}

const summary = (row: typeof translation.$inferSelect): TranslationSummary => ({
  id: row.catalogId,
  abbreviation: row.abbreviation,
  name: row.name,
  language: row.language,
  direction: row.direction,
  scheme: row.scheme,
  license: row.licenseKey,
});

/** True when a passage is whole chapters ("Psalm 23", "Ruth 1–2"). */
export const wholeChapters = (p: Passage, verses: VerseCounts): boolean =>
  p.start.part === 0 &&
  p.end.part === 0 &&
  p.start.verse === verses.verses(p.start.book, p.start.chapter)?.first &&
  p.end.verse === verses.verses(p.end.book, p.end.chapter)?.last;
