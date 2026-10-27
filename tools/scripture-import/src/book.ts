/**
 * Turns one book's USJ into verse records (domain-model §1, "Verse text"): each verse with its
 * text as markup, the headings before it, and where paragraphs and poetry lines begin in it.
 * Numbering stays as the translation prints it; conversion to canonical happens later.
 */

import { bookByUsfm } from "@scripturetips/passage";
import {
  BLOCK,
  CHAPTER_LABEL,
  CHARACTER,
  HEADING,
  IDENTIFICATION,
  INTRODUCTION,
  MILESTONE,
  NOTE,
  NOTE_CHARACTER,
} from "./markers.ts";
import type { UsjElement, UsjNode } from "./usj.ts";

/**
 * Verse text: plain text, character styles, notes, the start of a paragraph or line, and a
 * heading that falls inside the verse.
 */
export type Inline = string | CharNode | NoteNode | BlockStart | HeadingNode | SpanNode;

/**
 * Words a translator's note covers (domain-model §2.6): the LEB's idiomatic phrases, printed in
 * lower corner brackets. A span that runs across a verse number or a line is in pieces with
 * the same `span`.
 */
export interface SpanNode {
  readonly type: "span";
  /** Unique within the book; the note covering the words has the same `span`. */
  readonly span: string;
  readonly content: readonly Inline[];
}

