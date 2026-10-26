/**
 * Compares the converted text with a second witness: eBible.org's `engjps`, an independent
 * digitization of the same translation (renumbered to the KJV versification). Every difference
 * is a place to check against the scan.
 */

import { inflateRawSync } from "node:zlib";
import { NOTE_CHAR, type ParsedBook } from "./parse.ts";

/** Reads the files of a zip archive (stored or deflated entries). */
export function readZip(data: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = data.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("Not a zip archive");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const method = view.getUint16(p + 10, true);
    const compressed = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(data.subarray(p + 46, p + 46 + nameLength));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = data.subarray(start, start + compressed);
    files.set(name, method === 0 ? raw : new Uint8Array(inflateRawSync(raw)));
    p += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

const ACROSTIC_LETTER =
  /\b(ALEPH|BETH|GIMEL|DALETH|HE|VAU|VAV|ZAIN|HETH|TETH|JOD|IOD|CAPH|LAMED|MEM|NUN|SAMECH|AIN|PE|TZADE|KOPH|RESH|SHIN|SCHIN|TAU|TAV)\.\s/g;

export interface Word {
  readonly word: string;
  readonly ref: string;
  /** The first word of a verse (or of a psalm title). */
  readonly verseStart: boolean;
}

function words(text: string, ref: string, startsVerse: boolean): Word[] {
  const list = text
    .replace(new RegExp(NOTE_CHAR.source, "g"), "")
    .replace(/[\u2019']/g, "")
    // Compounds are compared without their hyphens: the witness joins or splits many of them,
    // and the printing's own hyphenation is settled from the scan (HYPHENATED_COMPOUNDS).
    .replace(/(?<=[A-Za-z])-(?=[A-Za-z])/g, "")
    .replace(/[-\u2014]/g, " ")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return list.map((word, i) => ({ word, ref, verseStart: startsVerse && i === 0 }));
}

export function bookWords(book: ParsedBook): Word[] {
  const out: Word[] = [];
  let chapter = 0;
  let verse = 0;
  let start = false;
  for (const e of book.events) {
    if (e.kind === "chapter") chapter = e.number;
    if (e.kind === "verse") {
      verse = e.number;
      start = true;
    }
    if (e.kind === "text") {
      const w = words(e.text, `${chapter}:${verse}`, start);
      out.push(...w);
      if (w.length > 0) start = false;
    }
  }
  return out;
}

export function usfmWords(usfm: string): Word[] {
  const out: Word[] = [];
  let chapter = 0;
  let verse = 0;
  let start = false;
  for (const rawLine of usfm.split("\n")) {
    const line = rawLine.replace(/\\f .*?\\f\*/g, "").replace(/\\x .*?\\x\*/g, "");
    const c = /^\\c (\d+)/.exec(line);
    if (c) {
      chapter = Number(c[1]);
      verse = 0;
      continue;
    }
    if (/^\\(id|ide|h|toc\d|mt\d|ms\d?|rem|usfm|s\d?|r)\b/.test(line)) continue;
    if (/^\\d\b/.test(line)) start = true;
    // eBible marks where the original (Hebrew) verses start inside its renumbered ones: "(3-2)".
    for (const part of line.split(/(\\v \d+|\(\d+-\d+\))/)) {
      if (/^\(\d+-\d+\)$/.test(part)) {
        start = true;
        continue;
      }
      const v = /^\\v (\d+)/.exec(part);
      if (v) {
        verse = Number(v[1]);
        start = true;
        continue;
      }
      // Leave out what the witness adds to the text: Psalms' "BOOK I" and the acrostic letters
      // of Psalm 119, which the printing sets as headings.
      const text = part
        .replace(/\\\+?[a-z]+\d?\*?/g, " ")
        .replace(/\bBOOK (I|II|III|IV|V)\b/g, " ")
        .replace(ACROSTIC_LETTER, " ");
      const w = words(text, `${chapter}:${verse}`, start);
      out.push(...w);
      if (w.length > 0) start = false;
    }
  }
  return out;
}

export interface Difference {
  readonly ours: readonly Word[];
  readonly theirs: readonly Word[];
  /** Reference near the difference in our numbering, and in the witness's. */
  readonly ref: string;
  readonly witnessRef: string;
  /** A few of our words on either side, to find the place on the scan. */
  readonly before: string;
  readonly after: string;
}

export interface Comparison {
  readonly differences: readonly Difference[];
  /** For each of our words that matches a witness word, the witness word's index (else -1). */
  readonly alignment: Int32Array;
}

/** Myers' diff over two word lists: the runs that differ, and how the matching words align. */
export function diffWords(a: readonly Word[], b: readonly Word[]): Comparison {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && (v[offset + k - 1] as number) < (v[offset + k + 1] as number))
          ? (v[offset + k + 1] as number)
          : (v[offset + k - 1] as number) + 1;
      let y = x - k;
      while (x < n && y < m && a[x]?.word === b[y]?.word) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= n && y >= m) {
        found = true;
        break;
      }
    }
  }
  // Walk the trace back to recover the edit script.
  const edits: { kind: "same" | "del" | "ins"; i: number; j: number }[] = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d >= 0; d--) {
    const vd = trace[d] as Int32Array;
    const k = x - y;
    const prevK =
      k === -d || (k !== d && (vd[offset + k - 1] as number) < (vd[offset + k + 1] as number))
        ? k + 1
        : k - 1;
    const prevX = vd[offset + prevK] as number;
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      edits.push({ kind: "same", i: x - 1, j: y - 1 });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) edits.push({ kind: "ins", i: x, j: y - 1 });
      else edits.push({ kind: "del", i: x - 1, j: y });
    }
    x = prevX;
    y = prevY;
  }
  edits.reverse();
  const alignment = new Int32Array(n).fill(-1);
  for (const e of edits) if (e.kind === "same") alignment[e.i] = e.j;
  const diffs: Difference[] = [];
  let ours: Word[] = [];
  let theirs: Word[] = [];
  let at = { i: 0, j: 0 };
  const close = () => {
    if (ours.length === 0 && theirs.length === 0) return;
    const end = at.i + ours.length;
    diffs.push({
      ours,
      theirs,
      before: a
        .slice(Math.max(0, at.i - 4), at.i)
        .map((w) => w.word)
        .join(" "),
      after: a
        .slice(end, end + 4)
        .map((w) => w.word)
        .join(" "),
      ref: (ours[0] ?? a[at.i] ?? a[at.i - 1])?.ref ?? "end",
      witnessRef: (theirs[0] ?? b[at.j] ?? b[at.j - 1])?.ref ?? "end",
    });
    ours = [];
    theirs = [];
  };
  for (const e of edits) {
    if (e.kind === "same") {
      close();
      at = { i: e.i + 1, j: e.j + 1 };
    } else if (e.kind === "del") ours.push(a[e.i] as Word);
    else theirs.push(b[e.j] as Word);
  }
  close();
  return { differences: diffs, alignment };
}

/** Our verse starts that don't fall on a verse start in the witness. */
export function boundaryMismatches(
  a: readonly Word[],
  b: readonly Word[],
  alignment: Int32Array,
): string[] {
  const out: string[] = [];
  a.forEach((w, i) => {
    const j = alignment[i] as number;
    if (w.verseStart && j >= 0 && !b[j]?.verseStart) out.push(`${w.ref} (witness ${b[j]?.ref})`);
  });
  return out;
}
