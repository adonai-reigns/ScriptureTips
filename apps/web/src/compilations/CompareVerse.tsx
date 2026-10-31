"use client";

import type { Verse } from "../reader/api.ts";
import { noteBody } from "../reader/layout.ts";
import { ShownText } from "../reader/ShownText.tsx";
import { useStudy } from "../study/StudyProvider.tsx";
import { STUDY_SOURCES } from "../study/types.ts";

/** A verse's number as printed: its own label, or its range. */
export const verseLabel = (v: Verse) =>
  v.published ?? (v.to ? `${v.verse}–${v.to}` : String(v.verse));

/** The headings before a verse. */
export function VerseHeadings({ verse }: { verse: Verse }) {
  return verse.headings.map((h, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: a verse's headings never reorder.
    <span key={i} className="compare-heading">
      <ShownText nodes={noteBody(h.content)} />
    </span>
  ));
}

/** A verse in the compare and edit modes: its headings, its number, then its words. */
export function VerseText({
  verse,
  number,
  source,
}: {
  verse: Verse;
  number: string;
  /** The translation the words are from (catalog ID): study mode marks only some. */
  source?: string | undefined;
}) {
  const words = useStudy();
  const study = words && source && STUDY_SOURCES.has(source) ? words : null;
  return (
    <>
      <VerseHeadings verse={verse} />
      <sup className="compare-number">{number}</sup>{" "}
      <ShownText nodes={noteBody(verse.content)} study={study} />
    </>
  );
}
