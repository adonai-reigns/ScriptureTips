import { formatOsisPassage } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { findReferences, type ParseOptions, parseReference } from "./parse.ts";
import { KJV_VERSES } from "./test-support/kjv.ts";

const KJV: ParseOptions = { scheme: "kjv", verses: KJV_VERSES };

const entered = (text: string, options = KJV) => {
  const result = parseReference(text, options);
  if (!result.ok) return `error: ${result.error.code}`;
  return result.references.map((r) => formatOsisPassage(r.entered));
};
const canonical = (text: string, options = KJV) => {
  const result = parseReference(text, options);
  if (!result.ok) return `error: ${result.error.code}`;
  return result.references.map((r) => (r.canonical ? formatOsisPassage(r.canonical) : null));
};

describe("reading a reference (testing.md §2: reference parser corpus)", () => {
  it.each([
    ["John 3:16", "John.3.16"],
    ["jn 3 16", "John.3.16"],
    ["Jn 3.16", "John.3.16"],
    ["john3:16", "John.3.16"],
    ["JOHN 3:16", "John.3.16"],
    ["John 3v16", "John.3.16"],
    ["  John 3:16  ", "John.3.16"],
    ["1 Jn 3:16a", "1John.3.16!a"],
    ["1John 3:16", "1John.3.16"],
    ["1 Jn. 3:16", "1John.3.16"],
    ["I John 3:16", "1John.3.16"],
    ["First John 3:16", "1John.3.16"],
    ["1st John 3:16", "1John.3.16"],
    ["III Jn 4", "3John.1.4"],
    ["Isa 53:5", "Isa.53.5"],
    ["Is 53:5", "Isa.53.5"],
    ["Song of Solomon 2:1", "Song.2.1"],
    ["Song of Songs 2:1", "Song.2.1"],
    ["Cant. 2:1", "Song.2.1"],
    ["Phil 4:13", "Phil.4.13"],
    ["Philemon 6", "Phlm.1.6"],
    ["Phlm 1:6", "Phlm.1.6"],
    ["Ecclesiasticus 1:1", "Sir.1.1"],
    ["Gen. 1:1", "Gen.1.1"],
  ])("%s", (text, expected) => {
    expect(entered(text)).toEqual([expected]);
  });

  it("reads ranges within a chapter and across chapters", () => {
    expect(entered("Rom 5:8-10")).toEqual(["Rom.5.8-Rom.5.10"]);
    expect(entered("Rom 5:8–10")).toEqual(["Rom.5.8-Rom.5.10"]);
    expect(entered("Rom 5:8 - 10")).toEqual(["Rom.5.8-Rom.5.10"]);
    expect(entered("Joel 2:28–3:1")).toEqual(["Joel.2.28-Joel.3.1"]);
    expect(entered("John 3:16a-17")).toEqual(["John.3.16!a-John.3.17"]);
  });

  it("reads whole chapters, chapter ranges and whole books from the verse counts", () => {
    expect(entered("Ps 23")).toEqual(["Ps.23.0-Ps.23.6"]);
    expect(entered("Psalm 1")).toEqual(["Ps.1.1-Ps.1.6"]);
    expect(entered("Gen 1-3")).toEqual(["Gen.1.1-Gen.3.24"]);
    expect(entered("Gen 1-2:3")).toEqual(["Gen.1.1-Gen.2.3"]);
    expect(entered("John")).toEqual(["John.1.1-John.21.25"]);
    expect(entered("Jude")).toEqual(["Jude.1.1-Jude.1.25"]);
  });

  it("reads lists: commas within a chapter, semicolons between chapters and books", () => {
    expect(entered("Rom 5:8–10, 12; 6:1")).toEqual(["Rom.5.8-Rom.5.10", "Rom.5.12", "Rom.6.1"]);
    expect(entered("Gen 1:1, 2:3")).toEqual(["Gen.1.1", "Gen.2.3"]);
    expect(entered("Ps 1, 3")).toEqual(["Ps.1.1-Ps.1.6", "Ps.3.0-Ps.3.8"]);
    expect(entered("Gen 1:1; Exod 20:3")).toEqual(["Gen.1.1", "Exod.20.3"]);
  });

  it("reads single-chapter books by verse", () => {
    expect(entered("Jude 3")).toEqual(["Jude.1.3"]);
    expect(entered("Jude 1:3")).toEqual(["Jude.1.3"]);
    expect(entered("Jude 3-5")).toEqual(["Jude.1.3-Jude.1.5"]);
    expect(entered("Obad 21")).toEqual(["Obad.1.21"]);
    expect(entered("Psalm 151:3")).toEqual(["AddPs.1.3"]);
  });

  it("reads a Psalm heading as verse 0", () => {
    expect(entered("Ps 3:title")).toEqual(["Ps.3.0"]);
    expect(entered("Ps 3 (title)")).toEqual(["Ps.3.0"]);
    expect(entered("Psalm 3:title-2")).toEqual(["Ps.3.0-Ps.3.2"]);
    expect(entered("Ps 1:title")).toEqual("error: no-such-verse");
  });
});

