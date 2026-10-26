# MACULA Hebrew and Greek: license evidence

**Verdict:** Ready with exclusions. MACULA is CC BY 4.0, but it bundles third-party data under other terms. The exclusion list below says which columns, attributes and files to leave out. No files are held yet: the commits below are the ones the exclusion list was checked against.
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

Both repositories carry the same license wording in `LICENSE.md`:

> "MACULA Hebrew Linguistic Datasets © 2022-2024 by Biblica, Inc is licensed under CC BY 4.0." "Attribution — You must attribute the work as follows: \"MACULA Hebrew Linguistic Datasets, available at https://github.com/Clear-Bible/macula-hebrew/\"."

> "MACULA Greek Linguistic Datasets © 2022-2024 by Biblica, Inc is licensed under CC BY 4.0." "In addition to datasets from Clear, MACULA contains data from the following datasets. Where a repository is given, please refer to the repository for the relevant license"

The license files list the third-party data with their terms. The two that matter:

> Hebrew: "Semantic Dictionary of Biblical Hebrew, edited by Reinier de Blois, with the assistance of Enio R. Mueller, ©2000-2021 United Bible Societies. Used with permission." (fields "`@sdbh`, `@lexdomain`, `@coredomain`, `@contextualdomain`")

> Greek: "Word sense data from the United Bible Societies MARBLE project. (`@ln`, `@domain`) Used with permission."

"Used with permission" is permission given to Biblica, not a license to us, so these fields are left out.

## What this means for us

- **Credit** each dataset in the wording above, with its link (`attribution`, licenses.md §8). Credit the bundled CC BY sources too: Groves Center (Westminster Hebrew Syntax), Open Scriptures Hebrew Bible, Cherith Analytics (glosses), and the SBLGNT (Society of Biblical Literature and Logos Bible Software) when the SBLGNT edition is used.
- **Leave out** the data in the exclusion list.
- MACULA's own data (syntax trees, Septuagint equivalents, Strong's numbers, word senses, semantic frames, participant referents, synonyms) is CC BY 4.0 and usable.

## Exclusion list

Checked against macula-hebrew commit `47db250bd55d0d8577f2a94fba114ef16c35b23c` (2026-04-24) and macula-greek commit `8423afe47b9e8f24b7772e808af45c7159a6fe7e` (2026-07-07). Attribute names are given as they appear in the TSV files; the XML formats use the same names, some capitalized (`SDBH`, `LexDomain`, `CoreDomain`, `ContextualDomain`, `LN`, `Domain`).

### MACULA Hebrew

| Data | Where | Terms | Action |
|---|---|---|---|
| Semantic Dictionary of Biblical Hebrew senses and domains | Columns `sdbh`, `lexdomain`, `coredomain`, `contextualdomain` in `WLC/tsv/macula-hebrew.tsv`; the same attributes in `WLC/nodes/` and `WLC/lowfat/` | © UBS, used with permission | **Leave out** |
| SDBH source files and MARBLE mappings | `sources/MARBLE/` (all files); `mappings/tsv/macula_to_marble_map.tsv`, `mappings/tsv/marble_unmapped.tsv`, `mappings/morpheme-mappings.xml` (MACULA ids to UBS MARBLE ids) | © UBS | **Leave out** |
| SIL Hebrew-English glosses (SILHA) | Column `gloss` in the TSV and the `gloss` attribute on `<m>` in `WLC/nodes/`, applied from `sources/biblicalhumanities/sil-hebrew-annotations/sil-gloss-mapping.tsv` by `pipelines/apply-sil-glosses` | © 2020 SIL International, own end-user license (below); not an open license | **Leave out.** Use the Cherith gloss (`english`, CC BY 4.0) instead |
| unfoldingWord Translation Notes, figures of speech | `sources/door43/UTN-figures-of-speech-OT.tsv` | CC BY-SA 4.0, unfoldingWord trademark rules | Not needed; leave out. If wanted later, it's share-alike (`share_alike`) |

The SILHA license isn't mentioned in MACULA's `LICENSE.md`; it sits beside the mapping file. Its terms: "You may freely distribute the SILHA, but you are not permitted to sell it on its own, in any format"; selling it as more than 25% of a work needs a license; quotations must be attributed ("© SIL International", or a full statement with links for 50 or more references). That is a free-to-share license, but not an open one, and the project uses only public-domain or openly licensed original-language data. The match was confirmed on the data: the TSV `gloss` column has "he.created" for Genesis 1:1 word 2, the same value as the SIL mapping file, while `english` (Cherith) has "created".

### MACULA Greek

