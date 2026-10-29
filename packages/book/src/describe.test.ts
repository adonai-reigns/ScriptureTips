import { describe, expect, it } from "vitest";
import type { Run } from "./book.ts";
import { type Attribution, describeCompilation, type SourceVerse } from "./describe.ts";

const verse = (chapter: number, n: number, text: string, more: Partial<SourceVerse> = {}) =>
  ({
    chapter,
    verse: n,
    to: null,
    published: null,
    headings: [],
    content: [text],
    notes: [],
    source: "leb",
    ...more,
  }) satisfies SourceVerse;

/** The user's own wording: from no source. */
const own = ({ source: _, ...v }: SourceVerse): SourceVerse => v;

const LEB: Attribution = {
  source: "leb",
  abbreviation: "LEB",
  designation: "LEB",
  statement: "Scripture quotations are from the Lexham English Bible.",
};
const KJV: Attribution = {
  source: "kjv",
  abbreviation: "KJV",
  designation: "KJV",
  statement: "The King James Version.",
};

const scripture = (book: ReturnType<typeof describeCompilation>, i = 2) => {
  const el = book.body[i];
  if (el?.type !== "scripture") throw new Error("not scripture");
  return el;
};
const runsOf = (book: ReturnType<typeof describeCompilation>, chapter = 0) =>
  scripture(book).chapters[chapter]?.blocks.flatMap((b) => ("runs" in b ? b.runs : [])) ?? [];

describe("describeCompilation (book-designer.md §9: the neutral book description)", () => {
  it("opens with the title and credits pages, then a scripture element per book", () => {
    const book = describeCompilation({
      title: "My Bible",
      subtitle: "A compilation",
      books: [
        { osis: "Ruth", chapters: [{ chapter: 1, verses: [verse(1, 1, "In the days")] }] },
        { osis: "Ps", chapters: [{ chapter: 23, verses: [verse(23, 1, "The Lord")] }] },
      ],
      attributions: [LEB],
    });
    expect(book.body.map((e) => e.type)).toEqual(["title", "credits", "scripture", "scripture"]);
    expect(book.format).toMatchObject({ width: 152, height: 229, bleed: 3 });
    // The book's title, and its name before a chapter in the running head.
    expect(scripture(book, 3)).toMatchObject({ book: "Ps", name: "Psalms", headName: "Psalm" });
  });

  it("numbers a chapter's first verse with the chapter numeral and the rest with verse numbers", () => {
    const book = describeCompilation({
      title: "T",
      subtitle: "",
      books: [
        {
          osis: "Gen",
          chapters: [
            {
              chapter: 1,
              verses: [
                verse(1, 1, "In the beginning"),
                verse(1, 2, "Now the earth", { published: "2a" }),
              ],
            },
          ],
        },
      ],
      attributions: [],
    });
    expect(runsOf(book).filter((r) => r.t === "chapter" || r.t === "verse")).toEqual([
      { t: "chapter", number: 1 },
      { t: "verse", label: "2a", cv: "1:2" },
    ]);
  });

  it("places each source's designation once after each run of its verses (licenses.md §8)", () => {
    const book = describeCompilation({
      title: "T",
      subtitle: "",
      books: [
        {
          osis: "Gen",
          chapters: [
            {
              chapter: 1,
              verses: [
                verse(1, 1, "a"),
                verse(1, 2, "b"),
                verse(1, 3, "c", { source: "kjv" }),
                verse(1, 4, "d"),
              ],
            },
            { chapter: 2, verses: [verse(2, 1, "e")] },
          ],
        },
      ],
      attributions: [LEB, KJV],
    });
    const designations = (runs: Run[]) =>
      runs.flatMap((r) => (r.t === "designation" ? [r.text] : []));
    // Verse 4's run continues into chapter 2, so it's named where the run ends.
    expect(designations(runsOf(book, 0))).toEqual(["LEB", "KJV"]);
    expect(designations(runsOf(book, 1))).toEqual(["LEB"]);
  });

  it("marks changed and own verses, and explains the marks on the credits page", () => {
    const book = describeCompilation({
      title: "T",
      subtitle: "",
      books: [
        {
          osis: "Gen",
          chapters: [
            {
              chapter: 1,
              verses: [
                verse(1, 1, "a", { edit: "correction" }),
                verse(1, 2, "b", { edit: "adaptation" }),
                own(verse(1, 3, "c", { rendering: "own" })),
              ],
            },
          ],
        },
      ],
      attributions: [LEB],
    });
    expect(runsOf(book).filter((r) => r.t === "chapter" || r.t === "verse")).toEqual([
      { t: "chapter", number: 1, mark: "†" },
      { t: "verse", label: "2", cv: "1:2", mark: "‡" },
      { t: "verse", label: "3", cv: "1:3", mark: "§" },
    ]);
    expect(book.credits).toEqual([
      LEB.statement,
      "Verses marked † corrected or ‡ adapted are changed from the LEB’s wording by the compiler of this edition. The changes are not the translator’s work.",
      "Verses marked § are the compiler’s own rendering.",
      "Set in Gentium, under the SIL Open Font License 1.1.",
    ]);
  });

  it("keeps the translation's paragraphs, poetry, headings, styles and notes", () => {
    const book = describeCompilation({
      title: "T",
      subtitle: "",
      books: [
        {
          osis: "Ps",
          chapters: [
            {
              chapter: 1,
              verses: [
                verse(1, 1, "", {
                  headings: [{ marker: "s1", content: ["Two Ways"] }],
                  content: [
                    { type: "block", marker: "q1" },
                    "Blessed is ",
                    { type: "char", marker: "nd", content: ["Yahweh"] },
                    { type: "note", position: 0 },
                  ],
                  notes: [
                    { position: 0, body: [{ type: "char", marker: "fr", content: ["1.1"] }, "Or"] },
                    { position: 1, body: ["Unmarked"] },
                  ],
                }),
              ],
            },
          ],
        },
      ],
      attributions: [],
    });
    const blocks = scripture(book).chapters[0]?.blocks;
    expect(blocks?.map((b) => b.kind)).toEqual(["heading", "poetry1"]);
    expect(blocks?.[1]).toEqual({
      kind: "poetry1",
      runs: [
        { t: "chapter", number: 1 },
        { t: "text", text: "Blessed is " },
        { t: "style", style: "smallcaps", runs: [{ t: "text", text: "Yahweh" }] },
        // The note's own reference is left out; a note the markup doesn't place still prints.
        { t: "note", cv: "1:1", body: [{ t: "text", text: "Or" }] },
        { t: "note", cv: "1:1", body: [{ t: "text", text: "Unmarked" }] },
      ],
    });
  });
});
