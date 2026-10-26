# STEPBible-Data: license evidence

**Verdict:** Ready (CC BY 4.0), with attribution. Obtained so far: **TVTMS** (versification mappings, for the versification package) and the repository README. The other datasets aren't held yet, and the exclusions in [sources.md](../../sources.md) §6 still apply to them.
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

Repository README, at the pinned commit:

> "# STEPBible Data Repository **CC BY 4.0**" "Data created initially by Tyndale House Cambridge now curated by www.STEPBible.org"

> "This public licence allows you to: **Include any part of STEPBible-Data in any software or publications** without requesting permission […] **Make changes to the data and record the differences** […] Any changes made to data should be recorded and made available to subsequent users. **Refer others to this repository as the source of the data.** Updates or corrections are easier to implement when the data is distributed from a single source. You are welcome to make a mirror, so long as it is kept up-to-date and has a link back here."

> "And you should: **Credit it** to \"STEP Bible\" linked to www.STEPBible.org"

The TVTMS file's own header:

> "Data created by www.STEPBible.org based on work at Tyndale House Cambridge (CC BY 4.0)" "This licence allows you to: * Include any part of this data in software or publications without requesting permission * Download the data and reformat it for your application, without changing the data * Send any proposed corrections to STEPBibleATGmail.com. to be verified (You MAY make changes yourself, but you should include a note of changes that can be viewed by those who use your new data) * Refer others to github.com/STEPBible as the source of the data. Please do not redistribute it yourself. (Updates or corrections are easier to implement when the data is distributed from a single source)"

**What this means for us:**
- We may load TVTMS into our database and use it for versification mapping, without asking.
- **Credit** "STEP Bible" with a link to www.STEPBible.org wherever the mappings are used (`attribution`, licenses.md §8).
- **Changes:** any correction we make must be recorded in a change note that users of our data can see, and sent to STEPBible for checking (`share_changes`).
- **Including it in our software is allowed:** "Include any part of this data in software or publications without requesting permission". The mapping data we generate from TVTMS is committed with the versification package, with the credit and a link to the repository. We don't offer the TVTMS file itself for download.

## What the data is

"Versification data for KJV, Hebrew, Latin & Greek traditions with methodology for reversification." Tab-separated text, UTF-8 with BOM, 29,896 lines. The header links the spreadsheet version, instructions and an explanation of the methodology (Google Docs). Mapping rows start at `#DataStart(Condensed)` and are typed (e.g. `#OneToOne`, `#MergedPrevVerse`, `#SubdividedVerse`), with columns per tradition (English KJV, English NRSV, Hebrew, Latin, Greek) and `#TEST` conditions that identify which tradition a translation follows. The file was last changed in commit `1f34217` (2026-07-17).

## Origin of the files

Pinned to commit **`be4191f0082aeedddb0eff0c02c966292b2bd641`** (2026-10-24) of https://github.com/STEPBible/STEPBible-Data. Downloaded 2026-10-26 to `source-texts/stepbible-data/`:

| File | Bytes | SHA-256 |
|---|---|---|
| `Versification/TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt` | 5,790,928 | `63058e0f20201af4bdaa7d830da5be8f493455d947c5f147d84840b33db9ddf8` |
| `README.md` | 14,495 | `261d5157c0ffeadeedad3f734db945a4c3642e3e4ce5fa28002985b6c52437b1` |

The URLs (raw.githubusercontent.com at the pinned commit) are in `stepbible-data-download-record-2026-10-26.json` and `../source-files.json`. The repository also holds two older TVTMS formats under `Older Formats/` (NRSV-based until Dec 2024, KJV-based until Mar 2025); they weren't downloaded.

## Files in this folder

| File | What it is |
|---|---|
| `github-repo-page-2026-10-26.pdf` | Screen-mode capture of the repository at the pinned commit (headless Chromium through CDP, 2026-10-26 13:50 NZDT, 7 pages): file list and rendered README with the license. SHA-256 `1fc776a27df3d807e712dd2e3af46a452d592ec8caaaa342e548e1aaf0972917` |
| `github-repo-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `30781c23ab6bba2588bb88fbb7f0c22c71d96243b43c7ea47a004d5d0e22c845` |
| `github-versification-folder-2026-10-26.pdf` | The `Versification` folder at the pinned commit (2 pages). SHA-256 `8114ca358505b989923d5951176bf6458675785590fdc7737d7400a44c8c5fde` |
| `github-versification-folder-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `d3c6ed7ab120de92e849786c48d2e4dbb9b7c8f5035821d3c828f9ef3b792773` |
| `github-commit-page-2026-10-26.pdf` | The pinned commit's page (6 pages): date and author. SHA-256 `b60bd1b066d5d905240e25e3c1613310fff8b1cec71dda42ec8eed07e12236dd` |
| `github-commit-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `65ad9d8f9201bd67b9910482ef582668864676186adb6e750d679b9cbb281856` |
| `stepbible-data-download-record-2026-10-26.json` | Commit, URL, size, SHA-256 and retrieval date of each downloaded file |
| `download-headers-2026-10-26/` | HTTP response headers of each download |

**To check for updates:** compare the latest commit touching `Versification/` with `1f34217`. A newer TVTMS is a new import: download it at its commit, record new hashes, and re-read the license header rather than overwriting this record.
