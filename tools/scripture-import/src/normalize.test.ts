/**
 * The USFM adjustments usfm-grammar needs (`normalizeUsfm`), each on the source pattern that
 * needed it, through the whole import: the text comes through, no words are lost, and the
 * adjustment is listed.
 */

import { describe, expect, it } from "vitest";
import { type Inline, plainText } from "./book.ts";
import { importBook } from "./import-book.ts";

const read = (code: string, ...lines: string[]) => {
  const result = importBook([`\\id ${code} test`, ...lines].join("\n"));
  expect(result.issues).toEqual([]);
  if (!result.book) throw new Error("no book");
  return { book: result.book, rules: result.normalizations.map((n) => n.rule) };
};

const verseContent = (book: ReturnType<typeof read>["book"], chapter: number, verse: number) =>
  book.chapters.find((c) => c.number === chapter)?.verses.find((v) => v.verse === verse)?.content ??
  [];

const headingsIn = (content: readonly Inline[]) =>
  content.flatMap((n) =>
    typeof n !== "string" && n.type === "heading" ? [[n.marker, plainText(n.content)]] : [],
  );

describe("words of Jesus across a verse number (BSB John 1:39)", () => {
  it("closes and reopens the span, so each verse has its words", () => {
    const { book, rules } = read(
      "JHN",
      "\\c 1",
      "\\p \\wj \\v 39 “Come and see,”\\wj* He replied. \\v 40 \\wj Follow \\v 41 me.\\wj*",
    );
    expect(verseContent(book, 1, 39)).toEqual([
      { type: "block", marker: "p" },
      { type: "char", marker: "wj", content: ["“Come and see,”"] },
      " He replied.",
    ]);
    expect(plainText(verseContent(book, 1, 40))).toBe("Follow");
    expect(plainText(verseContent(book, 1, 41))).toBe("me.");
    expect(rules).toContain("\\wj closed and reopened around a verse number");
  });
});

describe("a verse number inside a Psalm title", () => {
  it("keeps the title in verse 1, as the translation numbers it (BSB Ps 3:1)", () => {
    const { book, rules } = read(
      "PSA",
      "\\c 3",
      "\\d \\v 1 A Psalm of David.",
      "\\q1 O LORD, how my foes have increased!",
      "\\q1 \\v 2 Many say of me,",
    );
    const verses = book.chapters[0]?.verses ?? [];
    expect(verses.map((v) => v.verse)).toEqual([1, 2]);
    expect(headingsIn(verseContent(book, 3, 1))).toEqual([["d", "A Psalm of David."]]);
    expect(plainText(verseContent(book, 3, 1))).toBe("O LORD, how my foes have increased!");
    expect(rules).toContain("verse number moved out of a \\d title");
  });

  it("keeps each part of a title over two verses in its verse (JPS Ps 51:1–2)", () => {
    const { book } = read(
      "PSA",
      "\\c 51",
      "\\d \\v 1 For the Leader. A Psalm of David; \\v 2 when Nathan the prophet came unto him.",
      "\\q1 \\v 3 Be gracious unto me, O God.",
    );
    expect(headingsIn(verseContent(book, 51, 1))).toEqual([
      ["d", "For the Leader. A Psalm of David;"],
    ]);
    expect(headingsIn(verseContent(book, 51, 2))).toEqual([
      ["d", "when Nathan the prophet came unto him."],
    ]);
    expect(book.chapters[0]?.verses[2]?.headings).toEqual([]);
  });
});

describe("text after a book's last verse", () => {
  it("goes into the last verse: a closing note written as \\mr (BSB Hab 3:19)", () => {
    const { book, rules } = read(
      "HAB",
      "\\c 3",
      "\\q1 \\v 19 He makes me walk upon the heights!",
      "\\mr For the choirmaster. With stringed instruments.",
    );
    expect(plainText(verseContent(book, 3, 19))).toBe(
      "He makes me walk upon the heights! For the choirmaster. With stringed instruments.",
    );
    expect(rules).toContain("\\mr outside a \\ms heading written as \\qd");
  });

  it("goes into the last verse: the verse JPS repeats, after prose (Eccl 12:14)", () => {
    const { book } = read(
      "ECC",
      "\\c 12",
      "\\p \\v 13 The end of the matter. \\v 14 For God shall bring every work into judgment.",
      "\\lit The end of the matter.",
    );
    expect(headingsIn(verseContent(book, 12, 14))).toEqual([["lit", "The end of the matter."]]);
  });
});

describe("a paragraph that runs on across a chapter break (JPS Exod 7:1)", () => {
  it("starts no new paragraph at \\nb", () => {
    const { book } = read(
      "EXO",
      "\\c 6",
      "\\p \\v 30 And Moses said:",
      "\\c 7",
      "\\nb \\v 1 And the LORD said unto Moses: ‘See.’",
    );
    expect(verseContent(book, 7, 1)).toEqual(["And the LORD said unto Moses: ‘See.’"]);
  });
});

describe("NET notes and headings", () => {
  it("writes an open \\+fl as \\fl, and \\xo as \\xt (Isa 43)", () => {
    const { book, rules } = read(
      "ISA",
      "\\c 43",
      "\\q1 \\v 13 my power;\\f + \\fr 43:13 \\fl Note \\ft “hand” (so \\fl KJV\\ft , \\+fl NASB\\ft ). See \\xo Is 41:14.\\f*",
    );
    const note = verseContent(book, 43, 13).find((n) => typeof n !== "string" && n.type === "note");
    expect(JSON.stringify(note)).toContain('"marker":"fl","content":["NASB"]');
    expect(JSON.stringify(note)).toContain('"marker":"xt","content":["Is 41:14"]');
    expect(rules).toEqual([
      "open \\+fl in a note written as \\fl",
      "\\xo in a footnote written as \\xt",
    ]);
  });

  it("keeps a heading from before the first chapter, before verse 1 (Job)", () => {
    const { book } = read(
      "JOB",
      "\\mt1 Job",
      "\\ms1 I. The Prologue",
      "\\c 1",
      "\\p \\v 1 There was a man.",
    );
    expect(book.chapters[0]?.verses[0]?.headings).toEqual([
      { marker: "ms1", content: ["I. The Prologue"] },
    ]);
  });

  it("keeps a | in a heading as text, but not a word's attributes (Obad 1)", () => {
    const { book } = read(
      "OBA",
      "\\c 1",
      '\\s1 Judgment \\w on|strong="H5921"\\w* Edom|Edom’s Destruction',
      "\\p \\v 1 The vision of Obadiah.",
    );
    expect(plainText(book.chapters[0]?.verses[0]?.headings[0]?.content ?? [])).toBe(
      "Judgment on Edom|Edom’s Destruction",
    );
  });
});

describe("a note in an introduction paragraph (RV Sirach prologue)", () => {
  it("is written in brackets, and the book reads", () => {
    const { book, rules } = read(
      "SIR",
      "\\ip I found \\f + \\fr 1:0 \\ft Or, \\fqa a like work\\f* a copy.",
      "\\c 1",
      "\\p \\v 1 All wisdom cometh from the Lord.",
    );
    expect(book.skipped).toMatchObject({ "paragraph ip": 1 });
    expect(rules).toEqual(["note in an introduction paragraph written in brackets"]);
  });
});
