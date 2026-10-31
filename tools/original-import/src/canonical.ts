/**
 * A word's verse in the canonical scheme (domain-model §2.1), the way the translations' verses
 * are placed, so tokens and verse text overlap by canonical verse.
 */

import {
  formatOsisRef,
  parseOsisRef,
  toOrdinal,
  type VerseRef,
  verseRef,
} from "@scripturetips/passage";
import { type SchemeId, schemeById, toCanonical } from "@scripturetips/versification";

export interface Placed {
  /** Canonical verses (OSIS); empty where the canonical scheme lacks the verse. */
  readonly canonical: string[];
  /** The canonical verses as an inclusive ordinal range, or null. */
  readonly range: { start: number; end: number } | null;
}

/** As `tools/scripture-import` does for verse text: a whole verse covers all its parts. */
function rangeOf(canonical: readonly string[]): Placed["range"] {
  if (canonical.length === 0) return null;
  const ordinals = canonical.map((ref) => toOrdinal(parseOsisRef(ref)));
  const last = Math.max(...ordinals);
  return { start: Math.min(...ordinals), end: last % 10 === 0 ? last + 9 : last };
}

/** Places verses of one scheme, remembering each (a verse has many words). */
export function placer(scheme: SchemeId): (book: string, chapter: number, verse: number) => Placed {
  const known = schemeById(scheme);
  if (!known) throw new Error(`unknown versification scheme ${scheme}`);
  const cache = new Map<string, Placed>();
  return (book, chapter, verse) => {
    const key = `${book}.${chapter}.${verse}`;
    let placed = cache.get(key);
    if (!placed) {
      const refs: readonly VerseRef[] = known.books.has(book)
        ? toCanonical(scheme, verseRef(book, chapter, verse)).refs
        : [];
      const canonical = [...new Set(refs.map(formatOsisRef))];
      placed = { canonical, range: rangeOf(canonical) };
      cache.set(key, placed);
    }
    return placed;
  };
}
