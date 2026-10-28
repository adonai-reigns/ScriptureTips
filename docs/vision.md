# ScriptureTips: Product Vision

> Status: draft, 2026-10-25. This is the brief for the full rewrite of ScriptureTips. It replaces the 2019–2024 prototype repositories.

## 1. Purpose

ScriptureTips is a **personal Bible study tool**. Its primary purpose is to let each person **curate their own preferred translation**, a *compilation* that combines verses from the translations they trust, for **reading**, **printing**, and **sharing** through the ScriptureTips browser extension and website plugins.

Every translation hides the original to some degree. Translators must choose how to express each thought in a new language, and through those choices the original writer's meaning is often distorted, lost, or replaced by the translator's own views. ScriptureTips equips the user to get back to **what was originally said**: compare translations, study the original Hebrew and Greek words, and decide for themselves how each verse is best expressed in their own language.

Around that compilation, a reader can:

1. **Compile** a preferred translation, choosing the source translation for each book, chapter or verse, or writing their own rendering of a verse from the original. A user may keep as many compilations as they like.
2. **Record** the connections they see between passages. Some of the strongest moments in Bible study come when one verse brings another to mind, and putting the two together expands your understanding of what the scriptures teach. Each connection is saved as a link with a note explaining it.
3. **Print** a compilation, with their own cross-references, annotations and citations, as a print-ready Bible.
4. **Share** it with others: through the browser extension and website plugins (scripture references become tooltips showing the user's chosen compilation), and with chosen contacts, groups or the public. Sharing in this way is "doing unto others as you would have them do unto you".

**Social features are an extension, not the purpose.** Discussion, perspectives and groups (§3.11–3.12) build on the study tool for those who want them. The tool must be complete and valuable without them.

ScriptureTips is **free and non-commercial**. The Holy Bible must be free to read.

### 1.1 ScriptureTips can never be monetized

> **ScriptureTips must never be monetized in any form.** That rules out selling anything, subscriptions, paid features or paywalls, advertising, sponsorship, accepting donations, and offering anything in return for money. The same applies to the browser extension, the website widget and plugins, the API and every other part of the platform.

**Why:** monetizing would forfeit the right to use translations whose licenses permit only free, non-commercial use:

| Translation or resource | What its license requires | What monetizing would cost |
|---|---|---|
| **NET Bible** | Copies must be given away: "free means free". It "cannot be bundled with anything sold, used as a gift to solicit donations, nor can you charge for shipping, handling, or anything". HarperCollins, which handles the NET's commercial use, defines non-commercial use as "you will not be selling or receiving donations for your product". | The whole NET. Commercial use would fall under HarperCollins's quotation limits (500 verses), which rules out hosting it. |
| **Lexham English Bible (LEB)** | A website that takes advertising may carry the LEB only if it's no more than 25% of the site's substantive content. It can't be sold on its own. | Full LEB reading and compilations based on it. |
| **AWMC maps, BibleMapper** | Non-commercial use only (CC BY-NC, or "non-commercial use welcomed"). | The map library. |
| **ESV (Crossway API)**, if adopted | The API is free for non-commercial use only. | ESV access. |

Details are in [licenses.md](licenses.md) §3.1, §3.2, §4.1 and §6. Any feature, partnership or change that would bring money into the platform must be refused, even one that seems small.

Users may still sell **their own** printed editions outside ScriptureTips. That's their activity, not the platform's, and the license engine checks each sold edition against every source's rules (e.g. the LEB's 25% limit; the NET only within HarperCollins's gratis limits).

## 2. Principles

- **Individual first.** ScriptureTips is a personal study tool. Everything works fully for one person. Sharing, discussion and groups are optional layers, never required.
- **The compilation is the heart.** A user's curated translation is the main thing they build; reading, linking, printing and sharing all happen through it.
- **Toward the original.** The tools always lead back to the original-language text, so the user, not a translator, decides what a verse says. Study aids are shown with their sources, so the user can weigh each one.
- **Scripture at the center.** Links between scripture passages are the core study asset. Outside material is supported but kept separate, so the scripture graph stays pure.
- **Grow, don't fight.** Religious topics stir strong passions. The product is designed to help people grow and treat each other kindly, *including* when they disagree, without walling them off from views that differ from their own.
- **Private until published.** Everything a user creates is private and visible only to them until they *explicitly* publish it, to a group or to the public. Nothing private is reviewed, scanned or sent to any model by ScriptureTips. Review applies only at the point of publishing, with the user's knowledge.
- **Respect privacy.** A person's religious beliefs, and anything inferred about them, are sensitive information. Users opt in, inferences stay visible to them, and nothing is exposed to others.
- **Respect licenses.** Every translation and outside resource carries license terms, and the system enforces them, especially in exports.
- **Built to last.** A long-term foundation is more important than speed to launch.

## 3. Key features

### 3.1 Compilations (curated translations)
- **Start from a base, not from scratch.** A new compilation begins with a **base** that supplies every verse:
  - a published translation available on ScriptureTips (public domain, openly licensed, or licensed to ScriptureTips);
  - a publication from one of the user's groups (e.g. their church's compilation);
  - a publication that another user has made public;
  - one of the user's own compilations or publications.
- **Override in layers, from broad to narrow:** whole compilation (the base) → testament or section → book → chapter → verse range → single verse. The most specific choice wins. For example:
  1. Base: the NIV.
  2. Genesis: switch the whole book to the KJV.
  3. Genesis 1:2: switch to the LEB, because the KJV rendering doesn't satisfy.
  4. Genesis 3:15: type their own rendering from the Hebrew.
