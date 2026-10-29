/**
 * A compilation verse's translator's notes (domain-model §2.3, `CompilationNote`): the source
 * verse's notes, as the compilation changed them, and the user's own. Pure.
 */

import type { compilationNote } from "@scripturetips/db";
import type { PassageVerse } from "../translations/translations.service.ts";
import { type Inline, markAfterWord, noteText } from "./wording.ts";

export type NoteRow = typeof compilationNote.$inferSelect;
export type SourceNote = PassageVerse["notes"][number];
export type NoteOrigin = "original" | "modified" | "own";

/** A note as the compilation shows it: a source note's `origin` is left out while unchanged. */
export type CompiledNote = SourceNote & { readonly origin?: "modified" | "own" };

/** A note as the verse editor lists it. */
export interface NoteEditView {
  readonly position: number;
  readonly origin: NoteOrigin;
  readonly removed: boolean;
  /** The note's text now; for a removed note, the source's. */
  readonly text: string;
  /** The source note's text, for an original or modified note. */
  readonly sourceText: string | null;
  /** For an own note: the number of the verse's words before its mark. */
  readonly after: number | null;
}

/** At most this many notes of the user's own on one verse. */
export const MAX_OWN_NOTES = 20;
export const MAX_NOTE = 2000;

/** The key for a new own note: after every note the verse has, or had at its source. */
export const nextPosition = (source: readonly SourceNote[], rows: readonly NoteRow[]): number =>
  Math.max(-1, ...source.map((n) => n.position), ...rows.map((r) => r.position)) + 1;

/** The verse's content and notes as the compilation has them, with its own notes marked. */
export function compiledNotes(
  content: readonly Inline[],
  source: readonly SourceNote[],
  rows: readonly NoteRow[],
): { content: Inline[]; notes: CompiledNote[] } {
  const changed = new Map(rows.map((r) => [r.position, r]));
  const notes: CompiledNote[] = source.flatMap((n) => {
    const row = changed.get(n.position);
    if (row?.removed) return [];
    return row?.origin === "modified"
      ? [{ ...n, body: row.body, origin: "modified" as const }]
      : [n];
  });
  let marked = [...content];
  for (const r of rows)
    if (r.origin === "own") {
      marked = markAfterWord(marked, r.after ?? 0, r.position);
      notes.push({
        position: r.position,
        kind: "footnote",
        caller: "+",
        category: null,
        span: null,
        body: r.body,
        origin: "own",
      });
    }
  return { content: marked, notes };
}

/** The verse's notes for the editor: the source's, changed or not, then the user's own. */
export function noteEditViews(
  source: readonly SourceNote[],
  rows: readonly NoteRow[],
): NoteEditView[] {
  const changed = new Map(rows.map((r) => [r.position, r]));
  const text = (body: unknown) => noteText(body as Inline[]);
  return [
    ...source.map((n): NoteEditView => {
      const row = changed.get(n.position);
      return {
        position: n.position,
        origin: row?.origin === "modified" ? "modified" : "original",
        removed: row?.removed ?? false,
        text: text(row?.origin === "modified" ? row.body : n.body),
        sourceText: text(n.body),
        after: null,
      };
    }),
    ...rows
      .filter((r) => r.origin === "own")
      .map(
        (r): NoteEditView => ({
          position: r.position,
          origin: "own",
          removed: false,
          text: text(r.body),
          sourceText: null,
          after: r.after,
        }),
      ),
  ];
}

/** The rows as a revision keeps them (`compilation_verse_revision.notes`). */
export const revisionNotes = (rows: readonly NoteRow[]) =>
  rows.map((r) => ({
    position: r.position,
    origin: r.origin,
    removed: r.removed,
    body: r.body,
    after: r.after,
  }));
