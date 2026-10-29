# ScriptureTips: Domain Model

> Status: draft, 2026-10-25. This is a conceptual model, not a database schema. Field lists show intent; types and indexes will be settled when the schema is designed.
> Companion to [vision.md](vision.md).

## 1. Cross-cutting concepts

### 1.1 Identifiers
- All entities use **UUIDv7** keys internally: they sort by time and can be merged across environments. UUIDv7 embeds its creation time, so **UUIDs are never used in public URLs**.
- Public content gets a separate random **public ID** (about 8–10 characters, URL-safe, unique), used in URLs and as the stable **canonical URI**, so ActivityPub federation can be added later without migrating data (§1.6).

### 1.2 Ownership and visibility
Every item of user content (scripture link, external reference, annotation, note, perspective, comment) carries:

| Field | Meaning |
|---|---|
| `owner` | The account that controls the item: either a **User** or a **Group** (`owner_type` + `owner_id`). |
| `author` | The User who wrote it (always a user, even when a group owns it). |
| `visibility` | `private` · `contacts` (only the grants listed in `ShareGrant`) · `group` · `unlisted` (anyone with the link; not in search, feeds or profiles; `noindex`) · `public` |

- New content defaults to `owner = author` and `visibility = private`. **Nothing becomes visible to a group or the public without an explicit publish action by the owner** (§1.4).
- **ShareGrant** (`item`, `grantee_user`) lists the specific contacts who can see an item with `contacts` visibility.
- Every read query goes through one access-check function (one *visibility policy*), so the rules can't drift between features.

### 1.4 Publishing procedure
The only way content leaves a user's private workspace.

1. **Choose the scope:** a group the user belongs to, unlisted (anyone with the link), or the public.
2. **Pre-publish checks** shown to the user: the license composition and required attributions, the origin of every verse (with any similarity warnings), and the community covenant.
3. **Consent:** the user confirms they understand the content will be reviewed by automated tools (named in the privacy policy) and, where flagged, by human moderators.
4. **Review:**
   - *Public:* the moderation model panel, then human review of anything flagged or disputed.
   - *Group:* the group's moderators, with the automated tools available to them.
5. **Result:** published, returned with reasons (the user can fix it and resubmit), or appealed.

| Entity | Key fields |
|---|---|
| **PublishRequest** | item (publication, link, annotation, note, research library …), scope, requested_by, consented_at, status (`checking` · `in_review` · `published` · `returned`), reviewer notes |

Withdrawing a publication stops it being offered to new readers, bases and plugin installations. Versions already linked, quoted or discussed stay readable at their permanent links with a "withdrawn" notice, and their discussions stay readable but closed (vision §4.4).

**Small items** (a single link, annotation, comment or note) get a lighter path: an automated check, then immediate publishing, with human review only if flagged. Publications and research libraries get the full procedure.

**Publishing a link from a private draft:** the publish step asks for a `display_translation`, offering only publicly visible translations and the author's publications. Private compilation text, names and "as entered" references are never shown publicly (see vision §4.3).

### 1.3 Revisions and deletion
- User content is **versioned**: each edit writes a revision (author, timestamp, diff/snapshot). This allows undo, a "who changed what" view, and moderation evidence.
- Deletion is **soft** first (`deleted_at`): the user can undo it for **30 days**, then it is permanently purged. A user can also request erasure at any time from their data and privacy settings.
- **Published content is different** (§2.3, §3, §4): published versions are immutable, edits create new versions, and the history stays visible. Only legal or safety removals blank a version's content, leaving a tombstone (vision §4.4). Once a link, annotation or comment has been published, each edit keeps the earlier text as a **public revision** (author, timestamp, content hash) that readers can open, and replies record the revision they were written against (VersionReference).
- When a scripture link is deleted, its replies and perspectives stay. They show "original removed" and keep the passages for context.

### 1.5 Deleting a never-referenced published version
An author may delete a published version that no one has acted on (vision §4.4).

- **Eligible only if** the version has no `VersionReference` (comments, generated share links or embeds, use as a base, other users' edition builds, plugin installs, quotes in others' content) and no open moderation case or legal hold. Raw page views don't count (crawlers would make every version "seen").
- **Race safety:** reference creation takes a shared lock on the version row and requires `status = published`; deletion takes an exclusive lock and re-counts references in the same transaction. A database trigger refuses to blank a version's content while any reference exists, as a backstop.
- **Two phases:** `published` → `pending_delete` (new references and new readers blocked immediately; a short undo window, e.g. 24 hours) → `deleted`, performed by a background job that re-checks eligibility.
- **What is removed:** verse snapshot, annotation-collection snapshot, generated files in object storage, search index entries, caches and CDN copies. Backups age out within a documented window (e.g. 30 days).
- **What is kept:** a tombstone with version number, dates, content hash and chain link (so the hash chain stays intact), plus an audit record of who deleted it and the eligibility checks (kept for 3 months). The permanent link returns "410 Gone: deleted by the author".
- **Storage:** each version is a full compressed snapshot, so nothing else depends on it. Sharing rows between versions would need reference counting, and is only worth it if storage costs demand it.
- **Known gap:** off-platform sharing of a plain page URL isn't detectable. The 410 notice means those links never silently show different words.

### 1.6 URLs, handles and slugs
The path describes; a trailing ID pins.

| Kind | Pattern | Rule |
|---|---|---|
| Publication (latest available version) | `/p/{handle}/{publication-slug}[/{book}[/{chapter}[/{verse or range}]]]` | Resolves through the current namespace to the latest active version. If that version is withdrawn or removed, falls back to the latest available version, then to the tombstone. |
| Publication (pinned version) | the same path + `/{versionId}`, e.g. `/p/antz/plain-words-bible/john/3/16/7Kd9xQ2m` | **The version ID is authoritative.** If the path doesn't match the version's current path (rename, handle change), redirect to the current path. |
| Other published content (links, annotations, libraries, editions) | `/{kind}/{handle}/{slug}/{publicId}`, e.g. `/l/antz/john-3-16-and-isaiah-53/Xp4n8Rtz` | Same rule: the ID wins; without the ID, the path resolves to the current item. |
| People / groups | `/@{handle}` | One namespace shared by people and groups. |
| Scripture (translations) | `/read/{translation}/{book}/{chapter}[/{verse}]` | Naturally readable, no ownership issue. |
| Printed-edition QR codes and external citations | Short ID-only redirect on a dedicated domain kept permanently | Never uses a handle or slug. |
| Note (unlisted) | `/n/{key}/v{n}` | The key is long and unguessable (about 22 characters) because **the link is the access key**. No handle or slug, and no path-based access. |
| Note (public) | `/@{handle}/notes/{slug}[/{noteId}]`, e.g. `/@antz/notes/how-they-drank` | As for other published content: the ID wins. |
| Private content | `/{kind}/{publicId}` | **No slug**: titles in URLs leak through referrers and logs. |

#### Passage references in URLs
| Passage | Canonical form (after `/p/{handle}/{slug}` or `/read/{translation}`) |
|---|---|
| Chapter | `/john/3` |
| Verse | `/john/3/16` |
| Verse range in one chapter | `/john/3/16-18` |
| Chapter range | `/john/3-5` |
| Range across chapters | `/john/3:16-4:2` |
| Part of a verse | `/john/3/16a` |
| Psalm heading | `/psalms/51/0` |
| Non-contiguous or cross-book | `/passage/john.3.16-18,rom.5.8` (OSIS-style, comma-separated, served as ordered segments) |

- Other spellings (`/john/3:16`, abbreviations, `%3A`-encoded colons) are accepted and redirect to the canonical form.
- A trailing version ID may follow any form. IDs are fixed length and always contain letters, so they can't be mistaken for a reference (digits, `:`, `-`, `.`, `,` and a final `a`/`b`).
- **Formats:** browsers get HTML. The parallel JSON API (`/api/v1/publications/{id}/passages?ref=…&version=…`) accepts **free-text references** through the shared reference parser and returns segments of verses (number, text, paragraph/heading markers, origin, credit, note anchors) with explicit **gap markers** for verses the publication omits.
- **Caching:** pinned-version responses are immutable (`Cache-Control: immutable`, long lifetime). "Latest" responses have a short lifetime and an ETag.
- **Limits:** long passages are paginated. A per-request verse limit applies to translations served under quotation limits (e.g. the ESV API).

