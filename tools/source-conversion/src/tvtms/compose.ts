/**
 * Builds a scheme's mapping to and from the canonical scheme out of TVTMS rows.
 *
 * TVTMS maps each tradition to its KJV standard. A scheme's verse reaches the canonical scheme
 * through that standard: scheme → standard (the scheme's rows), then standard → canonical (the
 * canonical tradition's rows, inverted). A verse with no row keeps its number.
 *
 * The canonical tradition depends on the book (domain-model §2.1): Hebrew for the Old Testament,
 * Greek for the additional books and the New Testament. Only rows whose source is in a book of
 * that tradition count, so the Greek additions to Daniel and Esther, and Psalm 151, keep their
 * own books' numbering instead of the Greek tradition's place for them inside Daniel, Esther
 * and Psalms.
 */

import {
  bookByOsis,
  compareRefs,
  formatOsisRef,
  toOrdinal,
  type VerseRef,
  verseRef,
} from "@scripturetips/passage";
import type { TvtmsRow } from "./parse.ts";

/** One entry of a mapping table: `null` on one side means the verse has no counterpart. */
export type Pair = readonly [scheme: VerseRef | null, canonical: VerseRef | null];

export interface Composition {
  readonly pairs: readonly Pair[];
  /** Rows dropped because an earlier row of the same tradition already maps their source. */
  readonly conflicts: readonly string[];
}

const key = (ref: VerseRef) => formatOsisRef(ref);
const whole = (ref: VerseRef) => verseRef(ref.book, ref.chapter, ref.verse);
const withPart = (ref: VerseRef, part: number) => verseRef(ref.book, ref.chapter, ref.verse, part);

export function canonicalTradition(book: string): "Hebrew" | "Greek" {
  return bookByOsis(book)?.group === "ot" ? "Hebrew" : "Greek";
}

/** One tradition's rows, indexed both ways. */
class Tradition {
  readonly forward = new Map<string, VerseRef>();
  readonly inverse = new Map<string, VerseRef[]>();
  /** Standard verses (whole) that have rows for some of their parts. */
  readonly partsOf = new Map<string, VerseRef[]>();
  readonly sources: VerseRef[] = [];

  constructor(
    rows: readonly TvtmsRow[],
    accept: (row: TvtmsRow) => boolean,
    conflicts: string[],
    name: string,
  ) {
    const accepted = rows.filter(accept);
    // Where two alternatives map the same verse differently, keep the first and drop the other
    // alternative's rows altogether, so one alternative isn't mixed with another.
    const rejected = new Set<string>();
    const seen = new Map<string, TvtmsRow>();
    for (const row of accepted) {
      const first = seen.get(key(row.source));
      if (!first) seen.set(key(row.source), row);
      else if (first.alternative !== row.alternative && compareRefs(first.standard, row.standard))
        rejected.add(row.alternative);
    }
    for (const alternative of rejected)
      conflicts.push(`${name}: dropped alternative ${alternative}`);

    for (const row of accepted) {
      if (rejected.has(row.alternative)) continue;
      const existing = this.forward.get(key(row.source));
      if (existing) {
        if (compareRefs(existing, row.standard) !== 0)
          conflicts.push(
            `${name} ${key(row.source)}: kept → ${key(existing)}, dropped → ${key(row.standard)}`,
          );
        continue;
      }
      this.forward.set(key(row.source), row.standard);
      this.sources.push(row.source);
      push(this.inverse, key(row.standard), row.source);
      if (row.standard.part !== 0) push(this.partsOf, key(whole(row.standard)), row.source);
    }
  }

  /** The standard verse for a verse of this tradition. */
  toStandard(ref: VerseRef): VerseRef {
    return this.forward.get(key(ref)) ?? ref;
  }

  /** The verses of this tradition for a standard verse; empty if it has none. */
  fromStandard(ref: VerseRef): VerseRef[] {
    const exact = this.inverse.get(key(ref));
    if (exact) return exact;
    if (ref.part !== 0) {
      const sources = this.inverse.get(key(whole(ref)));
      if (sources) return sources.map((s) => (s.part === 0 ? withPart(s, ref.part) : s));
    } else {
      const parts = this.partsOf.get(key(ref));
      if (parts) return parts;
    }
    // Unmapped standard verses keep their number, unless that number belongs to another verse.
    return this.forward.has(key(ref)) ? [] : [ref];
  }
}

