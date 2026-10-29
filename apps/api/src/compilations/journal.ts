/**
 * The authorship journal's record (domain-model §2.3.1): each composition event changes the
 * text at one place, and is hashed with the hash before it, so the chain from the journal's own
 * hash to its head shows any event changed, removed or reordered later. Pure.
 */

import { createHash } from "node:crypto";
import { snapshotHash } from "./wording.ts";

export type EventKind = "insert" | "delete" | "replace" | "paste" | "undo" | "redo";

/** One change: at `position`, `removed` became `inserted`. */
export interface Delta {
  readonly position: number;
  readonly removed: string;
  readonly inserted: string;
}

export interface JournalHeader {
  readonly id: string;
  readonly authorId: string;
  readonly compilationId: string;
  readonly entered: string;
  readonly startText: string;
  readonly startedAt: Date;
}

export interface RecordedEvent extends Delta {
  readonly seq: number;
  readonly at: Date;
  readonly elapsed: number | null;
  readonly kind: EventKind;
  readonly pasteOrigin: "internal" | "external" | null;
  readonly pasteTranslationId: string | null;
  readonly prevHash: string;
  readonly hash: string;
}

/** SHA-256 of a rendering's text, as declared and compared. */
export const textHash = (text: string): string => createHash("sha256").update(text).digest("hex");

/** The chain's first link: the journal itself. */
export const journalHash = (j: JournalHeader): string =>
  snapshotHash({
    journal: j.id,
    author: j.authorId,
    compilation: j.compilationId,
    entered: j.entered,
    startText: j.startText,
    startedAt: j.startedAt.toISOString(),
  });

export const eventHash = (e: Omit<RecordedEvent, "hash">): string =>
  snapshotHash({
    prev: e.prevHash,
    seq: e.seq,
    at: e.at.toISOString(),
    elapsed: e.elapsed,
    kind: e.kind,
    position: e.position,
    removed: e.removed,
    inserted: e.inserted,
    pasteOrigin: e.pasteOrigin,
    pasteTranslation: e.pasteTranslationId,
  });

/** The text after `d`, or null when `d` doesn't fit it (the editor is out of step). */
export function applyDelta(text: string, d: Delta): string | null {
  if (d.position < 0 || d.position > text.length) return null;
  if (text.slice(d.position, d.position + d.removed.length) !== d.removed) return null;
  return text.slice(0, d.position) + d.inserted + text.slice(d.position + d.removed.length);
}

/**
 * Checks a journal's record: every event's hash, the links between them, and that replaying
 * them from the start text gives `text`, with the last hash `headHash`.
 */
export function verifyJournal(
  j: JournalHeader & { readonly text: string; readonly headHash: string },
  events: readonly RecordedEvent[],
): boolean {
  let prev = journalHash(j);
  let text: string | null = j.startText;
  for (const [k, e] of events.entries()) {
    if (e.seq !== k + 1 || e.prevHash !== prev || eventHash(e) !== e.hash) return false;
    text = applyDelta(text, e);
    if (text === null) return false;
    prev = e.hash;
  }
  return prev === j.headHash && text === j.text;
}
