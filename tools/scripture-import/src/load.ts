/**
 * Loads an imported translation into the database (packages/db): its books, verse text and
 * translator's notes (domain-model §2, §2.6), replacing what an earlier load put there.
 * Books with import issues aren't loaded; they're listed in the result instead.
 */

import {
  type Database,
  translation,
  translationBook,
  translationImport,
  translatorNote,
  verseText,
} from "@scripturetips/db";
import { parseOsisRef, toOrdinal } from "@scripturetips/passage";
import { eq } from "drizzle-orm";
import type { Heading, Inline, NoteNode } from "./book.ts";
import type { CanonicalVerse, ImportedTranslation } from "./translation.ts";

export interface LoadResult {
  readonly books: number;
  readonly verses: number;
  readonly notes: number;
  /** USFM codes of books not loaded because the import reported issues in them. */
  readonly withheld: readonly string[];
}

/** The kind of a translator's note, from its USFM marker. */
const NOTE_KINDS: Readonly<Record<string, "footnote" | "endnote" | "cross_reference">> = {
  f: "footnote",
  fe: "endnote",
  ef: "endnote",
  x: "cross_reference",
  ex: "cross_reference",
};

export interface ExtractedNote {
  readonly position: number;
  readonly note: NoteNode;
}

/**
 * Takes a verse's notes out of its markup, leaving `{ type: "note", position }` where each
 * mark is printed. Positions count through the headings, then the content.
 */
export function extractNotes(
  headings: readonly Heading[],
  content: readonly Inline[],
): { headings: Heading[]; content: unknown[]; notes: ExtractedNote[] } {
  const notes: ExtractedNote[] = [];
  const walk = (nodes: readonly Inline[]): unknown[] =>
    nodes.map((node) => {
      if (typeof node === "string" || node.type === "block") return node;
      if (node.type === "note") {
        notes.push({ position: notes.length, note: node });
        return { type: "note", position: notes.length - 1 };
      }
      return { ...node, content: walk(node.content) };
    });
  const outHeadings = headings.map((h) => ({ ...h, content: walk(h.content) as Inline[] }));
  return { headings: outHeadings, content: walk(content), notes };
}

/** The canonical verses as an inclusive ordinal range; a whole verse covers all its parts. */
export function canonicalRange(
  canonical: readonly string[],
): { start: number; end: number } | null {
  if (canonical.length === 0) return null;
  const ordinals = canonical.map((ref) => toOrdinal(parseOsisRef(ref)));
  const last = Math.max(...ordinals);
  return { start: Math.min(...ordinals), end: last % 10 === 0 ? last + 9 : last };
}

const CHUNK = 1000;
const chunks = <T>(list: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
};

export async function loadTranslation(db: Database, t: ImportedTranslation): Promise<LoadResult> {
  const { entry } = t;
  const withheld = t.books
    .map((b) => b.usfm)
    .filter((code) =>
      t.issues.some((issue) => issue.startsWith(`${code} `) || issue.startsWith(`${code}:`)),
    );
  const books = t.books.filter((b) => !withheld.includes(b.usfm));

  return db.transaction(async (tx) => {
    const values = {
      catalogId: entry.id,
      abbreviation: entry.abbreviation,
      name: entry.name,
      language: entry.language,
      direction: entry.direction,
      scheme: entry.scheme,
      licenseKey: entry.license,
    };
    const [row] = await tx
      .insert(translation)
      .values(values)
      .onConflictDoUpdate({ target: translation.catalogId, set: values })
      .returning({ id: translation.id });
    if (!row) throw new Error(`${entry.id}: no translation row`);
    const translationId = row.id;

    // A new load replaces the text; notes go with their verses (on delete cascade).
    await tx.delete(verseText).where(eq(verseText.translationId, translationId));
    await tx.delete(translationBook).where(eq(translationBook.translationId, translationId));

    if (books.length > 0) {
      await tx.insert(translationBook).values(
        books.map((b, position) => ({
          translationId,
          book: b.book,
          usfm: b.usfm,
          position,
          names: b.names,
        })),
      );
    }

    const verses = books.flatMap((b) =>
      b.chapters.flatMap((c) => c.verses.map((v) => ({ book: b.book, verse: v }))),
    );
    let verseCount = 0;
    let noteCount = 0;
    for (const chunk of chunks(verses)) {
      const prepared = chunk.map(({ book, verse }) => ({ book, verse, ...prepare(verse) }));
      const ids = await tx
        .insert(verseText)
        .values(
          prepared.map(({ book, verse, headings, content }) => ({
            translationId,
            book,
            chapter: verse.chapter,
            verse: verse.verse,
            toVerse: verse.to ?? null,
            published: verse.published ?? null,
            canonical: [...verse.canonical],
            mapping: verse.mapping,
            canonicalRange: canonicalRange(verse.canonical),
            headings,
            content,
          })),
        )
        .returning({ id: verseText.id });
      verseCount += ids.length;
      const notes = prepared.flatMap(({ notes }, i) =>
        notes.map(({ position, note }) => ({
          verseTextId: ids[i]?.id ?? "",
          position,
          kind: NOTE_KINDS[note.marker] ?? "footnote",
          marker: note.marker,
          caller: note.caller,
          category: note.category ?? null,
          span: note.span ?? null,
          body: note.content,
        })),
      );
      for (const part of chunks(notes)) {
        await tx.insert(translatorNote).values(part);
        noteCount += part.length;
      }
    }

    await tx.insert(translationImport).values({
      translationId,
      source: entry.source,
      report: {
        issues: t.issues,
        withheld,
        normalizations: t.normalizations,
        peripheral: t.peripheral,
      },
      verseCount,
      noteCount,
    });
    return { books: books.length, verses: verseCount, notes: noteCount, withheld };
  });
}

const prepare = (verse: CanonicalVerse) => extractNotes(verse.headings, verse.content);
