# Ezra SIL (font): license evidence

**Verdict:** Ready (SIL Open Font License 1.1, with the Hebrew layout code under the MIT/X11 License). Fonts may be embedded, in full or as a subset, in PDFs of any kind, including sold editions.
**Evidence gathered:** 2026-10-29 (NZ time). Obtained for the PDF engine trial (book-designer.md §9), for Biblical Hebrew; the trial doesn't commit the project to this font.

## License as stated by the rights holder

`Licenses.txt` in the release package:

> "Hebrew layout intelligence copyright (c) 2003 & 2007 Ralph Hancock and John Hudson, and licensed under the MIT/X11 License (copied below). All other font software is copyright (c) 1997-2007, SIL International (http://www.sil.org/), with Reserved Font Names "SIL" and "Ezra", and is licensed under the SIL Open Font License, Version 1.1."

The product page's Downloads section states the same split: the MIT/X11 License "for Hebrew layout intelligence only", and "All other font software licensed under the SIL Open Font License (OFL)". `README.txt`: "We are happy to make these fonts available to the general public at no charge, under the terms of the SIL Open Font License […] and the MIT/X11 License".

The OFL's terms for documents and embedding are quoted in [`../gentium/SOURCE.md`](../gentium/SOURCE.md); the MIT/X11 License permits use "without restriction" provided its notice stays with copies of the software.

**What this means for us:**
- PDF editions may embed Ezra SIL (subset or full) whether they're kept, given away or sold; the edition's license isn't affected.
- Distributing the font files themselves needs `Licenses.txt` alongside (it carries both notices). A subset web font can't use the names "Ezra" or "SIL".
- The credits page names the font and both licenses.

## What the fonts are, and a technical condition

"A typeface fashioned after the square letter forms of the typography of the Biblia Hebraica Stuttgartensia (BHS)." One download, two fonts: **Ezra SIL** (`SILEOT.ttf`, renders as the printed BHS) and **Ezra SIL SR** (`SILEOTSR.ttf`, a different style of cantillation marks). Version 2.51 (2007) is the current version.

The product page warns that the fonts follow a character order agreed by font developers in 2003, "This does not follow canonical order. Texts which have been converted to NFC or NFD canonical order will not display correctly with these fonts." The trial must check how our Hebrew text is ordered.

## Origin of the files

Downloaded 2026-10-29 to `source-texts/ezra-sil/`:

| File | Bytes | SHA-256 |
|---|---|---|
| `EzraSIL-2.51.zip` | 380,503 | `f16bcb3ec4473ac6a9f138ee0dbde7cc2f835e93a90cbe8649b3f32677760cc1` |

From https://software.sil.org/downloads/r/ezra/EzraSIL-2.51.zip (the font package link on software.sil.org/ezra). Inside: `Licenses.txt` (`cd29dbb1528a3ce89e66e76c7287b0866e93c43d49a8cf8a1c73804109c28214`), `OFL-FAQ.txt`, `FONTLOG.txt`, `README.txt`, `Filelist.txt`, an installation guide (PDF), `SILEOT.ttf` (`53c98ab95d2b5bd615527cdd05da42d7dd77f2690b79c043e9f90753d4930dce`) and `SILEOTSR.ttf` (`9794bf85dfe22ed7c87a3765b647987e1b87f11b6b082711d64567855ed61b35`).

## Files in this folder

| File | What it is |
|---|---|
| `sil-product-page-2026-10-29.pdf` / `.html` / `.headers.txt` | software.sil.org/ezra: description, the two fonts, the character-order warning, and the license (headless Chromium through Playwright, screen mode, 2026-10-29 20:35 NZDT). PDF `1134f57334d66c03cfa01261158c2a35b450d34dec109771b5ca186ae7a70862`, HTML `f9922c7067596f58cc40ddf4c81d289463d15f7359f067a944635a337884feed` |
| `ofl-official-text-2026-10-29.pdf` / `.html` / `.headers.txt` | openfontlicense.org: the official OFL 1.1 text. PDF `87f064e781dcbac5d742418c646be907f75e018c66ed12ac25c180802d3b7cad`, HTML `43c18586117a7002005d972c7e36b4c13d3f7d424ff9b94db15552eaa3fa3c2d` |
| `ezra-sil-download-record-2026-10-29.json` | URL, size, SHA-256 and retrieval date of the download |
| `download-headers-2026-10-29/` | HTTP response headers of the download |

**To check for updates:** compare the version on software.sil.org/ezra with 2.51.
