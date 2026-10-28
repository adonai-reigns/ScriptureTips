/**
 * The composition overview (vision §3.1): which source supplies each book as a whole, and how
 * many narrower choices (chapters, passages) it has from elsewhere.
 */

import { bookByOsis, parseOsisPassage } from "@scripturetips/passage";
import type { Rule, SourceView } from "./api.ts";

export interface BookSource {
  source: SourceView;
  /** The rule it comes from; undefined when it's the base. */
  rule?: Rule;
  /** Chapter and passage rules within the book. */
  narrower: number;
}

const bookOf = (rule: Rule) =>
  rule.kind === "section" ? undefined : parseOsisPassage(rule.entered).start.book;

export function bookSource(osis: string, rules: readonly Rule[], base: SourceView): BookSource {
  const group = bookByOsis(osis)?.group;
  const rule =
    rules.find((r) => r.kind === "book" && bookOf(r) === osis) ??
    rules.find((r) => r.kind === "section" && r.entered === group);
  const narrower = rules.filter(
    (r) => (r.kind === "chapter" || r.kind === "range") && bookOf(r) === osis,
  ).length;
  return { source: rule?.source ?? base, ...(rule ? { rule } : {}), narrower };
}
