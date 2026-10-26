import { BOOKS } from "@scripturetips/passage";
import type { VerseCounts } from "../parse.ts";
import { KJV_CHAPTERS } from "./kjv-chapters.ts";

const byOsis = new Map(
  BOOKS.flatMap((b) => {
    const entry = KJV_CHAPTERS[b.usfm];
    return entry ? [[b.osis, entry] as const] : [];
  }),
);

/** The KJV's verse counts, as the parser and formatter read them. */
export const KJV_VERSES: VerseCounts = {
  chapters(book) {
    const entry = byOsis.get(book);
    return entry && { first: entry.first, last: entry.first + entry.verses.length - 1 };
  },
  verses(book, chapter) {
    const entry = byOsis.get(book);
    const last = entry?.verses[chapter - entry.first];
    if (!entry || last === undefined) return undefined;
    return { first: book === "Ps" && entry.headings.includes(chapter) ? 0 : 1, last };
  },
};

/** The books the KJV fixture covers. */
export const KJV_BOOKS: readonly string[] = [...byOsis.keys()];
