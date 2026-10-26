// cspell:ignore athe agotten
/**
 * Parses Open Siddur's plain-text JPS 1917 (a conversion of JPS's PDF) into books, chapters
 * and verses.
 *
 * The transcription keeps the PDF's layout: narrow column lines, page numbers and form feeds,
 * footnotes at the foot of each column, verse numbers glued to the first word ("2Now"), and no
 * chapter numbers (a chapter starts with an unnumbered first verse). Hebrew characters were lost
 * in the conversion and appear as runs of dots.
 */

import { BOOKS, type BookInfo, SECTION_TITLES } from "./books.ts";
import { SOFT_HYPHEN } from "./hyphens.ts";

export type Event =
  | { readonly kind: "chapter"; readonly number: number }
  | { readonly kind: "verse"; readonly number: number }
  /** Start of a paragraph (`p`), poetic line (`q`) or psalm title (`d`); `stanza` marks extra space before it. */
  | { readonly kind: "break"; style: "p" | "q" | "d"; readonly stanza: boolean }
  | { readonly kind: "text"; readonly text: string }
  /**
   * A heading between verses: a weekly Torah portion (`s2`), a psalm book division (`ms1` Hebrew,
   * `ms2` English) or an acrostic letter heading in Psalm 119 (`qa`).
   */
  | { readonly kind: "heading"; readonly style: HeadingStyle; readonly text: string }
  /** An acrostic letter printed in the margin beside a verse or line. */
  | { readonly kind: "acrostic"; readonly letter: string }
  /** Hebrew in the printing that the transcription lost (a run of dots). */
  | { readonly kind: "lost-hebrew"; readonly source: string }
  /** A verse the printing repeats after a book's last verse, as read in the synagogue. */
  | { readonly kind: "repeat"; readonly text: string };

export type HeadingStyle = "s2" | "ms1" | "ms2" | "qa";

export interface Note {
  readonly caller: string;
  readonly text: string;
}

export interface ParsedBook {
  readonly info: BookInfo;
  readonly events: readonly Event[];
  /** Footnotes; the text refers to note `i` with the character `noteChar(i)`. */
  readonly notes: readonly Note[];
  readonly issues: readonly string[];
}

/** Notes are referenced from text by one private-use character each. */
export function noteChar(index: number): string {
  return String.fromCharCode(0xe000 + index);
}
export const NOTE_CHAR = /[-]/;

