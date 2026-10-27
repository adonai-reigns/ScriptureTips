/**
 * Checks that no words are lost: the USFM source against usfm-grammar's USJ (which once emptied
 * a whole `\qs` span), and the USJ against the verse records the import keeps. Words are runs
 * of letters; numbers, punctuation and spacing are left out of the comparison.
 */

import type { ImportedBook, Inline } from "./book.ts";
import { CHAPTER_LABEL, IDENTIFICATION, INTRODUCTION } from "./markers.ts";
import { markHeadingBars, type UsjElement, type UsjNode } from "./usj.ts";

const words = (text: string): string[] => text.match(/[\p{L}\p{M}]+/gu) ?? [];

/** The words of a USFM file: markers, attributes, numbers and note callers removed. */
export function usfmWords(usfm: string): string[] {
  // A `|` in a heading can be text (`markHeadingBars`); elsewhere it starts attributes.
  const text = markHeadingBars(usfm)
    .replace(/\\id\s+\S+/g, " ")
    .replace(/\\(?:ca|va|vp)\s[^\\]*\\(?:ca|va|vp)\*/g, " ")
    .replace(/\\(?:c|v)\s+\S+/g, " ")
    .replace(/\\(?:f|fe|ef|x|ex)\s+\S/g, " ")
    .replace(/\|[^\\]*/g, " ")
    .replace(/\\[a-z0-9+-]+\*?/g, " ");
  return words(text);
}

/** The words of USJ content. `keep` decides which paragraphs count. */
export function usjWords(
  nodes: readonly UsjNode[],
  keep: (node: UsjElement) => boolean = () => true,
): string[] {
  const out: string[] = [];
  const walk = (list: readonly UsjNode[]) => {
    for (const node of list) {
      if (typeof node === "string") out.push(...words(node));
      else if (keep(node)) walk(node.content ?? []);
    }
  };
  walk(nodes);
  return out;
}

/** The words of the verses and headings an imported book keeps, notes included. */
export function bookWords(book: ImportedBook): string[] {
  const out: string[] = [];
  const walk = (list: readonly Inline[]) => {
    for (const node of list) {
      if (typeof node === "string") out.push(...words(node));
      else if (node.type !== "block") walk(node.content);
    }
  };
  for (const chapter of book.chapters) {
    for (const verse of chapter.verses) {
      for (const heading of verse.headings) walk(heading.content);
      walk(verse.content);
    }
  }
  return out;
}

/** Paragraphs of verse text and headings: what `bookWords` should hold, from the USJ. */
export const isVerseText = (node: UsjElement): boolean =>
  node.type !== "book" &&
  !(
    node.type === "para" &&
    (IDENTIFICATION.has(node.marker ?? "") ||
      INTRODUCTION.has(node.marker ?? "") ||
      CHAPTER_LABEL.has(node.marker ?? ""))
  ) &&
  !(node.type === "char" && node.marker === "vp");

/** The first place two word lists differ, or undefined if they're the same. */
export function firstDifference(
  expected: readonly string[],
  actual: readonly string[],
): string | undefined {
  const n = Math.max(expected.length, actual.length);
  for (let i = 0; i < n; i++) {
    if (expected[i] !== actual[i]) {
      const around = (list: readonly string[]) => list.slice(Math.max(0, i - 4), i + 4).join(" ");
      return `word ${i}: expected "${around(expected)}", found "${around(actual)}"`;
    }
  }
  return undefined;
}