- **The editor always shows where each verse comes from:** color-coded by source, with "inherited from Genesis → KJV" indicators. A *reset to inherited* action removes an override, and a composition overview shows the whole Bible as a map of its sources, with the live license share.
- **Published versions are never overwritten.** Each time the user publishes changes, the result is a new numbered version of the publication. Every earlier version is kept, can be read at a permanent link, and can be compared with later ones. This keeps an accurate record of exactly what was shared and discussed (§4.4).
- **Following the base publication:** when the base is another publication, the compilation stays pinned to the version it started from. If the base's owner publishes a new version, the user is notified and can review the changes verse by verse, then accept them all, accept some, or stay on the old version. If the base is withdrawn, the user keeps the version they started from, under its published license.
- **Credit follows the chain:** a verse inherited through someone else's publication credits the original translator (e.g. the NIV translators), and the compilation it came through is acknowledged.
- **Available translations depend on licenses.** ScriptureTips can only offer translations it may lawfully distribute. Many modern translations (the NIV among them) are copyrighted and would need an agreement with their publisher, and may come with quotation limits that affect what a user can publish.
- Every verse records **where its text came from** (source translation and verse), so the compilation's makeup is always known. This drives attribution and the license share calculation (§6).
- **Two ways to change a verse's wording, recorded differently:**
  - **Write your own rendering** (free typing) of any verse, aligned to the original-language words it translates (§3.2), with an optional translator's note explaining the choice. It is backed by authorship evidence (§6.1), and counts as the user's own work in the license share calculation.
  - **Modify a translation's verse:** start from the selected translation's wording and change it. The record shows the verse was **derived from that translation and modified**: it keeps the source translation and verse, the source text exactly as it was, and the change made. The user says what kind of change it is:
    - **Correction:** fixing a mistake in the source text, such as a typing error, a missing or doubled word, or wrong punctuation. The verse is still credited to the source translator, with the correction shown ("LEB, corrected by [user]"), so the original translator's claim is kept. A correction must stay small; a larger change is treated as an adaptation.
    - **Adaptation:** changing the wording itself ("adapted by [user] from the LEB").
  - Both kinds still count toward the source's license share, and readers can always see the source's wording next to the change.
  - **Clearly marked:** each modified verse is marked wherever it appears (reading views, plugins, print), with the source's wording one click away, and labeled "([source], modified)". A publication or edition containing modified verses carries a notice naming each source and stating that the changes aren't the translator's work.
  - Not available for a source whose license forbids modification. The editor then offers another source, your own rendering, or a translator's note about the suspected error.
  - **When the source changes:** if a later import of the source translation changes a verse the user has modified (for example, the publisher fixes the same typo), the user is notified and can keep their change, or drop it and go back to the source.
- **Authorship evidence:** when a user writes their own rendering, ScriptureTips records evidence that they composed it themselves (§6.1). Their own wording is theirs to use, even where it matches an existing translation.
- **Credit reflects the real roles.** The **original writer** is the author of the scripture. A **translator** conveys the original writer's words in another language. A **compiler** (the user) selects and arranges. Each verse shows its translation credit: "translated by the LEB translators" for selected verses, "LEB, corrected by [user]" for corrected verses, "adapted by [user] from the LEB" for adapted verses, and "translated by [user]" for the user's own renderings. The original writer is never displaced by any translator, including the user.
- Verses from translations with different verse numbering are placed correctly through the canonical versification (see domain model §2).
- Unlimited compilations per user (for example, one for daily reading and one for a printed gift edition).
- **Private while in progress.** A new compilation, and all work on it, is visible only to its owner.
- **Publishing is a deliberate step.** When the user is ready, they publish it, to a group or to the public, through a publishing procedure (§4.2). A published compilation is called a **publication**. It is a fixed snapshot, together with the annotation collections (cross-references and footnotes) the user assigns to it. Later edits stay private until the user publishes a new version.

### 3.2 Original-language study
- **Interlinear view:** the Hebrew/Aramaic Old Testament and Greek New Testament, word by word, with transliteration, a basic English meaning (gloss), and grammatical details (tense, case, person and so on).
- **Strong's numbers:** every original word is tagged with its Strong's number (plus STEPBible's extended Strong's, which tells apart different words that share a number). Users can search, link and annotate by Strong's number, and every view links back to it.
- **Word study:** for any original word, see its dictionary entries (several lexicons side by side), every place it occurs in scripture, and **how each translation rendered it** each time. This shows quickly where translators have been inconsistent or have imposed a view.
- **Translation comparison:** line up any translations or compilations against the original, word by word, with differences highlighted.
- **Hebrew letter pictographs:** for Hebrew words, show the ancient (Paleo-Hebrew) form of each letter (e.g. aleph 𐤀) and how the letters combine in the word. The letter forms themselves are plain facts. Their *meanings* are interpretation, so they come from research libraries (§3.3): the user's own, their groups', those they follow, or the ScriptureTips default library. This is a highly opinionated topic, so meanings are always shown with whose research they come from.
- **Textual variants:** where manuscript traditions differ (for example, Textus Receptus vs critical text), show the variant readings, so "omitted" verses are explained rather than silently missing.
- **Personal word-study annotations:** annotations can attach to an original-language word (a lemma), not just to a passage, and follow it to every occurrence.
- Original-language fonts with right-to-left support, and a Paleo-Hebrew font for the pictograph view.

### 3.3 Research libraries
- Each user curates a **research library**: their own researched material on letters, words, passages, topics and historical background.
- A research entry can **cite external resources** (§3.8). This acknowledges where ideas came from without reproducing the source.
- Research entries can be attached to annotations, links and verse renderings as **footnotes** (for example, "see my research into the letters ש and ם"). They print as footnotes in compiled PDFs.
- **Owned like any other content:** private by default. **Groups and organizations** can keep their own libraries, visible only to members unless made public.
- **ScriptureTips default library:** the official, curated base material, maintained by ScriptureTips with sources cited. It starts with the 22 Hebrew letters and can be extended over time. Users can hide it. Groups can share their own research libraries with their members or the public, and users can browse the libraries of friends and of those they follow, with recommendations.
- **Copyright stance:**
  - ScriptureTips never scrapes or bulk-imports copyrighted material.
  - What a user pastes into their own **private** library is their responsibility.
  - Anything made **public** must be the user's own work or something they have the right to share (terms of use).
  - Copyright owners can report infringing public content, and it is removed through a notice-and-takedown process (required for host protection under the NZ Copyright Act).

### 3.4 Canon and additional writings
- Which books count as scripture differs between traditions, so the **canon is data and a user choice**, not decided by the software.
- **Canon profiles:** Protestant (66 books), Catholic (73), Orthodox (more books again), with others possible later. Each user picks a profile and can change it.
- Books outside the user's canon are available in a clearly labeled **"Additional writings"** section. They are never mixed silently into scripture.
- The **Septuagint** (Greek Old Testament) is both a translation used for comparison and a source of the additional books. The New Testament writers often quoted it, so it is available as a comparison text whatever the user's canon.
- Links touching additional writings are marked as such. Users can filter them out, and they are kept separate from the scripture graph that feeds the algorithms.
- Compilations can include additional writings as a separate section (as the 1611 King James Bible did with its Apocrypha).

### 3.5 Reading
- Read any compilation or available translation, and compare them side by side.
- See the links, annotations and perspectives attached to each passage, filtered by who made them (me, my contacts, my groups, public).