- **Book, chapter, verse segments** use the publication's own versification. Book segments are fixed lowercase English names (`genesis`, `1-peter`), independent of UI language; localized names and abbreviations are accepted and redirect to the canonical form.
- **Slugs** are unique **per owner** and generated from the title (editable). Renaming keeps the old slug in **SlugHistory** (owner, kind, old slug, target, changed_at) as a permanent redirect, and the old slug is never reused by that owner for different content.
- **Handles:** ASCII letters, digits and hyphens only (prevents lookalike-character impersonation); display names may use any script. Reserved handles:
  - **Matched exactly:** the site's own paths (`api`, `read`, `p`, `l`, …) and the service and system names of two published lists (The Big Username Blocklist and shouldbee/reserved-usernames, MIT, generated by `tools/source-conversion`).
  - **Matched in a normalized form,** so variants such as `jesus777`, `the-real-god` and `g0d` are caught too: staff words (`admin`, `moderator`, `official`, …); every name and title of God, Jesus and the Holy Spirit, everyday words among them (`god`, `yahweh`, `lord`, `king`, `light`, `word`, …); scripture itself (`bible`, `torah`, …); other faiths' main deities, with founders whose names are common given names only by title (`prophet-muhammad`, `guru-nanak`); and people of the Bible only with a title (`apostle-paul`, `king-david`, `virgin-mary`; plain `paul` stays available). No account appears to speak for God or for ScriptureTips.
  - **Display names** are checked against the same normalized names (not the paths or published lists): accents and vowel points are removed and other scripts folded, so `The Lord` or `Ἰησοῦς` is refused, while `Godfrey Smith` is fine. The Name (the Tetragrammaton, in Hebrew or Latin letters) is refused anywhere in a display name. For now the lists are in code (apps/api `reserved-handles.ts`); **later** it moves to the database, so staff can maintain it without a release. Group handles that resemble well-known organizations need verification before they are issued.
- **Ownership:** the platform owns the namespace; a handle is a revocable license, not property (terms of use). The owner controls the paths under their handle. No buying or selling of handles; a dispute process exists.
- **Changing a handle:** allowed with a rate limit; the old handle redirects. A handle that has **ever had published content is retired permanently** and never issued to anyone else, so ID-less links can't fall into someone else's hands. Handles without published content are quarantined for about 90 days.
- **Canonical links:** pages declare a canonical URL (the pinned form) for search engines.
- **Federation:** the actor identity uses the public ID, not the handle.
- **Deleted or withdrawn items** keep their ID URL, which serves the tombstone page (vision §4.4).
- **Slugs for non-Latin titles:** transliterate, or fall back to an ID-only path. Normalize Unicode before comparing.

## 2. Scripture text

| Entity | Key fields | Notes |
|---|---|---|
| **Translation** | abbreviation, name, language, script direction (left-to-right or right-to-left), versification scheme, license | Imported from USFM / OSIS. |
| **Book** | canonical book code (OSIS, e.g. `Gen`, `1Pet`, `Tob`, `1Macc`), translation-specific name/abbreviations, original writer(s) (traditional attribution, with a note where authorship is debated) | Includes deuterocanonical and other additional books. Order and status come from the canon profile. |
| **CanonProfile** | name (Protestant · Catholic · Orthodox …), description | There is no default: users choose at sign-up and can change it later. Stored as a user setting (`user.canon`). For now the profiles are data in code (`packages/canon`); tables come when users or groups can define their own. |
| **CanonBook** | canon profile, book, status (`canonical` · `additional`), order, section (e.g. Old Testament, Apocrypha, New Testament), part of (a book printed inside another: Greek Esther, the additions to Daniel, Baruch 6) | Decides where a book appears and whether it is labeled "Additional writings". Every profile places every book. A reader without a profile sees books the traditions disagree on labeled as such. |
| **Verse text** | translation, canonical ref, text (with formatting markup), paragraph/section markers | Stored **per verse**, with paragraph and section markers as fields: this fits the cache (§2.5), provenance and license counting. |
| **TranslatorNote** | translation, anchor (§2.6), kind, body (with formatting markup), category (e.g. `screen`: shown on screen, left out of print) | A note the translation's own translators wrote: footnotes, alternative renderings, the literal wording of an idiom. Imported with the text (§2.6). |
| **VersificationScheme** | name (e.g. English/KJV, Hebrew, LXX, Vulgate), canon (list of books) | Every Translation and Compilation declares one. |
| **VersificationMapping** | scheme, scheme ref ↔ canonical ref, mapping type | Converts a scheme's verse numbering to and from the **canonical scheme** (§2.1). |

### 2.1 Versification

Translations number verses differently: verses moved between chapters (English Joel 2:28–32 = Hebrew Joel 3:1–5), Psalm headings counted as verse 1, the Septuagint/Vulgate Psalm offset, verses split or merged (3 John 14–15), verses omitted (Matt 17:21, Acts 8:37), and books present in only some canons.

