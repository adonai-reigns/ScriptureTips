# @scripturetips/scripture-import

Imports the translations in `../source-texts` into verse records, ready to load into the database once it exists. Runs by hand when a source or the catalog changes, not in the app.

```bash
./toolbox pnpm --filter @scripturetips/scripture-import run import /source-texts /source-texts/imported [translation id …]
```

Writes `<id>.json` per translation and `import-report.txt`, outside git. Exits with status 1 if any translation has issues.

- **Catalog** (`catalog.ts`): each translation's source file, versification scheme and license key. A license key only names the license; what it allows is the license module's business (domain-model §7). A translation waiting on an open decision has `held` set, with the sources.md §8 item: it is skipped unless asked for by ID, which is how to work on it. Files held but never to be imported are listed in `NOT_IMPORTED` with the reason. Every source must be recorded in `docs/license-evidence/source-files.json` (checked by `catalog.test.ts`).
- **Pipeline:** `usj.ts` (USFM → USJ through usfm-grammar) → `book.ts` (verse records: text as markup, headings (inside the verse where one interrupts it), where paragraphs and lines begin, the verse's first included, `\vp` printed numbers, bridged verses, Psalm `\d` headings as verse 0) → `import-book.ts` (word-for-word checks that nothing was lost) → `translation.ts` (every book, canonical refs through versification, verse counts).
- **Never drop text silently.** A marker missing from `markers.ts` is an issue that stops the translation. Add a marker only after deciding what it means for the reader view. Where usfm-grammar needs the USFM adjusted (`normalizeUsfm`), the change is listed in the report.
- **Never renumber.** Verses keep the translation's numbering; `canonical` holds the canonical verses through the translation's scheme. Skipped verse numbers (e.g. Matt 17:21) are reported, not filled in.
- **usfm-grammar** builds native tree-sitter modules; the toolbox image has the compiler (`infra/docker/toolbox/Dockerfile`, `allowBuilds` in `pnpm-workspace.yaml`).
- **Tests:** unit tests on small USFM samples, and `catalog.test.ts`, which imports one book of each translation from the real files when `/source-texts` is mounted.

Run the tests: `./toolbox pnpm --filter @scripturetips/scripture-import test`
