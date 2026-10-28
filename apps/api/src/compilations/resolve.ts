/**
 * Which layer supplies each verse of a compilation (domain-model §2.3, "Resolution order"):
 * the most specific rule whose scope holds the verse, falling through to wider rules and then
 * the base where a source has no matching verse. Pure: the service fetches the rows.
 */

import type { OrdinalRange } from "@scripturetips/passage";

export type RuleKind = "section" | "book" | "chapter" | "range";

/** Narrower kinds win. Rules of the same kind never overlap, so there are no ties. */
export const KIND_RANK: Readonly<Record<RuleKind, number>> = {
  range: 3,
  chapter: 2,
  book: 1,
  section: 0,
};

export interface Layer {
  readonly id: string;
  readonly kind: RuleKind;
  readonly scope: OrdinalRange;
  readonly sourceId: string;
}

/** A verse as stored: its canonical verses (OSIS) and their ordinal range. */
export interface CanonicalVerse {
  readonly canonical: readonly string[];
  readonly range: OrdinalRange | null;
}

const within = (inner: OrdinalRange, outer: OrdinalRange) =>
  outer.start <= inner.start && inner.end <= outer.end;
const overlapping = (a: OrdinalRange, b: OrdinalRange) => a.start <= b.end && b.start <= a.end;

/** The rules that hold a verse, most specific first. A verse with no canonical verses has none. */
export function layersFor(verse: CanonicalVerse, rules: readonly Layer[]): Layer[] {
  const range = verse.range;
  if (!range) return [];
  return rules
    .filter((r) => within(range, r.scope))
    .sort((a, b) => KIND_RANK[b.kind] - KIND_RANK[a.kind]);
}

/**
 * The source's verse that is the same verse: exactly one source verse overlaps, and it holds the
 * same canonical verses. Otherwise (the source lacks it, or merges or splits it differently)
 * there's no match, and the next layer supplies the verse.
 */
export function matchingVerse<T extends CanonicalVerse>(
  verse: CanonicalVerse,
  source: readonly T[],
): T | undefined {
  const range = verse.range;
  if (!range) return undefined;
  const found = source.filter((s) => s.range && overlapping(s.range, range));
  const [only] = found;
  if (found.length !== 1 || !only) return undefined;
  const want = new Set(verse.canonical);
  return only.canonical.length === want.size && only.canonical.every((c) => want.has(c))
    ? only
    : undefined;
}
