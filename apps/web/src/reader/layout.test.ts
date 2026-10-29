import { describe, expect, it } from "vitest";
import type { Verse } from "./api.ts";
import { layOut, letter, noteBody } from "./layout.ts";

const verse = (n: number, content: Verse["content"], extra: Partial<Verse> = {}): Verse => ({
  chapter: 1,
  verse: n,
  to: null,
  published: null,
  canonical: [],
  headings: [],
  content,
  notes: [],
  ...extra,
});

const note = (position: number, text: string) => ({
  position,
  kind: "footnote" as const,
  caller: "+",
  category: null,
  span: null,
  body: [text],
});

describe("layOut", () => {
  it("runs verses on in a paragraph, numbered where their text begins", () => {
    const { blocks } = layOut(
      [verse(1, [{ type: "block", marker: "p" }, "One. "]), verse(2, ["Two."])],
      "p0",
    );
    expect(blocks).toMatchObject([
      {
        kind: "block",
        marker: "p",
        pieces: [
          { kind: "verse", label: "1", id: "p0-v1-1" },
          { kind: "text", shown: "One. " },
          { kind: "verse", label: "2", id: "p0-v1-2" },
          { kind: "text", shown: "Two." },
        ],
      },
    ]);
  });

  it("puts headings before their verse, and starts a poetry line for each block mark", () => {
    const { blocks } = layOut(
      [
        verse(
          1,
          [
            { type: "block", marker: "q1" },
            "Line one ",
            { type: "block", marker: "q2" },
            "line two",
          ],
          {
            headings: [{ marker: "s1", content: ["Head"] }],
          },
        ),
      ],
      "p0",
    );
    expect(blocks.map((b) => [b.kind, b.marker])).toEqual([
      ["heading", "s1"],
      ["block", "q1"],
      ["block", "q2"],
    ]);
  });

  it("letters notes in reading order, a note inside an idiom span included (LEB Gen 8:8)", () => {
    const { notes, blocks } = layOut(
      [
        verse(
          8,
          [
            { type: "block", marker: "p" },
            {
              type: "span",
              span: "1",
              content: ["he sent out a", { type: "note", position: 0 }, " dove"],
            },
            { type: "note", position: 1 },
            " from",
            { type: "note", position: 2 },
          ],
          { notes: [note(0, "Or the"), note(1, "Literally"), note(2, "Later")] },
        ),
      ],
      "p0",
    );
    expect(notes.map((n) => [n.letter, n.note.body[0]])).toEqual([
      ["a", "Or the"],
      ["b", "Literally"],
      ["c", "Later"],
    ]);
    const first = blocks[0];
    expect(first?.kind === "block" && first.pieces[1]).toMatchObject({
      kind: "text",
      shown: {
        type: "span",
        span: "1",
        content: ["he sent out a", { type: "mark", letter: "a", noteId: "p0-n0" }, " dove"],
      },
    });
  });

  it("draws a Psalm heading (verse 0) as a title, without a number", () => {
    const { blocks } = layOut(
      [verse(0, ["A Psalm of David."]), verse(1, [{ type: "block", marker: "q1" }, "The LORD"])],
      "p0",
    );
    expect(blocks[0]).toMatchObject({
      kind: "block",
      marker: "d",
      pieces: [{ kind: "text", shown: "A Psalm of David." }],
    });
  });

  it("carries a compilation's correction, adaptation or own wording to the verse number (domain-model §2.3)", () => {
    const { blocks } = layOut(
      [
        verse(1, ["One."]),
        verse(2, ["Two."], { edit: "correction" }),
        verse(3, ["Three."], { rendering: "own" }),
      ],
      "p0",
    );
    const numbers = blocks.flatMap((b) =>
      b.kind === "block" ? b.pieces.filter((p) => p.kind === "verse") : [],
    );
    expect(numbers).toEqual([
      { kind: "verse", label: "1", id: "p0-v1-1" },
      { kind: "verse", label: "2", id: "p0-v1-2", mark: "correction" },
      { kind: "verse", label: "3", id: "p0-v1-3", mark: "own" },
    ]);
  });

  it("still lists a note the markup doesn't mark", () => {
    const { notes } = layOut([verse(1, ["Text."], { notes: [note(0, "Unmarked")] })], "p0");
    expect(notes.map((n) => n.note.body[0])).toEqual(["Unmarked"]);
  });
});

describe("letter", () => {
  it("goes a … z, then aa, ab", () => {
    expect([0, 1, 25, 26, 27].map(letter)).toEqual(["a", "b", "z", "aa", "ab"]);
  });
});

describe("noteBody", () => {
  it("leaves out the note's own reference (KJV `\\fr 23.2`)", () => {
    expect(
      noteBody([
        { type: "char", marker: "fr", content: ["23.2 "] },
        { type: "char", marker: "ft", content: ["Heb."] },
      ]),
    ).toEqual([{ type: "char", marker: "ft", content: ["Heb."] }]);
  });
});
