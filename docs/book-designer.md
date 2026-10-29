# ScriptureTips: Book Designer

> Status: draft, 2026-10-25. Companion to [vision.md](vision.md) §3.9 and [domain-model.md](domain-model.md) §8.

## 1. Purpose

One of the primary features of ScriptureTips: a user can **design, print and bind their own customized Holy Bible**. They choose the compilation, add their own cover, maps, pictures, notes sections and study material, and get print-ready files they can send to any print-on-demand service or local printer.

The original `tex-bible` LEB edition is the reference case: 152 × 229 mm (6 × 9 in) perfect-bound paperback, 60 gsm paper, 1,096 pages, 43.7 mm spine, two columns with drop caps, printed by Snowfall Press.

An **edition** (a book design) is separate from the compilation it prints. A user can have several compilations and several editions, and can point an edition at a different compilation at any time.

## 2. Core principle: anchor to scripture, never to pages

Swapping the compilation, changing the font size or adding a map all move page breaks. So **nothing in a design is tied to a page number**:

- **Inserts are anchored to canonical passages or to structure**, not pages. Examples: "full-page map *before* Exodus 13", "notes section *after* Malachi", "picture *at* Luke 2:7, top of the column".
- **Cross-references between parts are labels**, not numbers. "See Map 3" is a reference to the label `map-exodus-route`, and its page number is filled in at render time. The same applies to the table of contents, the list of maps, and indexes.
- **Generated sections** (table of contents, list of maps, attribution page, index of the user's links) are rebuilt on every render.

Because of this, swapping the compilation needs **no manual repair**. Everything reflows and every page reference updates. What *can* change is reported to the user (§7).

## 3. Book structure

A design is an ordered tree of **elements**, grouped into regions:

| Region | Typical elements |
|---|---|
| **Cover** (separate print file) | Front cover, spine, back cover; optional dust jacket |
| **Front matter** | Half-title, title page, dedication, *attribution and license page (generated)*, preface, table of contents (generated), list of maps (generated), how to use this edition |
| **Scripture body** | Testament / section dividers, books from the compilation, *additional writings* section (if included, e.g. between the testaments as in the 1611 KJV) |
| **Anchored inserts** (placed inside the body) | Maps, pictures, rich-text pages, the user's notes (e.g. studies), blank or ruled journaling pages |
| **Back matter** | Notes sections, maps section, the user's notes (e.g. studies), research appendix (e.g. Hebrew letter pictographs), glossary of original words, index of the user's links, concordance (later), blank notes pages, colophon |

### 3.1 Element types

| Type | Content | Notes |
|---|---|---|
| `scripture` | A book range from the compilation (e.g. Genesis–Malachi) | Laid out by the design's scripture style (§4). |
| `divider` | Testament or section title page | Optional image or ornament. |
| `rich_text` | The user's own pages: preface, essays, notes | Rich-text editor; can include images, tables and scripture quotations. |
| `image` | A picture, illustration or map | Placement options in §3.2. |
| `map` | Same as `image`, plus a caption, map list entry and label | Feeds the generated list of maps. |
| `note` | One of the user's notes (e.g. a study), laid out as pages | Generated from their data. |
| `research` | Entries from a research library | e.g. the pictograph table. |
| `notes_pages` | N blank, lined or dot-grid pages | Journaling space. |
| `generated` | TOC, list of maps, attribution page, link index, glossary | Always rebuilt. |
| `blank` | Intentional blank page | Usually inserted automatically (§6.3). |

### 3.2 Placement of inserts

Each anchored insert has:
- **Anchor:** a passage (canonical ref), or a structural point (start/end of a book, chapter, testament or section).
- **Position:** `before` or `after` the anchor.
- **Placement:**
  - `inline` (in the column, at that verse);
  - `column_top` / `column_bottom`;
  - `page_top` / `page_bottom` (spanning both columns);
  - `next_page` (a full page after the anchor's page);
  - `facing_page` (opposite the anchor's page; may add a blank page);
  - `spread` (a two-page spread, starting on a left-hand page);
  - `full_bleed` (a full page printed to the trimmed edge).
- **Label:** for cross-references and the list of maps.
- **Fallback:** what to do if the anchor doesn't exist in the current compilation (§7).

## 4. Design and layout settings

Settings are grouped into a **design template**, so a user can reuse a look across books and share templates publicly.

| Area | Options |
|---|---|
| **Format** | Trim size in mm (presets: 152 × 229, 140 × 216, 127 × 203, A5, and custom); binding (perfect-bound, case-bound/hardcover, coil, saddle-stitch for short works); paper weight and caliper (for spine width); color or black-and-white interior |
| **Intended use** | *Personal* · *give away* · *sell*, plus the delivery countries. License checks depend on it (e.g. the LEB's 25% limit applies only to sold works; the KJV can't be printed for UK delivery without permission; AWMC maps are non-commercial). See [licenses.md](licenses.md). |
| **Margins** | Top, bottom, outside, gutter. **The gutter widens automatically with page count** (thick perfect-bound books need more). Optional wide outer margin for a **journaling edition**. |
| **Scripture layout** | One or two columns; paragraph or verse-per-line; verse number style; chapter number style (drop cap / large numeral / heading); section headings on or off; red letter (optional); poetry indentation; small caps for LORD |
| **Running heads** | Book, chapter and verse range of the page (e.g. "Genesis 1:1–2:3"); page number position |
| **Cross-references and annotations** | Set up as note streams (§5.3) |
| **Verse origin marks** | Optional subtle marks or footnotes showing which source each verse came from, and where a verse is the user's own rendering |
| **Typography** | Fonts (open-licensed only, embedded in the PDF), size, leading, Hebrew and Greek fonts, Paleo-Hebrew font, ornaments |
| **Color** | Accent color for headings and drop caps (in color editions) |

## 5. Footnotes, cross-references and annotation collections

### 5.1 Annotation collections
A **annotation collection** is a named, reusable set of annotations that can be used in **any number of publications and editions**, and also as a layer in the reading view and the plugins.

- **What a collection can hold:** scripture links, annotations (passage and word-study), translator's notes from the compilation, external references and research footnotes.
- **Items are referenced, not copied:** fixing a typo in an annotation updates every collection that holds it. Each build (`EditionBuild`) snapshots the content it used, so a printed edition can always be reproduced exactly.
- **Tags:** users label their links and annotations with their own tags (e.g. *messianic*, *youth study*, *Exodus route*), at any time, independent of any compilation. Tags are the everyday way of grouping work, and the easiest way to build collections for a particular publication, edition or audience.
- **Two ways to fill a collection, which can be combined:**
  - **Hand-picked:** "Add to collection" from anywhere a link or annotation appears while reading or studying.
  - **Rule-based ("smart") collections:** filters such as "tag: youth study", "my links of type *fulfills*", "tag: messianic", "note: The Lamb of God", "my group's published links", "external references in the Gospels", "created since January". Hand-picked includes and excludes override the rules.
- **Other people's published work** can be included, always with credit to its author (under the license its author chose: CC BY 4.0 by default).
- **Ownership like everything else:** private until published. Groups can keep collections (e.g. a church's shared study annotations). A collection can be published so others can use it in their own editions.

### 5.2 Where an annotation attaches in the text
- **Verse level** (default): the marker is placed after the verse, or after its first word.
- **Word level:** attached to a specific word. Stored as the **original-language word** (token) where possible, then located in the compilation through its alignment (domain model §2.3). If the compilation has no alignment for that word, the annotation falls back to verse level, and the impact report says so (§7).
- **Range level:** spans several verses, with the marker at the start of the range.

Because every anchor is canonical, annotation collections survive a compilation swap just as inserts do.

### 5.3 Note streams (the print apparatus)
In an edition, each collection is assigned to a **note stream**. A stream decides how its notes are printed.

| Setting | Options |
|---|---|
| **Placement** | Footnotes · center column · outer margin · end of chapter · end of book · back-matter section · not printed |
| **Marker** | Superscript letters (a, b, c), numbers, symbols (*, †, ‡), or none (e.g. center-column references keyed by verse number) |
| **Numbering reset** | Per page · per chapter · per book · continuous |
| **Format** | *References only* (compact: "1:1 a Jn 1:1–3; Heb 11:3"), *reference + note text*, or *full note*. Optional relationship symbols for links (e.g. ↔ complements, → fulfills). |
| **Link direction** | Show a link at its source verse, its target verse, or both |
| **Limits and overflow** | Maximum notes per verse or page; overflow moves to the end of the chapter with a "see note" marker |
| **Typography** | Font, size, column count for footnotes |

Several streams can be used at once, for example:
- **Stream A:** the user's cross-references, as compact references in the center column.
- **Stream B:** translator's notes and verse-origin notes, as lettered footnotes.
- **Stream C:** study notes from a group collection, at the end of each chapter.
- **Stream D:** external references, as endnotes with QR codes.

### 5.4 Conflicts and quality checks
- **Duplicates:** the same item in two collections is printed once, in the higher-priority stream.
- **Dense verses:** verses with more notes than the stream limit are listed in the build report, so the user can trim or move them.
- **Page growth:** the impact report shows how many pages each stream adds, so the user can see the cost of including a large collection.
- **Broken targets:** links to passages the compilation omits (e.g. a link into additional writings that aren't included) are listed with options: print anyway, show in the source translation, or leave out.

## 6. Print production

### 6.1 Output files
- **Interior PDF:** print-ready, fonts embedded, PDF/X where the printer supports it, with the correct trim and bleed (usually 3 mm) for full-bleed pages.
- **Cover PDF:** a single spread (back + spine + front) with bleed. **Spine width is calculated** from page count × paper caliper, and the cover template updates whenever the page count changes.
- **Reading PDF:** an optional screen version with hyperlinks, bookmarks and no bleed.
- Later: EPUB and HTML exports.

### 6.2 Preflight checks (run on every build)
- **Image resolution:** at least 300 dpi at printed size, with a warning below that.
- **Images in color** in a black-and-white interior.
- **Content inside the safe area:** nothing important within the trim and gutter margins.
- **Full-bleed images** actually extend into the bleed.
- **Page count** within the printer's limits for the binding (e.g. maximum pages for perfect binding).
- **Fonts:** all embedded and licensed for embedding.
- **Licenses:** the license composition (domain model §7) passes, and the attribution page is complete.
- **Copyright of images and quotes:** every asset has a rights status.

### 6.3 Page-count rules
- Chapters, testaments or inserts can be set to start on a right-hand page, adding blank pages automatically.
- An optional total page count rounding (e.g. to a multiple of 4, 16 or 32 for some printers), padded with notes pages or blank pages.

### 6.4 Printer profiles
A **printer profile** holds one printer's requirements: trim sizes, bleed, paper options and caliper, page limits, PDF standard and cover specifications. Users pick a profile, and the preflight checks follow it. Start with a generic profile and add the popular print-on-demand services (Lulu, IngramSpark, Amazon KDP, Snowfall Press …). *Later:* order directly through a printer's API (e.g. Lulu's print API), with the user paying the printer directly.

### 6.5 What license an edition carries

The ScriptureTips code license (AGPL-3.0) **doesn't apply to editions.** It covers the program and modified versions of it, not the program's output, and a PDF holds the rendered pages, not our template or engine code. An edition's license comes from what's in it:

- **Scripture text:** each source translation's license. The license engine calculates the result (DerivedLicense, domain model §7): for example, a share-alike source makes the edition CC BY-SA, and the NLT brings its fair-use limits.
- **The user's own content:** the license the user chose (CC BY 4.0 by default for published contributions).
- **Fonts, maps and images:** each under its own license, checked in preflight (§6.2).
- **Design templates:** templates shipped with ScriptureTips are AGPL-3.0 as part of the code; templates users make and share are user content under the license they chose. Either way, a template reaches the PDF only as appearance, so it adds no license terms to the edition.

The generated attribution and license page (§3) states the result.

## 7. Swapping the compilation (and other big changes)

When a user points a design at a different compilation, or makes any change that reflows the book, the designer runs an **impact report** before the next build:

| Check | Example |
|---|---|
| **Page count and spine** | "1,096 → 1,142 pages; spine 43.7 → 45.5 mm. The cover has been updated." |
| **Missing anchors** | "Map 'Exodus route' was anchored to Exodus 13:17. That verse exists. ✔". Or: "Picture at Daniel 3:24 is in the Prayer of Azariah, which isn't in this compilation's canon. Choose: move to Daniel 3:23, move to the back matter, or remove." |
| **Versification differences** | "Insert anchored to Malachi 4:1. This compilation uses Hebrew numbering, so it's now Malachi 3:19 (same text). ✔" |
| **Canon differences** | Additional writings added or removed, and what happens to the inserts inside them |
| **Page placement changes** | "The 'Jerusalem' spread now falls on a right-hand page. A blank page has been added before it." |
| **License composition** | "LEB share: 31% → 22%. This edition, marked *for sale*, now passes the LEB rule (under 25%)." Or the reverse, with a warning. |
| **Cross-reference targets** | Links or notes pointing at passages that the new compilation omits |

Anchors use canonical passages, so most inserts survive a swap automatically. The report covers only the exceptions, with a suggested fix for each.

## 8. Editing experience

- **Outline view:** the book as a tree of regions and elements. Drag to reorder, and click an element to edit its content and placement.
- **Clone an edition:** e.g. create the standard edition first, then clone it and adjust the clone's page size, margins and font size for a **large-print edition**. A clone is a full, independent copy. After cloning, the two editions are **not linked**, and changes to one never affect the other.
- **Live page preview:** see the pages as they will print, with spreads, cover and spine. Fast, incremental preview matters a lot for a 1,000-page book (see §9).
- **Proof copy:** a reminder (and checklist) to order a single proof copy before a larger print run.
- **Versions:** every build is an immutable `EditionBuild` (inputs + output files), so a user can go back to "the edition I printed in March".
- **Collaboration (later):** a group can co-design a church edition (e.g. a congregation's Bible with their own maps and study material).

## 9. Rendering engine: Typst (decided)

The prototype used LaTeX (as did `tex-bible`). Typst is the strongest alternative. **This is the most important technical decision for the designer**, and should be settled with a short trial before any designer UI is built.

| Criterion | LaTeX (LuaLaTeX / XeLaTeX) | Typst |
|---|---|---|
| Speed | Slow: minutes for a full Bible, several passes for references | Fast, with incremental compilation; makes live preview practical |
| Maturity for Bibles | Proven (`tex-bible`, many published Bibles); packages for parallel columns, multiple footnote series, drop caps | Younger. Columns, footnotes and scripting are good, but advanced layouts (several footnote series, center-column references) may need custom work |
| Hebrew, Greek, right-to-left | Mature (with LuaLaTeX/XeLaTeX) | Supported; needs testing on mixed-direction pages |
| Templating from code | Escaping and macros are fragile (the prototype needed special backslash escaping) | Built-in scripting and data loading (JSON in, pages out) |
| PDF standards for print | PDF/X via packages | Check its current support for PDF/X; PDF/A is supported |
| Operations | Large Docker image, slow builds | Single small binary, fast workers |

**Trial:** typeset the same sample (Genesis 1–11, Ruth, a two-column page with center-column links, a full-bleed map spread, a Hebrew interlinear page, and a cover with a calculated spine) in both engines. Then compare quality, speed and effort.

Whichever engine wins, the designer produces a **neutral book description** (JSON: regions, elements, resolved content, settings), and the engine-specific renderer turns that into a PDF. The engine can then be replaced without touching the designer or the data.

**Decided (project owner, 2026-10-29):** whichever engine wins, production builds run in a **queue worker** (BullMQ on Valkey, vision §7) in **its own Docker container**, with the engine and fonts installed there, never in the API or web containers. The trial runs in the toolbox.

**Trial run (2026-10-29):** results in [pdf-engine-trial.md](pdf-engine-trial.md).

**Built (2026-10-29):** PDF builds of a compilation, before editions exist: the API describes the book (packages/book), keeps its `book.json` in the file store and queues it; the PDF worker (apps/pdf-worker) renders the interior and the cover, and keeps the PDFs and the Typst sources beside it, all downloadable (the project owner's wish: the working files are assets too). The format is fixed at the trial's for now.

**Decided (project owner, 2026-10-29): Typst.** Before editions ship, it needs the three follow-ups in pdf-engine-trial.md §3: drop caps that text wraps around, TrimBox and BleedBox (and PDF/X where a printer profile asks) set by a post-processing step, and a font for the LEB's 〚 〛 marks.

## 10. Assets and the map library

- **Assets:** uploaded images and maps, with metadata: pixel size, effective dpi at each placement, color profile, rights status (`own_work` · `public_domain` · `licensed` (+ license) · `permission_confirmed`), credit line.
- Assets are private until published, like all user content (vision §4.2). Publishing an edition or template that contains assets goes through review.
- **ScriptureTips default map library (later):** starter maps built from open data, such as the Ancient World Mapping Center (CC BY) and OpenBible.info's geocoding of biblical places (CC BY). Licenses to be confirmed.

## 11. Open questions

1. ~~Rendering engine~~: **Typst** (§9).
2. Which printer profiles to support first, with a recommended shortlist and reasons. **Deferred** until after the first public release, which ships with the generic profile only.
3. Which binding layouts the exporter supports at launch. Printing and binding are done by the printer (files are download only), but the PDF must be laid out for the binding: the cover's spine width, a hardcover case wrap's extra bleed, and inner margins. Recommended: perfect-bound paperback first, hardcover from the printer shortlist.
4. A rich-text editor for notes pages and the preface (a new dependency). Recommended: TipTap's open-source core (MIT, built on ProseMirror, React, custom elements for scripture references, Yjs support for groups), without its paid add-ons; alternative: Lexical (MIT).

**Decided:**
- **Design templates** can be shared publicly from the start.
- **Print files are download only:** no ordering prints from within ScriptureTips.
- **Content license for published contributions:** CC BY 4.0 by default (anyone may reuse them with credit, including in printed editions), with a more restrictive choice per item.
- **Naming:** printed book designs are **editions**; a published compilation is a **publication**.
