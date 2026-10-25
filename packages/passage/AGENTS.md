# @scripturetips/passage

The Passage value object (domain model §2.1–2.2): the book registry, verse references, OSIS formatting and parsing, and the ordinal encoding used for PostgreSQL range queries.

- **Pure TypeScript, no dependencies.** Everything that stores or compares passages depends on this package, so keep it small and framework-free.
- **The book registry is append-only.** Book numbers are stored inside every passage ordinal. Never renumber, reorder or remove a book; the snapshot test in `books.test.ts` guards this.
- **Canonical numbering only.** Everything here uses the canonical (original-language) versification. Converting to and from a translation's numbering belongs in the versification package.
- **Structural checks only.** `verseRef` checks bounds (chapter 1–999, verse 0–999, part 0–9), not whether a verse exists. That needs versification data.
- **Tests:** example tests plus fast-check property tests. Shared generators live in `src/test-support/`.

Run: `./toolbox pnpm --filter @scripturetips/passage test`
