# JPS TaNaKH (1917, Old Testament only): license evidence

**Verdict:** Ready (public domain)
**Evidence gathered:** 2026-10-25 (NZ time), by automated capture from the origins below.

## License as stated by the rights holder

> eBible.org: "Public Domain". Not the later JPS translations (1972 onward), which are copyrighted.

**Conditions:** None.

## Origin of the files

- **engjps:** <https://ebible.org/Scriptures/engjps_usfm.zip>, 1,052,469 bytes, SHA-256 `952033091b8637befd49818f2daa412dcccce630e518c5a9aa05b072129879c4`, last modified Tue, 20 Oct 2026 22:00:49 GMT
- **eBible.org `engjps`:** "JPS TaNaKH 1917". Catalog: Redistributable=True, Copyright="public domain", updated 2023-09-19, OT/NT/DC books 39/0/0.

## Files in this folder

| File | What it is |
|---|---|
| `engjps-catalog-entry.json` | eBible.org catalog row for this translation (from translations.csv) |
| `engjps-copyright-page.pdf` | Rendered copyright page (as the 2020 LEB captures were made: browser print-to-PDF, with date and URL) |
| `engjps-copyright-page.html` | Raw HTML of the copyright page |
| `engjps-copyright-page.headers.txt` | HTTP response headers (retrieval date and server) |
| `engjps-details-page.pdf` | Rendered download/details page (formats, last-updated date) |
| `engjps-details-page.html` | Raw HTML of the details page |
| `engjps-details-page.headers.txt` | HTTP response headers |
| `engjps-copr-inside-archive.htm` | The copyright page shipped inside the USFM archive itself |
| `engjps-usfm-archive-record.json` | URL, size, SHA-256 and date of the exact USFM archive |
| `crosswire-jps.conf` | CrossWire SWORD module config for JPS (independent record; see DistributionLicense) |

## Re-verifying

Fetch the archive URL again and compare its SHA-256 with the value above. If it differs, the text has been updated: re-read the license page and record a new capture rather than overwriting this one.

## The eBible copy is renumbered (found 2026-10-25)

**eBible's `engjps` uses the KJV versification, not the 1917 printing's.** The printing follows the Hebrew numbering (Malachi 3:19–24, Joel 4, Psalm titles numbered as verse 1); `engjps` has Malachi 4, Joel 3 and unnumbered Psalm titles. eBible made that change before we downloaded it. Our copy of `engjps` is untouched and still matches its recorded hash. Project policy: never change a third-party text's numbering, so the original-numbered sources below are kept for the 1917 text.

## Original-numbered sources (obtained 2026-10-26)

### 1. Internet Archive scan: `archive.org/details/jps1917` (authoritative record of the printing)

> Title "JPS 1917", creator "Jewish Publication Society", date 1917, description "The Jewish Publication Society's The Holy Scriptures According to the Masoretic Text: A New Translation (1917)". License: **Public Domain Mark 1.0** (`http://creativecommons.org/publicdomain/mark/1.0/`). Uploaded 2020-01-11 by `hierophant@opensiddur.org` (the Open Siddur Project).

A full page scan (1,160 pages) in several formats: PDF with a text layer, DjVu, EPUB, page images (JP2), and Internet Archive's automatic OCR (`_djvu.txt`, `_djvu.xml`, `_abbyy.gz`). The OCR is uncorrected and garbles verse numbers (verse 22 of Malachi 3 reads as `^`), so it isn't usable as text without proofreading. The scan confirms the Hebrew numbering: "21 And ye shall tread down the wicked" is Malachi 3:21.

All 10 files were downloaded to `source-texts/jps-tanakh-1917/archive-org-jps1917/`, about 1 GB. Every file matched the SHA-1 that archive.org publishes in `jps1917_files.xml`. URLs, sizes, SHA-256 and last-modified dates are in `archive-org-jps1917-download-record-2026-10-26.json` and in `../source-files.json`.

### 2. Open Siddur plain text: `Tanakh1917.txt` (a ready-made transcription)

From the file's own header:

> "The Jewish Publication Society supports the Open Siddur Project's efforts to remix the 1917 JPS English translation of the TaNaKh, thereby adding value to an important historical work produced by JPS which has entered into the Public Domain."

