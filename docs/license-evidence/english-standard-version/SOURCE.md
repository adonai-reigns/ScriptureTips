# English Standard Version (ESV): license evidence

**Verdict:** Quotation only (copyrighted, Crossway). Not on the wanted list. The ESV API's terms are recorded here because they show what an API source can require of our scripture cache. No text is held.
**Evidence gathered:** 2026-10-26 (NZ time).

## ESV API terms (https://api.esv.org/)

> "Crossway allows you to access the ESV Bible text from our server and include it on your website, free of charge for non-commercial use."

Conditions of use, as listed on the page:

> "You may request up to 500 verses per query, or half a book, whichever is less (excepting single-chapter and double-chapter books)."
> "You may only perform 5,000 queries per day, with no more than 1,000 requests in an hour and no more than 60 requests per minute."
> "**You may not locally store more than 500 verses or one-half of any book of the Bible (whichever is less).**"
> "The text may be redistributed further (for example, via email or an RSS feed). You may distribute up to 500 verses, as long as the verses quoted do not amount to 50% of a complete book of the Bible and do not make up 50% or more of the total text of the work in which they are quoted."
> "You may not display more than 500 verses or one-half of any book (whichever is less) on any page."
> "You must use the text for non-commercial purposes, and your website must be non-commercial."
> "You must include the standard ESV copyright notice on your site […] and identify the passages as coming from the ESV. Each page on which you use the text must include a link to www.esv.org."
> "This service is available for use only by individuals and non-commercial organizations that use the service in ways consistent with the historic Christian understanding of doctrine and the Bible, as summarized in the following foundational doctrines." (A four-point statement of faith follows.)

> Caching: "You can cache up to 500 verses. We encourage you to periodically clear out your cache to ensure that you always have the latest version of the text".

> Changes: "You may not change any of the words in the text. You may choose to omit certain features, such as headings, footnotes, cross-references, and verse numbers. You may also omit portions of verses or sections quoted if you include an ellipsis (…)".

> Non-commercial: "A non-commercial site does not charge for access to any part of the site. Further, no charge is made for access to the ESV text. In contrast, a commercial website is primarily designed to motivate visitors to buy something, to pay for a service, or to give a donation, or it accepts advertising or sponsorships."

> Copyright notice (one of three forms) includes: "The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated into any other language. Users may not copy or download more than 500 verses of the ESV Bible or more than one half of any book of the ESV Bible."

The documentation page adds only the technical details (a key from a registered "API Application", sent in the `Authorization: Token` header).

## What this means for us

If the ESV were ever added, through the API:
- **Cache cap across the whole platform:** no more than 500 ESV verses (or half a book, if less) stored at once, whatever the number of users (`max_verses_stored_electronically`: 500). The cache would have to evict ESV entries to stay under it, and refresh them periodically.
- **Per page:** at most 500 verses or half a book (`max_verses_per_display`), a link to www.esv.org on every page, "ESV" after each quotation, and the notice on a copyright page.
- **No Creative Commons:** ESV text can't appear in anything published under a CC license (`incompatible_with`). ScriptureTips contributions default to CC BY 4.0, so a note quoting the ESV would need a different license.
- **No word changes** (`no_modification`), but omitting headings, notes and verse numbers is allowed, and so are marked ellipses.
- **Non-commercial:** satisfied, since ScriptureTips never charges, advertises or takes donations.
- **Statement of faith:** use must be consistent with Crossway's doctrinal statement. That is a question for a platform where users publish their own views, and for the planned opt-in other scriptures.

## Files in this folder

| File | What it is |
|---|---|
| `esv-api-home-page-2026-10-26.pdf` | Screen-mode capture of https://api.esv.org/ (headless Chromium through CDP, 2026-10-26 14:11 NZDT, 6 pages): conditions, caching, copyright notice, non-commercial definition. SHA-256 `92035b4ecc4d51f608f3082872182cf7d8df564b7f62718944f414387c47491c` |
| `esv-api-home-page-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers (HTTP 200, 2026-10-26 01:11 GMT). HTML SHA-256 `dd0fdb88e854203c1caa0502776f2e9db8b6551814522acaabed594c1137c290` |
| `esv-api-documentation-2026-10-26.pdf` | https://api.esv.org/docs/ (2 pages). SHA-256 `6b2dde14c54bbbe77c4a83e65244d08443a4b8aa0fba65156425d349253e780f` |
| `esv-api-documentation-2026-10-26.html` / `.headers.txt` | Raw HTML and HTTP headers. HTML SHA-256 `96d6b14c6c85f5a20664806be0d8f672cd833a64ded0a420d31ec4dc38eddd79` |