export interface CharNode {
  readonly type: "char";
  readonly marker: string;
  readonly content: readonly Inline[];
  /** E.g. `strong`, `lemma` on `\w`; `loc` on `\ref`. */
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface NoteNode {
  readonly type: "note";
  readonly marker: string;
  readonly caller: string;
  /** `\cat`: e.g. `screen` for a note the LEB shows on screen but leaves out of print. */
  readonly category?: string;
  /** The span of words the note covers (a `SpanNode` before it); without one, a point note. */
  readonly span?: string;
  readonly content: readonly Inline[];
}

/** A paragraph, poetry line or list item begins here (`p`, `q1`, `li1` …), or a blank line (`b`). */
export interface BlockStart {
  readonly type: "block";
  readonly marker: string;
}

export interface Heading {
  readonly marker: string;
  readonly content: readonly Inline[];
}

/** A heading printed inside a verse, where the verse goes on after it (e.g. OEB Gen 23:19). */
export interface HeadingNode extends Heading {
  readonly type: "heading";
}

export interface ImportedVerse {
  readonly chapter: number;
  /** 0 for a Psalm heading printed before verse 1. */
  readonly verse: number;
  /** The last verse of a bridged verse ("\v 3-4"). */
  readonly to?: number;
  /** The number as printed, where it differs (`\vp`, or a published-number attribute). */
  readonly published?: string;
  readonly headings: readonly Heading[];
  readonly content: readonly Inline[];
}

export interface ImportedChapter {
  readonly number: number;
  /** As printed (`\cl`, `\cp`), e.g. "Psalm 23". */
  readonly label?: string;
  readonly verses: readonly ImportedVerse[];
}

export interface ImportedBook {
  /** OSIS book ID. */
  readonly book: string;
  readonly usfm: string;
  /** The translation's own names: `\h`, `\toc1` (long), `\toc2` (short), `\toc3` (abbreviation). */
  readonly names: Readonly<Partial<Record<"header" | "long" | "short" | "abbreviation", string>>>;
  readonly chapters: readonly ImportedChapter[];
  /** Paragraphs of introduction and titles, and milestones, counted but not imported. */
  readonly skipped: Readonly<Record<string, number>>;
  /** Spans with no note right after them (e.g. "2Chr 4:22"), for the report. */
  readonly spansWithoutNote: readonly string[];
  readonly issues: readonly string[];
}

interface MutableVerse {
  chapter: number;
  verse: number;
  to?: number;
  published?: string;
  headings: Heading[];
  content: Inline[];
}

const NAME_MARKERS: Readonly<Record<string, keyof ImportedBook["names"]>> = {
  h: "header",
  toc1: "long",
  toc2: "short",
  toc3: "abbreviation",
};

const VERSE_NUMBER = /^(\d+)(?:[-–](\d+))?([a-z])?$/;

/** Reads a book. Returns undefined for a peripheral file (front matter, glossary …). */
export function readBook(usj: UsjElement): ImportedBook | undefined {
  const content = usj.content ?? [];
  const id = content.find((n): n is UsjElement => typeof n !== "string" && n.type === "book");
  const code = typeof id?.["code"] === "string" ? id["code"] : "";
  const book = bookByUsfm(code);
  if (!book) return undefined;

  const names: Record<string, string> = {};
  const chapters: { number: number; label?: string; verses: MutableVerse[] }[] = [];
  const skipped: Record<string, number> = {};
  const issues: string[] = [];
  let headings: Heading[] = [];
  let blocks: string[] = [];
  let verse: MutableVerse | undefined;
  let bookLabel: string | undefined;

  const count = (what: string) => {
    skipped[what] = (skipped[what] ?? 0) + 1;
  };
  const where = () => {
    const chapter = chapters.at(-1);
    return `${code} ${chapter ? chapter.number : 0}${verse ? `:${verse.verse}` : ""}`;
  };
  const issue = (text: string) => issues.push(`${where()}: ${text}`);

  /**
   * Appends to the open verse, starting any pending blocks there first. Headings still pending
   * fall inside this verse: no new verse began after them.
   */
  const append = (node: Inline) => {
    const blank = typeof node === "string" && node.trim() === "";
    if (!verse) {
      if (blank) return;
      issue(`text outside a verse: ${JSON.stringify(node).slice(0, 60)}`);
      return;
    }
    if (blank) {
      verse.content.push(node);
      return;
    }
    flushHeadings();
    for (const marker of blocks) verse.content.push({ type: "block", marker });
    blocks = [];
    verse.content.push(node);
  };

  /** Headings still pending go into the open verse (a title after its verse number). */
  const flushHeadings = () => {
    if (!verse) return;
    for (const heading of headings) verse.content.push({ type: "heading", ...heading });
    headings = [];
  };

  const startVerse = (node: UsjElement) => {
    // A verse number, then a title, then the next verse number: the title is the first
    // verse's (JPS Ps 51:1–2, written `\d \v 1 For the Leader … \v 2 when Nathan …`).
    if (verse && verse.content.length === 0) flushHeadings();
    const chapter = chapters.at(-1);
    const number = String(node["number"] ?? "");
    const match = VERSE_NUMBER.exec(number);
    if (!chapter || !match) {
      issue(`verse "${number}" outside a chapter or not a number`);
      return;
    }
    const published = node["pubnumber"] ?? node["altnumber"];
    verse = {
      chapter: chapter.number,
      verse: Number(match[1]),
      ...(match[2] ? { to: Number(match[2]) } : {}),
      ...(match[3] || published ? { published: String(published ?? number) } : {}),
      headings,
      content: [],
    };
    headings = [];
    chapter.verses.push(verse);
  };

  /** Inline content, as markup. `inNote`: inside a footnote or cross-reference. */
  const inline = (nodes: readonly UsjNode[], inNote: boolean, out: (n: Inline) => void) => {
    for (const node of nodes) {
      if (typeof node === "string") {
        out(node);
        continue;
      }
      const marker = node.marker ?? "";
      if (node.type === "verse") {
        if (inNote) issue("verse number inside a note");
        else startVerse(node);
      } else if (node.type === "char" && (CHARACTER.has(marker) || NOTE_CHARACTER.has(marker))) {
        if (marker === "vp") continue;
        const children: Inline[] = [];
        inline(node.content ?? [], inNote, (n) => children.push(n));
        const span = node["x-idiom"];
        if (marker === "w" && typeof span === "string") {
          // A span a translator's note covers, carried as `\w` (tools/source-conversion, LEB).
          out({ type: "span", span, content: children });
          continue;
        }
        const attributes = attributesOf(node);
        out({ type: "char", marker, content: children, ...(attributes ? { attributes } : {}) });
      } else if (node.type === "char" && marker === "vp") {
        // The published verse number: an attribute of the verse just started.
        if (verse) verse.published = textOf(node.content ?? []);
      } else if (node.type === "ref") {
        const children: Inline[] = [];
        inline(node.content ?? [], inNote, (n) => children.push(n));
        const loc = typeof node["loc"] === "string" ? { loc: node["loc"] } : undefined;
        out({
          type: "char",
          marker: "ref",
          content: children,
          ...(loc ? { attributes: loc } : {}),
        });
      } else if (node.type === "note" && NOTE.has(marker)) {
        const children: Inline[] = [];
        inline(node.content ?? [], true, (n) => children.push(n));
        // The space after the caller only separates it from the note's content.
        if (typeof children[0] === "string") children[0] = children[0].trimStart();
        const category = node["category"];
        out({
          type: "note",
          marker,
          caller: String(node["caller"] ?? "+"),
          ...(typeof category === "string" ? { category } : {}),
          content: children.filter((n) => n !== ""),
        });
      } else if (node.type === "ms" && MILESTONE.has(marker)) {
        count(`milestone ${marker}`);
        inline(node.content ?? [], inNote, out);
      } else if (node.type === "para" && HEADING.has(marker) && !inNote) {
        // usfm-grammar nests a `\lit` that follows a prose paragraph inside it (JPS Eccl 12).
        const heading: Inline[] = [];
        inline(node.content ?? [], false, (n) => heading.push(n));
        headings.push({ marker, content: tidy(heading) });
      } else {
        issue(`unknown ${node.type} ${marker}`.trim());
      }
    }
  };

  const toVerse = (nodes: readonly UsjNode[]) => inline(nodes, false, append);

  for (const node of content) {
    if (typeof node === "string") {
      if (node.trim() !== "") issue(`text outside a paragraph: ${node.slice(0, 40)}`);
      continue;
    }
    const marker = node.marker ?? "";
    const children = node.content ?? [];
    if (node.type === "book") continue;
    if (node.type === "chapter") {
      verse = undefined;
      const label = node["pubnumber"] ?? node["altnumber"];
      chapters.push({
        number: Number(node["number"]),
        ...(label || bookLabel ? { label: String(label ?? `${bookLabel} ${node["number"]}`) } : {}),
        verses: [],
      });
      continue;
    }
    if (node.type === "table") {
      for (const row of children) {
        if (typeof row === "string") continue;
        blocks.push("tr");
        toVerse(row.content ?? []);
      }
      continue;
    }
    if (node.type !== "para") {
      issue(`unknown ${node.type} ${marker}`.trim());
      continue;
    }

    if (IDENTIFICATION.has(marker)) {
      const name = NAME_MARKERS[marker];
      if (name) names[name] = textOf(children);
    } else if (INTRODUCTION.has(marker)) {
      count(`paragraph ${marker}`);
    } else if (CHAPTER_LABEL.has(marker)) {
      const chapter = chapters.at(-1);
      const text = textOf(children);
      if (!chapter) bookLabel = text;
      else if (marker !== "cd") chapter.label = text;
      else count("paragraph cd");
    } else if (HEADING.has(marker) && !children.some(isVerse)) {
      const chapter = chapters.at(-1);
      const title = chapter?.verses.length === 1 ? chapter.verses[0] : undefined;
      if (marker === "d" && book.osis === "Ps" && chapter && chapter.verses.length === 0) {
        // A Psalm heading printed before verse 1 is verse 0 (domain-model §2.1).
        verse = { chapter: chapter.number, verse: 0, headings, content: [] };
        headings = [];
        chapter.verses.push(verse);
        toVerse(children);
        verse = undefined;
      } else if (marker === "d" && title?.verse === 0 && !verse && headings.length === 0) {
        // The heading's next line (LEB Ps 51, over two lines): still verse 0.
        verse = title;
        blocks.push("d");
        toVerse(children);
        verse = undefined;
      } else {
        const heading: Inline[] = [];
        inline(children, false, (n) => heading.push(n));
        headings.push({ marker, content: tidy(heading) });
      }
    } else if (BLOCK.has(marker) || HEADING.has(marker)) {
      // `\nb`: the paragraph from before goes on (across a chapter break, or a title).
      if (marker !== "nb") blocks.push(marker);
      toVerse(children);
    } else {
      issue(`unknown paragraph marker ${marker}`);
    }
  }
  // Text after a book's last verse (an epistle's subscription, a closing musical note, the
  // verse JPS repeats at the end of Isaiah) is printed with that verse, so it goes into it.
  verse = chapters.at(-1)?.verses.at(-1);
  flushHeadings();
  if (headings.length > 0) issue("headings after the last verse");

  const tidied = chapters.map((c) => ({
    ...c,
    verses: c.verses.map((v) => ({ ...v, content: tidy(v.content) })),
  }));
  const { chapters: linked, spansWithoutNote } = linkSpanNotes(code, tidied);
  return {
    book: book.osis,
    usfm: code,
    names,
    chapters: linked,
    skipped,
    spansWithoutNote,
    issues,
  };
}

/**
 * Gives each span its note: the first note after the span's last piece, with nothing between
 * them but punctuation, spacing or the start of a line (LEB: 11,136 of 11,146 spans). A note
 * inside a span is a note on its own words, not the span's.
 */
function linkSpanNotes(
  code: string,
  chapters: readonly ImportedChapter[],
): { chapters: ImportedChapter[]; spansWithoutNote: string[] } {
  const spansWithoutNote: string[] = [];
  let open: { span: string; at: string } | undefined;
  const close = () => {
    if (open) spansWithoutNote.push(`${code} ${open.at}`);
    open = undefined;
  };
  const linked = chapters.map((chapter) => ({
    ...chapter,
    verses: chapter.verses.map((verse) => ({
      ...verse,
      content: verse.content.map((node): Inline => {
        if (typeof node === "string") {
          if (/[\p{L}\p{N}]/u.test(node)) close();
          return node;
        }
        if (node.type === "span") {
          if (open && open.span !== node.span) close();
          open = { span: node.span, at: `${verse.chapter}:${verse.verse}` };
          return node;
        }
        if (node.type === "note" && open) {
          const span = open.span;
          open = undefined;
          return { ...node, span };
        }
        if (node.type !== "block") close();
        return node;
      }),
    })),
  }));
  close();
  return { chapters: linked, spansWithoutNote };
}

const isVerse = (node: UsjNode) => typeof node !== "string" && node.type === "verse";

function attributesOf(node: UsjElement): Record<string, string> | undefined {
  const entries = Object.entries(node).filter(
    ([k, v]) => !["type", "marker", "content"].includes(k) && typeof v === "string",
  ) as [string, string][];
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** All the text in some USJ content, notes included. */
function textOf(nodes: readonly UsjNode[]): string {
  return nodes
    .map((n) => (typeof n === "string" ? n : textOf(n.content ?? [])))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapses runs of whitespace, and trims the start and end of the content. */
function tidy(content: readonly Inline[]): Inline[] {
  const collapse = (nodes: readonly Inline[]): Inline[] =>
    nodes
      .map((n) => {
        if (typeof n === "string") return n.replace(/\s+/g, " ");
        if (n.type === "block") return n;
        if (n.type === "heading") return { ...n, content: tidy(n.content) };
        return { ...n, content: collapse(n.content) };
      })
      .filter((n) => n !== "");
  const out = collapse(content);
  const firstText = out.findIndex((n) => typeof n === "string");
  if (
    firstText >= 0 &&
    out
      .slice(0, firstText)
      .every((n) => typeof n !== "string" && (n.type === "block" || n.type === "heading"))
  )
    out[firstText] = (out[firstText] as string).trimStart();
  const last = out.length - 1;
  if (typeof out[last] === "string") out[last] = (out[last] as string).trimEnd();
  return out.filter((n) => n !== "");
}

/** The verse's text without notes or markup, for search and comparison. */
export function plainText(content: readonly Inline[]): string {
  const walk = (nodes: readonly Inline[]): string =>
    nodes
      .map((n) => {
        if (typeof n === "string") return n;
        if (n.type === "note") return "";
        if (n.type === "heading") return " ";
        if (n.type === "block") return " ";
        return walk(n.content);
      })
      .join("");
  return walk(content).replace(/\s+/g, " ").trim();
}
