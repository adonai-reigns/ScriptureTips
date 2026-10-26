# ScriptureTips: Translation and Data Licensing Survey

> Status: **Stage 1 survey**, 2026-10-25. Desk research for planning, **not legal advice**. Every entry must be confirmed against the rights holder's current terms (Stage 2) before any text is imported, and the launch set reviewed by an NZ intellectual property lawyer before launch.
> "Checked" dates refer to when the source was read. Terms change: re-check before each major release.

## 1. Method

1. **Discovery:** translation lists from Bible Gateway (64 English versions), Blue Letter Bible (35 versions, incl. original-language texts), Bible Hub, eBible.org, the Open Bible Data catalog (freely-given.org), API.Bible and CrossWire.
2. **Terms:** taken from the rights holder's own permissions page wherever possible. Catalogs and third-party copies are used only as leads, and are marked as secondary.
3. **Key distinction:** *quotation permission* (quoting N verses in another work) is **not** permission to host the full text in software. Most quotation permissions don't allow a full Bible on a website or app.
4. **Ambiguities are never read in our favor.** They are listed in §8 for Stage 2 / the lawyer.

## 2. Summary

| Category | Translations | Can ScriptureTips host the full text? |
|---|---|---|
| **Public domain** | KJV (except UK), ASV, YLT, Darby, Webster, Douay-Rheims, Geneva 1599, Bishops, Tyndale NT, Wycliffe, JPS 1917, Weymouth, Brenton LXX (English), **WEB**, **BSB**, MSB | **Yes** |
| **Public domain unconfirmed** | Bible in Basic English (public domain only in the US) | **Not for now** ([sources.md](sources.md) §4) |
| **Public domain-like open licenses** | OEB (CC0) | **Yes** |
| **Open, share-alike** | LSV, FBV, ULT, UST, T4T, OET (all CC BY-SA 4.0; the OET isn't yet recommended for Bible sites, sources.md §4) | **Yes**, but derivatives must also be CC BY-SA (§6) |
| **Free custom licenses** | **LEB**, NET (without notes) | **LEB: yes**, as a free service. It can't be sold on its own; a sold work may contain it if it's under 25% (§3.1). **NET: yes**, as a free, never-monetized service; sold works only within HarperCollins's gratis limits (§3.2, §4.1) |
| **Copyrighted, API available** | ESV (Crossway API, non-commercial) | **Possibly**, through the API on its terms. Needs Stage 3 confirmation |
| **Copyrighted, quotation only** | NIV, NKJV (HarperCollins rules: §4.1), NLT, NASB, LSB, AMP, CSB, NRSVue, NRSVACE, TLV (NKJV, NLT, TLB, MSG, NASB, TLV and NRSVACE are wanted: sources.md §4.1), TLB, MSG, RSV, CEV, NABRE, CEB, others | **No.** Needs a license agreement (Stage 3) |

**Likely launch set (subject to Stage 2):** KJV, ASV, YLT, Darby, WEB, BSB, LEB, OEB, LSV, Douay-Rheims, Geneva 1599, Brenton (English LXX), NET (text without notes), and the original-language data in §5.

## 3. Free custom licenses (detail)

### 3.1 Lexham English Bible (LEB)

**Important correction:** the published terms are **not** a general 50% rule.

| Situation | Rule (as published) |
|---|---|
| **Giving it away** | Allowed in full. "You can give away the Lexham English Bible, but you can't sell it on its own." |
| **Selling a larger work that contains it** | Allowed only if the LEB is **less than 25%** of the content. |
| **50% limit** | Only for **non-profit organizations supporting non-English Bible translation**, e.g. commercially sold diglot Bibles. |
| **Software** | May be distributed with purchased software if it is no more than 25% of the software's content (with reporting). |
| **Reporting** | Annual report of units sold/distributed/downloaded if given away with a commercial product, or if a sold work contains more than 1,000 LEB verses. |
| **Attribution** | Always required. Fewer than 100 verses: "(LEB)" after each quote. 100 verses or more: full credit statement. Electronic use: link "LEB" to the LEB site and "Logos Bible Software" to Logos. |
| **Trademark** | "Lexham" may not be part of a larger work's title. |
| **Unit of measure** | "Content" (not defined: words, verses or pages). |

What this means for ScriptureTips:
- **Hosting and reading on ScriptureTips:** fine. It is a free service, which counts as giving the LEB away.
- **A user printing an edition for themselves, or giving copies away:** fine.
- **A user selling printed editions:** LEB content must be **under 25%** (or under 50% only in the non-profit, non-English translation case). The license engine must model this, and must define the unit we measure by (verses is the most defensible).
- **Rights holder:** the license pages at lexhampress.com and lexhamenglishbible.com now redirect to Baker Book House. **Baker Publishing Group acquired Lexham Press in September 2025**, and Logos retains rights to Lexham content *within Logos*.

Sources: Bible Gateway LEB page (copy of license, checked 2026-10-25); license copy bundled in the ScriptureTips-WordpressPlugin repo (`scripts/leb-bible-license.txt`, dated 2020-09-24); Logos newsroom "Baker acquires Lexham Press" (2025-09-23).

### 3.2 NET Bible (Biblical Studies Press)
**Verdict: permitted for ScriptureTips as a free service, with conditions.** This depends on ScriptureTips never being monetized ([vision.md](vision.md) §1.1).

- The text **without the notes** may be quoted in any form without written permission, followed by "(NET)" and a copyright acknowledgment.
- **Whole copies are allowed, not just quotations:** "You may copy the NET Bible® and print it for others as long as you give it away, do not charge for it and comply with our guidelines for content control including current valid copyright and organizational acknowledgments." The stated purpose ("personal study … or other noncommercial study") matches ScriptureTips.
- "Free means free": it may not be **bundled with anything sold**, or charged for in any way (not even shipping or handling). ScriptureTips sells nothing, so hosting it and free printed copies are fine. A "free" copy where the recipient pays for printing or postage isn't allowed.
- **Non-commercial means no money at all:** HarperCollins, which handles the NET's commercial use, defines non-commercial use of the NET as "you will not be selling **or receiving donations** for your product", and Biblical Studies Press forbids it being "used as a gift to solicit donations". This is the main reason ScriptureTips is never monetized ([vision.md](vision.md) §1.1).
- **Editions users sell:** the free-copy permission doesn't cover them, but HarperCollins's gratis policy does, within limits: up to 500 verses, no more than 25% of the work, no more than 50% of any book, and not in a commentary or biblical reference work (§4.1).
- **Content control:** the free-copy permission requires compliance with "our guidelines for content control including current valid copyright and organizational acknowledgments". Nothing beyond the acknowledgments is defined, so showing them is how we comply.
- **Copyright notice:** the publisher's current wording is "©1996, 2019 by Biblical Studies Press, L.L.C." (edition 2.1). We use it with the eBible.org file, which is the First Edition text (its own notice says 1996–2016); the license doesn't limit the edition.
- **Who administers it:** netbible.com is now run by Thomas Nelson Bibles (HarperCollins Christian Publishing). The copyright stays with Biblical Studies Press.
- The notes are copyrighted and not included.
- **Software and apps:** "(NET)" must follow quotations, and in software with internet access "NET" must link to netbible.org (captured in `license-evidence/net-bible/`).
- **Trademark:** use "NET Bible®" or "NET"; avoid "New English Translation Bible" or plain "New English Translation".

Sources: netbible.com/copyright, netbible.com/faq and the HarperCollins Christian permissions page (primary, all captured 2026-10-25 in `license-evidence/`); Wikipedia "New English Translation".

### 3.3 World English Bible (WEB)
- Public domain: "The World English Bible is not copyrighted."
- **Trademark:** the name "World English Bible" and its logo may be used **only to identify faithful copies**. A compilation that modifies WEB verses must not call itself the WEB, but can credit "verses from the WEB".

Source: worldenglish.bible (checked 2026-10-25).

### 3.4 Berean Standard Bible (BSB) and Majority Standard Bible (MSB)
- "Officially placed into the public domain as of April 30, 2023." "Licensing is not required for any use."
- The Berean Literal Bible and Berean Interlinear Bible are covered too: the terms page lists their sites under the dedication, and the BLB text file says it "has been dedicated to the public domain" (confirmed 2026-10-26; [sources.md](sources.md) §3.1). The interlinear's 2016 files still print an older "All Rights Reserved" notice.

Sources: berean.bible/licensing.htm (checked 2026-10-25); freely-given.org Open Bible Data catalog.

### 3.5 King James Version (KJV)
- Public domain everywhere **except the United Kingdom**, where rights are vested in the Crown. Printing in, or importing printed copies into, the UK requires permission: letters patent are held by Cambridge University Press (England, Wales, Northern Ireland) and the Scottish Bible Board (Scotland). Oxford University Press and Collins are also licensed.
- Sources conflict on whether UK protection is perpetual or ends in 2039.
- **Cambridge's own terms** ("Bibles rights and permissions", captured 2026-10-25) claim UK rights over "reproduction by any means", not only printing. Free use: up to 500 verses for liturgical and non-commercial educational use, not a complete book, under 25% of the work, with a set acknowledgment. Beyond that: written permission from permissions@cambridge.org.
- **Effect on ScriptureTips:** **printed editions shipped to UK users** containing the KJV are affected, and the book designer must warn about this. On Cambridge's reading, online display of the full text to UK users would be affected too. That's an open decision (sources.md §8 item 2).

Sources: ebible.org KJV copyright pages (secondary, checked 2026-10-25); Cambridge University Press "Bibles rights and permissions" (primary, captured 2026-10-25; the old Queen's Printer's Patent URL now redirects to a page with no rights information).

## 4. Copyrighted translations: quotation allowances

None of these allowances permits hosting a full Bible. They are listed so that (a) we know what users may *quote* in notes and research without permission, and (b) we know who to approach in Stage 3.

| Translation | Rights holder | Without permission | Other conditions | Source (checked 2026-10-25) |
|---|---|---|---|---|
| **NIV** | Biblica (Zondervan in US/Canada; Hodder & Stoughton in UK/EU) | Up to 500 verses | No more than 50% of a book; under 25% of the work; not in commentaries/reference works; latest edition (2011) only; online license is personal, non-commercial and revocable. See §4.1 | biblica.com permissions & terms (via search); HarperCollins page (captured) |
| **ESV** | Crossway | Up to 500 verses | Not more than half of any one book; under 25%; not in commentaries/reference works; **not in any work published under a Creative Commons license**; may not be translated; trademark needs permission. **Website/app use through the ESV API, free for non-commercial use:** no more than 500 verses (or half a book) stored locally, the same per page, a link to esv.org on each page, and use consistent with Crossway's statement of faith ([license-evidence/english-standard-version](license-evidence/english-standard-version/SOURCE.md)). | crossway.org/permissions, api.esv.org |
| **NKJV**, NCV, ICB, The Voice, The Expanded Bible | HarperCollins Christian (Thomas Nelson) | Up to 500 verses | No more than 50% of a book; no more than 25% of the work; not in commentaries/reference works. See §4.1 | HarperCollins Christian permissions page (captured) |
| **NLT** | Tyndale House | Up to 500 verses, **print or eBook only** | Not a complete book; no more than 25%; text must be exact; commercial commentaries/reference works need permission; online recordings 50 verses per sermon, or 250 per recording with at most 30 posts up, never monetized; permission not transferable. **Our online use (project decision):** the sermon rule applied to web pages: 50 verses per page displayed, NLT words no more than 25% of the work | tyndale.com/permissions; source route: Tyndale's NLT API, api.nlt.to (captured: `license-evidence/new-living-translation/`) |
| **TLB** (The Living Bible) | Tyndale House | Same as the NLT | Same as the NLT, including the online sermon rule; our online use follows the NLT decision | tyndale.com/permissions (captured: `license-evidence/the-living-bible/`) |
| **MSG** (The Message) | Eugene H. Peterson; NavPress, represented by Tyndale House | Up to 500 verses, **print or eBook only** | Not a complete book; no more than 25%; text must be exact; "(The Message)" after each verse in mixed works; **any online/audio use needs the Permissions Questionnaire** | tyndale.com/permissions (captured: `license-evidence/the-message/`) |
| **NASB / NASB1995 / AMP** | The Lockman Foundation | Up to 1,000 verses | Not a complete book; under 50%; **no more than 1,000 verses stored in an electronic retrieval system**; full notice with clickable link on web pages and apps; AI quoting allowed up to 1,000 verses per response, no training or datasets | lockman.org (captured: `license-evidence/new-american-standard-bible/`) |
| **LSB** | Lockman Foundation / Three Sixteen Publishing | Up to 1,000 verses | Not a complete book; under 50%; max 1,000 verses stored electronically. Its "AI Usage & Attribution" section covers AI assistants' answers only ([license-evidence/legacy-standard-bible](license-evidence/legacy-standard-bible/SOURCE.md)) | lsbible.org |
| **CSB** | Holman Bible Publishers | Up to 1,000 verses | No more than 50%; not a complete book | Third-party copy only (Sermonary); confirm with Holman |
| **NRSVue / NRSV / RSV** | National Council of Churches (Friendship Press) | Fewer than 500 verses | Sources conflict: 25% (Friendship Press) vs 50% (publisher notice); **text must not be altered**; NRSV no longer licensed except NRSV-CE | friendshippress.org/bible-licensing |
| **CEV** | American Bible Society | Up to 500 verses | Under 50% of a book and 25% of the work; non-commercial only | freely-given.org (secondary) |
| **MSG** | NavPress | Up to 500 verses | Not a complete book; under 25% | freely-given.org (secondary) |
| **NABRE** | Confraternity of Christian Doctrine | Under 5,000 words | | freely-given.org (secondary) |

### 4.1 HarperCollins Christian Publishing (Thomas Nelson and Zondervan)

HarperCollins Christian Publishing sets one permissions policy for each of its Bible imprints. Captured 2026-10-25 in [`license-evidence/harpercollins-christian-permissions/`](license-evidence/harpercollins-christian-permissions/).

| | Thomas Nelson policy | Zondervan policy |
|---|---|---|
| **Translations** | NKJV, NCV, ICB, The Voice, The Expanded Bible; the NET for **commercial use only** | NIV (commercial use in North America), NIrV (North America, UK & Commonwealth, EEC, EFTA) |
| **Verses** | No more than 500 "quoted in total" | Up to and including 500 |
| **Share of the work** | No more than 25% of the total text | Less than 25% of the total text |
| **Share of a book** | No more than 50% of any book; written permission whenever more than 50% of the Bible is reproduced | No more than 50% of a complete book |
| **Work types excluded** | Commentaries and other biblical reference works | Commentaries and other biblical reference works |
| **Not covered at all** | Standalone-verse products (artwork, cards, crafts, novelty items, jewelry); study Bible notes, charts and maps; lyrics and music; more than 50% of a book or the whole translation | The same |
| **Citation** | The set copyright notice for each translation | The same; the NIV notice credits Biblica |
| **Edition** | | NIV: the latest edition (2011) only |
| **Territory** | | Outside North America the NIV goes to Biblica; commercial use in the UK, EEC and EFTA goes to Hodder & Stoughton |
| **Whole translation or digital product** | Licensing department (a license agreement) | The same |

Other points on the page:
- **Non-commercial use of the NET** follows Biblical Studies Press's terms (§3.2). For the NET, HarperCollins defines non-commercial as "you will not be selling or receiving donations for your product".
- **Churches:** standalone quotations in sermons, bulletins, newsletters and projection need no permission if they are cited. Photocopies are limited to one chapter or less than 10% of a work, up to 20 copies.
- **Requests:** a permission request form, with a six-to-eight-week turnaround.

**How ScriptureTips applies these rules.** None of these translations can be hosted in full; that needs a license agreement (Stage 3). They can still turn up in a user's work, for example in verses a user enters and credits to the NKJV, in quotations in notes, or as NET verses in an edition for sale. Whenever a compilation, publication or edition contains verses credited to any of these translations, the license engine applies the policy (domain model §7):
1. **One policy, several translations.** The rules belong to the publisher's policy, not to each translation. The 500 verses are counted across every translation that policy covers, because "in total" doesn't say per translation and we don't read ambiguities in our favor.
2. **Per-book and whole-work shares** are checked alongside the verse count. The 50%-of-the-Bible rule is also checked.
3. **Work type matters.** An edition or publication that counts as a commentary or biblical reference work (e.g. one with study notes) isn't covered by gratis use at all.
4. **Product type matters.** Standalone-verse products (a verse printed alone on a card or poster) aren't covered.
5. **Citation:** the set notice for each translation is added automatically.
6. **NIV edition:** only the 2011 text qualifies.
7. **The NET** is treated as a Thomas Nelson translation whenever the use is commercial, i.e. an edition a user sells. ScriptureTips itself is never monetized, so its own use of the NET stays non-commercial.

## 5. Original-language texts and study data

| Resource | Content | License | Notes |
|---|---|---|---|
| **Westminster Leningrad Codex (WLC)** | Hebrew OT | Public domain | |
| **Open Scriptures Hebrew Bible (OSHB)** | Lemmas + morphology for WLC | CC BY 4.0 | Credit the OSHB project |
| **STEPBible-Data** | TAHOT (tagged Hebrew OT), TAGNT (tagged Greek NT, multiple traditions), TBESH/TBESG (brief lexicons), **TVTMS (versification)**, extended Strong's | CC BY 4.0 | Credit "STEP Bible" with a link. They ask that **changes be recorded and shared** with later users. |
| **SBL Greek New Testament** | Critical Greek NT | **CC BY 4.0**, confirmed 2026-10-25 on sblgnt.com/license and in the LogosBible/SBLGNT repo | Keep notices; indicate modifications. Older catalogs (CrossWire) still show the retired EULA. See [sources.md](sources.md) §5. |
| **MorphGNT** | Morphology + lemmas for SBLGNT | **CC BY-SA 3.0** (morphology only; the README's "SBLGNT EULA" line for the text is outdated) | Share-alike |
| **Robinson-Pierpont Byzantine, Nestle 1904, Scrivener TR** | Greek NT | Public domain | |
| **MACULA Hebrew & Greek (Clear Bible)** | Syntax trees, glosses, word senses | **CC BY 4.0, but it embeds data "used with permission"** from the United Bible Societies (Semantic Dictionary of Biblical Hebrew; MARBLE/Louw-Nida word senses) | **Leave out the UBS-derived fields and the SIL glosses** (Hebrew `gloss` column, © SIL International under its own license). Exclusion list in [license-evidence/macula](license-evidence/macula/SOURCE.md); summary in [sources.md](sources.md) §6. |
| **Septuagint: Rahlfs 1935** | Greek OT | The edition is generally treated as public domain, **but the only digital copy found (eliranwong/LXX-Rahlfs-1935) is CC BY-NC-SA 4.0** and derived from restricted CCAT data | **Not usable.** No clean digital Rahlfs found. |
| **Septuagint: Swete (1901 and others)** | Greek OT | Public domain edition; the First1KGreek digital text is **CC BY-SA 4.0** | **Chosen clean source** (56 works; Isaiah from Ottley, Ecclesiasticus from Hart). Text only, no morphology. [sources.md](sources.md) §5. |
| **CATSS LXX morphology** | LXX morphology | Restricted (CCAT user declaration; no commercial use) | **Not usable.** |
| **Brenton (English LXX)** | English Septuagint | Public domain | |
| **Strong's dictionaries (1890)** | Hebrew/Greek dictionaries | **Public domain**, stated in the Open Scriptures files (Greek prologue: "1890 Public Domain -- Copy Freely"; Hebrew file: `<rights>Public Domain</rights>`) | Use the Open Scriptures XML. Don't use the TWOT references in the Hebrew file (© Moody). |
| **unfoldingWord Hebrew Bible / Greek NT, translation notes** | Texts, notes | CC BY-SA 4.0 | Share-alike |
| **UBS dictionaries** | Dictionaries | CC BY-SA 4.0 | Keep the UBS copyright lines |

## 6. Maps and images

| Resource | License | Notes |
|---|---|---|
| **OpenBible.info Bible geocoding** | CC BY 4.0 (some OpenStreetMap data under its own license) | Credit OpenBible.info. KML/KMZ downloads and GitHub |
| **Ancient World Mapping Center (AWMC)** | Mostly CC BY-NC (some CC BY-NC-ND) | **Non-commercial:** OK on ScriptureTips, but not in editions users sell. License varies per map |
| **BibleMapper.com** | Non-commercial use welcomed; all rights reserved | Same limitation |
| **OpenBibleImages.org** | CC BY-SA 4.0 | Share-alike |

## 7. Reference websites: terms of use

These sites are useful for discovering which translations exist and for studying their features. **They are not data sources.**

| Site | Terms (checked 2026-10-25) |
|---|---|
| **Bible Gateway** | Personal use; no copying, downloading or archiving without permission; no scripts or bots; quoting up to 250 verses; each version's own copyright applies. |
| **Blue Letter Bible** | **No scraping** ("Scraping data from our site may lead to a user being blocked"); points users to public-domain download sites instead. Free study/teaching use with attribution; over 500 words needs permission; content may not be altered. |
| **Bible Hub** | Its own terms of use were not found. Its sister site openbible.com provides most content under CC0, but texts with copyright notices must keep them and must not be modified. The BSB (from the Bible Hub team) is public domain. |

**Rule for ScriptureTips:** import only from the rights holders or their official open distributions (e.g. eBible.org, GitHub repositories), never from reading sites. This matches the copyright stance in vision §3.3.

## 8. License rule types found

The license engine (domain model §7) must be able to express all of these:

| Rule type | Examples |
|---|---|
| `public_domain` (+ jurisdiction exceptions) | KJV: not in the UK (printing/import) |
| `attribution` (short form under N verses, full notice above; link requirements for electronic use) | LEB (100 verses), SBLGNT, NASB (clickable link) |
| `share_alike` | LSV, ULT, T4T, OET, MorphGNT, OpenBibleImages |
| `non_commercial` (with the rights holder's definition, e.g. HarperCollins counts receiving donations as commercial) | CEV, AWMC maps, CATSS, NET (HarperCollins definition) |
| `give_away_only` (no sale of any kind, not even inside a larger sold work) | NET (Biblical Studies Press terms) |
| `no_standalone_sale` (may be sold only as part of a larger work, within `max_share_of_work`) | LEB |
| `max_share_of_work` (percent, unit, context such as commercial / non-profit) | LEB 25% / 50%, NIV 25%, Thomas Nelson 25%, NASB 50%, NLT 25% (verses on export; words on online pages) |
| `max_share_of_bible` | Thomas Nelson: permission needed above 50% of the Bible |
| `max_verses_quoted` (counted per translation, or across a publisher policy's translations) | NIV 500, Thomas Nelson 500 in total, NASB 1,000, NLT 500 |
| `max_verses_stored_electronically` (across the whole platform, so it caps the scripture cache) | NASB, LSB: 1,000; ESV API: 500 or half a book |
| `no_complete_book` / `max_share_of_book` | NLT, NIV, NKJV and other Thomas Nelson translations (50% of a book), ESV (half a book), CEV (50% of a book) |
| `excluded_work_types` | ESV, NKJV, NIV: commentaries/reference works |
| `excluded_product_types` | Thomas Nelson, Zondervan: standalone-verse products (artwork, cards, jewelry), lyrics and music |
| `edition_restriction` | NIV: 2011 edition only |
| `jurisdiction_routing` (who grants permission depends on territory) | NIV: Zondervan / Biblica / Hodder & Stoughton |
| `no_modification` | NRSVue, NLT, TLB, MSG (exact punctuation and italics), openbible.com texts, BLB site content |
| `no_translation` | ESV |
| `incompatible_with` (license families) | ESV: not in Creative Commons-licensed works |
| `name_restriction` (trademark) | WEB (faithful copies only), "Lexham" not in titles, OET (an adapted text must be renamed) |
| `reporting_obligation` | LEB annual reporting |
| `notes_excluded` | NET (text only) |
| `access_via_api_only` (with caching/storage terms) | ESV API (cache at most 500 verses; clear it periodically) |
| `max_cache_lifetime` (how long content from a source may be kept; sets the cache entry's `storage_expires_at`, domain model §2.5) | None found yet; for API terms that allow only temporary caching |
| `not_as_base` (can't be the base of a compilation; only single verses can be picked in) | NLT, TLB (follows from their 500-verse and no-complete-book limits) |
| `max_verses_per_display` (verses shown on any one page: a note, a link, a published compilation page) | NLT, TLB: 50 (from their online platforms rule, applied to web pages by project decision) |
| `external_reader_link` (where a page would go over a limit, the excess verses link to an outside reader instead) | NLT, TLB → the external reader configured for the translation |
| `share_changes` (request) | STEPBible-Data |

Rules can belong to a **publisher policy** shared by several translations (e.g. HarperCollins's Thomas Nelson policy, §4.1), so limits such as "500 verses in total" can be counted across translations.

## 9. Design consequences

1. **The LEB rule in vision §6 is wrong** and must be corrected (§3.1). Free hosting and personal printing are fine. Sold editions must stay under 25% LEB content.
2. **Derived licenses:** a publication or edition built from share-alike sources (CC BY-SA) must itself be published CC BY-SA. The license engine must **calculate the license of each publication** from its sources, not just check limits.
3. **The CC BY default for user contributions conflicts with some sources.** ESV text may not appear in Creative Commons-licensed works. A note quoting the ESV can't be published CC BY, so the engine must catch this when the note is published.
4. **"Sold vs given away" matters** (LEB, NET, AWMC, HarperCollins). Editions need a declared intended use (*personal* · *give away* · *sell*), and the preflight license check depends on it. ScriptureTips itself is never monetized ([vision.md](vision.md) §1.1), so these rules only ever apply to what users do with their own editions.
5. **Jurisdiction:** KJV printed editions for UK delivery need a warning.
6. **Name rules:** compilations derived from the WEB can't use the WEB name; "Lexham" can't appear in edition titles.
7. **Publisher policies and work types:** HarperCollins's rules span several translations and exclude commentaries and reference works, so the engine needs publisher-level policies and each edition's work type (§4.1).
8. **Clean Septuagint source:** avoid TLG/CATSS-derived texts for anything that might be sold; prefer Swete (First1KGreek) or a confirmed public-domain Rahlfs 1935.
9. **Scripture cache:** all scripture text is served from a cache primed per translation (imported file, our database or a publisher's API), with each entry's source, date and expiry recorded, so temporary-cache API terms can be honored (domain model §2.5).

## 10. Open items for Stage 2

Stage 2 results are in [sources.md](sources.md) (checked 2026-10-25).

1. Confirm the current LEB rights holder and license after the Baker acquisition; ask about the unit of measure. **Resolved:** used under the 2020 license it was obtained with, which we hold in full in `tex-bible` git history with its FAQ rulings on advertising, printing and trademark (sources.md §3.4), so no re-confirmation is needed. The unit is verses, because every license restriction found names verses as its unit (§8).
2. Read the full current NET Bible copyright page. **Done** (free giving-away allowed, not selling; commercial use via HarperCollins). Free use is permitted, with the conditions in §3.2, because ScriptureTips is never monetized.
3. Confirm whether the BLB is public domain. **Resolved 2026-10-26:** yes, under the 2023 Berean dedication (sources.md §3.1).
4. Read the ESV API terms (storage, caching, compilation and printing of API text). **Done 2026-10-26:** no more than 500 verses or half a book stored or shown per page, a link to esv.org on each page, no Creative Commons works, non-commercial use consistent with Crossway's statement of faith ([license-evidence/english-standard-version](license-evidence/english-standard-version/SOURCE.md)).
5. Confirm the SBLGNT license. **Resolved: CC BY 4.0.**
6. Confirm the license of the Open Scriptures Strong's digitization. **Resolved: public domain**, stated in the files.
7. Read the MACULA LICENSE files. **Done:** CC BY 4.0, with the UBS-derived fields and SIL glosses to leave out.
8. Find a clean public-domain Septuagint source. **Resolved for the Greek text** (Swete via First1KGreek, CC BY-SA 4.0). No clean morphology yet.
9. Read Cambridge University Press's Queen's Printer's Patent page. **Done** (via its "Bibles rights and permissions" page): UK rights are claimed over any reproduction, beyond the free allowance. **Still open:** how to treat UK users (sources.md §8 item 2).
10. Read the LSB page's AI usage section. **Done 2026-10-26:** it lets AI assistants quote up to 1,000 verses per answer (no complete book, no datasets) and doesn't widen what ScriptureTips may do ([license-evidence/legacy-standard-bible](license-evidence/legacy-standard-bible/SOURCE.md)).
11. **New:** STEPBible-Data caveats (redistribution wording, Online Bible permission for the Hebrew brief lexicon, NA28/BHS content, Marvel fields, AI-generated names). See [sources.md](sources.md) §6 and §8.

## Sources

- Bible Gateway versions list: https://www.biblegateway.com/versions/
- Bible Gateway LEB: https://search.biblegateway.com/versions/Lexham-English-Bible-LEB/
- Bible Gateway terms: https://www.biblegateway.com/legal/terms/
- Blue Letter Bible versions: https://www.blueletterbible.org/help/vers.cfm
- Blue Letter Bible permissions: https://www.blueletterbible.org/about/permissions.cfm
- Open Bible Data catalog: https://freely-given.org/OBD/AllDetails.htm
- openbible.com permissions: https://openbible.com/download.htm
- API.Bible license tiers: https://care.api.bible/article/382-which-bible-versions-are-available
- Logos newsroom, Baker acquires Lexham Press: https://www.logos.com/newsroom/baker-acquires-lexham-press
- Berean Bible licensing: https://berean.bible/licensing.htm
- World English Bible: https://worldenglish.bible/
- NET Bible copyright: https://netbible.com/?p=44
- Biblica permissions: https://www.biblica.com/permissions/
- Biblica terms of use: https://www.biblica.com/terms-of-use/
- Crossway permissions: https://www.crossway.org/permissions/
- HarperCollins Christian permissions: https://www.harpercollinschristian.com/sales-and-rights/permissions/
- NET Bible FAQ: https://netbible.com/faq/
- Tyndale permissions: https://www.tyndale.com/permissions
- Lockman Foundation: https://www.lockman.org/permission-to-quote-copyright-trademark-information/
- LSB permissions: https://lsbible.org/permission-to-quote-the-lsb/
- CSB notice (third party): https://support.sermonary.com/article/67-bible-translation-copyright-and-permission-notices
- Friendship Press (NRSVue): https://friendshippress.org/bible-licensing
- ebible.org KJV copyright: https://ebible.org/kjv/copr.htm
- STEPBible-Data: https://github.com/STEPBible/STEPBible-Data
- Open Scriptures Hebrew Bible: https://github.com/openscriptures/morphhb
- SBLGNT: https://sblgnt.com/
- MorphGNT: https://github.com/morphgnt/sblgnt
- MACULA Greek: https://github.com/Clear-Bible/macula-greek
- OpenBible.info geocoding: https://www.openbible.info/geo/
- AWMC (catalog records): https://www.digitalcommonwealth.org/search/commonwealth:7366f704p
