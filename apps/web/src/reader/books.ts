/**
 * The book list and reading order (vision §3.4): a translation's books arranged by the
 * reader's canon profile. A book printed inside another (Greek Esther, the additions to Daniel)
 * is listed with that book. Without a profile, books every tradition counts come first, in
 * registry order, then the ones traditions disagree on, then those no profile counts.
 */

import { CANONS, type CanonId, standing } from "@scripturetips/canon";
import { BOOKS } from "@scripturetips/passage";

/** A book the translation has text for (apps/api `TranslationBookSummary`). */
export interface AvailableBook {
  osis: string;
  chapters: number[];
}

export interface ListedBook extends AvailableBook {
  /** Books printed inside this one, in order. */
  parts: AvailableBook[];
}

export type BookSectionId = "ot" | "nt" | "varies" | "additional";

export interface BookSection {
  id: BookSectionId;
  books: ListedBook[];
}

const SECTION_ORDER: readonly BookSectionId[] = ["ot", "nt", "varies", "additional"];

export function arrangeBooks(
  available: readonly AvailableBook[],
  canon: CanonId | null,
): BookSection[] {
  const have = new Map(available.map((b) => [b.osis, b]));
  const sections = new Map<BookSectionId, ListedBook[]>();
  const add = (id: BookSectionId, book: AvailableBook) => {
    const listed = { ...book, parts: [] };
    sections.set(id, [...(sections.get(id) ?? []), listed]);
    return listed;
  };

  if (canon) {
    const listed = new Map<string, ListedBook>();
    for (const cb of CANONS[canon].books) {
      const book = have.get(cb.osis);
      if (!book) continue;
      const parent = cb.partOf ? listed.get(cb.partOf) : undefined;
      if (parent) parent.parts.push(book);
      else listed.set(cb.osis, add(cb.section, book));
    }
  } else {
    for (const b of BOOKS) {
      const book = have.get(b.osis);
      if (!book) continue;
      const s = standing(b.osis, null);
      add(s === "canonical" ? (b.group === "nt" ? "nt" : "ot") : (s ?? "additional"), book);
    }
  }
  return SECTION_ORDER.flatMap((id) => {
    const books = sections.get(id);
    return books ? [{ id, books }] : [];
  });
}

export interface ChapterRef {
  osis: string;
  chapter: number;
}

/** Every chapter in list order: each book's chapters, then its parts'. */
export function readingOrder(sections: readonly BookSection[]): ChapterRef[] {
  return sections.flatMap((s) =>
    s.books.flatMap((b) =>
      [b, ...b.parts].flatMap((book) =>
        book.chapters.map((chapter) => ({ osis: book.osis, chapter })),
      ),
    ),
  );
}

/** The chapters before and after a passage running from `first` to `last` (same book). */
export function neighbors(
  order: readonly ChapterRef[],
  osis: string,
  first: number,
  last: number,
): { previous?: ChapterRef; next?: ChapterRef } {
  const at = (chapter: number) => order.findIndex((c) => c.osis === osis && c.chapter === chapter);
  const start = at(first);
  const end = at(last);
  const previous = start > 0 ? order[start - 1] : undefined;
  const next = end >= 0 ? order[end + 1] : undefined;
  return { ...(previous ? { previous } : {}), ...(next ? { next } : {}) };
}
