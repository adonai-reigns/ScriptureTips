# Berean Literal Bible (BLB): license evidence

**Verdict:** Ready (public domain since 2023-04-30). **Draft text:** "This is an early draft version and will be updated."
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

The Berean terms and licensing pages (captured on 2026-10-25 in [`../berean-standard-bible/`](../berean-standard-bible/), unchanged when re-read on 2026-10-26) cover all the "Berean Bible" texts, and list the BLB's site among them:

> "The Berean Bible and Majority Bible texts are officially dedicated to the public domain as of April 30, 2023. All uses are freely permitted." (`berean-terms-page`)

> "Linking (appreciated but not required): //berean.bible - Berean Bible Homepage, //interlinearbible.com - Berean Interlinear Bible, **//literalbible.com - Berean Literal Bible**, //bereanbible.com - Berean Standard Bible, //majoritybible.com - Majority Standard Bible" (`berean-terms-page`)

> "Licensing is not required for any use." (`berean-licensing-page`)

The downloaded text file states it directly, in its first two lines:

> "The Holy Bible, Berean Standard Bible, BLB is produced in cooperation with Bible Hub, Discovery Bible, unfoldingWord, Bible Aquifer, OpenBible.com, and the Berean Bible Translation Committee. This is an early draft version and will be updated."
> "This text of God's Word has been dedicated to the public domain. Free resources and databases are available at LiteralBible.com."

literalbible.com links its "Free Licensing" and "Free Downloads" menu items to the berean.bible licensing and downloads pages.

**Requests (not conditions), from the terms page:** attribution and linking are "appreciated but not required"; "For derivative works that vary from the official text, we respectfully request that the Berean name is not used." ScriptureTips should honor this the same way as for the BSB: show the Berean name only on verbatim text, not on user compilations that change it (the `name_restriction` rule, licenses.md §8).

## What the text is

- **Whole Bible, 66 books, 31,102 verses** (KJV versification). It used to be New Testament only. literalbible.com: "The first full draft of the Berean Literal Bible is now online", "We are currently entering a period of consistency checking, proofing, and public comment."
- **Numbering:** English (Joel 3 chapters, Malachi 4; no 3 John 1:15 or Revelation 12:18). Disputed verses (for example Matthew 17:21, Mark 9:44, Acts 8:37, Romans 16:24) are present as **empty rows**, so the verse grid matches the KJV.
- Because it's a draft that will change, pin the file by its hash and expect later releases.
- The Word file carries no notice; the PDF's first pages show none either. The public-domain statement is in the `.txt` file and on the Berean terms page.

## Origin of the files

Downloaded 2026-10-26 to `source-texts/berean-literal-bible/` from the links on literalbible.com and berean.bible/downloads.htm:

| File | URL | Bytes | Last modified |
|---|---|---|---|
| `blb.txt` (tab-separated, UTF-8 with BOM) | https://literalbible.com/blb.txt | 4,654,213 | Wed, 08 Apr 2026 17:39:02 GMT |
| `blb.xlsx` | https://literalbible.com/blb.xlsx | 2,328,165 | Wed, 08 Apr 2026 17:36:28 GMT |
| `blb.pdf` (2,114 pages) | https://literalbible.com/blb.pdf | 11,087,159 | Thu, 09 Apr 2026 02:33:54 GMT |
| `blb.docx` | https://literalbible.com/blb.docx | 3,221,146 | Thu, 09 Apr 2026 01:22:57 GMT |

SHA-256 values are in `blb-download-record-2026-10-26.json` and `../source-files.json`.

## Files in this folder

| File | What it is |
|---|---|
| `literalbible-home-page.pdf` | Screen-mode capture of https://literalbible.com/ (headless Chromium through CDP, 2026-10-26 07:27 NZDT, 3 pages): "The first full draft of the Berean Literal Bible is now online", the download links and the proofing notice. SHA-256 `b68bb9a17a28b9850a3e220fc9b909c5b8321003a4e0dca8c8d0d2353f970836` |
| `literalbible-home-page.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `fb689731f3a4a79f7d93b2e0a57b9aab9815f5b50a255f21aee5d2ed45df291b` |
| `blb-download-record-2026-10-26.json` | URL, size, SHA-256 and last-modified date of each downloaded file |
| `download-headers-2026-10-26/` | HTTP response headers of each download |
