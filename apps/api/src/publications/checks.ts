/**
 * The publishing procedure's automated license check (domain-model §1.4, step 2; §7): what
 * stops a compilation being published, what the user should know first, and the attributions
 * its sources require. ScriptureTips gives everything away (vision §1.1), so rules about selling
 * (`give_away_only`, `no_standalone_sale`, a share of a work that's `sold`) are always met here;
 * they matter for editions users sell (book-designer). Pure.
 */

import {
  attributionFor,
  canCompile,
  canModify,
  notesExcluded,
  restrictedNames,
} from "@scripturetips/licenses";
import type { CompilationSnapshot } from "../compilations/compilations.service.ts";

export type Problem =
  /** Verses pasted from outside and not declared the user's own (domain-model §2.3). */
  | { readonly code: "pasted-verses"; readonly verses: string[] }
  /** A source whose terms aren't recorded: nothing is allowed. */
  | { readonly code: "unknown-license"; readonly source: string }
  /** Changed wording from a source whose license forbids changes. */
  | { readonly code: "modification-not-allowed"; readonly source: string; readonly verses: number }
  /** A trademark in the title or abbreviation ("Lexham"). */
  | { readonly code: "name-restricted"; readonly source: string; readonly term: string }
  /** The source's own notes, which its license doesn't let be passed on (the NET's). */
  | { readonly code: "notes-excluded"; readonly source: string; readonly verses: number }
  /** The compilation's slug is already another publication's (domain-model §1.6). */
  | { readonly code: "slug-published" };

/** The user's own verses whose wording is very close to a translation's (vision §6.1). */
export interface SimilarVerse {
  readonly verse: string;
  readonly source: string;
  readonly score: number;
}

export type Warning = { readonly code: "similar-wording"; readonly verses: SimilarVerse[] };

/** What a source's text must carry wherever it's shown (the `attribution` rule). */
export interface Attribution {
  /** The source's catalog ID and abbreviation. */
  readonly source: string;
  readonly abbreviation: string;
  readonly designation: string;
  readonly statement: string;
  readonly links: readonly { readonly text: string; readonly url: string }[];
}

/** From this score up, an own verse is listed as close to a translation's wording. */
export const SIMILAR_WARNING = 90;

const mentions = (text: string, term: string) =>
  new RegExp(`(^|[^\\p{L}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu").test(
    text,
  );

export function checkSnapshot(
  s: CompilationSnapshot,
  similar: readonly SimilarVerse[],
): { problems: Problem[]; warnings: Warning[]; attributions: Attribution[] } {
  const problems: Problem[] = [];
  if (s.pasted.length > 0) problems.push({ code: "pasted-verses", verses: s.pasted });
  const verses = s.books.flatMap((b) => b.chapters.flatMap((c) => c.verses));
  const attributions: Attribution[] = [];
  for (const { translation: t } of s.sources) {
    const source = t.abbreviation;
    if (!canCompile(t.licenseKey)) problems.push({ code: "unknown-license", source });
    const from = verses.filter((v) => v.source === t.catalogId);
    const changed = from.filter((v) => v.edit).length;
    if (changed > 0 && !canModify(t.licenseKey))
      problems.push({ code: "modification-not-allowed", source, verses: changed });
    for (const term of restrictedNames(t.licenseKey))
      if (mentions(s.compilation.title, term) || mentions(s.compilation.abbreviation, term))
        problems.push({ code: "name-restricted", source, term });
    if (notesExcluded(t.licenseKey)) {
      const noted = from.filter((v) =>
        v.notes.some((n) => (n as { origin?: string }).origin !== "own"),
      ).length;
      if (noted > 0) problems.push({ code: "notes-excluded", source, verses: noted });
    }
    const a = attributionFor(t.licenseKey);
    if (a)
      attributions.push({
        source: t.catalogId,
        abbreviation: source,
        designation: a.designation,
        statement: a.statement,
        links: a.links,
      });
  }
  return {
    problems,
    warnings: similar.length > 0 ? [{ code: "similar-wording", verses: [...similar] }] : [],
    attributions,
  };
}