> "This plaintext edition of the 1917 JPS is a direct conversion by the Open Siddur Project of the 1917 JPS provided as a PDF document by the Jewish Publication Society on March 10, 2011."

From Open Siddur's page (Wayback snapshot of 2013-05-17): "We are grateful to JPS for contributing an authoritative digital edition of the 1917 JPS to the Public Domain, and for this statement of support." The page offers "Download your copy: PDF | TXT". The PDF link points to JPS's own product page (`jewishpub.org/product.php?id=473`, now jps.org, where the free e-book needs a newsletter sign-up), and the TXT link points to `opensiddur.org/wp-content/uploads/2010/08/Tanakh1917.txt`. The page also says Open Siddur's later XML edition "will be licensed with the Creative Commons Zero (CC0) Public Domain declaration".

opensiddur.org now refuses automated requests (HTTP 403), so the TXT was taken from the **Wayback Machine snapshot of 2011-05-07** (the `id_` raw-file URL) into `source-texts/jps-tanakh-1917/opensiddur-wayback/`. Encoding: Windows-1252 with CRLF line endings, left as downloaded. Not checked yet against the scan.

JPS's own free e-book of the 1917 edition isn't held ([sources.md](../../sources.md) §8 item 11).

### Files added on 2026-10-25 and 2026-10-26

| File | What it is |
|---|---|
| `archive-org-jps1917-item-page-2026-10-26.pdf` | Screen-mode capture of https://archive.org/details/jps1917 (headless Chromium through CDP, 2026-10-26 06:12 NZDT, 3 pages; shows "Public Domain Mark 1.0"). The embedded book viewer renders blank. SHA-256 `27ad04cf9e23fc5e537eef204c549e78d5974b4d5ddecf6ab9af376484e760c0` |
| `archive-org-jps1917-item-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `5e39cc36fb9d6e0c3081ce6ad0c89d23d97628a7525343a3820839e938cd2177` |
| `archive-org-jps1917-metadata-2026-10-26.json` / `.headers.txt` | The item's full metadata record (https://archive.org/metadata/jps1917), including every file's MD5 and SHA-1. SHA-256 `7d63a4819f7cd9e00d4298b7c60ec15a99cee9e9edc316ecde8f2a3dcdedd3c3` |
| `archive-org-jps1917-download-record-2026-10-26.json` | URL, size, SHA-256, archive.org SHA-1 and last-modified date of each downloaded file |
| `opensiddur-jps1917-page-wayback-20130517-captured-2026-10-26.pdf` | Print capture of Open Siddur's JPS 1917 page as archived by the Wayback Machine on 2013-05-17 (headless Chromium, 2026-10-26 06:14 NZDT, 3 pages). SHA-256 `d9004df6fe64b8944316ecc688924c0e5c13fac1a00f69686bd39813a0f0a773` |
| `opensiddur-jps1917-page-wayback-20130517-captured-2026-10-26.html` / `.headers.txt` | Raw HTML and headers of that snapshot. HTML SHA-256 `7caf357ccce28f20937ff5ce9a3beb4688211f764de420adf235c35a59bbb57a` |
| `opensiddur-tanakh1917-txt-download-record-2026-10-26.json` | Original URL, Wayback URL and timestamp, size, SHA-256 and encoding of `Tanakh1917.txt` |
| `download-headers-2026-10-26/` | HTTP response headers of every file download above |
| `sefaria-jps1917-version-record-2026-10-25.json` / `.headers.txt` | Sefaria's version record for JPS 1917, which names Open Siddur as its source: "JPS graciously shared digital images of this text with the Open Siddur Project, from which the text was imported by Sefaria." SHA-256 `c4c9f49504d557b3b08d0d247043d2070d72980d923b6bc7abd91d83c46b8031` |
| `sefaria-jps1917-numbering-check-2026-10-25.json` | Sefaria's Malachi 3 (24 verses), Joel 4 (21 verses) and Psalm 3 (9 verses, title as verse 1), with request URLs. SHA-256 `aa5b83228a6a9f7e22faad15e3996b26140ead40ecb6e7c4ccc8fd07f7e2db8a` |
