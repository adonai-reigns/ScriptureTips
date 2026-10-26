/** Property tests (testing.md §2): formatting a passage and reading it back gives the passage. */

import { formatOsisPassage, passage, toOrdinal, verseRef } from "@scripturetips/passage";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatPassage } from "./format.ts";
import { parseReference } from "./parse.ts";
import { KJV_BOOKS, KJV_VERSES } from "./test-support/kjv.ts";

/** A passage within one book of the KJV, with parts of verses now and then. */
const arbitraryPassage = fc
  .constantFrom(...KJV_BOOKS)
  .chain((book) => {
    const chapters = KJV_VERSES.chapters(book) ?? { first: 1, last: 1 };
    const ref = fc
      .integer({ min: chapters.first, max: chapters.last })
      .chain((chapter) => {
        const verses = KJV_VERSES.verses(book, chapter) ?? { first: 1, last: 1 };
        return fc.record({
          chapter: fc.constant(chapter),
          verse: fc.integer({ min: verses.first, max: verses.last }),
          part: fc.constantFrom(0, 0, 0, 1, 2),
        });
      })
      .map(({ chapter, verse, part }) => verseRef(book, chapter, verse, verse === 0 ? 0 : part));
    return fc.tuple(ref, ref);
  })
  .map(([a, b]) => (toOrdinal(a) <= toOrdinal(b) ? passage(a, b) : passage(b, a)));

describe("format → parse", () => {
  it.each(["full", "short"] as const)("returns the passage (%s names)", (style) => {
    fc.assert(
      fc.property(arbitraryPassage, fc.boolean(), (p, withCounts) => {
        const text = formatPassage(p, { style, ...(withCounts ? { verses: KJV_VERSES } : {}) });
        const result = parseReference(text, { scheme: "kjv", verses: KJV_VERSES });
        expect(result.ok, text).toBe(true);
        if (!result.ok) return;
        expect(
          result.references.map((r) => formatOsisPassage(r.entered)),
          text,
        ).toEqual([formatOsisPassage(p)]);
      }),
      { numRuns: 2000 },
    );
  });
});
