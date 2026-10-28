import { describe, expect, it } from "vitest";
import { type CanonicalVerse, type Layer, layersFor, matchingVerse } from "./resolve.ts";

const r = (start: number, end: number) => ({ start, end });
const verse = (canonical: string[], start: number, end = start + 9): CanonicalVerse => ({
  canonical,
  range: r(start, end),
});
const GEN_1_1 = 10_010_010;

const rules: Layer[] = [
  { id: "ot", kind: "section", scope: r(10_000_000, 399_999_999), sourceId: "kjv" },
  { id: "gen", kind: "book", scope: r(10_000_000, 19_999_999), sourceId: "leb" },
  { id: "gen1", kind: "chapter", scope: r(10_010_000, 10_019_999), sourceId: "web" },
  { id: "gen1.1-5", kind: "range", scope: r(GEN_1_1, 10_010_059), sourceId: "bsb" },
];

describe("domain-model §2.3: resolution order", () => {
  it("tries the most specific rule first, then wider ones", () => {
    expect(layersFor(verse(["Gen.1.1"], GEN_1_1), rules).map((l) => l.id)).toEqual([
      "gen1.1-5",
      "gen1",
      "gen",
      "ot",
    ]);
    expect(layersFor(verse(["Gen.2.1"], 10_020_010), rules).map((l) => l.id)).toEqual([
      "gen",
      "ot",
    ]);
  });

  it("leaves a verse with no canonical verses to the base", () => {
    expect(layersFor({ canonical: [], range: null }, rules)).toEqual([]);
  });

  it("takes a source verse only when it is the same verse", () => {
    const base = verse(["Joel.3.1"], 290_030_010);
    expect(matchingVerse(base, [verse(["Joel.3.1"], 290_030_010)])).toBeDefined();
    // The source lacks it.
    expect(matchingVerse(base, [])).toBeUndefined();
    // The source merges it with the next verse (3 John 14–15).
    expect(
      matchingVerse(base, [verse(["Joel.3.1", "Joel.3.2"], 290_030_010, 290_030_029)]),
    ).toBeUndefined();
    // The base bridges two verses the source has separately.
    const bridged = verse(["Joel.3.1", "Joel.3.2"], 290_030_010, 290_030_029);
    expect(
      matchingVerse(bridged, [verse(["Joel.3.1"], 290_030_010), verse(["Joel.3.2"], 290_030_020)]),
    ).toBeUndefined();
  });
});
