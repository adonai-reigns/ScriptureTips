# STEPBible-Data: license evidence

**Verdict:** Ready (CC BY 4.0), with attribution. Obtained so far: **TVTMS** (versification mappings, for the versification package), the repository README, and (2026-10-31) **TAHOT**, **TAGNT**, **TIPNR** and the morphology code tables, for the original-language data import. The other datasets aren't held yet, and the exclusions in [sources.md](../../sources.md) §6 still apply to them.
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

## Obtained 2026-10-31: TAHOT, TAGNT, TIPNR and the morphology codes

Same pinned commit as above (**`be4191f0082aeedddb0eff0c02c966292b2bd641`**, still the latest on 2026-10-31). Downloaded to `source-texts/stepbible-data/` from raw.githubusercontent.com for the original-language data import (domain-model §2.4, `tools/original-import`). Each file's own header carries the same CC BY 4.0 statement as TVTMS (quoted in full from `TAHOT`, `TAGNT` and `TIPNR`):

> "Data created by www.STEPBible.org based on work at Tyndale House Cambridge (CC BY 4.0)" … "Include any part of this data in software or publications without requesting permission" … "Refer others to github.com/STEPBible as the source of the data. Please do not redistribute it yourself." (`TIPNR` adds: "…in software or publications **and send it to AI servers** without requesting permission".)

What we take, and leave out (sources.md §6):
- **TAHOT** (Hebrew OT, 4 files): every word with its extended Strong's, grammar and gloss. Based on the Leningrad codex, following the Qere; the Ketiv and other readings are variant rows.
- **TAGNT** (Greek NT, 2 files): only words found in the SBLGNT, Byzantine or Textus Receptus (the `editions` column). **Not** taken: the Spanish translation and the "sub-meaning" columns (Marvel Bible Project/OpenGNT terms not cleared). The Greek spelling follows NA28 where it has the word (a copyrighted edition); this is recorded as an open item (sources.md §8).
- **TIPNR** (proper names): its brief and short descriptions were "adapted from the output by Claude 3 Opus AI in April 2024"; kept with an `ai_generated` flag and to be disclosed wherever shown.
- **TEHMC / TEGMC**: the expansions of the Hebrew and Greek morphology codes.
- **Changes:** any correction we make is recorded in a change note, as the license asks.

| File | Bytes | SHA-256 |
|---|---|---|
| `Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt` | 18,190,455 | `e9b8546ee48fe0bfc57c3b70f5f40e98d96580e803526d19026224e31753368b` |
| `Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt` | 24,500,317 | `195fee1dc3653bab33701f170734eb894ed647c10cd08cc61749375fe8b73775` |
| `Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt` | 9,540,623 | `bb508af3af07822fca84cc43a0eba79eb70eecf672aabc0245b8d8cecf329d96` |
| `Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt` | 17,977,518 | `f3ded203d2a74d6368932c97ae550d1d0754b271af491dc0dedf36fe3ba0bcc5` |
| `Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt` | 14,189,032 | `ab8eaaeb68e17a1dcfa34e1e9350358f22f03bc2a97244d848750ad81044bc8e` |
| `Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt` | 15,939,932 | `524e32375361e6d3fa2f7ef00b87605fdc4317a762f395651a05fdc31ad031b7` |
| `Proper Nouns/TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt` | 8,202,454 | `d595b9163d32a400bb0ef96b27a6de58335a63da840b82531fe9f5e1d16a318c` |
| `Morphology codes/TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt` | 394,580 | `78779bea824b31d4467dec0161d547481c86f266bc39def12cd11dc7dcbe6da7` |
| `Morphology codes/TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt` | 467,056 | `5f0416f7617019a6082285214903bde569a980d5fd3b88b8d7020d944e94de82` |

Pages: `github-amalgamated-folder-2026-10-31`, `github-proper-nouns-folder-2026-10-31`, `github-morphology-folder-2026-10-31` (`.pdf`, `.html`, `.headers.txt`). Download record: `stepbible-data-download-record-2026-10-31.json`; headers: `download-headers-2026-10-31/`.
