import fc from "fast-check";
import { BOOKS } from "../books.ts";
import { MAX_CHAPTER, MAX_PART, MAX_VERSE, verseRef } from "../verse-ref.ts";

/** Any structurally valid verse reference, for property tests. */
export const arbitraryVerseRef = fc
  .record({
    book: fc.constantFrom(...BOOKS.map((b) => b.osis)),
    chapter: fc.integer({ min: 1, max: MAX_CHAPTER }),
    verse: fc.integer({ min: 0, max: MAX_VERSE }),
    part: fc.integer({ min: 0, max: MAX_PART }),
  })
  .map(({ book, chapter, verse, part }) => verseRef(book, chapter, verse, part));
