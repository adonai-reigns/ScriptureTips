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

opensiddur.org now refuses automated requests (HTTP 403), so the TXT was taken from the **Wayback Machine snapshot of 2011-05-07** (the `id_` raw-file URL) into `source-texts/jps-tanakh-1917/opensiddur-wayback/`. Encoding: Windows-1252 with CRLF line endings, left as downloaded. Checked against the scan and converted to USFM (below).

JPS's own free e-book of the 1917 edition isn't held ([sources.md](../../sources.md) §8 item 7).

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

## Conversion to USFM (2026-10-26)

`Tanakh1917.txt` was converted to USFM 3 by `tools/source-conversion` (`pnpm --filter @scripturetips/source-conversion jps1917`). The downloaded file isn't changed; the converter reads it and writes 39 USFM files plus two reports to `source-texts/jps-tanakh-1917/converted/`.

- **Numbering:** the printing's own (Hebrew) chapter and verse numbering, with Psalm titles as verse 1. Verse counts are checked per chapter against `books.ts`. Nehemiah 7 has 73 verses: the printing prints 7:68 in brackets (scan page 1070).
- **Checked against the scan:** every place the transcription differs from eBible's `engjps` (an independent digitization) was looked up in the Internet Archive scan. 73 transcription errors were corrected, each listed with its scan page in `corrections.ts`: missing text (Ruth 1:1–17), wrong or missing verse numbers, doubled letters, dropped and stray words. Hebrew the transcription lost inside the text (Exod 6:3, the Judg 18:30 note) was restored unpointed.
- **Remaining differences from `engjps`:** 14, each confirmed on the scan as an error in `engjps` (listed below). The end-to-end test fixes this count.
- **Compounds:** the printing hyphenates many compounds ("first-born", "to-morrow"). 28 that the scan's text layer always shows hyphenated are restored where the transcription joined them. Other line-end hyphens are dropped when the text sets the word solid elsewhere, and otherwise kept (79 kept, listed in `conversion-report.txt`).
- **Markup:** paragraphs `\p`, poetry `\q1` with stanza breaks `\b`, Psalm titles `\d`, footnotes `\f`, the divine name (LORD, GOD in small capitals) `\nd`. The verse the printing repeats after the end of Isaiah, Malachi, Lamentations and Ecclesiastes is `\lit`.
- **Lost Hebrew restored:** the transcription turned every Hebrew character into a dot. All of it is restored from the scan, unpointed as printed (`hebrew.ts`, `books.ts`):
  - the Hebrew book titles above the English ones (`\mt2`, 39);
  - the weekly Torah portion names, centered where each portion begins (`\s2`, 49); the dot count of each run matches the letters of the restored name;
  - the five Psalm book names, "ספר ראשון" to "ספר חמישי" (`\ms1`, with "BOOK I" to "BOOK V" as `\ms2`);
  - the acrostic letters in the margins (`\qac`, 238): Psalms 25, 34, 37, 111, 112, 145, Proverbs 31 and Lamentations 1–4; and the letters before Psalm 119's letter names (`\qa`, "א ALEPH."). The printing follows the Hebrew: Ps 25 prints ה and ו together at verse 5 and has no ק, Ps 37 has no ע, Ps 145 has no נ, and Lamentations 2–4 put פ before ע (checked on scan pages 791–792, 798, 800–802, 981).

### Comparison with eBible's `engjps`

The converter compares the two texts word by word (`witness-report.txt`). It ignores punctuation, capitals, hyphens within compounds, footnotes and headings, so differences of those kinds haven't been checked. Each word difference was looked up in the scan. Where the transcription was wrong it was corrected (`corrections.ts`). These 14 differences remain, and in each the scan agrees with the converted text:

| Verse (printing) | Printing and converted text | `engjps` | Scan page |
|---|---|---|---|
| Exod 6:3 | "by My name יהוה" (Hebrew in the English text) | "by my name Jehovah" | 92 |
| Lev 1:1 | "And the LORD called" | "The LORD called" | 140 |
| Lev 18:15 | "she is thy son's wife" | "she is thy son wife" | 163 |
| 2 Sam 15:14 | "let us flee; for else" | "let us flee; or else" | 406 |
| 2 Sam 22:27 | "Thou dost show Thyself pure" | "Thou dost show myself pure" | 418 |
| Ps 47:1 | "a Psalm of the sons of Korah" | "a Psalm for the sons of Korah" | 830 |
| Ps 55:3 (`engjps` 55:2) | "Attend unto me, and answer me" | "Attend unto me, and hear me" | 835 |
| Ps 82:8 | "possess all the nations" | "possess all nations" | 858 |
| Ps 100:3 | "and we are His" | "and we our His" | 869 |
| Ps 119:66 | "I have believed in Thy commandments" | "I have believed Thy commandments" | 886 |
| Ps 119:142 | "Thy law is truth" | "Thy law is the truth" | 889 |
| Job 27:19 | "there shall be nought to gather" | "there shall be not to gather" | 970 |
| Ruth 1:12 | "should I even have a husband" | "should I even have an husband" | 995 |
| Dan 2:23 | "Who hast given me wisdom" | "Who hath given me wisdom" | 1031 |

Scan pages are page numbers in the archive.org PDF, not the printed page numbers.

Other differences between the two texts, not counted above:

- **Numbering:** `engjps` uses the KJV versification (see "The eBible copy is renumbered" above). After the alignment, one verse start still disagrees, Ps 70:2, and it comes from that renumbering.
- **Compounds:** `engjps` joins or splits many compounds differently from the printing ("firstborn" for "first-born"). The converted text follows the scan.
- **Headings set as text:** `engjps` puts the Psalm book divisions ("BOOK I") and Psalm 119's letter names in the verse text. The printing sets them as headings.
- **Shared errors:** a mistake both digitizations made the same way wouldn't show up in the comparison. The two were made independently, so this is unlikely but possible.

