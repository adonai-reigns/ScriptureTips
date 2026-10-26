# New Living Translation (NLT): license evidence

**Verdict:** Wanted, permission needed for the full text ([sources.md](../../sources.md) §4.1). No full text is held. **Planned route (decided 2026-10-26):** verses fetched on demand through Tyndale's NLT API into the scripture cache, used within the fair-use terms.
**Evidence gathered:** 2026-10-26 (NZ time): Bible Gateway's copyright tab, Tyndale's own permissions page, the NLT API pages and Tyndale's purpose page.

## License as stated by the rights holder

Copyright holder: **Tyndale House Foundation**; permissions handled by **Tyndale House Publishers, Inc.** (Carol Stream, Illinois). The wording below is the publisher's copyright and permissions statement as published on Bible Gateway's NLT version page (copyright tab).

> "Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Inc., Carol Stream, Illinois 60188. All rights reserved."

> "The text of the Holy Bible, New Living Translation, may be quoted in any form (written, visual, electronic, or audio) up to and inclusive of five hundred (500) verses without express written permission of the publisher, provided that the verses quoted do not account for more than twenty-five percent (25%) of the work in which they are quoted, and provided that a complete book of the Bible is not quoted."

> "When quotations from the NLT text are used in nonsalable media, such as church bulletins, orders of service, newsletters, transparencies, or similar media, a complete copyright notice is not required, but the initials NLT must appear at the end of each quotation."

> "Quotations in excess of five hundred (500) verses or twenty-five percent (25%) of the work, or other permission requests, must be approved in writing by Tyndale House Publishers, Inc. Send requests by e-mail to permission@tyndale.com or call 1-630-668-8300, ext. 5023."

> "Publication of any commentary or other Bible reference work produced for commercial sale that uses the New Living Translation requires written permission for use of the NLT text."

> "TYNDALE, New Living Translation, NLT, and the New Living Translation logo are registered trademarks of Tyndale House Publishers, Inc."

The page also gives three credit lines to choose from ("Scripture quotations are taken from…", "Unless otherwise indicated, all Scripture quotations are taken from…", "Scripture quotations marked NLT are taken from…").

**What this means for us:** users cannot use NLT as a base translation, cannot embed an entire book, must not use more than 500 verses total in any compilation, and must not export any compilation where NLT comprises more than 25% of the verses. Online, each page displayed may show no more than 50 NLT verses, and NLT words may make up no more than 25% of the work (see below).

## Tyndale's own permissions page (captured 2026-10-26)

https://www.tyndale.com/permissions, "Permissions and Fair-Use Guidelines", section "HOLY BIBLE NLT". It differs from the Bible Gateway wording in one important way: the 500-verse allowance covers **print and eBook** only.

> FAIR USE: "The text of the Holy Bible, New Living Translation (NLT), may be quoted in any **print or eBook form**, up to and inclusive of 500 verses without express written permission of the publisher, provided that the verses quoted do not account for more than 25 percent of the work in which they are quoted, and provided that a complete book of the Bible is not quoted." "Quotations in excess of five hundred (500) verses or twenty-five percent (25%) of the work, or other permission requests, must be approved in writing by Tyndale House Publishers. Send requests by email to permission@tyndale.com or through the Permissions Questionnaire."

> ONLINE PLATFORMS, sermons and Bible teachings online: "Permission to quote up to 50 verses per recording", "The scripture quotes can make up to 25% of the spoken content", "Recording cannot be commercial or monetized".
> Other online formats (podcasts, YouTube, social media) when Bible content is over 25%: "Permission to quote up to 250 verses per recording", "No more than 30 videos/episodes/posts containing NLT may be up on page at a time", "No post can contain an entire book of the Bible", "Recording cannot be commercial or monetized". Each needs the full credit line in the description.

> FURTHER GUIDELINES: "All material quoted from the NLT must be done so accurately, including punctuation, capitalization, italics, etc. Tyndale must be made aware of any intended deviation in style, in writing, prior to publication." "Permission given by Tyndale House Publishers for the use of text from the NLT applies to the specific use requested. […] you may not pass permission on to another person."

