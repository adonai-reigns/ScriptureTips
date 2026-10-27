/**
 * Checks that the conversion keeps every word: the text of a `<book>` in LEB.xml against the
 * USFM written for it. Words are runs of letters; verse numbers, punctuation and spacing are
 * left out.
 */

import type { XmlElement, XmlNode } from "./xml.ts";

const words = (text: string): string[] => text.match(/[\p{L}\p{M}]+/gu) ?? [];

/** The words of an LEB book: all its text, notes included, verse numbers ("title") left out. */
export function xmlWords(book: XmlElement): string[] {
  const out: string[] = [];
  const walk = (nodes: readonly XmlNode[]) => {
    for (const node of nodes) {
      if (typeof node === "string") out.push(...words(node));
      else if (node.name !== "verse-number") walk(node.children);
    }
  };
  walk(book.children);
  return out;
}

/** The words of LEB USFM: markers, attributes, note callers and categories removed. */
export function usfmWords(usfm: string): string[] {
  const text = usfm
    .replace(/^\\id .*$/m, " ")
    .replace(/^\\(?:usfm|ide) .*$/gm, " ")
    .replace(/\\cat\s[^\\]*\\cat\*/g, " ")
    .replace(/\\(?:c|v)\s+\S+/g, " ")
    .replace(/\\f\s+\+/g, " ")
    .replace(/\|[^\\]*/g, " ")
    .replace(/\\\+?[a-z0-9]+\*?/g, " ");
  return words(text);
}

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