### 3.6 Sharing through plugins
- **Browser extension** and **embeddable website widget** (plus a thin WordPress plugin): scripture references on a web page become links with tooltips.
- Tooltips show the text from the **user's chosen compilation** (for the browser extension) or the **site owner's chosen compilation** (for website plugins), optionally with the related links and annotations.
- **Browser extension features carried forward from v1.0.3** (live on the Chrome Web Store):
  - **Real-time page scanning:** references on any page, including inside frames and content that loads later, become clickable links. Existing links, form fields, headings and code are left alone, and links are never nested.
  - **Link generator tool:** a page where the user pastes text, picks an output format and a link destination, and gets the text back with every reference linked. Includes undo/redo.
  - **Output formats:** HTML, BBCode and wiki markup (`[url text]`), with **Markdown** added. The default format is a setting.
  - **Configurable link destinations:** links can open ScriptureTips (the user's chosen publication, new default) or an outside reading site. Bible Gateway, Bible Hub and Blue Letter Bible are preset. Users can add their own destination with a URL template using placeholders (`ST_REFERENCE`, `ST_TRANSLATION`, `ST_BOOKNAME`, `ST_CHAPTER`, `ST_VERSE`) and a default translation for each.
  - **Disable on this site:** one checkbox in the extension popup; the list of disabled sites is editable in the settings.
  - **Settings sync** across the user's browsers (browser sync storage now, plus the ScriptureTips account once signed in).
  - **Localized interface** (en-NZ default, as for the rest of the product).
  - **New in the rewrite:** tooltips showing the passage text on hover, the note composer and insert flow, and support beyond Chrome (Firefox, Edge; Safari later).
  - **Upgrade path:** the rewrite ships as an update to the **same Chrome Web Store listing**, so existing users receive it automatically, and their settings (link destinations, disabled sites, format) are migrated.
- **Website widget** (for site owners; prototype in the legacy App repo, `src/assets/widgets/scripturetips.js`):
  - **Easy install:** one script tag (or the WordPress plugin), then a single call that names the content area to scan, e.g. `ScriptureTips.run('#main-content')`. Scanning only that area leaves navigation, sidebars and comments alone unless the owner includes them.
  - **Converts references that aren't already links** into ScriptureTips links with tooltips. Existing links, code and anything marked to be ignored (e.g. a `st-ignore` class) are left alone. Content added later (infinite note, loaded comments) is scanned as it appears.
  - **Site-wide configuration:** the default translation or publication, the link destination, tooltip style and behavior. Set in the script options or in the site's ScriptureTips account settings.
  - **Tooltip features carried forward from the prototype:** switch translation inside the tooltip, expand to the surrounding paragraph, step to the previous or next passage, search, a "lite" mode (reference and short text only), moving and resizing, and a copyright notice for the translation shown.
  - **JavaScript API for the site's own user preferences:** a site with its own accounts can pass each visitor's preferred translation (and, later, their ScriptureTips publication) to the widget, listen for widget events (tooltip opened, translation changed), rescan on demand, and theme the tooltip with CSS variables. Rough shape: `ScriptureTips.run(selector, options)`, `ScriptureTips.setPreferences({ translation })`, `ScriptureTips.rescan(element)`, `ScriptureTips.on(event, handler)`.
  - **Visitors with the browser extension** see their own chosen publication instead of the site's default, unless they turn that off.
  - **Privacy and performance:** no cookies or tracking of the site's visitors; passage text is fetched from the public, cacheable passages API (domain model §1.6); a small script that loads without blocking the page.
- **Inline references while writing** (existing browser extension feature, carried forward): references typed into a post, such as "as Paul says in Romans 5:8", are converted into clickable links, formatted for the site (Markdown, BBCode or HTML). Each reference stands alone as supporting evidence for the point being made. Readers with the extension or website plugin also get tooltips. **This is a separate feature from notes.** Inline references support individual points within the writer's own text, while a note is a separate page of passages and notes that the post links to.
- One shared reference parser powers every plugin, so references are recognized the same way everywhere.

#### Notes
A composed, shareable page: the user's own text plus passages chosen from anywhere in the Bible. Notes stand on their own: they don't depend on links or the social features. Examples:
- a short message to a friend;
- scripture sent as supporting references for a forum post or an email;
- a sermon handout;
- a study tracing a theme from Genesis to Revelation (notes replace the earlier "study path" idea).

What a note can do:
- **Blocks in any order:** text, passages, and optionally the user's links, annotations, external references and research entries. Each passage is from any translation or publication, shown in full or as a reference, with an optional comment.
- **Notes never create links by themselves.** Placing two passages side by side doesn't assert a relationship. A user can deliberately select two passages and choose **"Link these"** to create a scripture link (relationship type + note), so the scripture graph stays clean.
- **Quick to make:** "Add to note" from anywhere; paste a list such as "John 3:16; Rom 5:8; Eph 2:8–9"; or select references on any web page with the browser extension.
- **Insert from the browser extension while writing elsewhere** (e.g. a post on a Christian forum):
  1. While typing in the forum's text box, the user clicks the ScriptureTips button next to the box, or presses a keyboard shortcut.
  2. A compact composer opens. They type references ("rom 5 8", "eph 2:8-9") or search by words, preview the text, choose the translation, and add a short note.
  3. They click **Insert**. ScriptureTips creates an unlisted note and inserts its link **where the cursor was**.
  4. The link is formatted for the site: plain URL, Markdown, BBCode or HTML, remembered per site. Optionally it includes the references as readable text, e.g. "John 3:16; Rom 5:8 (read on ScriptureTips)".
  5. If the site's editor isn't supported and the insert doesn't take, the link is copied for the user to paste, with a one-click **"Report this editor"** (sends the site and editor type only, never the user's text).
  - Readers of the forum just click the link. Forums that support link previews (oEmbed / Open Graph) show a preview card with the title and first passage.