The page also gives three credit lines (NLT used exclusively, with other translations, or mostly NLT), the non-salable media rule (initials "(NLT)" after each quotation), and rules for commentaries, music and artwork.

**What this adds for us:**
- The gratis allowance names print, eBooks and recordings; websites and apps aren't mentioned. The online platforms section is written for audio and video recordings, but shows Tyndale intends the NLT to be used online under fair use, with attribution, as long as it isn't a substantial part of the resulting work.
- **How ScriptureTips applies it (project decision, 2026-10-26).** The online platforms rules for sermons and teachings are applied in principle to our online pages (notes, links, published compilations and any other displayed page):
  - **No more than 50 NLT verses per page displayed** (per note, per link, or per any other page shown), from "up to 50 verses per recording".
  - **No more than 25% of the entire work.** "The scripture quotes can make up to 25% of the spoken content" counts **words**, so on a note the NLT words may be at most a quarter of the total: every NLT word must be accompanied by at least three words that don't come from the NLT, even when fewer than 50 verses are used.
  - The full credit line is shown with the content (the equivalent of "attribution in the description"), and nothing is monetized (ScriptureTips never is).
  - Where a page would exceed these limits, the NLT verses beyond them are replaced by a link to a configurable external scripture reader (set per translation; no particular service is preferred).
  - This is our reading of terms written for recordings; it isn't stated for websites. Ask Tyndale to confirm it when requesting fuller permission.
- **No modification:** quotations must be exact, including punctuation and italics. User compilations that alter NLT verses can't present them as NLT (the `no_modification` rule, licenses.md §8).
- **Permission isn't transferable:** a license to ScriptureTips wouldn't extend to users' own published or printed works; those fall under the fair-use terms above.

## Tyndale's NLT API (captured 2026-10-26)

https://api.nlt.to/, run by Tyndale House Publishers. This is the planned source route for NLT text: verses are fetched as users choose them and kept in the scripture cache ([domain-model.md](../../domain-model.md) §2.5); no full copy is downloaded.

> "Tyndale provides this API to the NLT for other web applications to use to include NLT text and search results on their own web pages."

> Anonymous access: "No more than 50 verses per request", "No more than 500 requests per day", "Non-commercial use (please sign up for commercial use license)", "You affirm that your use is consistent with Tyndale's purpose".

> Key-based use: "No more than 500 verses per request (this matches the NLT copyright statement)", "No more than 5000 requests per day", "Non-commercial use (if your use is commercial, please explain when you sign up how you wish to use the API)", "You affirm that your use is consistent with Tyndale's purpose".

