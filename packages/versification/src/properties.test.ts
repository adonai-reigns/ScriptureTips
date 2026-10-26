/**
 * Properties of every mapping table (testing.md): each verse maps somewhere or is marked
 * `omitted`/`added`, and mapping to the canonical scheme and back returns the original verse.
 */

import { formatOsisRef, parseOsisRef, type VerseRef } from "@scripturetips/passage";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pairs as greek } from "./data/greek.ts";
import { pairs as kjv } from "./data/kjv.ts";
import { pairs as latin } from "./data/latin.ts";
import type { MappingPairs } from "./mapping.ts";
import { fromCanonical, SCHEMES, type SchemeId, toCanonical } from "./schemes.ts";

const tables: ReadonlyArray<readonly [SchemeId, MappingPairs]> = [
  ["kjv", kjv],
  ["latin", latin],
  ["greek", greek],
];

const sameVerse = (a: VerseRef, b: VerseRef) =>
  a.book === b.book && a.chapter === b.chapter && a.verse === b.verse;

/** Whether `ref` comes back from `back`: the verse itself, or (for a whole verse) a part of it. */
const returns = (ref: VerseRef, back: readonly VerseRef[]) =>
  back.some((r) => sameVerse(r, ref) && (ref.part === 0 || r.part === 0 || r.part === ref.part));

describe.each(tables)("the %s table", (scheme, pairs) => {
  const refs = (side: 0 | 1) =>
    pairs.flatMap((p) => (p[side] === null ? [] : [parseOsisRef(p[side] as string)]));

  it("maps each of its verses to the canonical scheme and back", () => {
    for (const ref of refs(0)) {
      const there = toCanonical(scheme, ref);
      if (there.type === "added") continue;
      expect(there.refs.length, formatOsisRef(ref)).toBeGreaterThan(0);
      const back = there.refs.flatMap((c) => fromCanonical(scheme, c).refs);
      expect(returns(ref, back), `${formatOsisRef(ref)} → ${there.refs.map(formatOsisRef)}`).toBe(
        true,
      );
    }
  });

  it("maps each canonical verse it lists to the scheme and back", () => {
    for (const ref of refs(1)) {
      const there = fromCanonical(scheme, ref);
      if (there.type === "omitted") continue;
      const back = there.refs.flatMap((s) => toCanonical(scheme, s).refs);
      expect(returns(ref, back), `${formatOsisRef(ref)} → ${there.refs.map(formatOsisRef)}`).toBe(
        true,
      );
    }
  });

  it("marks a verse with no counterpart, and only then gives no verses", () => {
    for (const ref of refs(0)) {
      const { refs: found, type } = toCanonical(scheme, ref);
      expect(found.length === 0, formatOsisRef(ref)).toBe(type === "added");
    }
    for (const ref of refs(1)) {
      const { refs: found, type } = fromCanonical(scheme, ref);
      expect(found.length === 0, formatOsisRef(ref)).toBe(type === "omitted");
    }
  });
});

describe("verses in no table", () => {
  const scheme = fc.constantFrom(...SCHEMES.map((s) => s.id));
  const unlisted = (id: SchemeId) =>
    fc
      .record({
        book: fc.constantFrom(...(SCHEMES.find((s) => s.id === id)?.books ?? [])),
        chapter: fc.integer({ min: 1, max: 200 }),
        verse: fc.integer({ min: 0, max: 200 }),
      })
      .map(({ book, chapter, verse }) => parseOsisRef(`${book}.${chapter}.${verse}`));

  it("keep their number, or have no counterpart, both ways", () => {
    fc.assert(
      fc.property(
        scheme.chain((id) => fc.tuple(fc.constant(id), unlisted(id))),
        ([id, ref]) => {
          const there = toCanonical(id, ref);
          if (there.type === "same") {
            expect(fromCanonical(id, ref).refs.map(formatOsisRef)).toContain(formatOsisRef(ref));
          }
          return there.refs.length > 0 || there.type === "added";
        },
      ),
    );
  });
});