SHA-256 of the output (`converted/`):

```
28d4465979664757e75adfae66ac94102b63421258459855461f177c06229d9b  02-GEN.usfm
fcd5b96105927fa6cc4c0585b43879388fba3f44a99c8f3745d1e8c3ab1bee11  03-EXO.usfm
ef446168345243a6e38e416f01cee6b55f7900683e88fa48fcf52bf531c5d323  04-LEV.usfm
c7992ef61d33eaa4dfaaac1df465704e6fbe4f273d7c52729cca9e9b304e679c  05-NUM.usfm
4fb40e17ecb9b06fea3df1b4ff10f23b2907a08621a56f80bbcaa9a92e1acb9f  06-DEU.usfm
41bddd1b48696d28e3ffb59f3242be3c7f4e34be681980a2b0954033383a0b4a  07-JOS.usfm
3499ab845da12cb3fc25417f573f65bd1c1b69f6c6c2cad9315ec9be30cc18ff  08-JDG.usfm
cb048c7e3c68155c823e7a634bbede96cc9668618064b6373f919b4137f33204  09-1SA.usfm
d94c31a52c5436cb731b468e189694d4eea303f98545d8a8f81c39f380b7b55c  10-2SA.usfm
2ec9caafd9de48ca158b50729012f6f9b91b6ccf7a4633836220896fa50cb67d  11-1KI.usfm
530084c8b7ce1d4033d826805c0433dac3efc4ad05d995591830ed0dbc1a0cf6  12-2KI.usfm
a50b874915af8a08ddff7cd90ad2546b0d3397bcf8422d194012e8799eb5a2c0  13-ISA.usfm
72f7e55185e8020d8cc241f92bb0bc463dd98e28a0b00c255d3f0682a5ecf377  14-JER.usfm
cfc20038ffcba04274036c3bec0848c67385c35f9c1456a2108e31e49dcad2da  15-EZK.usfm
c2d143f1adbc4fc7d1181ac4eadbe143ca5a1263af7e43ed759371aea623c507  16-HOS.usfm
64876cb8695cd5eefd17850627463b59a6298d974ca0001fdc0c6be007401e59  17-JOL.usfm
5ab070f66bc127711a0b9100cb02361e0091f2f5595bda8afd270b173ed3da05  18-AMO.usfm
be55c517c5b5db842cce7e92177c607caf3cc3f76001e4da79c8fdc8ed98eff1  19-OBA.usfm
2da8fa128d4c4936e1c03862a3cf37ceaad1f8fdcdf40d81cb2dd29f0c8e150b  20-JON.usfm
e770f59e67ac27c02420bbd0766bade8474f2682ac151e4d00f282dcac3a64b1  21-MIC.usfm
6f9af46c19af6267629521ba2d29558ae9d0ee559a37caa88ff5b4dfc3d4501a  22-NAM.usfm
f34025eca2f905864e83c74ceb40883d1ec4aa71ef795eeb5f6a3137565d9523  23-HAB.usfm
e97f4aef9d7e0fca203653f7a7ae98cf696924e76e99198f35f135e2333be105  24-ZEP.usfm
dbda20dff7a4c9c85dcb257c56555b90ddcacd1571853b95b779cc70204412fb  25-HAG.usfm
e8cd7d676398f31fdb65aaf013fbda71324721fd9b9f7d5bcf012570253bb038  26-ZEC.usfm
647f906f8304166771a86bdd9ca6953c1b6fe5185070f9d20110741612afc90f  27-MAL.usfm
a420885fae531e7ff423a0f02596ce47be2bc676789cb458888ae7871063ef97  28-PSA.usfm
cd1260cc118ace9ba8bf1c9ce4df643a3c43dd58aa462cb463ae83de118363ac  29-PRO.usfm
52980253549933ef6136ad7bfd6239aee010ef4a3ce90fc2c033a4e80ea2eff3  30-JOB.usfm
5ec15c95bdcd5bee4881d8cc36c7f6c264ac69ce92f70fa99aaae68b79866d01  31-SNG.usfm
422fc0ac0738f89fac9fc2b2cdede4392ec2b36b6ee3a6f7c96cd4603b6b39cd  32-RUT.usfm
1589ec6344807da33bce34a4a8f8a43356df7229254908b7b6edfee14a36e5f9  33-LAM.usfm
2274c910868ee3ca500196afeb4d8f3bc8ee7528a759fb1351cbbc699e063b69  34-ECC.usfm
d873cc23e0fcae8dd8c00a7eac409ec16ef77f81040cf7a901a817980bf0bcf9  35-EST.usfm
ea4a92d3e33c35b33f135c25fa2baf0be16f84f9861d4e12b41a71ff4f15a06d  36-DAN.usfm
c122c2339c5ee5843fcce42139ea3cc5c9ad62437226dda2a4a22d6d89ed4327  37-EZR.usfm
06bce72bc1c0470aaafe4446dd50aa116292919094ab59e8c91d190012a7b661  38-NEH.usfm
7f84d8aea9c467cf0546148068efb4ed4e2cc16f5ace7db7eda36b2224b4d80c  39-1CH.usfm
4779189a201756b7a08c25fcafd39fca6c39a60a3bd8f583576330926545ddcd  40-2CH.usfm
a25e9f58bcf2df37819d8aa9402d047d803c6318aa695cd038ecf8be007b7f85  conversion-report.txt
cd5675c3c93e0f3947680ba604e87705964ea2c5e7c96d611461fa22bf0b81b3  witness-report.txt
```

The output is regenerated from the source and the converter, so these hashes change whenever `corrections.ts` or the converter changes.
