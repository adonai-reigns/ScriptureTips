/**
 * Converting verse references between a scheme and the canonical scheme (domain-model §2.1).
 *
 * A scheme's table lists only the verses whose numbers differ from the canonical scheme's. A
 * verse in no pair has the same number in both, unless its number is taken on the other side
 * by a different verse: then it has no counterpart.
 */

import { formatOsisRef, parseOsisRef, toOrdinal, type VerseRef } from "@scripturetips/passage";

/** Pairs of OSIS references, [scheme verse, canonical verse]; null means no counterpart. */
export type MappingPairs = readonly (readonly [string | null, string | null])[];

/**
 * How a verse corresponds (the domain's mapping types, plus `same`):
 * - `same`: the same number on both sides;
 * - `renumbered`: the same text under a different number;
 * - `merged`: one verse of the scheme holds several canonical verses;
 * - `split`: one canonical verse is spread over several verses of the scheme;
 * - `partial`: part of a verse (a, b …) on one side;
 * - `omitted`: a canonical verse the scheme doesn't have;
 * - `added`: a verse of the scheme the canonical scheme doesn't have.
 */
export type MappingType =
  | "same"
  | "renumbered"
  | "merged"
  | "split"
  | "partial"
  | "omitted"
  | "added";

export interface Mapping {
  /** The corresponding verses, in canonical order; empty for `omitted` and `added`. */
  readonly refs: readonly VerseRef[];
  readonly type: MappingType;
}

type Direction = "toCanonical" | "fromCanonical";

const whole = (ref: VerseRef): string => `${ref.book}.${ref.chapter}.${ref.verse}`;

/** One side of a table: each verse on that side, with the verses it corresponds to. */
class Side {
  readonly exact = new Map<string, VerseRef[]>();
  /** Keyed by the whole verse, covering entries for the verse and for its parts. */
  readonly verses = new Map<string, VerseRef[]>();

  add(ref: VerseRef, other: VerseRef | null): void {
    for (const [map, k] of [
      [this.exact, formatOsisRef(ref)],
      [this.verses, whole(ref)],
    ] as const) {
      const list = map.get(k) ?? [];
      if (other && !list.some((r) => toOrdinal(r) === toOrdinal(other))) list.push(other);
      map.set(k, list);
    }
  }
}

export class MappingTable {
  private readonly scheme = new Side();
  private readonly canonical = new Side();

  constructor(pairs: MappingPairs) {
    for (const [s, c] of pairs) {
      const schemeRef = s === null ? null : parseOsisRef(s);
      const canonicalRef = c === null ? null : parseOsisRef(c);
      if (schemeRef) this.scheme.add(schemeRef, canonicalRef);
      if (canonicalRef) this.canonical.add(canonicalRef, schemeRef);
    }
  }

  toCanonical(ref: VerseRef): Mapping {
    return this.lookup(ref, this.scheme, this.canonical, "toCanonical");
  }

  fromCanonical(ref: VerseRef): Mapping {
    return this.lookup(ref, this.canonical, this.scheme, "fromCanonical");
  }

  private lookup(ref: VerseRef, from: Side, to: Side, direction: Direction): Mapping {
    const listed =
      ref.part === 0
        ? from.verses.get(whole(ref))
        : (from.exact.get(formatOsisRef(ref)) ?? from.verses.get(whole(ref)));
    let refs: VerseRef[];
    if (listed) refs = [...listed].sort((a, b) => toOrdinal(a) - toOrdinal(b));
    else refs = to.verses.has(whole(ref)) ? [] : [ref];
    return { refs, type: typeOf(ref, refs, direction) };
  }
}

function typeOf(ref: VerseRef, refs: readonly VerseRef[], direction: Direction): MappingType {
  const [first] = refs;
  if (!first) return direction === "toCanonical" ? "added" : "omitted";
  if (refs.length === 1 && toOrdinal(first) === toOrdinal(ref)) return "same";
  if (ref.part !== 0 || refs.some((r) => r.part !== 0)) return "partial";
  if (refs.length > 1) return direction === "toCanonical" ? "merged" : "split";
  return "renumbered";
}
