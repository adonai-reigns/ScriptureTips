import { describe, expect, it } from "vitest";
import {
  applyWording,
  changes,
  editableText,
  type Inline,
  plainText,
  snapshotHash,
  wordCount,
} from "./wording.ts";

const verse: Inline[] = [
  { type: "block", marker: "p" },
  "In the beginning",
  { type: "note", position: 0 },
  " God created ",
  { type: "char", marker: "wj", content: ["the heaven"] },
  " and the earth.",
];

describe("domain-model §2.3: editing a verse's wording", () => {
  it("reads the verse's text without its notes, breaks or headings", () => {
    expect(plainText(verse)).toBe("In the beginning God created the heaven and the earth.");
    expect(
      editableText(["  In the\nbeginning ", { type: "heading", marker: "s", content: ["X"] }]),
    ).toBe("In the beginning");
  });

  it("counts words and punctuation marks added, removed or replaced, but not spacing", () => {
    expect(changes("the heaven and the earth", "the heavens and the earth")).toBe(1);
    expect(changes("light, and there was light", "light; and there was light.")).toBe(2);
    expect(changes("there was light", "there was light.")).toBe(1);
    // A moved mark is removed in one place and added in another.
    expect(changes("light, and there", "light and, there")).toBe(2);
    expect(changes("And God said", "And  God\nsaid")).toBe(0);
    expect(changes("the big dog", "a small cat")).toBe(3);
    expect(changes("God created", "God truly created all")).toBe(2);
    expect(changes("And God said", "God  said")).toBe(1);
    expect(wordCount("In the beginning, God's word.")).toBe(5);
  });

  it("keeps the markup when nothing changed", () => {
    expect(applyWording(verse, editableText(verse))).toEqual(verse);
  });

  it("keeps styles and note marks around a changed word", () => {
    expect(applyWording(verse, "In the beginning God created the heavens and the earth.")).toEqual([
      { type: "block", marker: "p" },
      "In the beginning",
      { type: "note", position: 0 },
      " God created ",
      { type: "char", marker: "wj", content: ["the heavens"] },
      " and the earth.",
    ]);
  });

  it("moves a note mark with the word it follows when that word is replaced", () => {
    expect(applyWording(verse, "In the start God created the heaven and the earth.")).toEqual([
      { type: "block", marker: "p" },
      "In the start",
      { type: "note", position: 0 },
      " God created ",
      { type: "char", marker: "wj", content: ["the heaven"] },
      " and the earth.",
    ]);
  });

  it("drops word-level attributes (Strong's numbers) from a word that changed", () => {
    const tagged: Inline[] = [
      { type: "char", marker: "w", attributes: { strong: "H430" }, content: ["God"] },
      " ",
      { type: "char", marker: "w", attributes: { strong: "H1254" }, content: ["created"] },
    ];
    expect(applyWording(tagged, "God made")).toEqual([
      { type: "char", marker: "w", attributes: { strong: "H430" }, content: ["God"] },
      " made",
    ]);
  });

  it("hashes a snapshot the same whatever its key order", () => {
    expect(snapshotHash({ a: 1, b: [{ c: 2, d: 3 }] })).toBe(
      snapshotHash({ b: [{ d: 3, c: 2 }], a: 1 }),
    );
  });
});
