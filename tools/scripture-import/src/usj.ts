/**
 * USFM → USJ (the JSON form of USFM) through usfm-grammar, with the normalizations its grammar
 * needs for our files (`normalizeUsfm`).
 */

import grammar from "usfm-grammar";

/** A USJ node: a string, or an object with a type, a marker, content and attributes. */
export type UsjNode = string | UsjElement;

export interface UsjElement {
  readonly type: string;
  readonly marker?: string;
  readonly content?: readonly UsjNode[];
  readonly [attribute: string]: unknown;
}

export interface Normalization {
  readonly rule: string;
  readonly count: number;
}

/**
 * Adjustments usfm-grammar needs, each kept to the smallest span and listed in the report.
 *
 * - It accepts no nested character marker inside `\qs` (the "Selah" span), and empties the span
 *   if it meets one. WEB editions write `\qs \+w Selah|strong="H5542"\+w*.\qs*`, which is
 *   valid USFM. Inside `\qs` only, the nested markers are unwrapped and their text kept; what
 *   is lost is the word's attributes (the Strong's number on "Selah").
 * - It moves a `\ref` in a `\r` heading out of the paragraph, after it. The BSB writes
 *   `\r (\ref John 1:1–5|JHN 1:1-5\ref*)`. In `\r` lines only, the reference is unwrapped and
 *   its text kept; what is lost is the link target (the heading is itself a reference).
 * - It accepts no verse number inside a character span. The BSB writes the words of Jesus as
 *   `\wj \v 39 “Come and see,”\wj*`, and runs a span on across verses. The span is closed
 *   before each verse number and reopened after it; nothing is lost.
 * - It accepts no verse number inside a `\d` title. The BSB, the KJV and others write a Psalm
 *   title that is part of verse 1 as `\d \v 1 A Psalm of David.`, and JPS some across two
 *   verses (`\d \v 1 For the Leader … \v 2 when Nathan …`). Each verse number is moved to a
 *   `\nb` (no new paragraph) before its part of the title, so each part stays in its verse, as
 *   the translation numbers it; nothing is lost.
 * - The BSB writes the musical note closing Habakkuk 3 as `\mr`, which is a heading for a range
 *   of references and must follow `\ms`. Outside that place `\mr` becomes `\qd`, the marker for
 *   a Hebrew note at the end of a poem; nothing is lost.
 * - It accepts no `\+fl` left open in a note. The NET writes `(so \fl KJV\ft , \+fl NASB\ft ,`;
 *   an open `\+fl` there becomes `\fl`, as in the same note's first item; nothing is lost.
 * - It accepts no heading before the first `\c`. The NET writes `\ms1 I. The Prologue` before
 *   Job 1. Headings there are moved to just after `\c 1`, before verse 1; nothing is lost.
 * - It reads a `|` in a heading as the start of attributes. The NET writes `\s1 God’s Judgment
 *   on Edom | Edom’s Approaching Destruction`. A `|` outside a character span, in a heading,
 *   is swapped for a placeholder that `parseUsfm` swaps back (`markTextBars`); nothing is lost.
 * - It accepts no `\xo` in a footnote. The NET writes `See the note at \xo Is 41:14.\f*`. There
 *   it becomes `\xt Is 41:14\xt*`, a reference in a note; nothing is lost. It also tags part of
 *   a commentary's title as a reference, unclosed (`R. Whybray, \it \+xo Is 40-66\it*`); there
 *   the tag is removed and the text kept.
 * - It accepts no note inside an introduction paragraph. The RV writes one in the prologue to
 *   Sirach. There the note is written out in brackets: introductions aren't imported yet, and
 *   no words are lost.
 */
