/**
 * Passage paths (domain-model §1.6, "Passage references in URLs"): `/read/{translation}/{book}/
 * {chapter}[/{verses}]`, with fixed lowercase English book names (`genesis`, `1-peter`).
 * Several passages use `/read/{translation}/passage/{osis},{osis}`.
 */

import { BOOKS, type Passage, parseOsisPassage } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";

/** The book's path segment: its English name for several chapters, e.g. `psalms`. */
export const bookSlug = (osis: string): string =>
  english.name(osis, "full", "several").toLowerCase().replace(/\s+/g, "-");

const BY_SLUG = new Map(BOOKS.map((b) => [bookSlug(b.osis), b.osis]));

/** The path of one passage (in the translation's numbering); whole chapters use the short form. */
export function passagePath(translation: string, p: Passage, wholeChapters = false): string {
  const { start, end } = p;
  const v = (n: number, part: number) => `${n}${part ? String.fromCharCode(96 + part) : ""}`;
  const base = `/read/${translation}/${bookSlug(start.book)}`;
  if (wholeChapters) {
    return start.chapter === end.chapter
      ? `${base}/${start.chapter}`
      : `${base}/${start.chapter}-${end.chapter}`;
  }
  if (start.chapter !== end.chapter) {
    return `${base}/${start.chapter}:${v(start.verse, start.part)}-${end.chapter}:${v(end.verse, end.part)}`;
  }
  const first = v(start.verse, start.part);
  const last = v(end.verse, end.part);
  return `${base}/${start.chapter}/${first === last ? first : `${first}-${last}`}`;
}

/** The path for the passages the API read (`entered`, OSIS). */
export function pathFor(
  translation: string,
  passages: readonly { readonly entered: string; readonly wholeChapters: boolean }[],
): string {
  const [only] = passages;
  if (passages.length === 1 && only)
    return passagePath(translation, parseOsisPassage(only.entered), only.wholeChapters);
  return `/read/${translation}/passage/${passages.map((p) => p.entered.toLowerCase()).join(",")}`;
}

/**
 * The reference to ask the API for, from a path's segments after the translation, or
 * undefined if they aren't a passage path.
 */
export function referenceFor(segments: readonly string[]): string | undefined {
  const [first, ...rest] = segments.map((s) => decodeURIComponent(s));
  if (!first) return undefined;
  if (first === "passage") {
    if (rest.length !== 1 || !rest[0]) return undefined;
    // OSIS passages: book names here are OSIS IDs, read back through the registry.
    return rest[0]
      .split(",")
      .map((o) => {
        const p = parseOsisPassage(osisCase(o));
        return referenceText(p);
      })
      .join("; ");
  }
  const book = BY_SLUG.get(first.toLowerCase());
  if (!book || rest.length === 0 || rest.length > 2) return undefined;
  const name = english.name(book, "full", "one");
  const [chapter = "", verses] = rest;
  if (!/^[\d:a-i-]+$/.test(chapter) || (verses !== undefined && !/^[\d a-i-]+$/.test(verses)))
    return undefined;
  return verses === undefined ? `${name} ${chapter}` : `${name} ${chapter}:${verses}`;
}

const BY_LOWER = new Map(BOOKS.map((b) => [b.osis.toLowerCase(), b.osis]));
const osisCase = (o: string) =>
  o.replace(
    /(^|-)([^.]+)\./g,
    (_, dash: string, book: string) => `${dash}${BY_LOWER.get(book.toLowerCase()) ?? book}.`,
  );

/** A passage as reference text the parser reads: "Psalm 3:0-2", "Joel 2:28-3:1". */
function referenceText(p: Passage): string {
  const { start, end } = p;
  const name = english.name(start.book, "full", start.chapter === end.chapter ? "one" : "several");
  const v = (n: number, part: number) => `${n}${part ? String.fromCharCode(96 + part) : ""}`;
  const from = `${start.chapter}:${v(start.verse, start.part)}`;
  if (start.chapter !== end.chapter)
    return `${name} ${from}-${end.chapter}:${v(end.verse, end.part)}`;
  const last = v(end.verse, end.part);
  return last === v(start.verse, start.part) ? `${name} ${from}` : `${name} ${from}-${last}`;
}

/**
 * The reader ID and passage segments from a path's segments after `/read/`: a translation
 * (`/read/leb/…`) or a compilation (`/read/@handle/slug/…`, ID `@handle/slug`).
 */
export function readerTarget(
  first: string,
  rest: readonly string[],
): { id: string; segments: string[] } | undefined {
  const head = decodeURIComponent(first);
  if (!head.startsWith("@")) return { id: head, segments: [...rest] };
  const [slug, ...segments] = rest;
  if (!slug || !/^@[a-z0-9-]{3,30}$/.test(head) || !/^[a-z0-9]{2,12}$/i.test(slug))
    return undefined;
  return { id: `${head}/${slug.toLowerCase()}`, segments };
}

/** True if a reader ID is a compilation's, and `handle` (the viewer's) owns it. */
export const ownsCompilation = (id: string, handle: string | null | undefined): boolean =>
  !id.startsWith("@") || (handle != null && id.startsWith(`@${handle}/`));
