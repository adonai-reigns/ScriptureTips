# @scripturetips/reference

Reads and writes human references ("jn 3 16", "Rom 5:8–10, 12; 6:1", "Psalm 3:title–2"). Pure TypeScript, no I/O. One shared parser for the app, the plugins and the extension (vision §3.6).

- **Always in a scheme's numbering** (domain-model §2.2). `parseReference` and `findReferences` take a `scheme` and return each reference as entered (`entered`, for `entered_ref`) and converted to canonical (`canonical`, through `@scripturetips/versification`).
- **`parseReference`** is for lookups: it accepts a space between chapter and verse ("jn 3 16") and a book name alone, and must consume the whole input. Errors come back as a code and an index, never as text; the UI words them.
- **`findReferences`** is for running text: book names must be capitalized and followed by a chapter, names that are also common words ("Am", "Is", "Act") are skipped, and anything that doesn't check out against the verse counts is left alone. Skipping existing links in HTML or BBCode belongs to the plugins (stage 4).
- **`formatPassage`** writes "John 3:16–18", "Psalm 23", "Jude 3", "Rev 13:1a". Formatting then parsing must give back the same passage (`properties.test.ts`).
- **Verse counts** (`VerseCounts`) are passed in. They're needed for whole chapters and books and to check that verses exist. The real counts come with the translation import; tests use a KJV fixture (`src/test-support/`).
- **Book names** are data per language in `src/languages/` (vision §3.16). Every registry book needs names; the `Language` constructor throws if a name points at two books. Spelling isn't checked in that folder.
- **Single-chapter books** (`SINGLE_CHAPTER_BOOKS`) are cited by verse alone: "Jude 3" is verse 3.
- **Corpus:** `parse.test.ts` holds about 60 hand-written strings so far. testing.md §2 asks for thousands of real-world ones (forum posts, sermons, BBCode and HTML); add them as they are collected.

Run: `./toolbox pnpm --filter @scripturetips/reference test`
