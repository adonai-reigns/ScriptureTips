import {
  compareRefs,
  formatOsisRef,
  MAX_PART,
  PassageError,
  parseOsisRef,
  toOrdinal,
  type VerseRef,
} from "./verse-ref.ts";

/**
 * A range in the canonical versification, e.g. `Isa.53.4-Isa.53.6` (domain model §2.2).
 * It may be one verse, part of a verse, or a span across chapters, but never across books.
 */
export interface Passage {
  readonly start: VerseRef;
  readonly end: VerseRef;
}

/**
 * Inclusive ordinal range, as stored in a PostgreSQL int4range `[start, end]` for overlap
 * queries. When the passage ends on a whole verse, `end` covers all of that verse's parts
 * (ordinal + 9), so a link to `John.3.16` also matches one to `John.3.16!b`.
 */
export interface OrdinalRange {
  readonly start: number;
  readonly end: number;
}

export function passage(start: VerseRef, end: VerseRef = start): Passage {
  if (start.book !== end.book) {
    throw new PassageError(
      `A passage can't span books: ${formatOsisRef(start)} to ${formatOsisRef(end)}`,
    );
  }
  if (compareRefs(start, end) > 0) {
    throw new PassageError(
      `A passage must start before it ends: ${formatOsisRef(start)} to ${formatOsisRef(end)}`,
    );
  }
  return Object.freeze({ start, end });
}

/** Formats as OSIS: `Isa.53.4` for a single verse, `Isa.53.4-Isa.53.6` for a range. */
export function formatOsisPassage(p: Passage): string {
  const start = formatOsisRef(p.start);
  return compareRefs(p.start, p.end) === 0 ? start : `${start}-${formatOsisRef(p.end)}`;
}

export function parseOsisPassage(text: string): Passage {
  const parts = text.split("-");
  if (parts.length > 2) {
    throw new PassageError(`Not an OSIS passage: ${text}`);
  }
  const [start = "", end] = parts;
  const startRef = parseOsisRef(start);
  return passage(startRef, end === undefined ? startRef : parseOsisRef(end));
}

export function toOrdinalRange(p: Passage): OrdinalRange {
  const end = toOrdinal(p.end);
  return { start: toOrdinal(p.start), end: p.end.part === 0 ? end + MAX_PART : end };
}

/**
 * True if the passages share any verse. A whole verse (part 0) and a part of the same verse
 * overlap, because the whole verse includes all its parts.
 */
export function overlaps(a: Passage, b: Passage): boolean {
  const ra = toOrdinalRange(a);
  const rb = toOrdinalRange(b);
  return ra.start <= rb.end && rb.start <= ra.end;
}

/** True if every verse of `inner` is within `outer`. */
export function contains(outer: Passage, inner: Passage): boolean {
  const ro = toOrdinalRange(outer);
  const ri = toOrdinalRange(inner);
  return ro.start <= ri.start && ri.end <= ro.end;
}
