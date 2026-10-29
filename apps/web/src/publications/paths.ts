/**
 * Publication paths (domain-model §1.6): `/p/{handle}/{slug}[/{book}/{chapter}[/{verses}]]`,
 * with a version ID at the end to pin one version. A version ID is 10 letters and digits with
 * letters among them, so it isn't read as a passage; a book's name of the same length isn't one.
 */

import { BOOKS } from "@scripturetips/passage";
import { bookSlug } from "../reader/paths.ts";

const BOOK_SLUGS = new Set(BOOKS.map((b) => bookSlug(b.osis)));

const isVersionId = (s: string) =>
  /^[A-Za-z0-9]{10}$/.test(s) && (s.match(/[A-Za-z]/g)?.length ?? 0) >= 2 && !BOOK_SLUGS.has(s);

/** A publication path's passage segments, and the version it pins, if any. */
export function splitVersion(rest: readonly string[]): { segments: string[]; version?: string } {
  const last = rest.at(-1);
  return last !== undefined && isVersionId(last)
    ? { segments: rest.slice(0, -1), version: last }
    : { segments: [...rest] };
}
