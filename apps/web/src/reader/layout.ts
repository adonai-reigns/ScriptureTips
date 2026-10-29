/**
 * Lays a passage's verses out for reading: the translation's paragraphs, poetry lines and
 * headings, with each verse number where its text begins, and note marks lettered in reading
 * order. Verses run on inside a paragraph, and a paragraph can run across verses, as printed.
 */

import type { Inline, Note, Verse } from "./api.ts";

/** Text to draw: the API's inline markup, with each note replaced by its lettered mark. */
export type Shown =
  | string
  | { type: "char"; marker: string; content: Shown[]; attributes?: Record<string, string> }
  | { type: "span"; span: string; content: Shown[] }
  | { type: "mark"; letter: string; noteId: string };

/** `key`: unique in its block, for React. */
export type Piece =
  | { kind: "text"; shown: Shown; key: string }
  | { kind: "verse"; label: string; id: string; mark?: VerseMark };

/** How a compilation's verse differs from a translation's: shown by its number. */
export type VerseMark = "correction" | "adaptation" | "own" | "pasted";

/** `key`: unique in the passage, for React. */
export type Block =
  | { kind: "heading"; marker: string; content: Shown[]; key: string }
  | { kind: "block"; marker: string; pieces: Piece[]; key: string };

/** A note with its letter, the verse it's on, and the id its mark links to. */
export interface PlacedNote {
  letter: string;
  id: string;
  verse: string;
  note: Note;
}

export interface Laid {
  blocks: Block[];
  notes: PlacedNote[];
}

/** a, b … z, aa, ab …: letters for note marks, as printed Bibles letter them. */
export function letter(n: number): string {
  return n < 26
    ? String.fromCharCode(97 + n)
    : letter(Math.floor(n / 26) - 1) + String.fromCharCode(97 + (n % 26));
}

const verseLabel = (v: Verse) => v.published ?? (v.to ? `${v.verse}–${v.to}` : String(v.verse));

export function layOut(verses: readonly Verse[], prefix: string): Laid {
  const blocks: Block[] = [];
  const notes: PlacedNote[] = [];
  let open: Extract<Block, { kind: "block" }> | undefined;

  const start = (marker: string) => {
    open = { kind: "block", marker, pieces: [], key: `b${blocks.length}` };
    blocks.push(open);
  };

  for (const v of verses) {
    let numbered = false;
    const byPosition = new Map(v.notes.map((n) => [n.position, n]));
    const placed = new Set<Note>();

    /** Letters the note at `position` and returns its mark. */
    const mark = (position: number): Shown | undefined => {
      const note = byPosition.get(position);
      if (!note) return undefined;
      placed.add(note);
      const l = note.caller !== "+" && note.caller !== "-" ? note.caller : letter(notes.length);
      const id = `${prefix}-n${notes.length}`;
      notes.push({ letter: l, id, verse: `${v.chapter}:${verseLabel(v)}`, note });
      return { type: "mark", letter: l, noteId: id };
    };
    const show = (nodes: readonly Inline[]): Shown[] =>
      nodes.flatMap((n): Shown[] => {
        if (typeof n === "string") return [n];
        if (n.type === "note") return [mark(n.position)].filter((m): m is Shown => m !== undefined);
        if (n.type === "char") return [{ ...n, content: show(n.content) }];
        if (n.type === "span") return [{ ...n, content: show(n.content) }];
        // A block or heading nested in a span or style isn't produced by the import.
        return [];
      });

    const push = (shown: Shown) => {
      // Verse 0 is a Psalm heading (or the Sirach prologue, which has its own paragraphs).
      if (!open) start(v.verse === 0 ? "d" : "p");
      if (!numbered) {
        numbered = true;
        // A Psalm heading or the Sirach prologue (verse 0) is printed without a number.
        if (v.verse !== 0)
          open?.pieces.push({
            kind: "verse",
            label: verseLabel(v),
            id: `${prefix}-v${v.chapter}-${v.verse}`,
            ...(v.edit || v.rendering ? { mark: v.edit ?? v.rendering } : {}),
          });
      }
      open?.pieces.push({ kind: "text", shown, key: `t${open.pieces.length}` });
    };

    for (const h of v.headings) {
      open = undefined;
      blocks.push({
        kind: "heading",
        marker: h.marker,
        content: show(h.content),
        key: `b${blocks.length}`,
      });
    }
    for (const node of v.content) {
      if (typeof node === "string") {
        if (node.trim() !== "" || numbered) push(node);
      } else if (node.type === "block") {
        start(node.marker);
      } else if (node.type === "heading") {
        open = undefined;
        blocks.push({
          kind: "heading",
          marker: node.marker,
          content: show(node.content),
          key: `b${blocks.length}`,
        });
      } else {
        for (const s of show([node])) push(s);
      }
    }
    // A note the markup doesn't mark is still listed, so none is ever hidden.
    for (const n of v.notes) if (!placed.has(n)) mark(n.position);
  }
  return { blocks, notes };
}

/**
 * A note's body as text to draw (a note holds no notes, blocks or headings of its own). The
 * note's own reference (`fr`, "23.2") is left out: the list already shows the verse.
 */
export function noteBody(nodes: readonly Inline[]): Shown[] {
  return nodes.flatMap((n): Shown[] => {
    if (typeof n === "string") return [n];
    if (n.type === "char" && n.marker === "fr") return [];
    if (n.type === "char" || n.type === "span") return [{ ...n, content: noteBody(n.content) }];
    return [];
  });
}
