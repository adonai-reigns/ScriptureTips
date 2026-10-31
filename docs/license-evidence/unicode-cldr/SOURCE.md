# Unicode CLDR territory data: license evidence

**Verdict:** Ready (Unicode License v3, SPDX `Unicode-3.0`). Keep the copyright and permission notice with the data we generate from it.
**Evidence gathered:** 2026-10-31 (NZ time).

## License as stated by the rights holder

`LICENSE` in the cldr-json repository at the pinned commit (last changed by "CLDR-17110 licensing update"), and Unicode's own terms page, which says that "All Unicode Data Files and Unicode Software are subject to the terms and conditions of the free and open-source Unicode License v3" and lists `https://github.com/unicode-org/` among the Data Files directories:

> "UNICODE LICENSE V3 … Copyright © 2015-2024 Unicode, Inc. … Permission is hereby granted, free of charge, to any person obtaining a copy of data files and any associated documentation (the "Data Files") … to deal in the Data Files or Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, and/or sell copies of the Data Files or Software … provided that either (a) this copyright and permission notice appear with all copies of the Data Files or Software, or (b) this copyright and permission notice appear in associated Documentation. … Except as contained in this notice, the name of a copyright holder shall not be used in advertising or otherwise to promote the sale, use or other dealings in these Data Files or Software without prior written authorization of the copyright holder."

**What this means for us:**
- We may use the territory data to build our list of countries without asking, and ship it.
- **The notice travels with it:** the generated list (`packages/countries/src/countries.generated.ts`) carries the full copyright and permission notice, and the credits page names CLDR.
- Unicode's terms also say no license is granted to copy or "mirror" its website, and that fonts and font data can't be extracted from Unicode Products. We use neither.
- The names of countries are not in these files: they come from the runtime's own `Intl.DisplayNames` (CLDR data built into Node and the browsers), which we call and don't copy.

## What the data is

CLDR is the Unicode Common Locale Data Repository, release **49** (cldr-json 49.0.0, published 2026-10-22). We use two supplemental files from `cldr-json/cldr-core/supplemental/`:

- `territoryInfo.json`: every territory CLDR holds data for, as two-letter codes (ISO 3166-1 alpha-2, and Kosovo's user-assigned `XK`), 258 of them including `ZZ` ("unknown region"). **This is the source of the country list.**
- `territoryContainment.json`: the UN M.49 grouping (continents, `EU`, `UN` …). Used only to check that no grouping slipped into the list.

**What the generator leaves out (and why):** `ZZ`, and the seven codes ISO reserves "exceptionally" and that are not ISO 3166-1 entries (`AC` Ascension Island, `CP` Clipperton Island, `CQ` Sark, `DG` Diego Garcia, `EA` Ceuta and Melilla, `IC` the Canary Islands, `TA` Tristan da Cunha): their people belong to a country that is on the list. What's left is **250 codes: the 249 ISO 3166-1 entries and `XK`.** Taiwan (`TW`), Palestine (`PS`), Hong Kong, Macao and the dependent territories are all in.

## Origin of the files

Pinned to commit **`a4b67247b446fd51b475991017a2481911210c60`** (tag `49.0.0`, 2026-10-21 23:53 UTC) of https://github.com/unicode-org/cldr-json. Downloaded 2026-10-31 to `source-texts/unicode-cldr/`:

| File | Bytes | SHA-256 |
|---|---|---|
| `territoryInfo.json` | 187,760 | `c8aa7654c87de234118f14ada0e1466eb09467bed4048da7eab3e7e63ffe335d` |
| `territoryContainment.json` | 11,991 | `9d124223e0005038b3ce0b9c2b80f8f30f221658373768aaa98bc28b3cdd9beb` |
| `LICENSE` | 2,033 | `220ba0e1c43b99530d2d5bdb892a99dca0989414f51ab695ecd90163eaa1ec3b` |
| `README.md` | 2,473 | `6d47338086101a7e7675ab292f1ab88c1e3c1a6245b3a63b9a8f7f4fd79c0091` |

URLs, sizes and dates are in `unicode-cldr-download-record-2026-10-31.json` and `../source-files.json`.

## Files in this folder

| File | What it is |
|---|---|
| `github-license-page-2026-10-31.pdf` | Screen-mode capture (headless Chromium through Playwright, 2026-10-31 NZ time). The `LICENSE` file at the pinned commit (Unicode License v3), as GitHub shows it. SHA-256 `0893a8f5e1f27625f71133011f4db5af9eb964487c9560858e4fb7f4b219c145` |
| `github-license-page-2026-10-31.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `89f6177ffc9d9086138c089e861c52d8aeea35f6e28b6be01eb758c92289b8b7` |
| `github-supplemental-folder-2026-10-31.pdf` | Screen-mode capture (headless Chromium through Playwright, 2026-10-31 NZ time). The `cldr-core/supplemental` folder at the pinned commit, showing the two files used. SHA-256 `e61d8a80b54d7a07f78ab0fc220fecf208d47315a074ffae773b59d90d57f99c` |
| `github-supplemental-folder-2026-10-31.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `daffbb278cec6c631a1b202815e388ea38ec18903bfe007480ceea64dc102dc1` |
| `github-commit-page-2026-10-31.pdf` | Screen-mode capture (headless Chromium through Playwright, 2026-10-31 NZ time). The pinned commit's page (`release-49`). SHA-256 `8a73687eb63c53b3fb1be7b141bc43014fb5ed7272e704cda0d7e67b07046a4a` |
| `github-commit-page-2026-10-31.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `296872ed479d63969e1ee8f84c0d8287621f2c568063263058c2405a150e876c` |
| `unicode-copyright-page-2026-10-31.pdf` | Screen-mode capture (headless Chromium through Playwright, 2026-10-31 NZ time). Unicode's Copyright, Terms of Use and Licenses page (https://www.unicode.org/copyright.html). SHA-256 `fa206aadb2358af2c3361d3940f85b2df3f30b3083bad4aea543f22f7f890843` |
| `unicode-copyright-page-2026-10-31.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `9f83fb0a046180c87d22c2678e79300475125611ac8dfc2da303db6c6b347251` |
| `unicode-cldr-download-record-2026-10-31.json` | Commit, URL, size, SHA-256 and retrieval date of each downloaded file |
| `download-headers-2026-10-31/` | HTTP response headers of each download |

**To check for updates:** compare the latest release of cldr-json with 49.0.0. A newer release is a new import: download it at its commit and record new hashes, rather than overwriting this record, then run `pnpm --filter @scripturetips/source-conversion countries` against it. Country codes change rarely (ISO adds or retires a code a few times a decade).