| Data | Where | Terms | Action |
|---|---|---|---|
| MARBLE / Louw-Nida senses and domains | Columns `domain` and `ln` in `Nestle1904/tsv/macula-greek-Nestle1904.tsv` and `SBLGNT/tsv/macula-greek-SBLGNT.tsv`; the same attributes in the XML formats of both editions | © UBS, used with permission | **Leave out** |
| SDBG source files | `sources/MARBLE/` (all files) | © UBS | **Leave out** |
| unfoldingWord Translation Notes, figures of speech | `sources/door43/figures-of-speech/UTN-figures-of-speech-NT.tsv` | CC BY-SA 4.0 | Not needed; leave out |

### Usable, with its own terms

| Data | Where | Terms |
|---|---|---|
| Greek `gloss` | Both Greek editions | Berean Interlinear Bible, public domain since 2023-04-30 |
| `english`, `mandarin` | Hebrew and Greek | Cherith Analytics, CC BY 4.0 |
| SBLGNT edition (text and the trees built on it) | `SBLGNT/`, `sources/LogosBible/` | CC BY 4.0, © 2010 Society of Biblical Literature and Logos Bible Software |
| Nestle 1904 text and morphology | `Nestle1904/` | Text public domain (1904); morphology CC0 (biblicalhumanities). The biblicalhumanities XML markup is CC BY-SA 4.0: use MACULA's word data, not that markup |
| Hebrew text, morphology and trees | `WLC/`, `sources/tanach.us/`, `sources/OpenScriptures/`, `sources/GrovesCenter/` | WLC public domain; OSHB CC BY 4.0; Groves Center syntax CC BY 4.0 |

## Files in this folder

| File | What it is |
|---|---|
| `macula-hebrew-license-2026-10-26.pdf` | Screen-mode capture of `LICENSE.md` on GitHub at the Hebrew commit (headless Chromium through CDP, 2026-10-26 14:01 NZDT, 3 pages). SHA-256 `80aaf6319587f25b8153390e9c5d3638ca00aca97407f42bb902807f75c588b7` |
| `macula-hebrew-license-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `40219f2342f3fbca78ae26c21329a192d32db9336f536378fdb0946f8957ce62` |
| `macula-greek-license-2026-10-26.pdf` | `LICENSE.md` at the Greek commit (3 pages). SHA-256 `a0405cbc73db42af374c8dacd4178a7867cc7940968c38df796a52fb67d390f3` |
| `macula-greek-license-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `6cafba4ec26a264e52643dc240ec483c4c151e72080b55ac41907a010a3d33c6` |
| `macula-hebrew-silha-license-2026-10-26.pdf` | The SILHA `LICENSE.TXT` in macula-hebrew (2 pages; long lines are cut off on the page, the full text is in the raw file below). SHA-256 `9335f1dcf2d87e8b54b71b46b8a3cff23061e7eec7ce147bf56dacdc9b6209a0` |
| `macula-hebrew-silha-license-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `3b4b3c885801c18090318c6c1e5e3e0658380ee80e1395bdb26b9ae86eb71cac` |
| `macula-greek-marble-sdbg-readme-2026-10-26.pdf` | `sources/MARBLE/SDBG/README.md` (3 pages): which attributes hold the UBS data. SHA-256 `07a50119724f344eb37c693948f4764081ffecf484d3f06f855591b0fc9b566d` |
| `macula-greek-marble-sdbg-readme-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `0ce58421770cfcfc4d0576316a70624180c646def82aec673ae3f52c09ea4274` |
| `nestle1904-xml-readme-2026-10-26.pdf` | https://github.com/biblicalhumanities/Nestle1904/blob/master/xml/README.md (2 pages): the CC BY-SA license of the markup. SHA-256 `ae623917c6b1a22248431f570735603299405049a753dd918e6b98203ef413f8` |
| `nestle1904-xml-readme-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `caab4e36fb4c2ed40e77821840538964bf077a8147ba29b0bb454c088056e61c` |
| `raw-files-2026-10-26/` | The raw files at the pinned commits: both `LICENSE.md` files (SHA-256 `df45ba32…` Hebrew, `41b49a23…` Greek), the SILHA `LICENSE.TXT` (`47f543c6…`), and `WLC/tsv/hebrew-nodes-to-tsv.xq` (`f79af52f…`), the query that builds the Hebrew TSV and shows which XML attribute feeds each column |

The first GitHub fetch of four of the pages was rate-limited (HTTP 429); those responses were deleted and fetched again a minute later (HTTP 200).

**To check for updates:** compare each repository's latest commit with the pinned one, and re-read `LICENSE.md` and `sources/` for new third-party data before importing.
