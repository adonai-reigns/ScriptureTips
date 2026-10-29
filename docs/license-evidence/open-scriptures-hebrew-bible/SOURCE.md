# Open Scriptures Hebrew Bible (OSHB): license evidence

**Verdict:** Ready. The Hebrew text (the Westminster Leningrad Codex) is public domain; the lemma and morphology markup is CC BY 4.0, with a set credit.
**Evidence gathered:** 2026-10-29 (NZ time). Obtained for the PDF engine trial's Hebrew page (book-designer.md §9); only Genesis and Ruth so far. Assessed in [sources.md](../../sources.md) §6.

## License as stated by the rights holder

`LICENSE.md` at the pinned commit:

> "This work is based on *The Westminster Leningrad Codex*, which is in the public domain. […] Creative Commons Attribution 4.0 International (CC BY 4.0) […] **Attribution** — You must attribute the work as follows: "Original work of the Open Scriptures Hebrew Bible available at https://github.com/openscriptures/morphhb". You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use."

**What this means for us:**
- We may use, adapt and print the text and its markup, in anything, given away or sold.
- Wherever the morphology or lemmas are used (an interlinear page, a word study), the credit above goes with it: on the page or in an edition's attribution page, and on the credits page.
- Keep the Hebrew as the files have it: no NFC normalization (sources.md §6). The Ezra SIL font needs this too ([`../ezra-sil/`](../ezra-sil/SOURCE.md)).

## Origin of the files

Pinned to commit **`3d15126fb1ef74867fc1434be1942e837932691f`** (2024-08-27, the latest on `master`) of https://github.com/openscriptures/morphhb. Downloaded 2026-10-29 to `source-texts/open-scriptures-hebrew-bible/` from raw.githubusercontent.com at that commit:

| File | Bytes | SHA-256 |
|---|---|---|
| `Gen.xml` (`wlc/Gen.xml`, OSIS) | 1,859,928 | `0526e5c9a5fb4d907847645f954ed3d1268fa69decbd872056cedd2668d86449` |
| `Ruth.xml` (`wlc/Ruth.xml`, OSIS) | 136,188 | `fb6a2660383c7176941cb87b2be182ef634b66d49d057635869f4d9cb1f0a11e` |
| `LICENSE.md` | 1,476 | `9bf4a2890c25372e4c1dc750d550bfb4eacfbfcb63c53123b0628159370d1878` |
| `README.md` | 5,027 | `2da25acf89375558b843dab582bdf00833137baf1c8afe2b32cf09e251179999` |

## Files in this folder

| File | What it is |
|---|---|
| `github-repo-page-2026-10-29.pdf` / `.html` / `.headers.txt` | The repository at the pinned commit (headless Chromium through Playwright, screen mode, 2026-10-29 20:38 NZDT). PDF `9f90dea6491c4b605842eb75c9a0635ca18c5b1fe96434d17d4160f792d76a3d`, HTML `f530c1d2854bd869fa2df9be4e2b6749e6e2891a5a2d598b0f5e8538fc6f2794` |
| `github-license-page-2026-10-29.pdf` / `.html` / `.headers.txt` | `LICENSE.md` at the pinned commit. PDF `b2fb115770ee629296f5c8b4cb5498c2e843e79640a89140b8683ac2be121a49`, HTML `b9a6f5bb2be402cc4fc9e5a7a2ef6c77a0c5328251ea0c903594caf17d002aad` |
| `github-commit-page-2026-10-29.pdf` / `.html` / `.headers.txt` | The pinned commit's page. PDF `4f2ac410685e5bbd8acd51041443e5da1be391d2dd4eb1c4ef0c2d064cf5d768`, HTML `fcacd23f73735e048ba1185969a298f56bb06a78786f9194c5e253e53e12bc59` |
| `open-scriptures-hebrew-bible-download-record-2026-10-29.json` | Commit, URL, size and SHA-256 of each download |
| `download-headers-2026-10-29/` | HTTP response headers of each download |

**To check for updates:** compare the latest commit on `master` with `3d15126`. The other books are a new download at a pinned commit, with their hashes added here.
