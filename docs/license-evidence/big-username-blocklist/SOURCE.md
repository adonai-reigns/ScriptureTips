# The Big Username Blocklist: license evidence

**Verdict:** Ready (MIT). Keep the copyright and permission notice with the data we generate from it.
**Evidence gathered:** 2026-10-28 (NZ time).

## License as stated by the rights holder

`LICENSE` at the pinned commit:

> "The MIT License (MIT) Copyright (c) 2015-2021 Martin Sandström Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software […] The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software."

The README ends: "The-Big-Username-Blocklist is released under the MIT License."

**What this means for us:**
- We may use, copy and merge the list into our reserved-handle table without asking.
- **The notice travels with it:** the generated table (`apps/api/src/auth/reserved-names.generated.ts`) carries the copyright line and the full permission notice, and the credits page names the list.

## What the data is

"An opinionated blocklist of words that you might not like to see used as usernames in your service (think username.domain.com, domain.com/username or username@domain.com)." Plain text, one name per line, 559 lines in six sections (privileges, code, terms, financial, sections, actions), with blank lines and no comments. No religious names and no curse words.

## Origin of the files

Pinned to commit **`c5d456f6af0285931c85e08d53ed7e1ac35d31fc`** (2021-02-13, release 2.0.1, the latest on `main`) of https://github.com/marteinn/The-Big-Username-Blocklist. Downloaded 2026-10-28 to `source-texts/big-username-blocklist/`:

| File | Bytes | SHA-256 |
|---|---|---|
| `list_raw.txt` | 4,146 | `aa22cc5da02fd90ef90a38179e2d16fe36c4504563472deebb0aeda679dbd8b9` |
| `LICENSE` | 1,090 | `6c9c512b6c4a94416c5024970736fa21625be32fae84f79edb124efad29e8430` |
| `README.md` | 2,939 | `7e46d778c719d3e1bbcf091f98266138d5406ffa6fcd1e9318839c08e3fd657a` |

URLs, sizes and dates are in `big-username-blocklist-download-record-2026-10-28.json` and `../source-files.json`.

## Files in this folder

| File | What it is |
|---|---|
| `github-repo-page-2026-10-28.pdf` | Screen-mode capture of the repository at the pinned commit (headless Chromium through Playwright, 2026-10-28 21:51 NZDT, 3 pages): file list and rendered README. SHA-256 `99e9716fddb03c8eab40c3de92276668b479199e4205667efb83465b73c7f1bb` |
| `github-repo-page-2026-10-28.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `e8070f98575ea1269e504e3034bfb0e5796abac3081a68dd66940ff98b066673` |
| `github-license-page-2026-10-28.pdf` | The `LICENSE` file at the pinned commit. SHA-256 `c3b23bb66b32a56e203d5901d42d061a032f69d02fa7190a7a1c07618b01149c` |
| `github-license-page-2026-10-28.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `7dc435fcf0b2aad723fe4642140992c6da6568c79e0aec659eb43a860d6403b2` |
| `github-commit-page-2026-10-28.pdf` | The pinned commit's page: date and author. SHA-256 `3bd1d9866414a22735867cb31a75805998402ea7cd66548626f421f96a8364b0` |
| `github-commit-page-2026-10-28.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `0aec35ef9d7a4ec34e4f277ae92bddfcfd940801493edb7fee05ecd446cf737e` |
| `big-username-blocklist-download-record-2026-10-28.json` | Commit, URL, size, SHA-256 and retrieval date of each downloaded file |
| `download-headers-2026-10-28/` | HTTP response headers of each download |

**To check for updates:** compare the latest commit on `main` with `c5d456f`. A newer list is a new import: download it at its commit and record new hashes, rather than overwriting this record.
