/**
 * Describes a compilation as a book (book-designer.md §9): its verses laid into paragraphs,
 * poetry lines and headings as the reader lays them (apps/web `layOut`), each source's
 * designation after its verses, the marks on changed verses, and the credits page with the
 * attributions and notices the licenses require. Pure.
 */

import { english } from "@scripturetips/reference";
import type { Block, Book, Chapter, Element, Format, Run } from "./book.ts";

/** Inline markup as the passages API gives it. */
export type Inline =
  | string
  | { type: "char"; marker: string; content: Inline[] }
  | { type: "span"; span: string; content: Inline[] }
  | { type: "note"; position: number }
  | { type: "block"; marker: string }
  | { type: "heading"; marker: string; content: Inline[] };

/** A compilation's verse: `source` the translation it came from, absent for the user's own. */
export interface SourceVerse {
  readonly chapter: number;
  readonly verse: number;
  readonly to: number | null;
  readonly published: string | null;
  readonly headings: readonly { readonly marker: string; readonly content: readonly Inline[] }[];
  readonly content: readonly Inline[];
  readonly notes: readonly { readonly position: number; readonly body: readonly Inline[] }[];
  readonly source?: string;
  readonly edit?: "correction" | "adaptation";
  readonly rendering?: "own" | "pasted";
}

export interface SourceBook {
  /** OSIS ID. */
  readonly osis: string;
  readonly chapters: readonly {
    readonly chapter: number;
    readonly verses: readonly SourceVerse[];
  }[];
}

/** What a source's text must carry (licenses.md §8, `attribution`). */
export interface Attribution {
  /** The source's catalog ID. */
  readonly source: string;
  readonly abbreviation: string;
  readonly designation: string;
  readonly statement: string;
}

export interface CompilationInput {
  readonly title: string;
  readonly subtitle: string;
  readonly books: readonly SourceBook[];
  readonly attributions: readonly Attribution[];
  readonly format?: Format;
}

/** The trial's format: 152 × 229 mm (6 × 9 in), as the `tex-bible` LEB edition. */
export const DEFAULT_FORMAT: Format = {
  width: 152,
  height: 229,
  bleed: 3,
  margins: { top: 16, bottom: 18, inner: 19, outer: 13 },
  gutter: 6,
  fontSize: 9.5,
  leading: 11.5,
  caliper: 0.0399,
};

/** The marks on a changed verse's number, as the reader shows them. */
export const VERSE_MARKS = {
  correction: "†",
  adaptation: "‡",
  own: "§",
  pasted: "*",
} as const;

const STYLES: Readonly<Record<string, "italic" | "bold" | "smallcaps">> = {
  it: "italic",
  em: "italic",
  add: "italic",
  tl: "italic",
  fq: "italic",
  fqa: "italic",
  bd: "bold",
  nd: "smallcaps",
};
const PARAGRAPHS: Readonly<Record<string, "paragraph" | "poetry1" | "poetry2">> = {
  p: "paragraph",
  m: "paragraph",
  pi: "paragraph",
  pi1: "paragraph",
  q: "poetry1",
  q1: "poetry1",
  q2: "poetry2",
  q3: "poetry2",
};

/** Text runs from inline markup; note marks become notes holding their bodies. */
function runs(nodes: readonly Inline[], note: (position: number) => Run | null): Run[] {
  return nodes.flatMap((n): Run[] => {
    if (typeof n === "string") return [{ t: "text", text: n }];
    if (n.type === "note") {
      const r = note(n.position);
      return r ? [r] : [];
    }
    if (n.type === "span") return [{ t: "idiom", runs: runs(n.content, note) }];
    if (n.type === "char") {
      // A note's own reference ("1.2") repeats the verse the note is on.
      if (n.marker === "fr") return [];
      const style = STYLES[n.marker];
      const inner = runs(n.content, note);
      return style ? [{ t: "style", style, runs: inner }] : inner;
    }
    return [];
  });
}

const markOf = (v: SourceVerse): string | undefined =>
  v.edit ? VERSE_MARKS[v.edit] : v.rendering ? VERSE_MARKS[v.rendering] : undefined;

/**
 * Lays a chapter's verses into blocks. `designationOf`: the designation a verse's source asks
 * for, placed once after each run of verses from the same source.
 */
