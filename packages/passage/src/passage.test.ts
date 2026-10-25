import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  contains,
  formatOsisPassage,
  overlaps,
  type Passage,
  parseOsisPassage,
  passage,
  toOrdinalRange,
} from "./passage.ts";
import { arbitraryVerseRef } from "./test-support/arbitraries.ts";
import { compareRefs, PassageError, parseOsisRef, verseRef } from "./verse-ref.ts";

const arbitraryPassage = fc
  .tuple(arbitraryVerseRef, arbitraryVerseRef)
  .filter(([a, b]) => a.book === b.book)
  .map(([a, b]) => (compareRefs(a, b) <= 0 ? passage(a, b) : passage(b, a)));

/** Passages within one chapter of one book, so overlaps are common. */
const arbitraryNearbyPassage = fc
  .tuple(
    fc.integer({ min: 1, max: 20 }),
    fc.integer({ min: 0, max: 2 }),
    fc.integer({ min: 1, max: 20 }),
    fc.integer({ min: 0, max: 2 }),
  )
  .map(([v1, p1, v2, p2]) => {
    const a = verseRef("Rom", 8, v1, p1);
    const b = verseRef("Rom", 8, v2, p2);
    return compareRefs(a, b) <= 0 ? passage(a, b) : passage(b, a);
  });

function osis(text: string): Passage {
  return parseOsisPassage(text);
}

describe("passages (domain model §2.2)", () => {
  it("formats a single verse without a range", () => {
    expect(formatOsisPassage(passage(verseRef("Isa", 53, 4)))).toBe("Isa.53.4");
    expect(formatOsisPassage(osis("Isa.53.4-Isa.53.6"))).toBe("Isa.53.4-Isa.53.6");
  });

  it("allows spans across chapters", () => {
    expect(formatOsisPassage(osis("Isa.52.13-Isa.53.12"))).toBe("Isa.52.13-Isa.53.12");
  });

  it("doesn't allow spans across books", () => {
    expect(() => osis("Mal.4.6-Matt.1.1")).toThrow(PassageError);
  });

  it("doesn't allow a start after the end", () => {
    expect(() => osis("Isa.53.6-Isa.53.4")).toThrow(PassageError);
  });

  it("rejects malformed ranges", () => {
    expect(() => osis("Isa.53.4-Isa.53.5-Isa.53.6")).toThrow(PassageError);
    expect(() => osis("Isa.53.4-")).toThrow(PassageError);
  });

  it("stores a range ending on a whole verse so that it covers that verse's parts", () => {
    expect(toOrdinalRange(osis("John.3.16"))).toEqual({ start: 430_030_160, end: 430_030_169 });
    expect(toOrdinalRange(osis("John.3.16!b"))).toEqual({ start: 430_030_162, end: 430_030_162 });
  });

  it("treats a whole verse and part of it as overlapping", () => {
    expect(overlaps(osis("John.3.16"), osis("John.3.16!b"))).toBe(true);
    expect(contains(osis("John.3.16"), osis("John.3.16!b"))).toBe(true);
    expect(overlaps(osis("John.3.16!a"), osis("John.3.16!b"))).toBe(false);
    expect(overlaps(osis("John.3.15"), osis("John.3.16"))).toBe(false);
  });

  it("round-trips through OSIS", () => {
    fc.assert(
      fc.property(arbitraryPassage, (p) => {
        expect(parseOsisPassage(formatOsisPassage(p))).toEqual(p);
      }),
    );
  });

  it("overlap is symmetric and every passage overlaps and contains itself", () => {
    fc.assert(
      fc.property(arbitraryNearbyPassage, arbitraryNearbyPassage, (a, b) => {
        expect(overlaps(a, b)).toBe(overlaps(b, a));
        expect(overlaps(a, a)).toBe(true);
        expect(contains(a, a)).toBe(true);
      }),
    );
  });

  it("containment implies overlap", () => {
    fc.assert(
      fc.property(arbitraryNearbyPassage, arbitraryNearbyPassage, (a, b) => {
        if (contains(a, b)) {
          expect(overlaps(a, b)).toBe(true);
        }
      }),
    );
  });

  it("overlap matches a verse-by-verse comparison", () => {
    // Enumerate every (verse, part) each passage covers, using the whole-verse rule.
    const covered = (p: Passage): Set<string> => {
      const result = new Set<string>();
      for (let verse = p.start.verse; verse <= p.end.verse; verse++) {
        for (let part = 0; part <= 9; part++) {
          const ref = verseRef("Rom", 8, verse, part);
          const afterStart = compareRefs(ref, p.start) >= 0;
          const beforeEnd = p.end.part === 0 ? verse <= p.end.verse : compareRefs(ref, p.end) <= 0;
          if (afterStart && beforeEnd) result.add(`${verse}!${part}`);
        }
      }
      return result;
    };
    fc.assert(
      fc.property(arbitraryNearbyPassage, arbitraryNearbyPassage, (a, b) => {
        const cb = covered(b);
        const shared = [...covered(a)].some((key) => cb.has(key));
        expect(overlaps(a, b)).toBe(shared);
      }),
    );
  });

  it("parses each side as an OSIS verse reference", () => {
    expect(osis("Ps.23.0-Ps.23.6").start).toEqual(parseOsisRef("Ps.23.0"));
  });
});
