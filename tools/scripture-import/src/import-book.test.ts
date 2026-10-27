import { describe, expect, it } from "vitest";
import { plainText } from "./book.ts";
import { importBook } from "./import-book.ts";

const usfm = (...lines: string[]) => ["\\id PSA test", "\\h Psalms", ...lines].join("\n");

const read = (...lines: string[]) => {
  const result = importBook(usfm(...lines));
  expect(result.issues).toEqual([]);
  if (!result.book) throw new Error("no book");
  return result.book;
};

describe("domain-model §1: verse text with its markup and markers", () => {
  it("keeps each verse with the headings before it and where paragraphs begin, its first included", () => {
    const book = read(
      "\\c 1",
      "\\s1 The Two Ways",
      "\\q1",
      "\\v 1 Blessed is the man",
      "\\q2 that walketh not",
      "\\v 2 But his delight",
    );
    const [first, second] = book.chapters[0]?.verses ?? [];
    expect(first?.headings).toEqual([{ marker: "s1", content: ["The Two Ways"] }]);
    expect(first?.content).toEqual([
      { type: "block", marker: "q1" },
      "Blessed is the man ",
      { type: "block", marker: "q2" },
      "that walketh not",
    ]);
    expect(second && plainText(second.content)).toBe("But his delight");
    expect(book.names).toEqual({ header: "Psalms" });
  });

  it("makes a Psalm heading printed before verse 1 verse 0 (domain-model §2.1)", () => {
    const book = read(
      "\\c 3",
      "\\d A Psalm of David.",
      "\\q1",
      "\\v 1 LORD, how are they increased",
    );
    const [heading, first] = book.chapters[0]?.verses ?? [];
    expect(heading).toMatchObject({ chapter: 3, verse: 0, content: ["A Psalm of David."] });
    expect(first?.verse).toBe(1);
  });

  it("keeps character styles with their attributes, and notes", () => {
    const book = read(
      "\\c 23",
      "\\q1",
      '\\v 1 The \\nd LORD\\nd* is my \\w shepherd|strong="H7462"\\w*;\\f + \\fr 23:1 \\ft Or, feeder.\\f*',
    );
    expect(book.chapters[0]?.verses[0]?.content).toEqual([
      { type: "block", marker: "q1" },
      "The ",
      { type: "char", marker: "nd", content: ["LORD"] },
      " is my ",
      { type: "char", marker: "w", content: ["shepherd"], attributes: { strong: "H7462" } },
      ";",
      {
        type: "note",
        marker: "f",
        caller: "+",
        content: [
          { type: "char", marker: "fr", content: ["23:1 "] },
          { type: "char", marker: "ft", content: ["Or, feeder."] },
        ],
      },
    ]);
  });

  it("keeps a bridged verse, and the number as printed", () => {
    const book = read("\\c 1", "\\p", "\\v 3-4 Bridged.", "\\v 5 \\vp 5a\\vp* Printed.");
    const [bridged, printed] = book.chapters[0]?.verses ?? [];
    expect(bridged).toMatchObject({ verse: 3, to: 4 });
    expect(printed).toMatchObject({ verse: 5, published: "5a" });
  });
});

describe("headings", () => {
  it("keeps a heading inside the verse it interrupts", () => {
    const book = read(
      "\\c 23",
      "\\p",
      "\\v 19 So Abraham returned.",
      "\\s1 Genealogy",
      "\\p Abraham lived.",
    );
    expect(book.chapters[0]?.verses[0]?.content).toEqual([
      { type: "block", marker: "p" },
      "So Abraham returned. ",
      { type: "heading", marker: "s1", content: ["Genealogy"] },
      { type: "block", marker: "p" },
      "Abraham lived.",
    ]);
    expect(plainText(book.chapters[0]?.verses[0]?.content ?? [])).toBe(
      "So Abraham returned. Abraham lived.",
    );
  });

  it("keeps the text of a reference in a \\r heading, and reports the change", () => {
    const result = importBook(
      usfm(
        "\\c 1",
        "\\s1 The Creation",
        "\\r (\\ref John 1:1–5|JHN 1:1-5\\ref*; \\ref Hebrews 11:1–3|HEB 11:1-3\\ref*)",
        "\\p",
        "\\v 1 In the beginning.",
      ),
    );
    expect(result.issues).toEqual([]);
    expect(result.normalizations).toEqual([{ rule: "\\ref inside \\r unwrapped", count: 1 }]);
    expect(result.book?.chapters[0]?.verses[0]?.headings).toEqual([
      { marker: "s1", content: ["The Creation"] },
      { marker: "r", content: ["(John 1:1–5; Hebrews 11:1–3)"] },
    ]);
  });
});

describe("nothing is dropped silently", () => {
  it("reports a marker the import doesn't know", () => {
    const result = importBook(usfm("\\c 1", "\\p", "\\v 1 Text \\xyz odd\\xyz* here."));
    expect(result.issues.join("\n")).toMatch(/xyz/);
  });

  it("reports text outside a verse", () => {
    const result = importBook(usfm("\\c 1", "\\p Stray text", "\\v 1 Verse."));
    expect(result.issues.join("\n")).toMatch(/text outside a verse/);
  });

  it("returns no book for a peripheral file", () => {
    expect(importBook("\\id FRT front matter\n\\p Preface.").book).toBeUndefined();
  });

  it("keeps the words of a Selah span with a nested word marker", () => {
    const book = read(
      "\\c 3",
      "\\q1",
      '\\v 2 Many there be. \\qs \\+w Selah|strong="H5542"\\+w*.\\qs*',
    );
    expect(plainText(book.chapters[0]?.verses[0]?.content ?? [])).toBe("Many there be. Selah.");
  });
});