export function normalizeUsfm(usfm: string): { usfm: string; normalizations: Normalization[] } {
  const normalizations: Normalization[] = [];
  const apply = (rule: string, pattern: RegExp, fix: (span: string) => string) => {
    let count = 0;
    usfm = usfm.replace(pattern, (span: string) => {
      const fixed = fix(span);
      if (fixed !== span) count++;
      return fixed;
    });
    if (count) normalizations.push({ rule, count });
  };
  apply("nested marker inside \\qs unwrapped", /\\qs\s.*?\\qs\*/gs, (span) =>
    span.replace(/\\\+[a-z0-9]+\s?([^\\|]*)(?:\|[^\\]*)?\\\+[a-z0-9]+\*/g, "$1"),
  );
  apply("\\ref inside \\r unwrapped", /^\\r\s.*$/gm, (line) =>
    line.replace(/\\ref\s([^\\|]*)(?:\|[^\\]*)?\\ref\*/g, "$1"),
  );
  apply("\\wj closed and reopened around a verse number", /\\wj\s.*?\\wj\*/gs, (span) =>
    span
      .replace(/\\v\s+(\S+)\s/g, "\\wj* \\v $1 \\wj ")
      .replace(/\\wj\s+\\wj\*\s*/g, "")
      .replace(/\s+\\wj\* /g, "\\wj* "),
  );
  apply("verse number moved out of a \\d title", /^\\d\s+\\v\s.*$/gm, (line) =>
    line
      .slice(2)
      .split(/\\v\s+(\S+)\s+/)
      .slice(1)
      .map((part, i, parts) => (i % 2 === 0 ? `\\nb \\v ${part}\n\\d ${parts[i + 1]?.trim()}` : ""))
      .filter(Boolean)
      .join("\n"),
  );
  apply("\\mr outside a \\ms heading written as \\qd", /^(?!\\ms).*\n\\mr\s/gm, (lines) =>
    lines.replace(/\n\\mr\s$/, "\n\\qd "),
  );
  apply("open \\+fl in a note written as \\fl", /\\\+fl\s[^\\]*\\(?!\+fl\*)/g, (span) =>
    span.replace(/^\\\+fl/, "\\fl"),
  );
  apply(
    "\\ms heading before the first chapter moved after \\c 1",
    /^((?:\\(?:ms|s)\d?\s.*\n)+)(\\c\s+1\s*\n)/m,
    (lines) => lines.replace(/^((?:\\(?:ms|s)\d?\s.*\n)+)(\\c\s+1\s*\n)$/, "$2$1"),
  );
  apply("| in a heading kept as text", HEADING_LINE, markTextBars);
  apply("\\xo in a footnote written as \\xt", /\\f\s.*?\\f\*/g, (note) =>
    note.replace(/\\xo\s+([^\\]*?)([.,;]?)(?=\\)/g, "\\xt $1\\xt*$2"),
  );
  apply("unclosed \\+xo in a footnote removed", /\\f\s.*?\\f\*/g, (note) =>
    note.replace(/\\\+xo\s+(?=[^\\]*\\(?!\+xo\*))/g, ""),
  );
  apply("note in an introduction paragraph written in brackets", /^\\i[a-z]*\d?\s.*$/gm, (line) =>
    line.replace(
      /\\f\s+\S\s+(.*?)\\f\*/g,
      (_, note: string) => `[${note.replace(/\\f[a-z]+\*?\s?/g, "").trim()}]`,
    ),
  );
  return { usfm, normalizations };
}

/** Stands for a `|` that is text, while usfm-grammar parses (private use: in no source). */
export const BAR = String.fromCharCode(0xe07c);

const HEADING_LINE = /^\\(?:s\d?|ms\d?|mr|sr|r|d|sp|qa)\s.*$/gm;

/**
 * In a heading line, a `|` outside any character span (`\w …\w*`) is text, not the start of
 * attributes: it's swapped for `BAR`. The NET writes `\s1 God’s Judgment on Edom | Edom’s
 * Approaching Destruction` and `\w on\w* Edom|Edom’s Approaching Destruction`.
 */
export function markTextBars(line: string): string {
  const paragraph = /^\\\S+\s/.exec(line)?.[0] ?? "";
  let open = 0;
  const rest = line.slice(paragraph.length).replace(/\\\+?[a-z0-9]+\*?\s?|\|/g, (token) => {
    if (token === "|") return open > 0 ? token : BAR;
    open = Math.max(0, open + (token.includes("*") ? -1 : 1));
    return token;
  });
  return paragraph + rest;
}

/** `markTextBars` on every heading line of a book. */
export const markHeadingBars = (usfm: string): string => usfm.replace(HEADING_LINE, markTextBars);

function restoreBars(node: UsjNode): UsjNode {
  if (typeof node === "string") return node.replaceAll(BAR, "|");
  return node.content ? { ...node, content: node.content.map(restoreBars) } : node;
}

export interface ParsedUsfm {
  readonly usj: UsjElement;
  readonly errors: readonly string[];
  readonly normalizations: readonly Normalization[];
}

export function parseUsfm(source: string): ParsedUsfm {
  const { usfm, normalizations } = normalizeUsfm(source);
  const parser = new grammar.USFMParser(usfm);
  const usj = restoreBars(parser.toUSJ(null, null, true) as UsjElement) as UsjElement;
  return { usj, errors: parser.errors.map(String), normalizations };
}