- The API page and documentation say nothing about storing or caching the text, and set no cache lifetime.
- "Tyndale's purpose" links to https://www.tyndale.com/purpose: "Minister to the spiritual needs of people, primarily through the publication of literature consistent with biblical principles and through grants to other charitable entities." Core values include "Driven to make God's Word accessible".
- Endpoints (documentation): `passages` (HTML excerpt for one or more references), `search`, `parse` (references, JSON), `tag` (links Scripture references in HTML to the NLT website), `plans` and `reading` (reading plans). The key goes in the `key` query parameter; without one, the caller's IP address is the key.
- Versions served: `NLT` (American English), `NLTUK` (UK English), `NTV` (Nueva Traducción Viviente) and `KJV`.
- The sign-up form (https://api.nlt.to/Account/Register) asks for name, email, phone, organization, website and "Purposed Use". No key has been requested yet ([sources.md](../../sources.md) §8 item 12).

## Versification and canon

From the Bible Gateway book list (in the raw HTML): 66 books, **English chapter numbering** (Joel 3 chapters, Malachi 4). Verse-level differences weren't checked.

## Files in this folder

| File | What it is |
|---|---|
| `biblegateway-nlt-version-page.pdf` | Screen-mode capture of https://www.biblegateway.com/versions/New-Living-Translation-NLT-Bible/ with the Copyright tab opened (headless Chromium through CDP, 2026-10-26 07:13 NZDT, 5 pages, date and URL in the header and footer). A cookie notice covers a few lines on page 1; the full wording is in the PDF's text layer and in the HTML. SHA-256 `30709f02d694c09b3a9a70d4532ac1b6b08cd1bb5acab9ab7757b6d1d5762563` |
| `biblegateway-nlt-version-page.html` | Raw HTML of the same page (includes the copyright text and the book list). SHA-256 `3d0b1ce5022236b547254a0cf0aa12ba36ef7ce5bf1dd1c4f7ee519388c92179` |
| `biblegateway-nlt-version-page.headers.txt` | HTTP response headers (HTTP 200, 2026-10-25 18:13 GMT) |
| `tyndale-permissions-page-2026-10-26.pdf` | Screen-mode capture of https://www.tyndale.com/permissions with the "HOLY BIBLE NLT" section opened, taken in the project owner's Chromium through the remote debugging connection (the site blocks automated browsers), 2026-10-26 07:50 NZDT, 6 pages, date and URL in the header and footer. SHA-256 `ea4f3f65e836da49f8947339fc6fec85c6ebae21f8505e86e29f431c57178a80` |
| `tyndale-permissions-page-2026-10-26.html` | The same page's DOM as rendered in the browser (after scripts ran), not the raw server response; no HTTP headers were available this way. SHA-256 `d5c2676bf27b2adc49cb3e9837899d9b67d8d3cfe74927b8d65ffe2273901689` |
| `nlt-api-home-page-2026-10-26.pdf` | Screen-mode capture of https://api.nlt.to/ (headless Chromium through CDP, 2026-10-26 09:04 NZDT, 2 pages): anonymous and key-based limits. SHA-256 `8e6390e1bc04bde9f9b605d9d639317e9c946ed28a063f55de9a9893bca7897f` |
| `nlt-api-home-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page (HTTP 200, 2026-10-25 20:04 GMT). HTML SHA-256 `3f37857b4027da5d906c246f9f31fc1fbeab277ba46eef0dec967a0556ce0091` |
| `nlt-api-documentation-2026-10-26.pdf` | Screen-mode capture of https://api.nlt.to/Documentation (3 pages): endpoints, parameters, versions. SHA-256 `703c4f84c50e3081d5387aa25a36d7e572b70f4949bbdf65503059077067ea7c` |
| `nlt-api-documentation-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `e6a4a15d6b022bbe4a1bcebbcd82ab9b8ba177677b3df041cc880248ecbd64fd` |
| `nlt-api-register-page-2026-10-26.pdf` | Screen-mode capture of https://api.nlt.to/Account/Register (2 pages): the key sign-up form. SHA-256 `086e29a9b318017b08237712b58430e0524f3ec508e265ac3743887c18bad550` |
| `nlt-api-register-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers of the same page. HTML SHA-256 `003dc8a1e5bc2fff0067e99e94b286ec2ced05692530b1fd6c09c5e156cb8761` |
| `tyndale-purpose-page-2026-10-26.pdf` | Screen-mode capture of https://www.tyndale.com/purpose, linked from the API terms as "Tyndale's purpose"; taken in the project owner's Chromium (the site blocks automated browsers), 2026-10-26 09:05 NZDT, 3 pages. SHA-256 `703ca5aff7dcdaa3e16ff16c4792be550ee088222e0415ec5013e67854f9c4db` |
| `tyndale-purpose-page-2026-10-26.html` | The same page's DOM as rendered in the browser; no HTTP headers. SHA-256 `d39821c6009aaacb82159cd633f38ceafb71b405ea2e018456909385089799a5` |
| `tyndale-permissions-page-blocked.headers.txt` | Response headers from https://www.tyndale.com/permissions (HTTP 403, 2026-10-25 18:14 GMT), recording that the page refused automated access |
