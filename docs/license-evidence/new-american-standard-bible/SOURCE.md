# New American Standard Bible (NASB): license evidence

**Verdict:** Wanted, permission needed ([sources.md](../../sources.md) §4.1). Not obtained: no text has been downloaded.
**Evidence gathered:** 2026-10-26 (NZ time).

## License as stated by the rights holder

Copyright holder: **The Lockman Foundation** (La Habra, California), "a religious nonprofit, nondenominational Christian ministry". Editions: NASB 2020 and NASB 1995 (the shop also lists the NASB 1977).

From Lockman's "Permission to Quote" page:

> "The text of the NASB® (New American Standard Bible®) may be quoted in any form (written, visual, electronic, or audio) up to and inclusive of one thousand (1,000) verses without express written permission of The Lockman Foundation, providing the verses do not amount to a complete book of the Bible, nor do the verses quoted account for more than 50% of the total text of the work in which they are quoted, **nor may more than 1,000 verses be stored in an electronic retrieval system.**"

> "Scripture quotations taken from the (NASB®) New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation. Used by permission. All rights reserved. www.Lockman.org" — "Only use the last year corresponding to the edition(s) quoted. For example, if quotations are from the NASB 1995, do not include the year 2020 in the copyright notice."

> "For web pages or apps the full copyright notice must be used with www.Lockman.org being a click-enabled web link."

> "For other digital media, such as social media posts, blogs, or email the abbreviation (NASB) may simply be used along with the quotation provided it is a click-enabled web link to www.Lockman.org, when possible."

> "If your request is beyond the permissions granted below, please use the Permission to Quote Request Form to request express written permission." (`https://www.lockman.org/permission-to-quote-request-form`)

> Trademarks: "The 'NASB,' 'NAS,' 'New American Standard Bible,' 'New American Standard,' […] are trademarks registered in the United States Patent and Trademark Office by The Lockman Foundation. Use of these trademarks requires the permission of The Lockman Foundation."

**AI usage section** (relevant to the later AI assistance feature, vision.md §10): AI systems "are permitted to quote up to 1,000 verses in a single response" from the NASB 1995, NASB 2020, AMP, NBLA and LBLA, with the translation's abbreviation on each quotation and a link to lockman.org for responses over 10 verses. "This permission does not authorize bulk downloading, scraping, the creation of standalone datasets for redistribution, or the use of The Lockman Foundation's copyrighted Bible translations for training, fine-tuning, improving, evaluating, or developing artificial intelligence or machine learning models without prior written permission."

The same page covers the Amplified Bible (same 1,000-verse and storage terms), NBLA and LBLA (500 verses, 25%), the lockman.org website content, and contact details (PO Box 2279, La Habra, CA 90632-2279; (714) 879-3055).

**What this means for us:**
- Hosting the full text needs written permission (request form above).
- **The storage limit applies even before display:** keeping more than 1,000 NASB verses in our database ("an electronic retrieval system") isn't covered by the gratis terms. This also limits users' own work: a compilation that stores more than 1,000 NASB verses would exceed it. The license engine's `max_verses_stored_electronically` rule (licenses.md §8) covers this.
- Every web page or app view that shows NASB text needs the full notice with a clickable link to www.Lockman.org.
- Decide which edition to ask for: NASB 2020, NASB 1995, or both.

## Versification and canon

From the Bible Gateway book list (in the raw HTML; Bible Gateway's "NASB" page is the 2020 edition): 66 books, **English chapter numbering** (Joel 3 chapters, Malachi 4). Bible Gateway's NASB 1995 page URL (`New-American-Standard-Bible-1995-NASB1995`) returned "Version not found", so the 1995 edition wasn't checked.

## Files in this folder

| File | What it is |
|---|---|
| `lockman-permission-to-quote-page.pdf` | Screen-mode capture of https://www.lockman.org/permission-to-quote-copyright-trademark-information/ (headless Chromium through CDP, 2026-10-26 07:14 NZDT, 10 pages, date and URL in the header and footer). SHA-256 `4b6632b878a0f524ef200fe432a51a30515c4fb6999ae80f15ff120d0756cf25` |
| `lockman-permission-to-quote-page.html` | Raw HTML of the same page. SHA-256 `a1162f1f9dbe482a4435dcb4fe57b37681ee60384ce4759912540ed8d780f448` |
| `lockman-permission-to-quote-page.headers.txt` | HTTP response headers (HTTP 200, 2026-10-25 18:14 GMT) |
| `biblegateway-nasb-version-page.pdf` | Screen-mode capture of https://www.biblegateway.com/versions/New-American-Standard-Bible-NASB/ with the Copyright tab opened (same method, 2026-10-26 07:14 NZDT, 4 pages). SHA-256 `37849bde4a3a9386cc98032581b7dac3b9b59648fbf014d95ca9061c2f6b30f8` |
| `biblegateway-nasb-version-page.html` | Raw HTML of the same page (includes the book list). SHA-256 `a9624c10cb67e3899956ea5d9c0c97ee4eb50714084f4e31d95bac38e2a6f34b` |
| `biblegateway-nasb-version-page.headers.txt` | HTTP response headers (HTTP 200, 2026-10-25 18:13 GMT) |
