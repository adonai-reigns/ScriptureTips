// cspell:ignore knowl lehem
import { describe, expect, it } from "vitest";
import type { BookInfo } from "./books.ts";
import { SOFT_HYPHEN } from "./hyphens.ts";
import { joinLines, parseBook } from "./parse.ts";
import { toUsfm } from "./usfm.ts";

const TEST_BOOK: BookInfo = {
  heading: "TEST",
  code: "TST",
  name: "Test",
  hebrew: "טסט",
  chapters: [3, 2],
};

const usfmOf = (lines: string[], chapters = TEST_BOOK.chapters) => {
  const book = parseBook({ ...TEST_BOOK, chapters }, lines);
  return { book, usfm: toUsfm(book, "Test").usfm };
};

describe("joinLines", () => {
  it("joins at soft hyphens and keeps real ones", () => {
    expect(joinLines([`the knowl${SOFT_HYPHEN}`, "edge of"])).toBe("the knowledge of");
    expect(joinLines(["to Beth-", "lehem"])).toBe("to Beth-lehem");
  });

  it("restores the space a conversion lost after a possessive", () => {
    expect(joinLines(["his sons’wives"])).toBe("his sons’ wives");
    expect(joinLines(["the ass’s colt"])).toBe("the ass’s colt");
  });
});

describe("parseBook", () => {
  const lines = [
    "In the beginning there was a",
    "test. 2And the second verse went",
    "on. 3And the aThird ended it.",
    "",
    "a Heb. third.",
    "",
    "And the second chapter began",
    "here. 2And it ended.",
  ];

  it("reads glued verse numbers and the unnumbered first verse of each chapter", () => {
    const { book, usfm } = usfmOf(lines);
    expect(book.issues).toEqual([]);
    expect(usfm).toContain(
      "\\c 1\n\\p \\v 1 In the beginning there was a test. \\v 2 And the second",
    );
    expect(usfm).toContain(
      "\\c 2\n\\p \\v 1 And the second chapter began here. \\v 2 And it ended.",
    );
  });

  it("attaches a footnote to its caller", () => {
    expect(usfmOf(lines).usfm).toContain("\\v 3 And the \\f a \\fr 1:3 \\ft Heb. third.\\f*Third");
  });

  it("reports verse counts that differ from the printing's", () => {
    expect(usfmOf(lines, [4, 2]).book.issues).toEqual(["TST 1: 3 verses, expected 4"]);
  });

  it("writes the Hebrew title above the English one", () => {
    expect(usfmOf(lines).usfm).toContain("\\mt2 טסט\n\\mt1 Test");
  });
});

describe("toUsfm", () => {
  it("writes \\nb where a paragraph runs on across a chapter break", () => {
    const { usfm } = toUsfm(
      {
        info: TEST_BOOK,
        events: [
          { kind: "chapter", number: 1 },
          { kind: "break", style: "p", stanza: false },
          { kind: "verse", number: 1 },
          { kind: "text", text: "Said unto Moses:" },
          { kind: "chapter", number: 2 },
          { kind: "verse", number: 1 },
          { kind: "text", text: "‘See, I have set thee.’" },
        ],
        notes: [],
        issues: [],
      },
      "Test",
    );
    expect(usfm).toContain("\\c 2\n\\nb \\v 1 ‘See, I have set thee.’");
  });
});

describe("margin letters", () => {
  it("reads a dot before a line as a lost margin letter, but not an ellipsis", () => {
    const { book } = usfmOf([". In the beginning.", "", "x. 2And", ". . . saying."], [2]);
    expect(book.events.filter((e) => e.kind === "lost-hebrew")).toEqual([
      { kind: "lost-hebrew", source: "." },
    ]);
  });
});