function push<T>(map: Map<string, T[]>, k: string, value: T): void {
  const list = map.get(k);
  if (list) list.push(value);
  else map.set(k, [value]);
}

/**
 * Composes the mapping between a scheme (one TVTMS tradition, limited to `books`) and the
 * canonical scheme. Returns only the pairs that differ from "same number on both sides".
 */
export function compose(
  rows: readonly TvtmsRow[],
  tradition: string,
  books: ReadonlySet<string>,
): Composition {
  const conflicts: string[] = [];
  const inBooks = (row: TvtmsRow) => books.has(row.source.book);
  const scheme = new Tradition(
    rows,
    (r) => inBooks(r) && r.traditions.includes(tradition),
    conflicts,
    tradition,
  );
  const canonical = new Tradition(
    rows,
    (r) => inBooks(r) && r.traditions.includes(canonicalTradition(r.source.book)),
    conflicts,
    "canonical",
  );

  const found = new Map<string, [VerseRef | null, VerseRef | null]>();
  const add = (s: VerseRef | null, c: VerseRef | null) => {
    if (s && !books.has(s.book)) s = null;
    if (c && !books.has(c.book)) c = null;
    if (s || c) found.set(`${s ? key(s) : "-"} ${c ? key(c) : "-"}`, [s, c]);
  };
  for (const s of scheme.sources) {
    const targets = across(scheme, canonical, s);
    if (targets.length === 0) add(s, null);
    for (const c of targets) add(s, c);
  }
  for (const c of canonical.sources) {
    const targets = across(canonical, scheme, c);
    if (targets.length === 0) add(null, c);
    for (const s of targets) add(s, c);
  }

  return { pairs: simplify([...found.values()]), conflicts };
}

/**
 * The verses of tradition `to` for a verse of tradition `from`, through the standard. Where both
 * split one standard verse into the same number of verses (a two-verse Psalm title, both one
 * KJV title), they correspond one to one, in order.
 */
function across(from: Tradition, to: Tradition, ref: VerseRef): VerseRef[] {
  const standard = from.toStandard(ref);
  const targets = to.fromStandard(standard);
  const siblings = from.inverse.get(key(standard)) ?? [];
  if (targets.length > 1 && siblings.length === targets.length) {
    const sorted = (list: VerseRef[]) => [...list].sort(compareRefs);
    const index = sorted(siblings).findIndex((r) => compareRefs(r, ref) === 0);
    const target = sorted(targets)[index];
    if (target) return [target];
  }
  return targets;
}

/**
 * Drops pairs that say nothing beyond the default (same number both ways), and a whole-verse
 * pair where a pair for part of the same verse says the same more precisely.
 */
function simplify(pairs: readonly Pair[]): Pair[] {
  const bySide = (side: 0 | 1) => {
    const map = new Map<string, Pair[]>();
    for (const p of pairs) {
      const ref = p[side];
      if (ref) push(map, key(ref), p);
    }
    return map;
  };
  const byScheme = bySide(0);
  const byCanonical = bySide(1);
  const hasPartPair = (p: Pair, side: 0 | 1) => {
    const ref = p[side];
    const other = p[side === 0 ? 1 : 0];
    if (!ref || !other || ref.part !== 0) return false;
    const list = (side === 0 ? byCanonical : byScheme).get(key(other)) ?? [];
    return list.some((q) => {
      const r = q[side];
      return r !== null && r.part !== 0 && compareRefs(whole(r), ref) === 0;
    });
  };

  return pairs
    .filter(([s, c]) => {
      if (!s || !c) return true;
      const same =
        compareRefs(s, c) === 0 &&
        byScheme.get(key(s))?.length === 1 &&
        byCanonical.get(key(c))?.length === 1;
      return !same;
    })
    .filter((p) => !hasPartPair(p, 0) && !hasPartPair(p, 1))
    .sort((a, b) => order(a) - order(b));
}

const order = ([s, c]: Pair): number => toOrdinal((c ?? s) as VerseRef);
