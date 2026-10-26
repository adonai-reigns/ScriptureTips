/** Converting passages (verse ranges) between a scheme and the canonical scheme. */

import { type Passage, passage, toOrdinal, type VerseRef } from "@scripturetips/passage";
import type { Mapping } from "./mapping.ts";
import { fromCanonical, type SchemeId, toCanonical } from "./schemes.ts";

/**
 * The canonical passage for a passage numbered in `scheme`: from the first verse its start maps
 * to, to the last verse its end maps to. Undefined if either end has no counterpart, or the
 * result would span two books (the Greek Daniel 3:24 is the canonical Prayer of Azariah 1:1).
 */
export function passageToCanonical(scheme: SchemeId, p: Passage): Passage | undefined {
  return convert(p, (ref) => toCanonical(scheme, ref));
}

/** The passage numbered in `scheme` for a canonical passage; see `passageToCanonical`. */
export function passageFromCanonical(scheme: SchemeId, p: Passage): Passage | undefined {
  return convert(p, (ref) => fromCanonical(scheme, ref));
}

function convert(p: Passage, map: (ref: VerseRef) => Mapping): Passage | undefined {
  const start = map(p.start).refs[0];
  const end = map(p.end).refs.at(-1);
  if (!start || !end || start.book !== end.book || toOrdinal(start) > toOrdinal(end))
    return undefined;
  return passage(start, end);
}
