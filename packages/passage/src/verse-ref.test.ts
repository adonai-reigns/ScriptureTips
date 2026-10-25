import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BOOKS } from "./books.ts";
import { arbitraryVerseRef } from "./test-support/arbitraries.ts";
import {
  compareRefs,
  formatOsisRef,
  fromOrdinal,
  PassageError,
  parseOsisRef,
  toOrdinal,
  verseRef,
} from "./verse-ref.ts";

describe("verse references (domain model §2.1–2.2)", () => {
  it("encodes the ordinal as book·10⁷ + chapter·10⁴ + verse·10 + part", () => {
    expect(toOrdinal(verseRef("Isa", 53, 4))).toBe(230_530_040);
    expect(toOrdinal(verseRef("John", 3, 16, 2))).toBe(430_030_162);
  });

  it("allows verse 0 for Psalm headings", () => {
    expect(formatOsisRef(verseRef("Ps", 3, 0))).toBe("Ps.3.0");
  });

  it("formats and parses OSIS, with !a, !b … for parts of a verse", () => {
    expect(formatOsisRef(verseRef("Isa", 53, 4))).toBe("Isa.53.4");
    expect(formatOsisRef(verseRef("John", 3, 16, 2))).toBe("John.3.16!b");
    expect(parseOsisRef("1John.4.8")).toEqual(verseRef("1John", 4, 8));
  });

  it.each(["Isa 53:4", "Isa.53", "isa.53.4", "Isa.0.1", "Isa.53.4!j", "Foo.1.1", "Isa.1000.1"])(
    "rejects %s",
    (text) => {
      expect(() => parseOsisRef(text)).toThrow(PassageError);
    },
  );

  it("rejects out-of-range numbers", () => {
    expect(() => verseRef("Gen", 1, 1, 10)).toThrow(PassageError);
    expect(() => verseRef("Gen", 1.5, 1)).toThrow(PassageError);
    expect(() => fromOrdinal(990_010_010)).toThrow(PassageError);
  });

  it("round-trips through the ordinal", () => {
    fc.assert(
      fc.property(arbitraryVerseRef, (ref) => {
        expect(fromOrdinal(toOrdinal(ref))).toEqual(ref);
      }),
    );
  });

  it("round-trips through OSIS", () => {
    fc.assert(
      fc.property(arbitraryVerseRef, (ref) => {
        expect(parseOsisRef(formatOsisRef(ref))).toEqual(ref);
      }),
    );
  });

  it("orders ordinals the same way as book, chapter, verse, part", () => {
    fc.assert(
      fc.property(arbitraryVerseRef, arbitraryVerseRef, (a, b) => {
        const byFields =
          BOOKS.findIndex((x) => x.osis === a.book) - BOOKS.findIndex((x) => x.osis === b.book) ||
          a.chapter - b.chapter ||
          a.verse - b.verse ||
          a.part - b.part;
        expect(Math.sign(compareRefs(a, b))).toBe(Math.sign(byFields));
      }),
    );
  });

  it("fits every ordinal in a PostgreSQL int4", () => {
    fc.assert(
      fc.property(arbitraryVerseRef, (ref) => {
        expect(toOrdinal(ref)).toBeLessThanOrEqual(2_147_483_647);
      }),
    );
  });
});