const VERSE_NUMBER = /(?<!\d)(\d{1,3})(?=\s?[A-Za-z\u2018\u2019\u201c"'([\u2014-])/g;
const NOTE_LINE = /^[a-z] [A-Z(\u2018[]/;
const PSALM_BOOK = /^BOOK (I|II|III|IV|V)$/;
const ACROSTIC = /^\.\s*([A-Z]+)\.$/;
const LOST_HEBREW = /^[.\s]*\.[.\s]*$/;
const SENTENCE_END = /[.!?][\u2019\u201d'\])]*$/;
const PSALM_TITLE =
  /^(\[?A )?(Psalm|Song|Prayer|Maschil|Michtam|Shiggaion)\b|^For the Leader|^\[?(Of|A Psalm of|A Song of) (David|Solomon|Asaph|the sons of Korah|Moses)/;

type LineKind =
  | { kind: "text"; text: string }
  | { kind: "gap"; space: boolean }
  | { kind: "page" }
  | { kind: "chapter-number"; number: number }
  | { kind: "heading"; style: HeadingStyle; text: string }
  | { kind: "lost-hebrew"; source: string };

interface Block {
  lines: string[];
  /** What separated this block from the previous one. */
  gap: "none" | "line" | "space" | "page" | "note";
}

type Item =
  | { kind: "block"; block: Block }
  | { kind: "note"; caller: string; text: string }
  | { kind: "chapter-number"; number: number }
  | { kind: "heading"; style: HeadingStyle; text: string }
  | { kind: "lost-hebrew"; source: string };

/** Finds each book's lines: from its heading to the next book's heading or a section title. */
export function splitBooks(text: string): { info: BookInfo; lines: string[] }[] {
  const lines = text.split("\n");
  const isHeading = (i: number, heading: string) => lines[i]?.trim() === heading;
  const nextTextLine = (i: number) => {
    let j = i + 1;
    while (j < lines.length && (lines[j] ?? "").replace(/\f/g, "").trim() === "") j++;
    return (lines[j] ?? "").trim();
  };
  const allHeadings = new Set([...BOOKS.map((b) => b.heading), ...SECTION_TITLES]);
  const starts: number[] = [];
  let cursor = 0;
  for (const book of BOOKS) {
    let found = -1;
    for (let i = cursor; i < lines.length; i++) {
      // A contents list names the books one after another; a book's own heading is followed by text.
      if (isHeading(i, book.heading) && !allHeadings.has(nextTextLine(i))) {
        found = i;
        break;
      }
    }
    if (found < 0) throw new Error(`Book heading not found: ${book.heading}`);
    starts.push(found);
    cursor = found + 1;
  }
  return BOOKS.map((info, k) => {
    const start = (starts[k] as number) + 1;
    let end = starts[k + 1] ?? lines.length;
    for (let i = start; i < end; i++) {
      if (SECTION_TITLES.includes((lines[i] ?? "").trim())) {
        end = i;
        break;
      }
    }
    return { info, lines: lines.slice(start, end) };
  });
}

function classifyLines(lines: readonly string[]): LineKind[] {
  const out: LineKind[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] as string;
    if (raw.includes("\f")) {
      out.push({ kind: "page" });
      const rest = raw.replace(/\f/g, "");
      if (rest.trim() !== "") out.push({ kind: "text", text: rest.trim() });
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === "") {
      out.push({ kind: "gap", space: raw !== "" });
      continue;
    }
    // A page number: a line holding only a number, with only blank lines before the next form feed.
    if (/^\d+$/.test(trimmed)) {
      let j = i + 1;
      while (
        j < lines.length &&
        (lines[j] as string).trim() === "" &&
        !(lines[j] as string).includes("\f")
      )
        j++;
      if (j >= lines.length || (lines[j] as string).includes("\f")) {
        out.push({ kind: "page" });
        continue;
      }
      // Most chapter numbers were lost, but some survive as a number on a line of its own,
      // set off by blank lines and followed by text.
      const next = (lines[j] as string).trim();
      if (j > i + 1 && (lines[i - 1] ?? "").trim() === "" && !/^\d+$/.test(next)) {
        out.push({ kind: "chapter-number", number: Number(trimmed) });
        continue;
      }
      // Other lone numbers (pairs of figures beside a chapter opening) are layout, not text.
      if (/^\d+$/.test(next)) continue;
    }
    const psalmBook = PSALM_BOOK.exec(trimmed);
    if (psalmBook) {
      out.push({ kind: "heading", style: "ms2", text: `BOOK ${psalmBook[1]}` });
      continue;
    }
    const acrostic = ACROSTIC.exec(trimmed);
    if (acrostic) {
      out.push({ kind: "heading", style: "qa", text: `${acrostic[1]}.` });
      continue;
    }
    if (LOST_HEBREW.test(trimmed)) {
      out.push({ kind: "lost-hebrew", source: trimmed });
      continue;
    }
    // An acrostic letter in the margin, lost to a dot before the line's text.
    const marginLetter = /^(\.{1,2})\s+(?=[^.\s])/.exec(trimmed);
    if (marginLetter) {
      out.push({ kind: "lost-hebrew", source: marginLetter[1] as string });
      out.push({ kind: "text", text: trimmed.slice(marginLetter[0].length) });
      continue;
    }
    out.push({ kind: "text", text: trimmed });
  }
  return out;
}

/** Groups lines into blocks, footnotes and headings. */
function toItems(kinds: readonly LineKind[]): Item[] {
  const items: Item[] = [];
  let current: Block | null = null;
  let gap: Block["gap"] = "none";
  // A page break inside a paragraph: text, page number, form feed, then the paragraph goes on.
  let continuesAcrossPage = false;
  const close = () => {
    if (current) items.push({ kind: "block", block: current });
    current = null;
  };
  for (const k of kinds) {
    switch (k.kind) {
      case "text":
        if (current) {
          current.lines.push(k.text);
        } else if (continuesAcrossPage && items.at(-1)?.kind === "block") {
          const last = items.pop() as { kind: "block"; block: Block };
          current = last.block;
          current.lines.push(k.text);
        } else {
          current = { lines: [k.text], gap };
        }
        continuesAcrossPage = false;
        gap = "line";
        break;
      case "gap":
        close();
        continuesAcrossPage = false;
        if (k.space) gap = "space";
        else if (gap !== "space") gap = "line";
        break;
      case "page":
        continuesAcrossPage = current !== null;
        close();
        gap = "page";
        break;
      case "heading":
      case "lost-hebrew":
      case "chapter-number":
        close();
        continuesAcrossPage = false;
        items.push(k);
        break;
    }
  }
  close();

  // Footnote blocks: "a Heb. Hiddekel." at the foot of a column.
  const out: Item[] = [];
  let afterNote = false;
  for (const item of items) {
    if (item.kind === "block" && NOTE_LINE.test(item.block.lines[0] as string)) {
      const text = joinLines(item.block.lines);
      out.push({ kind: "note", caller: text[0] as string, text: text.slice(2).trim() });
      afterNote = true;
      continue;
    }
    if (item.kind === "block" && afterNote && item.block.gap !== "page") item.block.gap = "note";
    afterNote = false;
    out.push(item);
  }

  // A word broken at a line end whose second half comes after a footnote or column break.
  let last: Block | undefined;
  return out.filter((item) => {
    if (item.kind !== "block") return true;
    const end = last?.lines.at(-1) ?? "";
    const next = item.block.lines[0] as string;
    if (last && (/\u00ad$/.test(end) || (/[A-Za-z]-$/.test(end) && /^[A-Za-z]/.test(next)))) {
      last.lines.push(...item.block.lines);
      return false;
    }
    last = item.block;
    return true;
  });
}

/** Joins a block's lines: no space after a hyphen or dash at a line end, or between split digits. */
export function joinLines(lines: readonly string[]): string {
  let s = "";
  for (const line of lines) {
    if (s === "") s = line;
    else if (s.endsWith(SOFT_HYPHEN)) s = s.slice(0, -1) + line;
    else if (
      s.endsWith("-") ||
      s.endsWith("\u2014") ||
      (/\d/.test(s.at(-1) ?? "") && /^\d/.test(line))
    )
      s += line;
    else s += ` ${line}`;
  }
  // A possessive whose following space was lost in the conversion: "sons’wives".
  return s.replace(/s\u2019(?=[a-z])(?!s\b)/g, "s\u2019 ").replace(/ {2,}/g, " ");
}

/** Marks poetry: runs of three or more short blocks are poetic lines. */
function markPoetry(blocks: readonly Block[]): Set<Block> {
  const poetic = new Set<Block>();
  let run: Block[] = [];
  const flush = () => {
    if (run.length >= 3) for (const b of run) poetic.add(b);
    run = [];
  };
  for (const b of blocks) {
    if (b.lines.length <= 3) run.push(b);
    else flush();
  }
  flush();
  return poetic;
}

/**
 * Attaches each footnote to its caller: the nearest earlier word that carries the note's letter,
 * or failing that the nearest later one (a note at the foot of a column can come before its caller
 * in the transcription).
 */
function attachNotes(
  items: Item[],
  vocabulary: ReadonlyMap<string, number>,
): { notes: Note[]; issues: string[] } {
  const notes: Note[] = [];
  const issues: string[] = [];
  const texts: { block: Block; joined: string }[] = [];
  const noteAt: { caller: string; text: string; position: number }[] = [];
  for (const item of items) {
    if (item.kind === "block")
      texts.push({ block: item.block, joined: joinLines(item.block.lines) });
    else if (item.kind === "note")
      noteAt.push({ caller: item.caller, text: item.text, position: texts.length });
  }

  const findCaller = (joined: string, caller: string) => {
    const pattern = new RegExp(
      `(?<![A-Za-z\\u2019'\\ue000-\\uefff])${caller}(?=([A-Za-z\\u2018\\u201c(\\u2014\\u05d0-\\u05ea]+|\\d))`,
      "g",
    );
    return [...joined.matchAll(pattern)].filter((m) => {
      const rest = m[1] as string;
      // A bracketed passage carries its caller inside the bracket: "[a36And", "[,band".
      if (/\[,?$/.test(joined.slice(0, m.index))) return true;
      if (/^\d/.test(rest)) return false;
      if (/^[A-Z\u2018\u201c(\u2014\u05d0-\u05ea]/.test(rest)) return true;
      // Glued to a lower-case word ("athe River"): the glued form must be much rarer than the word.
      const glued = vocabulary.get((caller + rest).toLowerCase()) ?? 0;
      const word = vocabulary.get(rest.toLowerCase()) ?? 0;
      return word >= 2 && glued <= Math.max(2, word / 200);
    });
  };

  for (const note of noteAt) {
    const index = notes.length;
    notes.push({ caller: note.caller, text: note.text });
    const order: number[] = [];
    for (let t = note.position - 1; t >= 0 && t >= note.position - 60; t--) order.push(t);
    for (let t = note.position; t < texts.length && t < note.position + 30; t++) order.push(t);
    let attached = false;
    for (const t of order) {
      const entry = texts[t] as { block: Block; joined: string };
      const found = findCaller(entry.joined, note.caller);
      // A caller before a capital or bracket is surer than one glued to a lower-case word.
      const sure = found.filter((m) => !/^[a-z]/.test(m[1] as string));
      const pick = sure.length > 0 ? sure : found;
      // Before the note, the nearest caller is the last in the block; after it, the first.
      const m = t < note.position ? pick.at(-1) : pick[0];
      if (m?.index === undefined) continue;
      // The printing sometimes gives one note two callers close together ("aBelial … aSheol").
      const at = m.index;
      const also = sure.filter((o) => o.index !== at && Math.abs((o.index ?? 0) - at) < 120);
      for (const o of [m, ...also].sort((x, y) => (y.index ?? 0) - (x.index ?? 0))) {
        const i = o.index ?? 0;
        entry.joined = entry.joined.slice(0, i) + noteChar(index) + entry.joined.slice(i + 1);
      }
      // In poetry the second caller is on a neighboring line.
      for (const n of [t - 1, t + 1]) {
        const near = texts[n];
        if (!near || near.joined.length > 120 || entry.joined.length > 120) continue;
        for (const o of findCaller(near.joined, note.caller).filter((x) =>
          /^[A-Z]/.test(x[1] as string),
        )) {
          const i = o.index ?? 0;
          near.joined = near.joined.slice(0, i) + noteChar(index) + near.joined.slice(i + 1);
        }
      }
      attached = true;
      break;
    }
    if (!attached) issues.push(`note ${note.caller} "${note.text}" has no caller in the text`);
  }
  for (const entry of texts) entry.block.lines = [entry.joined];
  return { notes, issues };
}

/** Word counts, used to tell a footnote caller glued to a word ("agotten") from a real word. */
function buildVocabulary(lines: readonly string[]): Map<string, number> {
  const vocabulary = new Map<string, number>();
  for (const w of lines
    .join(" ")
    .toLowerCase()
    .match(/[a-z]+/g) ?? []) {
    vocabulary.set(w, (vocabulary.get(w) ?? 0) + 1);
  }
  return vocabulary;
}

interface Pending {
  readonly events: Event[];
  /** Text that starts a block, so it can start a chapter. */
  readonly startsBlock: boolean;
  /** The block follows a stanza space, which in poetry also separates chapters. */
  readonly afterSpace?: boolean;
  readonly poetic?: boolean;
  /** Number of source lines in the block. */
  readonly lineCount?: number;
  readonly text: string;
}

/** Parses one book's lines into events. `chapterStarts` overrides where a chapter's first verse begins. */
export function parseBook(
  info: BookInfo,
  lines: readonly string[],
  chapterStarts: ReadonlyMap<string, string> = new Map(),
  vocabulary: ReadonlyMap<string, number> = buildVocabulary(lines),
): ParsedBook {
  const items = toItems(classifyLines(lines));
  // Poetry is judged on the original line layout, before footnote callers are resolved.
  const poetic = markPoetry(items.flatMap((i) => (i.kind === "block" ? [i.block] : [])));
  const { notes, issues } = attachNotes(items, vocabulary);

  const events: Event[] = [];
  let chapter = 0;
  let verse = 0;
  let pending: Pending[] = [];

  const startChapter = () => {
    chapter++;
    verse = 0;
    events.push({ kind: "chapter", number: chapter });
  };
  const flushPending = (upTo = pending.length) => {
    for (const p of pending.slice(0, upTo)) events.push(...p.events);
    pending = pending.slice(upTo);
  };
  const chooseChapterStart = (): number => {
    const candidates = pending.map((p, i) => (p.startsBlock ? i : -1)).filter((i) => i >= 0);
    const override = chapterStarts.get(`${info.code} ${chapter + 1}`);
    if (override) {
      const hit = candidates.findLast((i) =>
        (pending[i] as Pending).text.replace(/^[\u2018\u2019\u201c"']/, "").startsWith(override),
      );
      if (hit !== undefined) return hit;
      issues.push(`${info.code} ${chapter + 1}: chapter-start override "${override}" not found`);
    }
    if (info.code === "PSA") {
      const title = candidates.find((i) => PSALM_TITLE.test((pending[i] as Pending).text));
      if (title !== undefined) return title;
    }
    // In poetry a chapter starts after a space; failing that, at the first block after the end
    // of a sentence.
    const at = (i: number) => pending[i] as Pending;
    // A chapter that changes from poetry to prose starts with the prose.
    const prose = candidates.findLast((i) => !at(i).poetic);
    if (prose !== undefined && candidates.some((i) => i < prose && at(i).poetic)) return prose;
    const afterSpace = candidates.findLast((i) => at(i).afterSpace);
    if (afterSpace !== undefined) {
      // A one-line superscription ("The burden of Moab.", "Hallelujah.") set off by its own
      // space belongs to the new chapter.
      const n = candidates.indexOf(afterSpace);
      const before = candidates[n - 1];
      if (
        before !== undefined &&
        at(before).afterSpace &&
        at(before).lineCount === 1 &&
        /^[A-Z][^.!?]{0,60}\.$/.test(at(before).text)
      )
        return before;
      return afterSpace;
    }
    const afterSentence = candidates.find((i) => SENTENCE_END.test(textBefore(i)));
    return afterSentence ?? candidates.at(-1) ?? pending.length;
  };
  const lastText = (evs: readonly Event[]): string | undefined => {
    for (let k = evs.length - 1; k >= 0; k--) {
      const e = evs[k] as Event;
      if (e.kind === "text") return e.text;
    }
    return undefined;
  };
  const textBefore = (i: number): string => {
    for (let k = i - 1; k >= 0; k--) {
      const t = lastText((pending[k] as Pending).events);
      if (t !== undefined) return t;
    }
    return lastText(events) ?? "";
  };
  const beginNewChapter = () => {
    let k = chooseChapterStart();
    // Headings just before the first verse belong to the new chapter.
    while (
      k > 0 &&
      (pending[k - 1] as Pending).events.every(
        (e) => e.kind === "heading" || e.kind === "lost-hebrew",
      )
    )
      k--;
    flushPending(k);
    startChapter();
    verse = 1;
    const first = pending.findIndex((p) => p.startsBlock);
    pending.forEach((p, i) => {
      if (i === first) {
        const at = p.events.findIndex((e) => e.kind === "text");
        p.events.splice(at, 0, { kind: "verse", number: 1 });
      }
    });
    if (first < 0) issues.push(`${info.code} ${chapter}:1 is missing`);
    flushPending();
  };

  const previousBlock = new Map<Block, Block>();
  let prev: Block | undefined;
  for (const item of items) {
    if (item.kind !== "block") continue;
    if (prev) previousBlock.set(item.block, prev);
    prev = item.block;
  }

  // A surviving chapter number: the next block starts that chapter. Only the next chapter's
  // number counts; a stray number (a column's running figure) is ignored.
  let numberedChapter: number | undefined;

  for (const item of items) {
    if (item.kind === "note") continue;
    if (item.kind === "chapter-number") {
      flushPending();
      numberedChapter = item.number;
      continue;
    }
    if (item.kind === "heading") {
      pending.push({
        events: [{ kind: "heading", style: item.style, text: item.text }],
        startsBlock: false,
        text: "",
      });
      continue;
    }
    if (item.kind === "lost-hebrew") {
      pending.push({
        events: [{ kind: "lost-hebrew", source: item.source }],
        startsBlock: false,
        text: "",
      });
      continue;
    }
    const block = item.block;
    const text = block.lines.join(" ");
    const brk: Event = {
      kind: "break",
      style: poetic.has(block) ? "q" : "p",
      stanza: block.gap === "space",
    };
    // A paragraph that only continues across a footnote or a column break isn't a new paragraph.
    // (One that runs across a page break was already joined in toItems.)
    const before = previousBlock.get(block)?.lines.join(" ").trimEnd() ?? "";
    const midSentence = before !== "" && !/[.!?\u2019\u201d'":;\u2014]$/.test(before);
    const continuation =
      /^[a-z]/.test(text) || (midSentence && (block.gap === "note" || !poetic.has(block)));
    const parts = text.split(VERSE_NUMBER);
    const lead = (parts[0] as string).trim();
    let breakEmitted = false;
    if (lead !== "") {
      const evs: Event[] = continuation && chapter > 0 ? [] : [brk];
      evs.push({ kind: "text", text: lead });
      if (numberedChapter === chapter + 1 && !midSentence) {
        flushPending();
        startChapter();
        events.push(brk, { kind: "verse", number: 1 }, { kind: "text", text: lead });
        verse = 1;
      } else if (chapter === 0) {
        startChapter();
        // Headings before the first verse (a psalm book, a margin letter) belong to chapter 1.
        flushPending();
        events.push(brk, { kind: "verse", number: 1 }, { kind: "text", text: lead });
        verse = 1;
      } else {
        pending.push({
          events: evs,
          startsBlock: !continuation,
          afterSpace: block.gap === "space",
          poetic: poetic.has(block),
          lineCount: block.lines.length,
          text: lead,
        });
      }
      breakEmitted = true;
    }
    numberedChapter = undefined;
    for (let p = 1; p < parts.length; p += 2) {
      const n = Number(parts[p]);
      const body = (parts[p + 1] as string).trim();
      if (n === 1 && verse > 1) {
        flushPending();
        startChapter();
      } else if (n === 2 && verse !== 1 && chapter > 0) {
        beginNewChapter();
      } else {
        flushPending();
      }
      if (n !== verse + 1)
        issues.push(`${info.code} ${chapter}: verse ${n} follows verse ${verse}`);
      if (!breakEmitted) {
        if (!continuation) events.push(brk);
        breakEmitted = true;
      }
      events.push({ kind: "verse", number: n }, { kind: "text", text: body });
      verse = n;
    }
  }
  flushPending();

  markPsalmTitles(info, events);
  markRepeatedLastVerse(info, events);
  issues.push(...checkCounts(info, events));
  return { info, events, notes, issues };
}

/** In Psalms, a title at the start of verse 1 is set as a `d` paragraph. */
function markPsalmTitles(info: BookInfo, events: Event[]): void {
  if (info.code !== "PSA") return;
  for (let i = 0; i < events.length; i++) {
    const e = events[i] as Event;
    if (e.kind !== "verse" || e.number !== 1) continue;
    const next = events[i + 1];
    const prev = events[i - 1];
    if (next?.kind === "text" && PSALM_TITLE.test(next.text) && prev?.kind === "break")
      prev.style = "d";
  }
}

const wordsOf = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

/** The printing repeats the second-to-last verse after the last in Isaiah, Malachi, Lamentations and Ecclesiastes. */
function markRepeatedLastVerse(info: BookInfo, events: Event[]): void {
  if (!["ISA", "MAL", "LAM", "ECC"].includes(info.code)) return;
  // The printing repeats the second-last verse after the last, as read in the synagogue.
  const lastVerse = events.findLastIndex((e) => e.kind === "verse");
  const previous = events.findLastIndex((e, i) => i < lastVerse && e.kind === "verse");
  if (previous < 0) return;
  const textOf = (from: number, to: number) =>
    events
      .slice(from, to)
      .flatMap((e) => (e.kind === "text" ? [e.text] : []))
      .join(" ");
  const earlier = wordsOf(textOf(previous, lastVerse));
  for (let b = lastVerse + 1; b < events.length; b++) {
    if (events[b]?.kind !== "break") continue;
    const repeated = textOf(b, events.length);
    // The repetition can differ slightly ("Turn Thou us" / "Turn us" in Lamentations).
    if (similar(wordsOf(repeated), earlier)) {
      events.splice(b, events.length - b, { kind: "repeat", text: repeated });
      return;
    }
  }
}

/** Word sequences that share at least 90% of their words, in order. */
function similar(a: readonly string[], b: readonly string[]): boolean {
  const lcs: number[] = new Array(b.length + 1).fill(0);
  for (const x of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const above = lcs[j] as number;
      lcs[j] = x === b[j - 1] ? diagonal + 1 : Math.max(above, lcs[j - 1] as number);
      diagonal = above;
    }
  }
  return (lcs[b.length] as number) >= 0.9 * Math.max(a.length, b.length);
}

function checkCounts(info: BookInfo, events: readonly Event[]): string[] {
  const issues: string[] = [];
  const counts: number[] = [];
  for (const e of events) {
    if (e.kind === "chapter") counts.push(0);
    if (e.kind === "verse") counts[counts.length - 1] = e.number;
  }
  if (counts.length !== info.chapters.length) {
    issues.push(`${info.code}: ${counts.length} chapters, expected ${info.chapters.length}`);
  }
  counts.forEach((n, i) => {
    const expected = info.chapters[i];
    if (expected !== undefined && n !== expected)
      issues.push(`${info.code} ${i + 1}: ${n} verses, expected ${expected}`);
  });
  return issues;
}

/** Parses the whole transcription. */
export function parseTranscription(
  text: string,
  chapterStarts?: ReadonlyMap<string, string>,
): ParsedBook[] {
  const books = splitBooks(text);
  const vocabulary = buildVocabulary(books.flatMap((b) => b.lines));
  return books.map(({ info, lines }) => parseBook(info, lines, chapterStarts, vocabulary));
}
