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