describe("domain-model §2.2: references are read in a scheme's numbering", () => {
  it("converts the scheme's numbering to the canonical", () => {
    expect(canonical("Joel 2:28–32")).toEqual(["Joel.3.1-Joel.3.5"]);
    expect(canonical("Joel 3")).toEqual(["Joel.4.1-Joel.4.21"]);
    expect(canonical("Mal 4:5")).toEqual(["Mal.3.23"]);
    expect(canonical("Ps 3:1")).toEqual(["Ps.3.2"]);
    // Psalm 23's short title is part of the Hebrew verse 1.
    expect(canonical("Ps 23:1")).toEqual(["Ps.23.1"]);
    expect(canonical("3 John 14")).toEqual(["3John.1.14-3John.1.15"]);
    expect(canonical("Rev 13:1")).toEqual(["Rev.12.18-Rev.13.1"]);
  });

  it("reads the same text differently in another scheme", () => {
    expect(canonical("Joel 3:1", { scheme: "hebrew" })).toEqual(["Joel.3.1"]);
    expect(canonical("Ps 22:1", { scheme: "greek" })).toEqual(["Ps.23.1"]);
  });

  it("gives Psalm 151 its own book in a scheme that numbers it in Psalms", () => {
    expect(canonical("Psalm 151:3", { scheme: "greek" })).toEqual(["AddPs.1.3"]);
    expect(canonical("Psalm 151:3")).toEqual(["AddPs.1.3"]);
  });

  it("has no canonical passage for a verse only the scheme has", () => {
    expect(canonical("Neh 7:68")).toEqual([null]);
  });
});

describe("errors", () => {
  it.each([
    ["", "no-book"],
    ["   ", "no-book"],
    ["Hezekiah 3:1", "unknown-book"],
    ["3:16", "unknown-book"],
    ["John 22:1", "no-such-chapter"],
    ["John 3:99", "no-such-verse"],
    ["John 3:18-16", "backwards-range"],
    ["John 3:16 is love", "unexpected-text"],
    ["John 3:", "unexpected-text"],
  ])("%j: %s", (text, code) => {
    expect(entered(text)).toBe(`error: ${code}`);
  });

  it("rejects a book the scheme doesn't number", () => {
    expect(entered("Matt 1:1", { scheme: "hebrew" })).toBe("error: book-not-in-scheme");
  });

  it("needs verse counts for a whole chapter, but not for verses", () => {
    expect(entered("Ps 23", { scheme: "kjv" })).toBe("error: verse-counts-unknown");
    expect(entered("John 3:16", { scheme: "kjv" })).toEqual(["John.3.16"]);
  });

  it("reports where the problem is", () => {
    const result = parseReference("John 3:16 is love", KJV);
    expect(result.ok || result.error.index).toBe(10);
  });
});

describe("finding references in text", () => {
  const find = (text: string) =>
    findReferences(text, KJV).map((r) => [r.text, formatOsisPassage(r.entered)]);

  it("finds each reference with its place in the text", () => {
    const text = "As Paul says in Rom 5:8, God loves us. See John 3:16-18 and 1 Cor 13.";
    expect(find(text)).toEqual([
      ["Rom 5:8", "Rom.5.8"],
      ["John 3:16-18", "John.3.16-John.3.18"],
      ["1 Cor 13", "1Cor.13.1-1Cor.13.13"],
    ]);
    const [first] = findReferences(text, KJV);
    expect(first && text.slice(first.start, first.end)).toBe("Rom 5:8");
  });

  it("finds lists, abbreviations with full stops and references in brackets", () => {
    expect(find("(Matt. 5:3–12; Luke 6:20–23)")).toEqual([
      ["Matt. 5:3–12", "Matt.5.3-Matt.5.12"],
      ["Luke 6:20–23", "Luke.6.20-Luke.6.23"],
    ]);
    expect(find("Rom 5:8, 10")).toEqual([
      ["Rom 5:8", "Rom.5.8"],
      ["10", "Rom.5.10"],
    ]);
  });

  it("leaves alone what isn't a reference", () => {
    expect(find("I am 3 years old")).toEqual([]);
    expect(find("Is 53:5 the verse?")).toEqual([]);
    expect(find("read john 3:16 tonight")).toEqual([]);
    expect(find("Mark my words")).toEqual([]);
    expect(find("John 99:1 doesn't exist")).toEqual([]);
    expect(find("Acts of kindness")).toEqual([]);
  });

  it("doesn't take a space as the chapter-verse separator in running text", () => {
    expect(find("Gen 1 2 3")).toEqual([["Gen 1", "Gen.1.1-Gen.1.31"]]);
  });
});
