# @scripturetips/canon

Canon profiles (vision §3.4, domain-model §1): which books each tradition counts as scripture, their order and section. Pure TypeScript data, no I/O.

- **Profiles:** `protestant` (66 books), `catholic` (73), `orthodox` (76, the Greek Orthodox canon). Each places **every** registry book: books a profile doesn't count follow its New Testament as `additional` writings, in registry order. More profiles (Slavonic, Ethiopian, Tanakh order) can be added; Ethiopian needs books the registry doesn't have yet.
- **Parts:** a book printed inside another (Greek Esther, the additions to Daniel, the Letter of Jeremiah as Baruch 6 in Catholic Bibles, Psalm 151) has `partOf` and counts with that book.
- **No default:** users choose a profile at sign-up (vision §11). `standing(book, null)` answers for a reader without one: `varies` where traditions differ.
- **Sources:** memberships from Wikipedia's "Books of the Bible" table (Latin Catholic and Greek Orthodox columns); orders as modern Catholic editions and Greek Orthodox Bibles print them. Book lists are facts, so no license evidence is needed. The profiles live in code for now; domain-model's `CanonProfile`/`CanonBook` tables come when users or groups can define their own.

Run: `./toolbox pnpm --filter @scripturetips/canon test`
