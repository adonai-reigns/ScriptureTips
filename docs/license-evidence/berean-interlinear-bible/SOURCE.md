# Berean Interlinear Bible (BIB): license evidence

**Verdict:** Ready (public domain since 2023-04-30, per the Berean terms page), **with a caveat:** the downloadable files predate the dedication and still print a 2016 copyright notice. Written confirmation from the Berean team would settle it.
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

The Berean terms page (captured on 2026-10-25 in [`../berean-standard-bible/`](../berean-standard-bible/), unchanged on 2026-10-26):

> "The Berean Bible and Majority Bible texts are officially dedicated to the public domain as of April 30, 2023. All uses are freely permitted."

> Linking list: "**//interlinearbible.com - Berean Interlinear Bible**, //literalbible.com - Berean Literal Bible, //bereanbible.com - Berean Standard Bible, …"

interlinearbible.com links "Free Licensing" to berean.bible/licensing.htm ("Licensing is not required for any use").

**The conflict:** both downloadable files (`bib.pdf`, `bib.docx`, created March–May 2016) carry the pre-dedication notice:

> "The Holy Bible, Berean Interlinear Bible, BIB. Copyright ©2016 by Bible Hub. All Rights Reserved Worldwide. Published by Bible Hub." "The BGB text may be quoted in any form (written, visual, audio, or electronic) up to two thousand (2000) verses without written permission of the publisher. […] Additionally, free licensing for use of the full text in software, apps, and websites is available through the following Berean Bible websites: www.Berean.Bible …"

The 2023 dedication is later and comes from the same publisher, so it should prevail; the files simply weren't regenerated. This also changes the OpenGNT note in sources.md §4: the BIB glosses it bundles ("Copyright ©2016, 2018 by Bible Hub, Used by Permission") are now public domain too, although OpenGNT's other content still needs checking.

## What the text is

New Testament only. "The interlinear gloss is a word for word, Greek / Hebrew word order rendering based on the most reliable sources. This text also contains complete parsing tags, as well as Strong's numbers for easy reference to Greek lexicons." (interlinearbible.com). The Greek base is the **Berean Greek Bible (BGB)**: "The Nestle 1904 was chosen, as we believe it is the most accurate critical text currently in the public domain. Paragraph and poetry formatting for the Greek Text has been adapted from Westcott and Hort, 1881." The page also lists NA28 (© 2012 Deutsche Bibelgesellschaft) among the texts it compares against; that's a reference, not the base text.

The separate Berean Greek Bible files (`greekbible.org/bgb.pdf`, `bgb.docx`) aren't held ([sources.md](../../sources.md) §8 item 8).

## Origin of the files

Downloaded 2026-10-26 to `source-texts/berean-interlinear-bible/`:

| File | URL | Bytes | Last modified |
|---|---|---|---|
| `bib.pdf` (929 pages, "BIB New Testament") | https://interlinearbible.com/bib.pdf | 12,973,694 | Thu, 05 May 2016 06:12:58 GMT |
| `bib.docx` | https://interlinearbible.com/bib.docx | 7,273,311 | Thu, 05 May 2016 06:05:41 GMT |

SHA-256 values are in `bib-download-record-2026-10-26.json` and `../source-files.json`. Neither is a structured data format; structured word-level data may be available in the Berean tables on the downloads page (for example `bsb_tables.xlsx`; not checked).

## Files in this folder

| File | What it is |
|---|---|
| `interlinearbible-home-page.pdf` | Screen-mode capture of https://interlinearbible.com/ (headless Chromium through CDP, 2026-10-26 07:28 NZDT, 5 pages): description, sources, licensing link. SHA-256 `f016546c3da73aa9ac92fb329ea01b107b7b6cc93b1d22d6a2437d2d2d68c046` |
| `interlinearbible-home-page.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `f754a0d1cdb256d3a12c67adad90fe26f548a92d8bf5d5ac11d37515e788ff02` |
| `bib-download-record-2026-10-26.json` | URL, size, SHA-256 and last-modified date of each downloaded file |
| `download-headers-2026-10-26/` | HTTP response headers of each download |
