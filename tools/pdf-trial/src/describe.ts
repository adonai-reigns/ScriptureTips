/**
 * Builds the trial's book description from the passages API (the verses as the reader has them)
 * and the Open Scriptures Hebrew Bible. The sample is book-designer.md §9's: Genesis 1–11, Ruth,
 * a chapter with its notes in a center column, a full-bleed map spread and a Hebrew interlinear
 * page.
 */

import { english } from "@scripturetips/reference";
import type { Block, Book, Chapter, Element, Run } from "./book.ts";
import { interlinear } from "./oshb.ts";

type Inline =
  | string
  | { type: "char"; marker: string; content: Inline[] }
  | { type: "span"; span: string; content: Inline[] }
  | { type: "note"; position: number }
  | { type: "block"; marker: string }
  | { type: "heading"; marker: string; content: Inline[] };

interface Verse {
  chapter: number;
  verse: number;
  to: number | null;
  published: string | null;
  headings: { marker: string; content: Inline[] }[];
  content: Inline[];
  notes: { position: number; body: Inline[] }[];
}

const API = process.env["API_URL"] ?? "http://api:3001/api";

export async function chapterVerses(translation: string, ref: string): Promise<Verse[]> {
  const res = await fetch(
    `${API}/translations/${translation}/passages?ref=${encodeURIComponent(ref)}`,
  );
  if (!res.ok) throw new Error(`${ref}: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { passages: { verses: Verse[] }[] };
  return body.passages.flatMap((p) => p.verses);
}

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

/** Lays a chapter's verses into blocks, as the reader does (apps/web `layOut`). */
export function chapterOf(name: string, number: number, verses: readonly Verse[]): Chapter {
  const blocks: Block[] = [];
  let open: Extract<Block, { runs: Run[] }> | undefined;
  const start = (kind: "paragraph" | "poetry1" | "poetry2") => {
    open = { kind, runs: [] };
    blocks.push(open);
  };
  for (const v of verses) {
    const ref = `${name} ${v.chapter}:${v.verse}`;
    const byPosition = new Map(v.notes.map((n) => [n.position, n]));
    const note = (position: number): Run | null => {
      const n = byPosition.get(position);
      return n
        ? { t: "note", ref: `${v.chapter}:${v.verse}`, body: runs(n.body, () => null) }
        : null;
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
        if (v.verse === 1) open?.runs.push({ t: "chapter", number: v.chapter });
        else if (v.verse !== 0)
          open?.runs.push({ t: "verse", label: v.published ?? String(v.verse), ref });
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
  }
  return { number, blocks };
}

async function scripture(
  translation: string,
  book: string,
  name: string,
  chapters: readonly number[],
  notes: "foot" | "center",
  opensBook = true,
): Promise<Element> {
  const out: Chapter[] = [];
  for (const c of chapters)
    out.push(chapterOf(name, c, await chapterVerses(translation, `${name} ${c}`)));
  return { type: "scripture", book, name, chapters: out, notes, opensBook };
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A placeholder map: the trial tests the spread's placement and bleed, not the artwork. */
export function mapSvg(widthMm: number, heightMm: number): string {
  const lines: string[] = [];
  for (let x = 0; x <= widthMm; x += 10)
    lines.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${heightMm}" stroke="#9bb" stroke-width="0.2"/>`,
    );
  for (let y = 0; y <= heightMm; y += 10)
    lines.push(
      `<line x1="0" y1="${y}" x2="${widthMm}" y2="${y}" stroke="#9bb" stroke-width="0.2"/>`,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${widthMm} ${heightMm}">
<rect width="${widthMm}" height="${heightMm}" fill="#e8efe4"/>
${lines.join("\n")}
<path d="M ${widthMm * 0.1} ${heightMm * 0.7} C ${widthMm * 0.3} ${heightMm * 0.2}, ${widthMm * 0.6} ${heightMm * 0.9}, ${widthMm * 0.9} ${heightMm * 0.3}" fill="none" stroke="#a33" stroke-width="1.2" stroke-dasharray="3 2"/>
<rect x="${widthMm / 2 - 0.25}" y="0" width="0.5" height="${heightMm}" fill="#c55"/>
<text x="${widthMm * 0.25}" y="${heightMm * 0.5}" font-size="9" text-anchor="middle" fill="#455">Left page</text>
<text x="${widthMm * 0.75}" y="${heightMm * 0.5}" font-size="9" text-anchor="middle" fill="#455">Right page</text>
</svg>`;
}

export async function describe(translation = "leb"): Promise<Book> {
  const format = {
    width: 152,
    height: 229,
    bleed: 3,
    margins: { top: 16, bottom: 18, inner: 19, outer: 13 },
    gutter: 6,
    fontSize: 9.5,
    leading: 11.5,
    caliper: 0.0399,
  };
  return {
    title: "The Holy Bible",
    subtitle: "Lexham English Bible: a sample edition",
    format,
    fonts: { body: "Gentium", hebrew: "Ezra SIL" },
    credits: [
      "Scripture quotations are from the Lexham English Bible. Copyright 2012 Logos Bible Software. Lexham is a registered trademark of Logos Bible Software.",
      "Hebrew text: the Westminster Leningrad Codex, public domain. Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb. Glosses from Strong's Hebrew dictionary, via the Open Scriptures Hebrew Bible Project.",
      "Set in Gentium (SIL Open Font License 1.1) and Ezra SIL (SIL Open Font License 1.1; Hebrew layout code under the MIT/X11 License).",
    ],
    body: [
      { type: "title" },
      { type: "credits" },
      await scripture(translation, "Gen", "Genesis", range(1, 11), "foot"),
      await scripture(translation, "Gen", "Genesis", [12], "center", false),
      {
        type: "spread",
        label: "map-sample",
        caption: "A sample map spread, printed to the trimmed edge",
        image: { svg: "map.svg", pdf: "map.pdf" },
      },
      await scripture(translation, "Ruth", "Ruth", range(1, 4), "foot"),
      {
        type: "interlinear",
        title: "Genesis 1:1–5 in Hebrew",
        credit:
          "Westminster Leningrad Codex (public domain); morphology from the Open Scriptures Hebrew Bible; glosses from Strong's dictionary.",
        verses: interlinear("Gen", 1, 1, 5),
      },
    ],
  };
}

/** The whole LEB in the same layout, for timing: every book, notes at the foot. */
export async function wholeBible(translation = "leb"): Promise<Book> {
  const sample = await describe(translation);
  const res = await fetch(`${API}/translations/${translation}/books`);
  const { books } = (await res.json()) as { books: { osis: string; chapters: number[] }[] };
  const body: Element[] = [{ type: "title" }, { type: "credits" }];
  for (const b of books) {
    const name = english.name(b.osis, "full", "one");
    const chapters: Chapter[] = [];
    for (const c of b.chapters)
      chapters.push(chapterOf(name, c, await chapterVerses(translation, `${name} ${c}`)));
    body.push({ type: "scripture", book: b.osis, name, chapters, notes: "foot", opensBook: true });
  }
  return { ...sample, body };
}
