# Gentium (font): license evidence

**Verdict:** Ready (SIL Open Font License 1.1). Fonts may be embedded, in full or as a subset, in PDFs of any kind, including sold editions, and the OFL doesn't extend to the documents.
**Evidence gathered:** 2026-10-29 (NZ time). Obtained for the PDF engine trial (book-designer.md §9); the trial doesn't commit the project to this font.

## License as stated by the rights holder

`OFL.txt` in the release package:

> "Copyright (c) 2003-2025 SIL Global (https://www.sil.org/), with Reserved Font Names "Gentium" and "SIL". This Font Software is licensed under the SIL Open Font License, Version 1.1."

From the OFL itself: the fonts "can be bundled, embedded, redistributed and/or sold with any software provided that any reserved names are not used by derivative works", "Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself", and "The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives."

`OFL-FAQ.txt` in the package: 1.1 "Can I use the fonts for a book or other print publication […]? Yes. […] No additional license or permission is required"; 1.12 "So can I embed OFL fonts in my document? Yes, either in full or a subset."; 1.13 embedding "does not change the license of the document itself".

**What this means for us:**
- PDF editions may embed Gentium (subset or full) whether they're kept, given away or sold; the edition's license isn't affected (book-designer.md §6.5).
- Distributing the font files themselves (e.g. self-hosting them as web fonts) needs `OFL.txt` alongside. A subset web font is a Modified Version and can't use the names "Gentium" or "SIL" (OFL-FAQ 2.6); embedding in a PDF isn't affected.
- The credits page names the font and its license (branding.md).
- Covers Latin, Cyrillic and **Greek** (polytonic). Not Hebrew: see [`../ezra-sil/`](../ezra-sil/SOURCE.md).

## Origin of the files

Release **7.000** (2 June 2025; the family is named "Gentium" again, formerly "Gentium Plus"), the current version on the download page. Downloaded 2026-10-29 to `source-texts/gentium/`:

| File | Bytes | SHA-256 |
|---|---|---|
| `Gentium-7.000.zip` | 15,102,846 | `313e64963ba27851356060a725d36ce01680e5c5c63f46e4b40f15741c043e21` |

From https://github.com/silnrsi/font-gentium/releases/download/v7.000/Gentium-7.000.zip (the "Download Now" link on software.sil.org/gentium/download). Inside: `OFL.txt` (`dcae5818b104b6cb24334bb4c92f7896d1ac988529ca4654ff21361a7b5b94ee`), `OFL-FAQ.txt`, `FONTLOG.txt`, `README.txt`, and ten weights (Regular to ExtraBold, each with italic), e.g. `Gentium-Regular.ttf` (`158d89548ef28f62abfc2921878fa253b833111e8d3932da7f501daef6d0eccf`).

## Files in this folder

| File | What it is |
|---|---|
| `sil-product-page-2026-10-29.pdf` / `.html` / `.headers.txt` | software.sil.org/gentium (headless Chromium through Playwright, screen mode, 2026-10-29 20:33 NZDT). PDF `032f11b05b1934702b70d48dd040710907c86f7606891ab6cef0191b60d46b40`, HTML `c4c9399dba19af43a2491ed09682872681b9bdefae2158fad94aa9b830a5d247` |
| `sil-download-page-2026-10-29.pdf` / `.html` / `.headers.txt` | The download page: current version 7.000, 14.40 MB, 2 Jun 2025. PDF `d0ba78f7c082d34a016b65afc2c8ad34182a86304ccc710e637abe4218dc194c`, HTML `74a6653d720350d5bf01ac1b370825fb05334b85d6d46fe9bbc370fffe3dd254` |
| `sil-release-7-000-page-2026-10-29.pdf` / `.html` / `.headers.txt` | The 7.000 release announcement. PDF `98588c108b4674a06d46eb2598d02d835f3c0e9f934721ec5eaf7821772183c2`, HTML `465383ad5b35d816d27d2e6cc207d33cb5c3b6b49fc605e00aca9f995f15e044` |
| `github-release-v7-000-2026-10-29.pdf` / `.html` / `.headers.txt` | The GitHub release the file came from. PDF `530802c01743f0921d998c85b4ab676d538a98d6fd79cd20ba1c36c4aec76616`, HTML `1efbd4b1cda83b7806edc8f17e97fd728f0af438c91558a9bebcbb644016b54d` |
| `ofl-official-text-2026-10-29.pdf` / `.html` / `.headers.txt` | openfontlicense.org: the official OFL 1.1 text. PDF `fe99162cc9fe05668f85d71c6b7b936b3492eeb691d20d0225684c90f41202d0`, HTML `43c18586117a7002005d972c7e36b4c13d3f7d424ff9b94db15552eaa3fa3c2d` |
| `gentium-download-record-2026-10-29.json` | URL, size, SHA-256 and retrieval date of the download |
| `download-headers-2026-10-29/` | HTTP response headers of the download (a redirect, then the file) |

**To check for updates:** compare the current version on software.sil.org/gentium/download with 7.000. A newer release is a new download with its own record.