- **Hub and spoke.** All stored references use one **canonical scheme**: original-language numbering (Paratext's "org"). Each scheme maps only to and from the canonical scheme, never directly to other schemes.
- **Canonical numbering per book:** the Hebrew (Masoretic) numbering for the Old Testament books in the Hebrew Bible, the Greek (Septuagint) numbering for the deuterocanonical books, and the Greek numbering for the New Testament. Verse numbers a tradition skips (e.g. Matt 17:21 in the Greek text) still exist in the canonical scheme, so translations that have the verse can be stored against it.
- **Users never see canonical numbers.** Display, input and URLs always use the numbering of the translation or compilation being read.
- **Mapping data:** taken from STEPBible's **TVTMS** (Tyndale House), with Paratext `.vrs` files as a fallback. License: CC BY 4.0, confirmed and obtained (`license-evidence/stepbible-data/`). Credit "STEP Bible" linked to www.STEPBible.org; record any changes we make. The mapping data generated from TVTMS is committed with the versification package.
- **Mapping types** tell the reader view how to handle each case:

| Type | Meaning | Display behavior |
|---|---|---|
| `renumbered` | Same text, different number | Transparent |
| `merged` / `split` | Several verses ↔ one | Show the whole matched range |
| `partial` | Part of a verse (`a` / `b`) | Highlight, marked "part of verse" |
| `omitted` | Not present in this translation | "This verse isn't in the LEB. Show it in KJV?" |
| `added` | Present only in this translation/canon | Shown; links from other schemes don't reach it |

- **Psalm headings** are verse `0`, so they can be linked like any other verse.
- **The prologue to Sirach** is verse `0` of chapter 1 for now (Sir 1:0), in every translation that prints it, wherever the source puts it (after `\c 1`, or in the book's introduction). Like a Psalm heading it's numbered where no scheme numbers it. It may become a prologue element of its own (§10).
- A **golden test set** of the hard cases above runs in CI against every change to mapping data or the reference parser.

### 2.2 Passage (value object)
A passage is a **range** in the canonical versification, for example `Isa.53.4–Isa.53.6`.

- Stored as `start_ref` / `end_ref` in OSIS form, **plus** an integer ordinal range (`book·10⁷ + chapter·10⁴ + verse·10 + part`, where `part` is 0 for a whole verse and 1, 2 … for `a`, `b` …). PostgreSQL range types with GiST indexes make "which links touch this passage?" a single fast query that also catches overlapping ranges.
- Can be a single verse, part of a verse, a span of verses, or a span across chapters. Spans across books are not allowed (use a note, or the multi-segment passage route, instead).
- Always resolved through VersificationMapping when shown in a particular translation or compilation.
- **As entered:** every stored passage also keeps the reference exactly as the user entered it (`entered_scheme` + `entered_ref`, e.g. `LEB Joel 2:28`). This shows what the author saw, and lets the canonical passage be recalculated if mapping data is corrected.
- **Translation-aware parsing:** the reference parser always parses in the context of a scheme. The plugins assume English/KJV numbering unless the page or user settings say otherwise.

### 2.3 Compilation (curated translation)

The user's preferred translation, built by combining verses from source translations. **This is the central object of the product.** A user may own any number of compilations.

| Entity | Key fields | Notes |
|---|---|---|
| **Compilation** | title, abbreviation, language, versification scheme, **base** (a Translation, or a Publication + pinned version), preface, ownership (§1.2) | The working draft, always private to its owner. Readable, printable and usable in the owner's own plugins like any translation. The versification scheme defaults to the base's. |
| **Publication** | compilation, title, owner, scope (`group` + group, or `public`), status (`active` · `withdrawn`), current version, permalink | The stable identity of a published compilation. Created through the publishing procedure (§1.4). |
| **PublicationVersion** | publication, version number, immutable snapshot (verses, origins, credits, license composition), **assigned annotation collections** (§3.6), author's change note, change summary + diff against the previous version, content hash, previous hash, status (`in_review` · `published` · `removed`), published_at, removal record | What readers actually read, and what plugins and discussions pin. Never edited after publishing. A new publish creates version n+1; earlier versions stay. Hashes are chained and periodically timestamped (**TimestampAnchor**, §2.3.1). A `removed` version keeps its number, dates and hash but its content is blanked; the removal record names the legal or safety reason, the date and the actor. |
| **VersionReference** | item (comment, link, annotation, share link, embed, base of a compilation), publication version | Records which version each piece of content or plugin install points at. Drives the "revised since" notices, and shows whether any version has ever been referenced. |
| **CompilationRule** | compilation, scope (testament/section · book · chapter · verse range), source (Translation or Publication + version) | Layered overrides on top of the base: "Genesis from KJV", "Genesis 1:1–5 from LEB". The most specific scope wins; equal scopes cannot overlap. Single verses are CompilationVerse rows. |
| **BaseUpdate** | compilation, base publication, from version, to version, changed verses, status (`pending` · `accepted` · `partly_accepted` · `declined`) | Created when a base publication publishes a new version. The user reviews the changes verse by verse. |
| **CompilationVerse** | compilation, canonical ref, origin (`source` · `edited` · `pasted` · `ai_assisted` · `own`), source translation + source verse (if any), **edit kind** (`correction` · `adaptation`, for `edited` only), **source snapshot** (for `edited`: the source text as it was, its hash, and the source import it came from), text, change note, translator's note, word count, authorship declaration | A single-verse choice, a modified translation verse, or the user's own rendering. Verses taken unchanged from a rule need no stored row. |
| **CompilationNote** | compilation verse, anchor (§2.6), body, origin (`original` · `modified` · `own`), source TranslatorNote + snapshot of it (for `original` and `modified`), removed (for a removed original) | A translator's note as the compilation has it. Notes left unchanged on a `source` verse need no stored row. |
| **CompilationAlignment** | compilation verse, word span in the user's text ↔ original-language tokens (§2.4) | Links the user's wording to the original words it renders. Optional, but powers interlinear and word-study views for the compilation. |

- **Provenance is always kept.** Every verse records its origin:
  - `source`: taken unchanged from a translation.
  - `edited`: derived from an existing translation's verse, then modified. It keeps the source as provenance, a snapshot of the source text it started from, and the change, and counts toward that source's license share. Its **edit kind** is one of:
    - `correction`: a small fix to a mistake in the source (typing error, missing or doubled word, punctuation). The credit stays with the source translator, marked as corrected ("LEB, corrected by [user]"). A change of more than **3 words or punctuation marks** (each added, removed or replaced; spacing doesn't count) can't be saved as a correction and becomes an adaptation. A translation's license settings can override the limit.
      - **Why punctuation counts:** "For verily I say unto you, Till heaven and earth pass, one jot or one tittle shall in no wise pass from the law, till all be fulfilled" (Matthew 5:18, KJV; also Luke 16:17). The jot (yod, the smallest Hebrew letter) and the tittle (Greek *keraia*, the small stroke that tells one letter from another) are the least marks of the text, and Jesus held that even they matter. A comma or a full stop can change how a verse reads, so a change to one is counted like a change to a word.
    - `adaptation`: the wording itself changed. Credited "adapted by [user] from the LEB".
  - `pasted`: text pasted from outside ScriptureTips. It can't count as the user's own until it has been declared and checked for similarity, and then becomes `own` (if declared as their own composition) or `edited` (if a source is identified).
  - `ai_assisted`: the rendering includes accepted AI suggestions. Each accepted suggestion is recorded in the authorship journal as its own event, with the provider and model. It is labeled for readers and does not count as the user's own composition.
  - `own`: written by the user from the original, backed by an authorship journal (§2.3.1). Counts as the user's own work.
  Attribution and the license share calculation (§7) depend on this.
- **Resolution order** for each verse (most specific first): CompilationVerse → the narrowest matching CompilationRule → … → the base. The editor shows the winning layer and the layer it overrides, and *reset to inherited* deletes the override.
- **Built so far (slice 1):** Compilation and CompilationRule with a Translation as base and source. The compilation's verses and numbering are its base's, so a book the base lacks can't yet take a rule. A source verse is used only where it covers exactly the same canonical verses as the compilation's verse; otherwise the next layer supplies it. Single-verse choices and edits (CompilationVerse `source` and `edited`) are built too: an edited verse shows its source snapshot's headings and notes, and a change to the source is flagged in the editor (rebasing comes later). Own renderings (`own` and `pasted`) are built with their authorship evidence (§2.3.1): the journal, the study trail (the translations the editor showed), similarity reports, the declaration, and an evidence export that is not yet signed. Translator's notes in compilations are built (CompilationNote): on an edited verse a source's note can be reworded (`modified`, keeping a snapshot of the original) or removed (recorded), and the user can add their own notes to an edited verse or their own rendering, each marked after a word of the verse. Changing a note on a verse taken unchanged makes it an edited verse. Selecting and adjusting a note's word range comes later: own notes are placed after one word for now, and a source note keeps its span as imported. AI-assisted text and outside timestamping (TimestampAnchor) come later.
- **Built so far (publishing procedure, slice 3b, §1.4):** each publish is a PublishRequest (scope, the consent statement's version and when it was accepted, status, problems, warnings, review). Step 2 runs on request before publishing and again when publishing: the license composition (each source's verses and share), the attributions readers will be shown, and the similarity warnings for the user's own verses (score 90 and up). It refuses verses still pasted, an unknown license, changed wording under `no_modification`, a `name_restriction` term in the title or abbreviation ("Lexham"), source notes under `notes_excluded` (the NET's), and a slug already published. Step 3's consent statement is versioned (`consent{n}` in the UI messages); a publish sent with an older one is refused. **Until moderation exists, step 4 is the automated license check alone** (project owner's decision, 2026-10-29): a request that passes is published at once, recorded as `review: automated-license-check, content: not-reviewed`, so moderation can later be applied to these versions too. Each version stores the attributions it was published with, and readers see them: the designation after each run of verses from that source ("(LEB)", linked) and the credit statement with its required links. The plain reader shows a translation's own attribution the same way. The community covenant, groups, appeals and the owner's private compilation reader's attributions come later.
- **Built so far (publishing, slice 3a):** Publication and PublicationVersion. Publishing snapshots every verse of the compilation as the reader has it, stored a chapter at a time, with the credits and license composition; versions are numbered and hash-chained, with a change summary (the verses changed since the previous version), and never change. The scope is `unlisted` or `public` (groups come with the social features). An **unlisted publication is read only at a pinned version's link**: its path (`/p/{handle}/{slug}`) is guessable, so the version ID is the key, as a note's key is (§1.6). A public publication's path follows its latest version. Verses still `pasted` can't be published. The age declaration, content review, withdrawing, VersionReference, deleting a never-referenced version, and caching pinned versions as immutable come later.
- **Base publications are pinned:** a compilation built on a publication always reads from a specific version, never "latest", so its text never changes without the user's consent (see BaseUpdate). A withdrawn base remains readable at the pinned version for compilations already built on it, under the license it was published with.
- **Credit chains:** provenance resolves through publications to the ultimate source (translation + verse, or a user's own rendering). Credits name the translator first, then acknowledge the publications the verse came through.
- **Mixed numbering:** a verse taken from a source with a different scheme is mapped through the canonical scheme into the compilation's scheme. Where a source omits a verse, the next rule in priority order supplies it, or the gap is flagged for the user to fill.
- **Edits** to an existing translation's wording are allowed except where the source's license has a `no_modification` rule. Every `edited` verse is marked as modified wherever it is shown, and any publication version or edition build containing them gets a generated modification notice for each source (vision §3.1), stored in the snapshot. All user wording keeps a revision history (§1.3).
- **Source changes:** when a new import of a translation changes a verse that a compilation has as `edited`, the snapshot no longer matches, and the user is notified. They can keep their change (rebased on the new source text, with the new snapshot) or drop it and return to the source. Published versions keep the snapshot they were published with.
- **License-limited sources** (e.g. the NLT: 500 verses per compilation, no more than 25% of the work, never a complete book; online, 50 verses per page displayed). The UI is designed around the license rules (§7) rather than blocking at the end:
  - Such a translation can't be a compilation's **base** (`not_as_base`); the user starts from another translation.
  - It is shown **alongside** the base in compare view, so the user can pick individual verses into the compilation. Only while such a translation is selected, compare view is limited by its `max_verses_per_display` rule (50 for the NLT and TLB): it pages or scrolls through a window of at most that many verses, and **the window is always smaller than the book**, so a short book (Obadiah, Philemon, 2–3 John, Jude) is never shown whole. Other translations are compared a whole book at a time as usual. The limit is a per-translation setting, set from each license.
  - Each picked verse counts toward the limits, and the editor shows how many remain. When a limit is reached, further verses from that translation can't be added.
  - **Export** (PDF edition) is blocked while its verses make up more than 25% of the compilation's verses.
  - **Online pages** (a published compilation, a note, a link, a ScriptureTip) show no more than 50 of its verses per page displayed (`max_verses_per_display`), and its words make up no more than 25% of the page's words (`max_share_of_work` with the unit `words`). For a note, that means at least three words of other content for every NLT word. See [licenses.md](licenses.md) §4 and the NLT evidence for how these limits were derived.
  - Where a page would go over a limit, the verses beyond it are replaced by a link to a configurable external scripture reader (set per translation; no particular service is preferred) (`external_reader_link`), rather than blocking the whole page.
- **Translator's notes** (§2.6) come with every verse taken from a translation. A `source` verse shows its translation's notes unchanged. When a user edits a verse, they can also edit its notes: change the wording or the span, remove a note, or add their own. Each note in a compilation records where it came from:
  - `original`: the translation's note, unchanged.
  - `modified`: started as the translation's note and then changed. It keeps the original note as provenance (a snapshot of it and the import it came from) and is marked as modified wherever it is shown ("note adapted from the LEB").
  - `own`: written by the user.
  A removed original note is recorded, so the change summary and modification notice can list it. Notes count with their verse in the license share calculation (§7).
  - **A note belongs to its verse.** Changing a note (rewording, removing or adding one, or moving its range) alters the verse: a verse taken unchanged becomes an `edited` verse of its translation, even if its words are unchanged, and counts as one altered verse toward the source's limits, the same as a change to its words. The verse's words and its notes together are one alteration, not one per change.
  - **A note's word range.** Every note in a compilation applies to a range of the verse's words, from a start word to an end word (a single word, or a point where the publisher marks only a point). The editor lets the user select that range in the verse text and adjust its start and end, which changes how many words the note covers. This matters most after rewording a verse: the words a note referred to may have moved, changed or gone, so the user moves the note's start and end onto the right words. A source note's span (the LEB's ⸤…⸥) is its range to begin with; a range moved from the source's is a change to the note (`modified`). The editor flags a note whose range no longer fits the reworded verse.
- **Plugins:** the browser extension can show the user's own private compilation to them. Website plugins, which public visitors see, serve only **publications**, either pinned to a version or following the latest, and always record the version served (VersionReference).
- Builds on the prototype's verse cloning (`Verse.fromVerse`, `wordCount`).

#### 2.3.1 Authorship evidence

Evidence that a user composed their own wording (see vision §6.1).

| Entity | Key fields | Notes |
|---|---|---|
| **AuthorshipJournal** | compilation verse, author, started_at, completed_at | One per own rendering session. Private to the author. |
| **CompositionEvent** | journal, timestamp, kind (`insert` · `delete` · `paste` · `undo` …), text delta, paste origin (internal source / external), prev_hash, hash | Recorded only inside the ScriptureTips editor and grouped into short bursts, not individual keys. Each event's hash includes the previous one, making a tamper-evident chain. |
| **StudyTrail** | journal, timestamp, resource consulted (interlinear token, lexicon entry, research entry, translation viewed) | Shows the user worked from the original, and also which translations they had in view. |
| **SimilarityReport** | compilation verse, translation, score, matched spans, computed_at | Computed against every translation in the system when the rendering is saved. Visible to the author; included in evidence exports. |
| **AuthorshipDeclaration** | compilation verse, author, statement version, declared_at, final text hash | The user's good-faith declaration of their own composition. |
| **TimestampAnchor** | chain head hash, service (RFC 3161 timestamp authority or OpenTimestamps), receipt, anchored_at | A periodic outside timestamp of chain heads, proving the records existed at that date. |

- **Evidence export:** the author can export a signed evidence bundle for any verse (journal, trail, similarity report, declaration, anchors).
- **Privacy:** journals are personal data. They are visible only to the author, kept while the rendering exists, and deleted with it unless the user chooses to keep an export.
- **License share:** `own` verses count as the user's work. A high similarity score against a licensed translation is shown as a warning in the share report (§7) but does not reassign the verse. The user's declaration and evidence stand.

### 2.4 Original-language data

The tools exist to lead the user back to the original text. Every source text, dictionary and study lens is stored with its own source and license, and is shown with its source.

| Entity | Key fields | Notes |
|---|---|---|
| **SourceText** | name, language (Hebrew · Aramaic · Greek), tradition (e.g. Masoretic, Septuagint, Textus Receptus, critical, Byzantine), license | One manuscript edition, e.g. Westminster Leningrad Codex. The Septuagint is a comparison text for every user, whatever their canon profile. |
| **Token** | source text, canonical ref, position, surface form, transliteration, lemma, morphology code, gloss | One original-language word in a verse. |
| **Lemma** | language, dictionary form, Strong's number, extended Strong's (STEPBible), other identifiers | The dictionary headword shared by all forms of a word. Our own ID is the key. Strong's numbers are attributes, because one Strong's number sometimes covers several different words (which extended Strong's tells apart), and some numbers are unused. Users can search and link by Strong's number. |
| **LexiconEntry** | lexicon, lemma, definition (rich text) | Several lexicons per lemma, shown side by side. |
| **Lexicon** | name, author, year, license | e.g. Brown-Driver-Briggs, Thayer, STEPBible brief lexicons. |
| **TranslationAlignment** | translation, verse, word span ↔ tokens | How a published translation rendered each original word (e.g. KJV with Strong's tags). Powers "how was this word translated" across translations. Compilations use CompilationAlignment (§2.3). |
| **Variant** | canonical ref, readings (source text + tokens), note | Differences between manuscript traditions. Explains `omitted` and `added` versification cases (§2.1). |
| **LetterForm** | letter, Paleo-Hebrew glyph, name, Unicode code points | The 22 Hebrew letters and their ancient forms: facts only. Pictograph **meanings** are interpretation and live in research libraries (§3.5), shown with whose research they come from. |

**Candidate open data** (each license must be confirmed before use):

| Data | Candidates |
|---|---|
| Hebrew OT text + morphology | Westminster Leningrad Codex (public domain); Open Scriptures Hebrew Bible morphology (CC BY); STEPBible TAHOT (CC BY) |
| Greek NT text + morphology | STEPBible TAGNT (CC BY, covers several traditions); Nestle 1904, Robinson-Pierpont Byzantine, Scrivener TR (public domain); MorphGNT (CC BY-SA) |
| Lexicons | Strong's original 1890 dictionaries, Brown-Driver-Briggs, Thayer, Abbott-Smith (public domain); STEPBible brief lexicons (CC BY). **Not** modern revised Strong's editions, which are copyrighted. |
| English alignment | KJV with Strong's numbers (public domain) |
| Letter pictograph meanings | Not imported. The ScriptureTips default research library (written by the project with sources cited), plus users' and groups' own libraries (§3.5) |

- Lemma links work like passages: **annotations can attach to a lemma** (§3.4), so a word study follows the word to every occurrence.
- **Word study queries** (every occurrence of a lemma, and how each translation or compilation rendered it) run over Token + alignment tables. They need careful indexing but no separate search engine.

### 2.5 Scripture content cache

All scripture text the API serves comes from **one cache**, the authoritative store for scripture content within the API. The same pattern applies to every translation, whatever its origin.

| Entity | Key fields | Notes |
|---|---|---|
| **PrimingSource** | translation, kind (`import` · `database` · `api`), configuration (file or importer reference, or endpoint, credentials reference and rate limits), license evidence reference, active | Where content comes from when the cache can't answer. Consulted **only** when the requested content isn't cached or its entry has expired. |
| **CacheEntry** | translation, canonical ref (one verse), content (verse text with formatting markup), source (the PrimingSource used), fetched_at, **storage_expires_at** (license: when the content must no longer be held; null = no limit), **refresh_after** (data integrity: when to check the source for updates; null = never), source version or hash | One cached piece of scripture. Readers are always served from here. |
| **CacheChange** | cache entry, translation, canonical ref, source, old content + hash, new content + hash, detected_at, review status (`open` · `reviewed`), reviewed_by, review note | Logged whenever a fetch returns content that differs from what was cached. |

- **Two kinds of expiry:**
  - **Storage expiry** (`storage_expires_at`) satisfies a vendor's license. Once it passes, the content is not served until it has been fetched again from the licensed source. If that fails, the content is unavailable (for a license-limited translation, readers get the external reader link).
  - **Refresh** (`refresh_after`) keeps content up to date. Once it passes, a refresh is attempted; if the refresh fails, the stale content may still be served.
- **Read path:** look up the cache per verse → if the entry is missing or its storage expiry has passed, fetch from the translation's priming source, store the new entry and serve it → if only `refresh_after` has passed, try a refresh and fall back to the cached entry → otherwise serve the cached entry.
- **Lifetimes come from the license.** An imported public-domain file primes entries with no storage expiry (`storage_expires_at` null). An API whose terms allow only temporary caching sets `storage_expires_at` from its cache rule (`max_cache_lifetime`, [licenses.md](licenses.md) §8). Our own database can be a priming source too.
- **API sources fetch on demand.** For a translation primed from a publisher's API (the NLT: Tyndale's NLT API), only the verses users actually ask for are fetched and kept, within the API's rate limits. Nothing pre-fills the whole text.
- **Access is checked before the cache.** The license engine (§7) decides whether a request may be answered at all, for example refusing a whole book of a translation with a `no_complete_book` rule. A cache hit never bypasses a license limit.
- **Changed content is logged and reported.** Every refresh, and every refetch after a storage expiry, compares the new content with the cached content (by hash). A difference is logged as a **CacheChange** and raises a notice to the administrators. A change can mean a new upstream edition, which may come with different license terms, so the translation's license and evidence are reviewed again (the evidence policy in [sources.md](sources.md) §7) before the change is marked reviewed. **The changed content keeps being served** in the meantime: we trust the source, and without advance notice of a license change, we review and adjust with reasonable speed once the change is detected. Changed verses also trigger the compilation snapshot check (§2.3, *Source changes*).
- Every entry keeps its source and date, so any verse shown can be traced back to where it came from (the source ledger, [sources.md](sources.md) §7).

### 2.6 Translator's notes

Many translations come with their translators' own notes: footnotes, alternative renderings ("Or …"), textual notes, and the literal wording behind an idiomatic phrase. They are part of the translation as published, so they are imported with it and carried through wherever its text goes.

- **Every translation that provides them.** The import keeps every note a translation's source gives (the LEB's 24,247, the NET's, the WEB's footnotes, …); none is dropped.
- **Anchored like an annotation.** A note's **anchor** is a point in the verse text (where the publisher prints the note mark), or a **span** of words when the publisher marks one. The LEB marks idiomatic phrases with lower corner brackets, ⸤like this⸥, and gives the literal wording in the note after them: the bracketed words are the span, and the note is its body. A span can run across a verse number (LEB Hos 4:10–11), so an anchor has a start and an end, each a canonical ref and a position in that verse's text.
- **Always with the text.** Wherever a translation's text is shown, exported or printed, its notes are available with it. A reader can collapse them in a view, and an edition decides where they're placed (book-designer.md §5, stream B), but they can't be detached from the text. The publisher's own categories are kept: a note the LEB marks for screen only is left out of print unless the edition asks for it.
- **In compilations,** notes travel with their verses and can be edited with them, keeping their provenance (§2.3).
- **Annotation collections** can include translator's notes like any other annotation (§3.6).

## 3. Linking

There are two different kinds of link, kept as separate entities on purpose.

### 3.1 ScriptureLink (passage ↔ passage)
The core asset. Only these feed the internal algorithms (connection graph, suggestions, ranking).

| Field | Notes |
|---|---|
| `source` | Passage |
| `target` | Passage |
| `relationship_type` | → RelationshipType |
| `note` | Rich text: the author's insight |
| ownership + visibility | §1.2 |
| `in_response_to` | Optional → a ScriptureLink, Annotation or ExternalReference (marks this link as a *perspective*; see §4.3) |
| `touches_additional` | Derived: true if either side falls in a book that is `additional` in the canon profiles. Such links can be filtered out and are kept separate from the scripture graph used by the algorithms. |
| `display_translation` | Set when published: a publicly visible translation or publication used to show the passages to viewers who have no preference of their own. Never a private draft. |

**RelationshipType** (curated list only; users can't define their own):

| key | label | inverse label | symmetric |
|---|---|---|---|
| `complements` | complements | complements | yes |
| `parallels` | parallels | parallels | yes |
| `expands` | expands on | is expanded by | no |
| `fulfills` | fulfills | is fulfilled by | no |
| `quotes` | quotes / alludes to | is quoted by | no |
| `contrasts` | contrasts with | contrasts with | yes |

For an asymmetric type, the link is shown with the inverse label when it is read from the target side.

### 3.2 ExternalResource and ExternalReference (passage → outside material)

**ExternalResource**: one record per outside resource, shared by every passage and user that cites it.

| Field | Notes |
|---|---|
| `kind` | web page · book · article · audio · video · other |
| `citation` | **CSL-JSON**, the standard used by citeproc/Zotero, so PDFs can be rendered in any citation style |
| `url`, `isbn`, `doi` | Optional identifiers; used to avoid duplicate records |
| `snapshot` | Title, author, publisher, date and accessed-at, captured when the resource is added. It stays usable after the link dies. |
| `link_status` | Periodic link checking (ok / redirected / dead) |

**ExternalReference**: a user's reference from a passage to a resource.

| Field | Notes |
|---|---|
| `passage` | Passage |
| `resource` | → ExternalResource |
| `locator` | Page, section, or media timestamp |
| `note` | The user's own commentary |
| `quote` | Optional short excerpt |
| `quote_rights` | `fair_dealing` (short, for criticism/review) · `permission_confirmed` · `public_domain` · `own_work` |
| ownership + visibility | §1.2 |

### 3.3 Study paths → notes
Study paths have been merged into **notes** (§3.7): a study is a note whose blocks are mostly links, with text between them.

### 3.4 Annotation
A standalone annotation, for thoughts that aren't connections. It attaches to **either** a passage **or** a lemma (§2.4); a lemma annotation is a word-study annotation and appears at every occurrence of that word.
`subject` (passage or lemma), `body`, ownership + visibility.

### 3.5 Research libraries
A user's (or group's) collection of researched material, which they use as reference material when explaining their ideas.

| Entity | Key fields | Notes |
|---|---|---|
| **ResearchLibrary** | title, description, ownership + visibility (§1.2) | A user may have several. Groups and organizations own libraries visible only to members unless made public. |
| **ResearchEntry** | library, title, body (rich text), subjects (letter forms, lemmas, passages, topics), revisions | e.g. "The letter ש: pictograph and meaning". |
| **ResearchCitation** | entry, ExternalResource (§3.2), locator, note | Acknowledges where an idea came from, without reproducing the source. |
| **ResearchFootnote** | item (annotation, link, compilation verse, note block), research entry | Attaches an entry to a piece of content as a footnote: "see my research into …". Printed as a footnote in PDFs. |

- **ScriptureTips default library:** the official, curated base material, written by the project with sources cited (starting with the 22 Hebrew letters). It's shown by default and labeled as ScriptureTips material. A user can hide it.
- **Sharing:** a library owned by a group is shared with the group's members, or with the public if the group's settings allow. Users can browse the libraries of friends and of the users and groups they follow, and see recommended libraries.
- **Resolution order** when showing interpretive material such as letter meanings: the user's own libraries → their groups' libraries → libraries they follow → the ScriptureTips default library. The user can switch between them. If the user has hidden the default library and none of the others covers the subject, nothing is shown ("no research yet").
- **Copyright:** content is never scraped or bulk-imported. A user's private libraries are their own responsibility. Public entries are covered by the terms of use and the notice-and-takedown process (§6).

### 3.6 Annotation collections
Reusable, named sets of annotations, assigned to publications (for readers) and editions (as note streams for print), used as layers in the reading view, and in the plugins. Full design: [book-designer.md](book-designer.md) §5.

| Entity | Key fields | Notes |
|---|---|---|
| **AnnotationCollection** | title, description, ownership + visibility, rules (filter definition), priority | Private until published. Groups can own collections. |
| **AnnotationCollectionItem** | collection, item (ScriptureLink · Annotation · ExternalReference · ResearchFootnote · translator's note), mode (`include` · `exclude`), sort order | Hand-picked entries, and overrides of the rules. Items are referenced, not copied. |
| **Tag** | name, owner (user or group), color (UI only) | Users' own labels. Applied to links, annotations, external references and research entries via **TagAssignment** (tag, item). Independent of any compilation. |
| **AnnotationAnchor** (value object) | level (`verse` · `word` · `range`), canonical passage, original-language token (for `word`), fallback | Word-level anchors are located in each compilation through its alignment; they fall back to verse level when there is no alignment. |

### 3.7 Notes
A shareable page of the user's own text plus passages from anywhere in the Bible, e.g. a note to a friend, or scripture sent as supporting references.

| Entity | Key fields | Notes |
|---|---|---|
| **Note** | title, owner, visibility (usually `unlisted`), access key (unlisted), public ID, comments allowed (default off), current version | Readable without an account. Rich link previews (title and first lines). |
| **NoteVersion** | note, version number, immutable snapshot of the blocks, content hash, published_at | Generated share links pin a version; edits create a new version with a "revised since" notice for readers of older versions (vision §4.4). |
| **NoteBlock** | note version, order, type (`text` · `passage` · `link` · `annotation` · `external_reference` · `research_entry`), content: rich text; or passage + source (translation or publication **+ pinned version**) + display (`full` · `reference_only`) + optional comment; or a reference to the item (pinned to its revision) | Passages may come from any book, in any order. Notes never create links implicitly; a "Link these" action creates a ScriptureLink from two passage blocks deliberately. |

- **Creation shortcuts:** "Add to note" anywhere in the app; paste a free-text list of references (expanded by the reference parser); in the browser extension, select text containing references on a page.
- **Browser extension insert flow** (user steps in vision §3.6). Technical requirements:
  - **Remember the cursor:** when the composer is opened, the content script records the focused editable element and the selection (`selectionStart/End` for `textarea`/`input`, a DOM `Range` for `contenteditable`), because opening the composer takes focus away.
  - **Composer UI:** an in-page overlay isolated in a shadow DOM (or the browser's side panel), opened by a button next to the focused text box or a keyboard shortcut.
  - **Insert so the site notices:** `setRangeText` plus an `input` event for text fields; `insertText` via the editing commands for rich editors (keeps the site's undo history and works with React-style editors); content scripts in all frames for editors inside iframes. Fallback: copy to clipboard with a "press Ctrl+V" prompt.
  - **Format per site:** plain URL, Markdown, BBCode or HTML link (the existing extension already generates all three), auto-detected where possible and remembered per site.
  - **Fast publishing:** the light automated check runs within seconds while the link is returned. If the check flags the note, the link shows "pending review" until a moderator clears it.
  - **Privacy:** the extension reads a text field only when the user invokes it; it never captures what users type in the background.
  - **Sign-in:** the extension signs in with the user's ScriptureTips account (OAuth with PKCE).
  - **Link previews:** an oEmbed endpoint and Open Graph tags, so forums can show a preview card.
- **Outputs:** web page, print and one-page PDF, "copy as text" for email.
- **Placement tracking** (private to the owner):

| Entity | Key fields | Notes |
|---|---|---|
| **NotePlacement** | note, version, channel (`extension_insert` · `copied_link` · `email` · `manual`), page URL, site, page or thread title, placed_at, status (`inserted` · `seen_live` · `not_found` · `manual`), last_seen_at, owner note | Created by the extension on insert, by share actions, or by hand. Each placement also creates a VersionReference (so the note can no longer be fully deleted, §1.5). |
| **NoteReferrerStat** | note, referrer site (+ path where the browser provides it), first_seen, last_seen, visit count | Aggregated counts only; nothing about individual visitors. Reveals reshares too. |
| **NoteJournalEntry** | note, body, created_at | Private follow-up reflections. |

  `Note` also gets an owner-only `archived` flag. Archiving hides the note from the owner's list without affecting its links. Insert tracking can be turned off in the extension settings, and placement records can be deleted by the owner.
- **Publishing:** unlisted and public notes go through the light automated check (§1.4). Translations shown must be publicly visible; licensing rules (e.g. quotation limits) are checked like any other published item. Some limits are per page and counted in words: an NLT passage block is allowed only while the note stays within 50 NLT verses and NLT words are no more than 25% of the note's words (§2.3). The editor shows both counts as the user writes.

## 4. Discussion

### 4.1 Thread and Comment
- A **Thread** belongs to one subject: a passage in a PublicationVersion, a published Note, a ScriptureLink, an ExternalReference or an Annotation.
- A **Comment** has `thread`, `parent_comment` (nested replies, **at most 3 levels deep**), `author`, `body`, revisions and `state`:

| State | Set by | Effect |
|---|---|---|
| `visible` | — | Shown to everyone who can see the subject |
| `hidden_by_owner` | Owner of the subject (the author of the publication, note, link or annotation) | Hidden from public view along with its replies; still visible to its commenter (marked hidden) and to moderators. The owner can unhide it. |
| `withdrawn` | The commenter | The body is removed from view; replies stay, under "withdrawn by its author". |
| `removed` | Moderators (§6) | For conduct or legal reasons; recorded in the moderation log. |

- There is **no suggestion or change-request mechanism** on other people's publications; public discussion is the only form of critique.
- Withdrawn and hidden comments are kept privately until their author deletes them from their data and privacy settings (or they are purged like any soft-deleted item, §1.3). **Moderation evidence used to impose a membership penalty is never pruned:** it's needed to audit moderators' activity and for security. When the penalized account is deleted, the evidence is kept without anything that identifies the person, so it is no longer personal information under the Privacy Act 2020.
- Thread state: `open` · `cooling_off` (replies paused until a set time) · `locked`.

### 4.2 Response (structured stance)
A user's position on a ScriptureLink or Perspective: `stance` (`agree` · `question` · `disagree`) plus a **required** `reason`. Each user has one response per item, which they can edit.

### 4.3 Perspective
A ScriptureLink or Annotation with `in_response_to` set, answering a ScriptureLink, an Annotation or an ExternalReference. It is displayed **alongside** the original rather than buried inside its thread. A perspective's visibility can't be wider than its own owner allows, but it may be narrower than the original's.

### 4.4 HelpfulnessRating
Separate from stance: "was this helpful?" (`helpful` · `somewhat` · `not_helpful`) on links, perspectives and comments. **This is the input to bridging-based ranking**: someone can disagree with a perspective and still rate it helpful.

## 5. People and groups

| Entity | Key fields | Notes |
|---|---|---|
| **User** | handle, display name, email, locale, trust level, created_at | Accounts and sign-in are handled by Better Auth: a one-time email code, no passwords (vision §11, Decided). The email address is private and never shown to other users. |
| **AIProviderConfig** | user, provider, model preferences, key location (`device` · `server`), encrypted key (only when `server`), enabled features | Bring your own key. By default the key stays on the user's device (web app / extension storage) and is never sent to ScriptureTips. |
| **Profile** | bio, avatar, public links | Shown only to the audience the user chooses. |
| **Contact** | user A ↔ user B, status (`requested` · `accepted` · `blocked`) | Both users must accept. Used for `contacts` visibility. |
| **Group** | name, slug, description, visibility (`private` · `listed`), join policy (`invite` · `request` · `open`), covenant (optional) | e.g. a church or study group. |
| **GroupMembership** | group, user, role (`read` · `contribute` · `publish` · `admin`), joined_at | |
| **PersonalBoundary** | user, kind (`mute` · `block` · `reply_limit`), target | Self-service. |

| **AccountDeletion** | user, requested_at, runs_at (requested + 30 days), published content choice (`keep_named` · `keep_as_former_member` · `remove`), comments choice (`keep_named` · `keep_as_former_member` · `withdraw`), state (`pending` · `cancelled` · `completed`) | `remove`: unreferenced versions are deleted (§1.5); referenced versions become tombstones with reason `author_left`. Forks owned by others are untouched; their credits switch to "a former member". |
| **LegacyContact** | user, contact (user or email), verified_at, activated_at, proof of death (reviewed by staff), choices made | Once activated, the contact can export, choose what stays published, and set the account to `memorial`. |
| **DataExport** | user, requested_at, format bundle, download URL (expires), completed_at | Built by a background job. |

| **GuardianLink** | minor (user), guardian (user), requested_at, accepted_by_minor_at, accepted_by_guardian_at, ended_at, end reason (`turned_18` · `replaced` · `revoked_by_staff`) | Gives the guardian read-only access to everything the minor's account can see or has done, including private work and messages. Guardian access is itself logged and visible to the minor. |

`User` gains `state`: `active` · `pending_deletion` · `deleted` · `memorial`, and, once the user first opens a feature that communicates with others, starting with publishing (vision §5.2), `age_bracket`: `adult` · `minor` (self-declared) plus `turns_adult_on` (from the declared birth month and year). Until then both are empty: private study needs neither. A `minor` without an accepted GuardianLink can't publish or use the social features.

### 5.1 Group collaboration
Each member has a **role**: `read` (can read the group's items), `contribute` (can also edit them), `publish` (can also publish them) or `admin` (can also manage membership, conduct and the group's settings). The **group's settings** decide whether its content may be made public at all.

| Entity | Key fields | Notes |
|---|---|---|
| **Donation** | group, item donated (compilation, publication version, note, annotation collection, research library, edition), donated_by, source item + version, new group item, donated_at | Donating clones the item into the group. The member's original is unaffected; the group copy's history starts with the donation. |
| **VerseCheckout** | compilation verse, user, base revision (the one they opened), checked_out_at, state (`open` · `checked_in` · `abandoned`) | Opening a verse to edit it records a check-out. |
| **VerseCheckin** | checkout, new revision, checked_in_at, conflicts reviewed[] (revisions checked in by others since the base revision, each with reviewed_at) | Check-in is refused until the user has reviewed every revision checked in by others since their base revision. |

- **The audit trail** is the ordered list of check-outs and check-ins for each verse (plus the existing revision history), showing who opened which revision when, and who checked in over whom.
- **Rich text** (note text blocks, annotations, edition rich-text pages) is co-edited live with Yjs; snapshots are saved as revisions with all contributors credited.
- **Forks:** any member can start their own compilation based on the group's work (§2.3), keeping history and credits.

### 5.2 Devices and sync
Supports offline use (vision §3.15).

| Entity | Key fields | Notes |
|---|---|---|
| **Device** | user, name, platform, registered_at, last_synced_at, wiped_at | Remote wipe sets `wiped_at`; the device erases its local data at next contact. |
| **ChangeLog** | sequence number, owner or group, item type, item ID, revision, change kind (`created` · `updated` · `deleted`), at | Ordered feed behind the "changes since" sync API (`GET /api/v1/sync?since={cursor}`). Each device keeps its own cursor. |
| **OfflinePack** | kind (`publication` · `compilation` · `lexicon` · `interlinear`), source + version, size, offline allowed (from the license engine) | What a device may download. |

- **Offline writes** are queued on the device with client-generated IDs (UUIDv7) and the base revision they were made against. On reconnect, each queued verse edit becomes a check-in (§5.1): if others checked in since the base revision, the user reviews before it's accepted. Links, annotations and research entries use the same revision check. Rich text merges through Yjs.

### 5.3 Notifications

| Entity | Key fields | Notes |
|---|---|---|
| **Notification** | recipient, event type, subject (item + version), actor (optional), created_at, read_at, delivered channels[] | One row per event per recipient. The in-app inbox reads from here. |
| **NotificationPreference** | user, event type, channel (`in_app` · `email` · `push` · `extension`), frequency (`instant` · `daily` · `weekly` · `off`) | Mandatory types (moderation, legal) ignore `off`. Defaults: direct replies and review results instant; group and discussion activity daily. |
| **PushSubscription** | user, device or browser, endpoint, keys, created_at, last_used_at | Standard Web Push. |
| **DigestRun** | user, frequency, period, sent_at | Built by a scheduled job, respecting quiet hours in the user's time zone. |

- Delivery runs on the job queue (BullMQ). Email goes out over SMTP only (no provider SDK), so the provider is a configuration choice.

## 6. Community health and moderation

| Entity | Purpose |
|---|---|
| **Covenant** | Versioned conduct guidelines; scope = platform or group. Users accept the platform covenant at sign-up. |
| **Report** | reporter, subject item, reason category, details, status |
| **ModerationCase** | Groups related reports; assigned moderator; scope (platform or group) |
| **ModerationAction** | case, action (`no_action` · `warn` · `hide` · `remove` · `cooling_off` · `suspend`), reason, actor, covenant clause cited |
| **Appeal** | action, appellant, statement, outcome |
| **CopyrightNotice** | claimant, contact details, work claimed, infringing items, received_at, status, action taken | Notice-and-takedown process for public content (NZ Copyright Act host protection). The author is told and can respond. |
| **AuditLog** | Append-only record of every moderation and admin action |
| **ToneCheck** | (optional) Pre-post assessment result, only used to prompt the author. Never stored with the published content. |
| **TrustLevel** | user, level (0–4), reached_at, reason | Unlocks public posting, links, messaging, full rating weight. Rises with genuine activity and falls with moderation actions. Moderators can set it manually. |
| **AccountSignal** | user, kind (sign-up risk, posting velocity, duplicate content, coordinated activity …), score, observed_at | Inputs to trust levels and the review queue. Behavioral only, never about beliefs. |
| **ModelVerdict** | item, provider, model/version, category scores, rationale, created_at | One per model in the moderation panel. If the verdicts disagree beyond a set threshold, the item goes to human review. Kept for bias audits. |
| **ModelBenchmark** | provider, model/version, test set version, accuracy, false-positive rate on sincere minority views, run_at | Bias testing before a model joins the panel, re-run on every model version change. |
| **ContentFlag** | item, source (`ai` · `user_report` · `rule`), category (spam · abuse · explicit · deception · illegal), confidence, model/version, status | AI and rule flags go to the review queue; only humans take actions beyond a temporary hold. |
| **LegalComplaint** | kind (`hdca` · `copyright` · `objectionable`), complainant, items, received_at, author_notified_at, author_response, deadline, outcome | Tracks statutory deadlines (e.g. HDCA 48-hour notices). |

**Rendering fidelity (information, not moderation):** for an `own` or `edited` compilation verse, computed indicators are shown to readers: alignment coverage (how many original words are rendered), words added beyond the original, and original words left out. These are never used to hide or remove content.

### 6.1 Ranking signals
- **ViewpointSignal**: aggregated, per-user numeric vectors learned from HelpfulnessRatings (matrix factorization, as in Community Notes). Never a human-readable label.
- **BridgingScore**: per item; high when raters with *different* viewpoint signals both find the item helpful.
- **Reputation**: per user, based on helpfulness and bridging, not on raw popularity.
- Computed in background jobs (BullMQ) from ratings, and only from **public** content.

### 6.2 Consent
**ConsentRecord**: user, purpose (`personalization` · `viewpoint_signals` · `email` …), granted or withdrawn, timestamp, policy version.
Viewpoint signals for a user are calculated only while that user's consent is active. If consent is withdrawn, the user's signals are deleted.

## 7. Licensing

| Entity | Purpose |
|---|---|
| **License** | name, URL, full text, machine-readable **rules** |
| **LicenseRule** | type, parameters, context (`any` · `sold` · `given_away` · `non_profit` …), jurisdiction. Types (full list in [licenses.md](licenses.md) §8): `public_domain`, `attribution`, `share_alike`, `non_commercial` (with the rights holder's definition), `give_away_only`, `no_standalone_sale`, `max_share_of_work` (e.g. LEB < 25% when sold), `max_share_of_bible`, `max_verses_quoted`, `max_verses_stored_electronically`, `no_complete_book` / `max_share_of_book`, `excluded_work_types`, `excluded_product_types`, `edition_restriction`, `jurisdiction_routing`, `no_modification`, `no_translation`, `incompatible_with`, `name_restriction`, `reporting_obligation`, `notes_excluded`, `access_via_api_only`, `share_changes` |
| **LicensePolicy** | A publisher's policy whose rules cover several translations, e.g. HarperCollins's Thomas Nelson policy (NKJV, NCV, ICB, The Voice, The Expanded Bible, and the NET for commercial use) and its Zondervan policy (NIV, NIrV). Limits such as "500 verses in total" are counted across all the policy's translations. A translation can follow different policies in different contexts (the NET: Biblical Studies Press terms when non-commercial, HarperCollins when commercial). See [licenses.md](licenses.md) §4.1 |
| **DerivedLicense** | Calculated for each publication and edition: the license it must carry (e.g. CC BY-SA if any share-alike source is included), plus any conflicts (e.g. ESV text in a Creative Commons-licensed item) |
| License links | Translation → License; ExternalResource → license/rights (optional) |
| **LicenseComposition** | Calculated for a Compilation (and again for each EditionBuild): how much of the work comes from each licensed source, in the agreed unit, using verse provenance (§2.3), counted per translation, per book and per LicensePolicy. Checked against LicenseRules; the result is pass / warn / block, plus the attribution text required. Inputs include the intended use (*personal* · *give away* · *sell*), the **work type** (e.g. a plain text versus a commentary or reference work with study notes) and the **product type** (e.g. a standalone-verse card). |

**What counts toward a share rule.** Verses are the unit for verse rules: every license restriction found names verses (licenses.md §8), so the LEB's 25%/50% rules count verses too. Where a rule counts words (the NLT and TLB online 25% rule), every word that comes from a user or from a rights holder counts: verse text, headings, footnotes, annotations and commentary. Book names, chapter and verse numbers, and references are identification marks, not translated or copyrightable content, so they don't count.

The share check runs whenever a compilation changes (so the user sees the effect while curating) and again on every export, because an edition adds its own content (annotations, links, pages) to the total.

## 8. Editions (book designer)

An **edition** is a printed book design (e.g. a standard edition and a large-print edition). Builds on the prototype's Publication / PublicationElement / PublicationVersion design, renamed. Full feature design: [book-designer.md](book-designer.md).

| Entity | Purpose |
|---|---|
| **Edition** | title, owner, **compilation or publication (swappable)**, design template, printer profile, cloned_from (informational only), ownership. Private until published. | **Cloning** makes a full, independent copy (elements, assets, note streams, settings). After cloning, the two editions are not linked: changes to one never affect the other. |
| **DesignTemplate** | Reusable layout settings: trim size (mm), binding, paper, margins, columns, scripture style, running heads, placement of cross-references and annotations, fonts, colors. Can be shared. |
| **PrinterProfile** | One printer's requirements: trim sizes, bleed, paper options + caliper, page limits, PDF standard, cover specification. |
| **EditionElement** | A node in the book tree: region (`cover` · `front` · `body` · `back`), type (book-designer §3.1), content reference, sort order, soft delete. |
| **Anchor** (value object) | For inserts: canonical passage or structural point, `before`/`after`, placement (`inline` · `column_top` · `page_top` · `next_page` · `facing_page` · `spread` · `full_bleed` …), fallback rule. **Never a page number.** |
| **ElementLabel** | A label on an element (e.g. `map-exodus-route`) that cross-references, the table of contents and the list of maps resolve at render time. |
| **Asset** | An uploaded image or map: file, pixel size, color profile, rights status, credit line. Private until published. |
| **NoteStream** | edition, annotation collections (ordered), placement, marker style, numbering reset, format, link direction, limits/overflow, typography (book-designer §5.3). |
| **ImpactReport** | Produced after a compilation swap or other reflowing change: page count and spine changes, missing anchors (with suggested fixes), versification/canon differences, license composition changes. |
| **EditionBuild** | An immutable snapshot of a build: inputs (the neutral book description JSON), renderer + version, output files (interior, cover, reading PDF), preflight results, status. |
| **LicenseComposition** | Calculated for each version (see §7), including the edition's own added content. |

External references in an edition are rendered as footnotes or endnotes using the edition's CSL style, with QR codes for URLs. Quotes are included only when `quote_rights` allows it.

## 9. Federation readiness (not built at launch)

- Canonical URIs on public content (§1.1).
- ScriptureLink, Annotation, Comment and Note map to ActivityStreams objects (`Note`, `Article`, `Collection`) with a ScriptureTips extension for passages and relationship types.
- Users map to `Person` and Groups to `Group` actors.

## 10. Open questions

1. Which source text the interlinear and word studies show when the user hasn't chosen one. Licenses for the original-language datasets are confirmed in [sources.md](sources.md) §5 (with the caveats in §6). Proposed: follow the translation being read (e.g. KJV → Textus Receptus, modern translations → a critical text), with a user setting to override it.
2. **A prologue element.** The prologue to Sirach is stored as verse 0 for now (§2.1), as are Psalm headings. It's prose (two paragraphs, about 600 words in the KJV), not a verse: it may need its own element, shown before 1:1, linkable as "Sirach, prologue" and offered separately in compilations. Revisit when the reader view is built.
