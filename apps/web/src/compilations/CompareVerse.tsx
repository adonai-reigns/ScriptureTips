import type { Verse } from "../reader/api.ts";
import { noteBody } from "../reader/layout.ts";
import { ShownText } from "../reader/ShownText.tsx";

/** A verse's number as printed: its own label, or its range. */
export const verseLabel = (v: Verse) =>
  v.published ?? (v.to ? `${v.verse}–${v.to}` : String(v.verse));

/** A verse in the compare and edit modes: its headings, its number, then its words. */
export function VerseText({ verse, number }: { verse: Verse; number: string }) {
  return (
    <>
      {verse.headings.map((h, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a verse's headings never reorder.
        <span key={i} className="compare-heading">
          <ShownText nodes={noteBody(h.content)} />
        </span>
      ))}
      <sup className="compare-number">{number}</sup> <ShownText nodes={noteBody(verse.content)} />
    </>
  );
}
