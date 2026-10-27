# @scripturetips/source-conversion

Converters that turn third-party source texts into USFM for import. They run by hand when a source changes, not in the app. The source files live outside git in `../source-texts/`, mounted at `/source-texts` in the toolbox.

## JPS 1917 (`src/jps1917/`)

Converts Open Siddur's `Tanakh1917.txt` to USFM 3, keeping the 1917 printing's own (Hebrew) numbering.

```bash
./toolbox pnpm --filter @scripturetips/source-conversion jps1917 \
  /source-texts/jps-tanakh-1917/opensiddur-wayback/Tanakh1917.txt \
  /source-texts/jps-tanakh-1917/converted \
  /source-texts/jps-tanakh-1917/engjps_usfm.zip
```

The third argument is optional: eBible's `engjps`, a second witness. With it the converter writes `witness-report.txt`, listing every word difference and every verse start that doesn't line up.

- **The scan is the authority.** Every fix goes in `corrections.ts` with the Internet Archive scan page it was checked against (`source-texts/jps-tanakh-1917/archive-org-jps1917/JPS 1917.pdf`). Never fix the text from the witness alone: `engjps` has its own errors. Never edit the downloaded file.
- **Never renumber.** Verse counts per chapter in `books.ts` follow the printing. A count only changes when the scan shows it.
- **Pipeline:** `source.ts` (decode, apply corrections) → `hyphens.ts` (restore compounds, resolve line-end hyphens) → `parse.ts` (books, chapters, verses, notes, poetry) → `hebrew.ts` (restore the Hebrew the transcription lost to dots: portion names, Psalm book names, acrostic letters) → `usfm.ts`. `verify.ts` compares with the witness.
- **Where a chapter starts is guessed** (the transcription has no chapter numbers). Where the guess is wrong, add an entry to `CHAPTER_STARTS`.
- **Tests:** unit tests per module. `conversion.test.ts` runs the whole conversion against the real files when `/source-texts` is mounted: no issues, and exactly the witness differences already confirmed on the scan. If a change alters that count, check each new difference on the scan.
- **Record the output** in `docs/license-evidence/jps-tanakh-1917/SOURCE.md` (conversion section and hashes) when you regenerate it.

Run the tests: `./toolbox pnpm --filter @scripturetips/source-conversion test`

## TVTMS versification (`src/tvtms/`)

<!-- cspell:ignore Standardisation -->

Generates the mapping tables of `packages/versification` from STEPBible's TVTMS (expanded section).

```bash
./toolbox pnpm --filter @scripturetips/source-conversion tvtms \
  "/source-texts/stepbible-data/Versification/TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt" \
  /workspace/packages/versification/src/data
```

- **Pipeline:** `parse.ts` (rows, skipping summaries and empty slots) → `compose.ts` (scheme → KJV standard → canonical) → `generate.ts` (modules and `import-report.txt`).
- **`generate.test.ts`** fails if the committed tables differ from a fresh import. Regenerate rather than editing them, and update `packages/versification/src/data/CHANGES.md` when the importer changes what it does to the data.
- **Plain-language summary:** every import's report also needs a version for non-technical readers on the public translations and licenses page (vision.md §6). Not built yet.
- When TVTMS is updated: download the new file with license evidence and hashes, change `TVTMS_COMMIT`, regenerate, and check the golden tests.

## Lexham English Bible (`src/leb/`)

Converts `LEB.xml` (the 2020 download, license-evidence/lexham-english-bible) to USFM 3, keeping the LEB's numbering.

```bash
./toolbox pnpm --filter @scripturetips/source-conversion leb \
  /source-texts/lexham-english-bible/LEB.xml /source-texts/lexham-english-bible/converted
```

- **Pipeline:** `xml.ts` (a small XML reader) → `usfm.ts` (one book; the element mapping is in its header comment) → `verify.ts` (the words of each USFM book must equal the XML's) → `cli.ts` (files and `conversion-report.txt`). `books.ts` maps LEB book IDs and `<cite>` targets to USFM.
- **Idioms are spans of a translator's note** (domain-model §2.6). usfm-grammar drops custom `\z` markers, so they travel as `\w …|x-idiom="N"\w*`, closed and reopened with the same number across a verse number or a line. Character markers inside them are written as nested (`\+add`).
- **Record the output** hashes in `docs/license-evidence/lexham-english-bible/README.md` when you regenerate it.
