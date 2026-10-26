# @scripturetips/versification

Converts verse references between a versification scheme and the canonical scheme (domain-model §2.1). Pure TypeScript, no I/O.

- **Hub and spoke.** Every scheme maps only to and from `canonical`: Hebrew numbering for the Old Testament, Greek for the additional books and the New Testament. Convert between two schemes through canonical.
- **Schemes:** `kjv`, `hebrew` (Old Testament only; the same as canonical), `latin`, `greek` (`schemes.ts`). A reference to a book a scheme doesn't number throws `VersificationError`.
- **Results** carry a mapping type: `same`, `renumbered`, `merged`, `split`, `partial`, `omitted`, `added` (`mapping.ts`). A whole verse matches the parts of it listed in a table.
- **Tables** (`src/data/*.ts`) are generated from STEPBible's TVTMS by `tools/source-conversion` (`pnpm tvtms`). Never edit them by hand; change the importer and regenerate. `CHANGES.md` there is the change note the license asks for, and must stay accurate. Credit: "STEP Bible", linked to www.STEPBible.org.
- **Tests:** `golden.test.ts` is the golden set of hard cases; every expectation is checked against TVTMS's rows. `properties.test.ts` checks every table both ways. Run them after any change to the tables.

Run: `./toolbox pnpm --filter @scripturetips/versification test`