export function chapterOf(
  number: number,
  verses: readonly SourceVerse[],
  designationOf: (v: SourceVerse) => string | undefined = () => undefined,
  /** The verse after this chapter's last in the same book: a run continuing into it isn't cut. */
  following?: SourceVerse,
): Chapter {
  const blocks: Block[] = [];
  let open: Extract<Block, { runs: Run[] }> | undefined;
  const start = (kind: "paragraph" | "poetry1" | "poetry2") => {
    open = { kind, runs: [] };
    blocks.push(open);
  };
  verses.forEach((v, i) => {
    const cv = `${v.chapter}:${v.verse}`;
    const byPosition = new Map(v.notes.map((n) => [n.position, n]));
    const placed = new Set<number>();
    const note = (position: number): Run | null => {
      const n = byPosition.get(position);
      if (!n) return null;
      placed.add(position);
      return { t: "note", cv, body: runs(n.body, () => null) };
    };
    for (const h of v.headings) {
      open = undefined;
      blocks.push({ kind: "heading", runs: runs(h.content, () => null) });
    }
    let numbered = false;
    const push = (r: Run) => {
      if (!open) start("paragraph");
      if (!numbered) {
        numbered = true;
        const mark = markOf(v);
        if (v.verse === 1)
          open?.runs.push({ t: "chapter", number: v.chapter, ...(mark ? { mark } : {}) });
        // A Psalm heading or the Sirach prologue (verse 0) is printed without a number.
        else if (v.verse !== 0)
          open?.runs.push({
            t: "verse",
            label: v.published ?? (v.to ? `${v.verse}–${v.to}` : String(v.verse)),
            cv,
            ...(mark ? { mark } : {}),
          });
      }
      open?.runs.push(r);
    };
    for (const node of v.content) {
      if (typeof node === "string") {
        if (node.trim() !== "" || numbered) push({ t: "text", text: node });
      } else if (node.type === "block") {
        if (node.marker === "b") {
          open = undefined;
          blocks.push({ kind: "break" });
        } else if (node.marker !== "nb") start(PARAGRAPHS[node.marker] ?? "paragraph");
      } else if (node.type === "heading") {
        open = undefined;
        blocks.push({ kind: "heading", runs: runs(node.content, () => null) });
      } else for (const r of runs([node], note)) push(r);
    }
    // A note the markup doesn't mark is still printed, so none is ever hidden.
    for (const n of v.notes) if (!placed.has(n.position)) push(note(n.position) as Run);
    const d = designationOf(v);
    const next = verses[i + 1] ?? following;
    if (d && open && (!next || designationOf(next) !== d))
      open.runs.push({ t: "designation", text: d });
  });
  return { number, blocks };
}

/** The credits page: each source's attribution, then what the marks on changed verses mean. */
export function credits(input: CompilationInput): string[] {
  const verses = input.books.flatMap((b) => b.chapters.flatMap((c) => c.verses));
  const lines = input.attributions.map((a) => a.statement);
  for (const a of input.attributions) {
    const changed = verses.filter((v) => v.source === a.source && v.edit);
    if (changed.length === 0) continue;
    const kinds = [
      changed.some((v) => v.edit === "correction") ? `${VERSE_MARKS.correction} corrected` : "",
      changed.some((v) => v.edit === "adaptation") ? `${VERSE_MARKS.adaptation} adapted` : "",
    ].filter(Boolean);
    lines.push(
      `Verses marked ${kinds.join(" or ")} are changed from the ${a.abbreviation}’s wording by the compiler of this edition. The changes are not the translator’s work.`,
    );
  }
  if (verses.some((v) => v.rendering === "own"))
    lines.push(`Verses marked ${VERSE_MARKS.own} are the compiler’s own rendering.`);
  if (verses.some((v) => v.rendering === "pasted"))
    lines.push(
      `Verses marked ${VERSE_MARKS.pasted} were pasted from elsewhere, and their source is not recorded.`,
    );
  lines.push("Set in Gentium, under the SIL Open Font License 1.1.");
  return lines;
}

export function describeCompilation(input: CompilationInput): Book {
  const designations = new Map(input.attributions.map((a) => [a.source, a.designation]));
  const designationOf = (v: SourceVerse) => (v.source ? designations.get(v.source) : undefined);
  const body: Element[] = [{ type: "title" }, { type: "credits" }];
  // A run of one source's verses ends with its designation at the latest where its book ends:
  // a printed Bible names its source on the credits page, so not after every chapter.
  for (const b of input.books) {
    body.push({
      type: "scripture",
      book: b.osis,
      name: english.name(b.osis, "full", "several"),
      headName: english.name(b.osis, "full", "one"),
      chapters: b.chapters.map((c, j) =>
        chapterOf(c.chapter, c.verses, designationOf, b.chapters[j + 1]?.verses[0]),
      ),
      notes: "foot",
    });
  }
  return {
    title: input.title,
    subtitle: input.subtitle,
    format: input.format ?? DEFAULT_FORMAT,
    fonts: { body: "Gentium", hebrew: "Ezra SIL" },
    credits: credits(input),
    body,
  };
}
