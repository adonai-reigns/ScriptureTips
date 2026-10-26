# Translation for Translators (T4T): license evidence

**Verdict:** Ready (CC BY-SA 4.0, share-alike). No files are held yet; the source is eBible.org (`eng-t4t`).
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

eBible.org copyright page and details page (identical wording):

> "Copyright © 2008-2017 Ellis W. Deibler, Jr." "This translation is made available to you under the terms of the Creative Commons Attribution Share-Alike license 4.0."

> "You have permission to share and redistribute this Bible translation in any format and to make reasonable revisions and adaptations of this translation, provided that: You include the above copyright and source information. If you make any changes to the text, you must indicate that you did so in a way that makes it clear that the original licensor is not necessarily endorsing your changes. If you redistribute this text, you must distribute your contributions under the same license as the original."

The eBible catalog row lists it as "Redistributable": "True", last updated 2026-10-20. The unfoldingWord Simplified Text (UST) is adapted from T4T and names the same license ([unfoldingword-simplified-text](../unfoldingword-simplified-text/)).

**What this means for us:**
- Show the copyright line and the source (`attribution`).
- Mark changed verses as changed (a CC BY-SA condition, handled with `share_alike`).
- Works that include T4T text must carry CC BY-SA 4.0 (`share_alike`, licenses.md §6).

## What the text is

Full Bible, 66 books, American English. Catalog counts: OT 39 books, 929 chapters, 22,769 verses; NT 27 books, 260 chapters, 7,871 verses. The OT count is lower than the usual 23,145 (and the NT's below 7,957), so some verses are combined into verse ranges; the importer must handle bridged verses.

## Files in this folder

| File | What it is |
|---|---|
| `ebible-details-page-2026-10-26.pdf` | Screen-mode capture of https://ebible.org/Scriptures/details.php?id=engt4t (headless Chromium through CDP, 2026-10-26 14:07 NZDT, 2 pages): formats, copyright and license. SHA-256 `ad99409ea8ed43f7d7efe40f2f6ca264c00e0f4d3198954937a702c81ec8e9d8` |
| `ebible-details-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers (HTTP 200, 2026-10-26 01:07 GMT). HTML SHA-256 `95d48efaf54fc8b850d9855d5049fdb32a6c2f30f3f93d112d7ea017a2ed9f86` |
| `ebible-copyright-page-2026-10-26.pdf` | https://ebible.org/eng-t4t/copyright.htm (2 pages). SHA-256 `2f327dbab55fa82ad1d26c54f74e4d32daf880c63d08a5673ac2e80a7a0297da` |
| `ebible-copyright-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers (HTTP 200, 2026-10-26 01:08 GMT). HTML SHA-256 `839ab40a8e656edf86c10819b29531d2a8e706f71c93da529a639af3a97156e5` |
| `eng-t4t-catalog-entry-2026-10-26.json` | The `eng-t4t` row of https://ebible.org/Scriptures/translations.csv. SHA-256 `a965bc626a42a72ea30a528b04e2aa751f5f466c43edef51f7dfdf567775bf5a` |

**When importing:** download `https://ebible.org/Scriptures/eng-t4t_usfm.zip`, record its size, date and SHA-256 here and in `../source-files.json`, and keep the `copr.htm` inside the archive, as for the other eBible texts.