- **Sent as a link** that opens without an account and previews nicely in messaging apps and email. Also printable, as a one-page PDF or as plain text.
- **Usually unlisted:** anyone with the link can read it, but it doesn't appear in search, feeds or profiles. A long, unguessable link is the access key: `/s/{key}/v1`.
- **What was sent stays what was sent:** the link pins the version, and passages are pinned to their translation version. Later edits create a new version, and the recipient sees a "revised since" notice (§4.4).
- Public notes live under the author's handle: `/@{handle}/notes/{slug}`, e.g. `/@antz/notes/how-they-drank`.
- **Remembering where a note went:** years later, a user can see where each note was placed and why.
  - **Recorded automatically** when the extension inserts the link (page, site, thread title, date) and when the link is copied or emailed from the app.
  - **Added by hand**, e.g. "Sent to James about baptism".
  - **Visit tallies per site**, from visitors who click through, which also reveals places where others reshared it. Only counts are kept, never visitor details.
  - An extension insert is recorded as *inserted*, and becomes *seen live* once the extension spots the link on that page, or visitors arrive from it (a draft might never have been posted).
  - **Follow-up journal:** private reflections on each note.
  - **Housekeeping:** *archive* (hidden from the user's own list; links keep working) or *withdraw* (readers see a notice, but shared versions stay readable, §4.4). A note can be fully deleted only if it was never placed anywhere.
  - **Privacy:** placements are visible only to the owner; they can be deleted, and insert tracking can be turned off.

### 3.7 Scripture links (passage ↔ passage)
- Link one passage range to another (for example, `Isa 53:4–6` → `1 Pet 2:24`).
- Each link has a **relationship type** (for example: *complements*, *expands on*, *fulfills*, *quotes/alludes to*, *parallels*, *contrasts with*) and a **note** explaining the insight.
- Links do not depend on any one translation. A link appears in every translation that contains the passages, with differences in verse numbering handled automatically.
- **Share as you learn.** A user can publish a link (or annotation) straight away, even while the compilation they were reading in is still a private draft. Because links are stored against the original passages, not a translation, the public sees the linked verses in a **publicly visible translation** (see §4.3). The private draft's text is never exposed.
- Links can be arranged into a **note** (§3.6), for example a study tracing a theme from Genesis to Revelation, with commentary between the steps.
- **Tags and annotation collections:** users tag their links and annotations with their own labels, and group them into **annotation collections** (hand-picked or built from tags and other rules). A collection is put together for a particular publication, edition or audience. Collections are assigned to publications (shown to readers as cross-references and footnotes) and to editions (printed through note streams; see [book-designer.md](book-designer.md) §5). Links themselves stay independent of any compilation, so one link can serve the social features, several publications and several editions at once.
- Only scripture links feed the internal algorithms (connection graph, suggestions, ranking).

### 3.8 External references (passage → outside resource)
- A separate kind of link, from a passage to an outside resource: web page, book, article, audio or video (with a timestamp).
- Citation details are saved when the reference is created, so printed and offline copies survive broken links.
- Included in compiled PDFs as footnotes or endnotes, in a consistent citation style, with QR codes for online resources.
- Quoting outside material follows copyright limits (see §6).

### 3.9 Book designer (print your own Bible)
One of the primary features: design, print and bind a customized Holy Bible. Full design: [book-designer.md](book-designer.md).
- An **edition** (a printed book design) is separate from the compilation it prints. Editions can be **cloned**: for example, make a standard edition, then clone it and adjust page size, margins and fonts for a large-print edition. After cloning, the two are independent. A user can have several of each, and can **swap the compilation** mid-design.
- Add a cover, maps, pictures, notes sections, the user's notes (e.g. studies), research appendices and journaling pages, anchored to **passages rather than pages**. Page numbers, the table of contents and "see Map 3" references then update automatically when anything reflows.
- Full control of format and layout (trim size in mm, binding, columns, margins, fonts, where cross-references and annotations appear), saved as reusable templates.
- Print-ready interior and cover PDFs (with the spine width calculated), preflight checks, and printer profiles. An impact report runs after big changes such as a compilation swap.
- A license check runs on every build (see §6).

### 3.10 AI assistance (bring your own key)
- AI features in the user's workspace and the browser extension use **the user's own API key**, so the platform carries no model costs.
- **Any provider:** Anthropic, OpenAI, Google, OpenRouter, or a local model (e.g. Ollama) for users who want everything kept on their own machine.
- **Keys stay with the user by default:** the web app and extension call the provider directly from the user's device, and the key never reaches ScriptureTips servers. A key is stored on the server (encrypted) only if the user enables a feature that runs in the background.
- **Feature ideas:**
  - explain an original-language word in its context;
  - compare why translations rendered a verse differently;
  - suggest alignments between the user's rendering and the original words;
  - suggest cross-references;
  - summarize an external resource for a research entry;
  - in the browser extension, spot *allusions* to scripture on a page, not just explicit references.
- **AI output is always labeled.** It is never presented as scripture, as research, or as the user's own composition. Accepted AI suggestions in a rendering are marked `ai_assisted` and recorded in the authorship journal (§6.1).

### Social extension

The features below extend the study tool for users who want to share and discuss. They are not required to use ScriptureTips.

### 3.11 Discussion and perspectives
- **Structured responses** to a link: *agree*, *question* or *disagree*, each with a written reason. There is no bare "dislike".
- **Discussion threads** on published work: a verse or passage in a publication, a note, a link or an annotation. Members comment and reply, and a thread may grow into a large discussion.
- **Public discussion is the only form of critique.** Nobody can send changes or suggestions into another person's publication.
- **The author manages the threads on their own work.** They can hide any comment from public view if they don't find it beneficial. It's their publication, so they decide what's displayed on it. A hidden comment's replies are hidden with it. The commenter still sees their comment, marked as hidden.
- **Commenters can withdraw their own comments** at any time, for example after a change of heart, or if they're uncomfortable with where the conversation has gone. Replies stay, with "withdrawn by its author" in place of the comment.
- **Perspectives:** a user who reads the passages differently can add their own link or annotation in reply. It is shown alongside the original, so disagreement becomes something to study rather than a fight.

### 3.12 Groups and contacts
- **Contacts:** share directly with chosen people for one-to-one study.
- **Groups** (for example, a church or a study group): private, shared collections of compilations, links, annotations and notes, with an optional group covenant on top of the platform's own.
- **Collaboration happens in groups, by role.** Each member has a role: *read*, *contribute* (edit the group's work), *publish* or *admin* (membership, conduct and the group's settings). The group's settings decide whether its content may be made public.
  - **Donating a copy:** a member brings their own work into the group by donating a copy (a clone). The copy belongs to the group, and the member's own original stays theirs. The copy's history records where it came from.
  - **Check-out and check-in for verses:** a member opens (checks out) a verse to edit it. If another member checked in a change after that, they're shown the other change and must review it before checking theirs in over the top.
  - **Full audit trail:** every check-out and check-in is recorded with who, when and which revision, so the edit history shows exactly what happened, e.g. "Anna checked out at 10:02, Ben checked out at 10:05, Ben checked in at 10:20, Anna reviewed Ben's change and checked in at 10:31".
  - **Rich text** (note text, annotations, an edition's own pages) is co-edited live.
  - **Disputes are the group's to resolve.** Any member can fork the work into their own compilation and publication, keeping the history and credits. ScriptureTips provides the tools and the record, not a referee.

### 3.13 Notifications
- **What notifies:** comments and replies on the user's work and replies to their comments; publishing review results; moderation and legal notices (always sent, can't be turned off); group activity (donations, a check-in over a verse the user has checked out, membership requests); new versions of a base the user's compilation uses; finished PDF builds; guardian link requests and the handover at 18.
- **Channels:** in-app inbox (always on), email, web push (and mobile push later), and a badge in the browser extension.
- **Settings** per event type and per channel: instant, daily digest or weekly digest. Quiet hours follow the user's time zone.
- **Calm by default:** no engagement bait ("someone liked your post"), no streaks. Group and discussion activity defaults to a daily digest; only direct replies and review results are instant.
- **Email** is sent from our own domain through a mail-sending service over **standard SMTP**, so the provider can be swapped by changing configuration. No provider-specific API.

### 3.14 Search
- **Reference lookup:** typing "jn 3 16" or "Rom 5:8-10" goes straight to the passage (shared reference parser).
- **Scripture text:** words and phrases in one or several translations, or in the user's own compilations, matching word forms ("forgive" finds "forgave"), filtered by book, testament or canon profile.
- **Original language:** by Strong's number, lemma, English gloss or grammar (e.g. every aorist imperative in Paul), matching with or without vowel points and accents. This runs on the word-level data tables (domain model §2.4), not text search.
- **The user's own work:** annotations, links, notes, research libraries, external references, compilations, editions and publications, so they can quickly find what to share through the browser extension and widget.
- **Later, with the social features:** search of other people's public content (published links, notes, publications, users, groups). Unlisted items are never searchable.
- **Not planned:** search by meaning (AI embeddings).
- **Privacy:** every search applies the same permission rules as viewing, enforced in the database. Private content never goes into a shared index.
- **Technology:** PostgreSQL full-text search plus trigram matching for typos; no separate search service. All search goes through one internal interface, so a self-hosted engine (e.g. Meilisearch) could replace it later without rewriting features.

### 3.15 Offline use
- **Study and create without a connection** in the mobile app (and the web app installed as an app): read downloaded publications and compilations, use downloaded lexicon and interlinear packs, and create and edit links, annotations, research entries, notes and compilation verses.
- **Syncs automatically** when the device is back online. An offline verse edit is simply a long check-out: if someone else (or the user on another device) checked in a change meanwhile, the user reviews it before their change goes in (§3.12). Rich text merges automatically.
- **Publishing needs a connection,** because the publishing review runs on the server. Offline work stays private until then.
- **Licenses decide what can be downloaded.** Each translation's license records whether offline copies are allowed (some, like the ESV API, limit this).
- **On-device data is encrypted** and can be wiped remotely from the account settings if a device is lost.
- **Built in from the start:** client-generated IDs, revision-based check-in, and a "changes since" sync API, so offline support doesn't need a redesign later.

### 3.16 Languages
Two separate things: the **interface language** and the **language of the scripture content**. Both are built into the foundations from the start; the features themselves arrive later.

- **Interface:** every user-facing string lives in language files (next-intl) from day one; no text is hard-coded in components. en-NZ first, with US English as a variant. **Later:** volunteer translations of the language files.
- **Content in any language (later feature, supported from the start):**
  - every translation and compilation carries a language tag (BCP 47) and writing direction, so users will be able to curate compilations in their own language (e.g. Māori or Samoan);
  - the reference parser reads book names and abbreviations from data files per language ("Jean 3:16", "Juan 3:16", "Ioane 3:16"), so the extension and widget can work on non-English sites;
  - search uses per-language word matching where PostgreSQL supports it, and plain matching otherwise.
- **Right-to-left:** Hebrew is always shown right to left (interlinear, lexicons, PDFs). Layouts use CSS logical properties from the start, so a full right-to-left interface (Arabic, Persian, Hebrew) can follow without rework. Mixed-direction text is a criterion in the PDF engine trial (book designer §9).
- **Fonts:** open-source Noto fonts for every script, embedded in PDFs.

## 4. Healthy community design

This applies to the social extension (§3.11–3.12). Disagreement is expected and welcome. Hostility is not. The approach:

| Mechanism | What it does |
|---|---|
| **Bridging-based ranking** | Content is promoted when people who *usually disagree* both rate it helpful (the method behind Community Notes). Fair, careful contributions rise; tribal ones don't. |
| **Comfortable circles, open window** | Users choose who they *engage* with, but are still shown the strongest, kindest version of other views. The aim is to avoid fights *and* echo chambers. |
| **Friction before heat** | Possibly hostile wording is spotted before posting, with a prompt to rephrase. Heated threads get cooling-off periods; rapid back-and-forth replies are rate-limited. |
| **Reputation for helpfulness** | Reputation rewards clear reasoning, charitable readings and citing scripture, not popularity. |
| **Community covenant** | Conduct guidelines grounded in scripture (for example, Eph 4:29, Matt 18:15, Col 4:6), which moderators can point to. Groups may add their own. |
| **Personal boundaries** | Self-service mute, block, and limits on who may reply. |
| **Moderation from day one** | Reports, review queue, moderation actions, audit trail and appeals. |

Patterns in what people like and dislike may be used to shape their experience **only with opt-in consent**. They are stored as aggregated signals (never labels like "this person believes X"), can be viewed and reset by the user, and are never shown to other users.

### 4.1 Trust and safety: behavior, not belief

The guiding rule: **ScriptureTips moderates behavior, never belief.** A rendering or interpretation that differs from mainstream translations is welcome. Some mainstream translations themselves differ greatly from the original. What is moderated is conduct: spam, fake accounts, harassment, deception and illegal content.

| Concern | Approach |
|---|---|
| **Accuracy of renderings** | Handled with **transparency, not removal**. Every verse shows its origin (selected, corrected, adapted, or the user's own) and can be opened against the original-language text. For a user's own rendering, the tools show how closely it follows the original words (alignment coverage, words added or left out). Readers judge for themselves, and bridging-based helpfulness ratings surface renderings that people across viewpoints find faithful. |
| **Deceptive content** | Content that has nothing to do with the original (e.g. an advert placed in Genesis 1:1), or that impersonates a published translation, *is* moderated as deception or spam, not as a matter of doctrine. Plugins always label user renderings as such, so a website visitor is never misled about what they are reading. |
| **Fake and malicious accounts** | Graduated **trust levels** (as in the Discourse forum software): new accounts can study privately at once, but making content public, posting links, messaging strangers and rating at full weight are unlocked over time through genuine activity. Bot checks at sign-up, rate limits, and detection of coordinated behavior (groups of accounts rating or posting together to game the ranking). Ratings from low-trust accounts count for less. |
| **Offensive and abusive content** | AI-assisted triage for spam, abuse, threats and explicit material, using a **panel of several language models** from different providers, to reduce the bias of any one model. A cheap first pass screens everything; only uncertain or flagged items go to the full panel. **When the models disagree, the item goes to a human.** Every model is tested for bias before use against a labeled set that includes sincere minority interpretations. **AI flags, humans decide** on anything beyond holding an item for review. AI is never used to judge doctrine or interpretation. |
| **Data sent to models** | Anonymized as far as practicable: no account IDs or usernames are sent, and user handles are stripped from the text before it leaves ScriptureTips. |
| **Disclosure** | Users are told plainly, at sign-up and in the privacy policy, which of their content is processed by language models, which providers are used, and why. |
| **Private content** | Never reviewed, scanned or sent to the moderation panel. A user's own AI features (bring your own key) are the only route by which private content reaches a model, and only when the user turns them on. |
| **Group content** | Group moderators are the first line inside their groups, under the group's covenant, with the automated tools available to help them. |
| **Transparency** | No hidden "shadow bans". Every action tells the user what was done, which covenant clause it relates to, and how to appeal. |

Legal processes to build in:
- The Harmful Digital Communications Act 2015 complaint process for online content hosts: notify the author within 48 hours; they have 48 hours to respond.
- The Copyright Act notice-and-takedown process (§3.3).
- Reporting of objectionable material under the Films, Videos, and Publications Classification Act.

### 4.2 Private until published

Nothing a user creates leaves their private workspace until they explicitly publish it.

1. **Private by default:** compilations, renderings, links, annotations, research and notes are visible only to their owner while being worked on. ScriptureTips does not review, scan or send private work to any model.
2. **Publishing is a procedure, not a toggle:** the user chooses a scope (one of their groups, or the public). They see the pre-publish checks (license composition, attributions, the origin of every verse, the covenant) and consent to review.
3. **Review at the point of publishing:** this is where ScriptureTips takes on responsibility for what it presents, and has the right to require that the work follows the community guidelines.
   - *Public:* the moderation model panel, then human moderators for anything flagged.
   - *Group:* the group's own moderators, with the automated tools available to them.
4. **Publications are fixed snapshots with a permanent history:** a published version never changes. Edits become visible only when the owner publishes a new version, and every earlier version stays available (§4.4).
5. **Social features attach to published work only.** Discussions, perspectives and ratings exist only on content that has been published. Comments are themselves public as soon as they're posted, so they are checked when posted.

Sharing directly with chosen contacts is a private share between people who know each other, not a publication, and isn't reviewed.

### 4.3 Sharing learnings while a compilation is unpublished

Users learn as they go and will want to share links and annotations immediately. Publishing a single link or annotation must therefore be quick, and must never require publishing the compilation behind it.

- **Links are translation-independent** (they reference canonical passages), so a link made while reading a private draft is valid in every translation.
- **Public display text** comes from the first available of:
  1. the viewer's own preferred translation or compilation;
  2. the **display translation** the author chose when publishing the link (only publicly visible translations are offered);
  3. the author's latest public publication;
  4. the default public translation for the viewer's language.
- **Nothing private leaks.** The text, name and abbreviation of a private compilation are never shown publicly. That includes the "as entered" reference: if it was entered in a private compilation, the public sees it in the display translation's numbering.
- If the author's note quotes their own private rendering, that quoted text is part of what they are publishing, and is reviewed as such.
- **Lighter review for small items:** a single link or annotation is published as soon as it passes the automated check. Only flagged items wait for a human. Publications and other large works get the full review.

### 4.4 Published history: an accurate record of what was shared

Once something is public, other people act on it: they read it, quote it, reply to it and build on it. If the author could quietly change the words afterwards, the discussion would no longer match what provoked it. So published work keeps a permanent, visible history.

- **Versions are immutable.** A published version of a publication can't be edited. Even a typo fix is published as a new version.
- **Permanent links pin a version.** Every share link, embed and discussion reference points to a specific version (e.g. *My Compilation, v3*), not "latest". A person who follows a link sees the words that were shared. Website plugins may follow the latest version, but they record which version they served.
- **Visible notice of change.** When a newer version exists, readers of an older version see: "This text has been revised since this version (v3). See v5 and what changed." Discussion threads show which version each comment was written about.
- **Change history for everyone.** Each version has a change summary and a verse-by-verse comparison with the previous version, which anyone who can read the publication can open. The author can add a note explaining why they made the change.
- **Integrity.** Each version has a content hash, and the hashes are chained and periodically timestamped by an outside service (the same mechanism as the authorship evidence in §6.1). The record of what was published, and when, can't be altered afterwards, even by ScriptureTips.
- **Withdrawing is not erasing.** A withdrawn publication is no longer offered to new readers, as a base for new compilations, or to new plugin installations. Versions that people have linked to remain readable at their permanent links, with a "withdrawn by the author" notice, and discussions stay readable but closed to new comments.
- **Small items too.** Published links, annotations and comments also keep their edit history. An edited item shows an "edited" marker, and anyone can open the earlier versions. Where an edit changes the meaning of something others replied to, replies show the version they were written against.
- **Exceptions, always disclosed.** Content is removed from a version only for legal or safety reasons (copyright notices, Harmful Digital Communications Act orders, illegal or objectionable material, or an erasure request that must be honored). The version is replaced with a visible marker ("removed: copyright notice, 2027-03-02") that keeps the version number, dates and hash, so the history shows that something existed and why it is gone.
- **Private drafts are different.** Work that has never been published has ordinary private revision history for the author's own use (domain model §1.3), and can be freely edited or deleted.

## 5. Privacy and compliance

- Follows the NZ Privacy Act 2020, and the EU GDPR for European users (religious belief is "special category" data there).
- Explicit consent before any profiling. Users can see, export and delete their data.
- Language-model processing is disclosed: which content, which providers, and for what purpose. Sending personal information to overseas providers follows the Privacy Act's cross-border rules (IPP 12).
- Only the data that's needed is collected. Private content is encrypted at rest; private and group content is never used for public ranking.

### 5.1 Your data, and leaving
- **Full export at any time, in open formats:** compilations as USFM or OSIS; annotations, links, notes, libraries, comments and edit histories as JSON; citations as CSL-JSON; uploaded files as they are. One download, which also meets the Privacy Act right of access.
- **Deleting an account:**
  - **Private work** is deleted completely.
  - **Published work stays available to the public by default**, at its existing links, as the published-history rule requires (§4.4). The user chooses whether it keeps their name or is credited to **"a former member"**. Comments are handled the same way.
  - **Optional extra: remove my published content too.** Never-referenced versions are deleted outright. Versions that others have linked to, discussed or built on are taken out of public view and replaced with a visible marker ("removed by its author when they left ScriptureTips, 2027-03-02"), as for other disclosed removals (§4.4). So the record shows something existed and why it's gone, but the words are no longer shown. Other people's forks are their own copies and remain, credited to "a former member".
  - **30-day grace period** to change their mind, then the deletion runs. The handle is retired permanently.
- **Legacy contact:** a user can name someone who, on proof of death, can download the export, choose what stays published, and turn the account into a memorial. Without one, the account and its published work remain as they are.
- **Inactive accounts are never deleted automatically.** People return to study tools after years.

### 5.2 Minors: full participation, with a guardian
Minors have the same rights to participate as everyone else: every feature, including publishing, discussion and groups. ScriptureTips doesn't strip young people of participation because they might be harmed; it acts against the people who would do harm.

- **Declared, not verified:** a user under 18 declares that they are in the minor age bracket at sign-up.
- **A guardian is required.** A minor's account is linked to a guardian's ScriptureTips account, with both agreeing to the link, before the minor can publish, comment or join groups. Until then the account can still be used for private study.
- **The guardian can see all of the minor's activity:** private work, published work, comments, groups and messages. They have view-only access: they can't edit, publish or post as the minor.
- **The guardian reports harm through the normal abuse channels** (§4.1). Minors get no extra moderation beyond this. The platform-wide moderation of behavior applies to everyone as usual.
- **Not shown publicly:** other users aren't told that an account belongs to a minor, so the label can't be used to single them out.
- **At 18, guardian access ends automatically,** and both are told beforehand. A guardian link can also be changed (e.g. to another parent), with the minor's agreement and the new guardian's acceptance.

## 6. Licensing

- **ScriptureTips itself:** the license is to be confirmed. The prototype's terms (free to use, no profit-making, no advertising) express the intent. We need to choose a formal open-source or source-available license that keeps that intent.
- **Translations:** each translation stores its license terms in a machine-readable form.
  - *Lexham English Bible (LEB):* the LEB may be **given away in full**, so hosting it on ScriptureTips and printing for personal use or to give away are fine. A work that is **sold** may include the LEB only if it makes up **less than 25%** of the content (50% only for non-profits supporting non-English Bible translation). Editions that include LEB text and are intended for sale must calculate this share and warn or block. See [licenses.md](licenses.md) §3.1.
  - *NET Bible:* the text (without the notes) may be copied and printed for others **as long as it is given away**. ScriptureTips is never monetized (§1.1), so hosting it and free printed copies are fine. Editions for sale may contain it only within HarperCollins's gratis limits. See [licenses.md](licenses.md) §3.2 and §4.1.
  - *HarperCollins translations* (NKJV, NIV and others): quotation only, under the publisher's gratis rules. The license engine applies them to any verses credited to these translations. See [licenses.md](licenses.md) §4.1.
- **Translations and their licenses page (to be designed):** a public page that explains, in plain language:
  - why some translations aren't available on ScriptureTips, so a user can see why their favorite translation is missing;
  - the constraints of each translation that *is* available, for example why some can't be corrected or adapted in a compilation, and why the user is warned when their work contains more than a set share or number of verses from one translation.

  - **what each import left out or decided**, so readers can see the limits of the data they're reading. Every import of a text or data set (translations, versification mappings, lexicons …) produces a technical report: rows skipped and why, conflicts between sources and which one was chosen, known gaps. For example, the TVTMS versification import's `import-report.txt` (`packages/versification/src/data/`). Each report is rewritten for non-technical readers: what was imported, what's missing or uncertain, and what that means for them in practice (e.g. "some verses of the Greek Exodus 36–39 can't be linked yet").

  The details will be worked out when the license engine is built, because the restrictions are easier to explain once they're implemented. The page and the engine's warnings should link to each other.

  **Writing the import summaries:** a language model drafts the plain-language version from the technical report as part of the import, run by the maintainer, so it costs nothing at run time. A person checks the draft against the report before it's published, because it must not overstate or hide a gap. The summary is stored with the import, kept in step with the report when the import is rerun, and is UI text (en-NZ, translatable).
- **Full survey:** all translations, datasets and rule types are cataloged in [licenses.md](licenses.md). Publications derived from share-alike sources (CC BY-SA) must themselves be published CC BY-SA, so the license engine calculates each publication's license from its sources.
- **External material:** a print includes the citation and the user's own note by default. Quoted text is kept short (NZ Copyright Act fair dealing for criticism and review) or is included only after the user confirms they have the right to use it.
- **Strong's numbers:** the numbering system and James Strong's original 1890 concordance and dictionaries are in the public domain. Modern revised editions (e.g. *The New Strong's Exhaustive Concordance*) add copyrighted material, and that material is not used. Only public-domain or openly licensed digitizations are used (e.g. STEPBible extended Strong's, CC BY).

### 6.1 The user's own wording

ScriptureTips supports each user's right to express the scriptures in the words they believe are best, even where those words match an existing translation, whether by coincidence or not. Because many renderings of a verse are short and constrained by the original text, matching wording is common.

Copyright protects a work against *copying*, not against someone else independently arriving at the same words. Evidence that the user composed the text themselves is therefore what matters. The system:

1. **Records how each own rendering was composed.** This is an authorship journal: typing activity in the ScriptureTips editor (timing and revisions, not a keylogger), the study tools consulted while writing (interlinear, lexicons, research entries), and the user's translator's note explaining their choice.
2. **Treats pasting differently from typing.** Text pasted from a translation in ScriptureTips is automatically treated as a modification of that source (§3.1). Text pasted from outside is marked `pasted` and must be declared and checked before it can count as the user's own.
3. **Checks similarity.** Each own rendering is compared with every translation in the system. Matches are shown to the user ("92% similar to the NIV") and recorded, so similarity is known and explained, never hidden.
4. **Makes the author declare it.** The user confirms the wording is their own composition, made in good faith to express the original.
5. **Proves the date.** Each journal entry is hashed into a tamper-evident chain and periodically timestamped by an outside service, so the record can't be backdated or altered.
6. **Credits each verse to its origin** in reading views, plugins and printed attribution pages.

Limits to be honest about:
- Typing evidence shows the user wrote the words. It does not by itself prove they didn't retype what they saw in another translation, especially as ScriptureTips shows translations side by side. The study-tool trail, the translator's notes and the similarity record together make the strongest case.
- Under the NZ Copyright Act's host protection, ScriptureTips must still respond to notices about public content (§3.3).

## 7. Technology summary

All TypeScript, in one monorepo. Full rationale: see [architecture.md](architecture.md) (to be written).

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Runtime | Node 24 LTS, TypeScript 6 (strict) |
| Development environment | Docker only: Node, pnpm and all tools run in a toolbox container; nothing is installed on the host |
| API | NestJS (Fastify adapter) |
| Database | PostgreSQL (full-text search; pgvector later) |
| ORM | Drizzle |
| Jobs / cache | Valkey + BullMQ |
| Auth | Better Auth (self-hosted): sign-in with a one-time email code, no passwords; passkeys next (§11) |
| Web | Next.js (React), server-rendered public pages |
| Mobile (later) | Expo / React Native |
| Real-time | NestJS WebSockets; Yjs for collaborative editing later |
| Files | S3-compatible storage (MinIO in development) |
| Print / PDF | LaTeX worker (proven), Typst under evaluation |
| i18n | next-intl, default locale `en-NZ`, right-to-left support |
| Testing | Vitest, Playwright |
| AI | Moderation: a panel of models from several providers. Vercel AI SDK as the single interface to providers. User features: bring your own key, any provider or local model. |
| Hosting (initial) | Docker Compose + Caddy on a single VPS |
| WordPress | Thin PHP plugin that loads the shared JS widget |
| Future | ActivityPub federation: the data model should allow it, but it isn't built at launch |

### 7.1 Running costs and sustainability
ScriptureTips is never monetized (§1.1), so running costs are kept low.

- **Fair-use limits** (configuration, raised as capacity allows): storage allowance per user and per group; PDF builds queued one at a time per user with a daily cap; draft PDFs expire while final print files are kept; rate limits per site on the widget and API.
- **Cheap traffic:** pinned versions never change, so their passage and note responses are cached permanently, and most widget traffic is served from cache.
- **Satellite installations (distant future):** organizations may one day run their own ScriptureTips instance. Nothing is planned yet, but design choices should keep this easy: everything configurable through environment settings, no hard-coded domains, the whole stack in Docker Compose, and federation readiness (ActivityPub). This points towards an open-source code license such as AGPL (open question 2).

## 8. Conventions

- **UI text:** New Zealand English (for example, "colour", "organise", "favourite").
- **Code, CSS, comments and documentation:** US English (for example, `color`, `organize`).
- **Look-alike characters in code:** write dashes, curly quotes and other characters that look like ASCII as `\u` escapes (`"\u2013"`, `/[-\u2014]/`), so a reviewer can tell them apart. Prose (docs, comments) and text data (test inputs, source-text excerpts) use the characters themselves.
- **Git:** conventional commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:` …).

## 9. Legacy repositories

These will be imported into this monorepo or retired:

| Repository | Fate |
|---|---|
| ScriptureTips-API (`rebuild` branch) | Reference for the domain model and the export pipeline; rewritten |
| ScriptureTips-App | Reference for the management UI; rewritten |
| ScriptureTips-BibleManager | Dev environment; replaced by the monorepo's `infra/` |
| ScriptureTips-BrowserPlugin | Live on the Chrome Web Store; ported to use the shared reference parser |
| ScriptureTips-WordpressPlugin | Rewritten as a thin wrapper around the widget |
| ScriptureTips-WebsitePlugin | Rewritten; the former implementation is kept in an archived branch |
| tex-bible | Source of print typesetting styles |

Legacy repos contain committed secrets (JWT keys, `.env`). These must not be carried over, and the keys must be treated as compromised.

## 10. Delivery order

The first three stages complete the primary purpose: **ScriptureTips as a study tool**. **The first public release** comes when an edition can be exported as a PDF (the end of stage 3). Until stage 5, export and deletion requests are handled manually (Privacy Act 2020).

| Stage | Contents |
|---|---|
| **1. Compilations and publications** | Foundations first: monorepo, testing framework (testing.md), accounts, canon choice, versification, reference parser, public-domain translations, passages API. Then compilations (bases, layered overrides, own wording with authorship evidence, modified translation verses as corrections or adaptations), the publishing procedure with the automated check, versions, published history and URLs. |
| **2. Study tools** | Interlinear, Strong's, lexicons, Paleo-Hebrew letter forms, personal research libraries, scripture links, external references, annotations, tags, annotation collections, search of the user's own content. |
| **3. Book designer** | Editions, the PDF engine (after the LaTeX vs Typst trial), printer profiles, preflight checks. |
| **4. Sharing and the browser extension** | Notes with placement tracking; the rewritten browser extension (v1.0.3 parity, tooltips, note insert flow), released as an update to the existing Web Store listing; the website widget and its JavaScript API; the WordPress plugin. Built together because they share most of their code. Until then, v1.0.3 stays live as it is. |
| **5. Your data** | Full export, account deletion with its options, legacy contact. |
| **Later** | The social features: discussion, groups and collaboration, public content search, guardians for minors' social activity. Also notifications beyond the basics, offline and mobile, AI assistance (BYOK), content in other languages, volunteer UI translation, federation, satellite installations. |

Foundations for the later stages are still built from the start where retrofitting would be costly: language files and language tags, RTL-ready layouts, client-generated IDs, revision-based check-in and the sync API, the visibility model and the authorization matrix test.

## 11. Open questions

1. Which translations are available at launch. **Research done** ([sources.md](sources.md)): public domain and open-license candidates are verified, with origins; the LEB is used under the 2020 license it was obtained with; the NET may be hosted and given away free, with conditions (§1.1); the BBE is left out for now. Wanted copyrighted translations and their routes: sources.md §4.1.
2. Legal entity to own and operate ScriptureTips (e.g. a charitable trust or incorporated society), separating the operator's personal liability from the platform's.
3. Which language models make up the moderation panel (§6). Decided at the social-features stage. Every call is paid by the operator, since ScriptureTips earns nothing, so an open-weights safety model on our own server is preferred for the first pass.
4. Which domain name(s) to commit to permanently, including a short domain for printed QR codes, and the handle rules (how often a handle may change, which group names need verification).
5. Age-related laws in countries where users live (e.g. bans on under-16s using social media, the EU's age of digital consent, US COPPA for under-13s): how the guardian model (§5.2) applies, and whether any country needs different rules. **Deferred** until after the first public release.
6. **Bot check for sign-up and code requests:** self-hosted, so no visitor data goes to a third party (which rules out reCAPTCHA, hCaptcha and Cloudflare Turnstile). Candidate: ALTCHA (proof of work, MIT). Needs approval as a dependency when accounts are built.

**Decided:**
- **Unit for the LEB share rules:** verses. Every license restriction found names verses as its unit (licenses.md §8).
- **Code license:** AGPL-3.0.
- **LLM-based tone check:** acceptable, with data anonymized as far as practicable (§6).
- **WebsitePlugin:** rewritten; the old implementation is archived in a branch (§9).
- **First public release:** when an edition can be exported as a PDF (§10).
- **Research libraries:** the ScriptureTips default library is the official, curated base material; groups share their own libraries (§3).
- **Provider-agnostic AI library:** the Vercel AI SDK, approved.
- **Review for single links and annotations:** a lighter automated check with immediate publishing, and human review only when flagged (§4.3).
- **Deleting a never-referenced published version:** allowed; only a tombstone remains (domain model §1.5). Its audit record is kept for 3 months.
- **Name for shareable pages:** notes, e.g. `/@antz/notes/how-they-drank` (§3.6). Short thoughts attached to a passage or word are **annotations**.
- **Other scriptures:** the reference parser keeps its extension point; other scriptures will come later as an opt-in feature, to help link traditions and understand common themes.
- **Canon profile:** there is no default; new users choose one at sign-up from the main traditions.
- **Sign-in:** a one-time code sent to the user's email address (6 digits, valid for about 10 minutes, a few attempts per code), with **no passwords**. Signing in proves control of the address, so it doubles as email verification, with no identity documents asked for. Users stay pseudonymous: any email address will do, including private ones, which matters for believers where faith is persecuted. Long sessions (renewed while in use) keep the emails few. Code requests are protected by a self-hosted bot check (which one: item 6) and rate limits per address and IP. **Next:** passkeys as an optional, phishing-resistant second way in.
