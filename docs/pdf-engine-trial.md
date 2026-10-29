# PDF engine trial: Typst vs LuaLaTeX

> 2026-10-29. The trial asked for in [book-designer.md](book-designer.md) §9. Code: [`tools/pdf-trial`](../tools/pdf-trial/AGENTS.md). **Decided (project owner, 2026-10-29): Typst**, with the follow-ups in §3. Follow-ups 1 and 2 (drop caps, print boxes) are deferred to later. In production (the PDF worker), a whole Bible built in about 50 s on the project owner's machine (a Threadripper).

## 1. What was built

One neutral book description (`tools/pdf-trial/src/book.ts`: JSON, in mm, no engine syntax), made from the passages API and the Open Scriptures Hebrew Bible, rendered by both engines:

- **Sample:** a title page, the attribution page, Genesis 1–11 (two columns, chapter numerals, section headings, translator's notes at the foot of the column, running heads with the page's verse range), Genesis 12 with its notes in a **center column** beside their lines, a **full-bleed map spread** starting on a left-hand page (placeholder art), Ruth, a **Hebrew interlinear page** (Genesis 1:1–5, right to left, with glosses and Strong's numbers), and a **cover** whose spine width comes from the page count.
- **Whole Bible:** the LEB in the same layout, for timing.
- Trim 152 × 229 mm with 3 mm bleed on every page, Gentium 9.5/11.5 pt, Ezra SIL for Hebrew. Versions: Typst 0.15.1; LuaHBTeX 1.15 (TeX Live 2022, Debian).

## 2. Results

| | **Typst** | **LuaLaTeX** |
|---|---|---|
| Sample build | **0.7–0.9 s** (one pass) | 17–18 s (two passes) |
| Whole Bible | **113 s**, 1,304 pages (0.09 s/page) | 227 s, 1,559 pages (0.15 s/page) |
| Live preview (book-designer.md §8) | Practical: a chapter rebuilds in well under a second, and `typst watch` compiles incrementally | Impractical: every change is a full multi-pass build |
| Chapter drop caps | **No native drop cap.** The sample uses a large numeral; text wrapping around it needs custom code or a third-party package (`droplet`) | `lettrine`: proper two-line drop caps, proven |
| Justification quality | Good; no font expansion, so narrow columns show some loose lines | Very good with `microtype` (protrusion and expansion): 333 overfull lines without it, **0 with it** |
| Running heads ("Genesis 1:1–2:3") | **No built-in marks.** The obvious approach (query every verse from every page) never finished on a whole Bible (killed after 9 minutes). Reworked with `state`, it costs ~27 s on a whole Bible | Native marks (first and last on the page). `\markboth` broke under babel; a dedicated mark class works |
| Footnotes in two columns | Each column's notes at its foot; letters a…z, aa… | The same (`alphalph` for past z) |
| Center-column notes | Works in one pass: positions queried, notes placed in the page foreground, pushed down so none overlap | Works, but needed custom Lua: the first pass records each mark's position at shipout, the second places the notes |
| Hebrew, right to left | Correct after one fix (line edges set to the glyph bounds, or glosses overlap the vowels) | Correct (babel, `bidi=basic`) |
| Ezra SIL shaping | Correct (OSHB text kept unnormalized) | Correct |
| Full-bleed spread | Works (clipped halves of one image) | Works (shipout hooks) |
| **PDF/X, TrimBox and BleedBox** | **Not supported.** Printers that need them would need a post-processing step on the PDF (e.g. qpdf, or a PDF library) | Supported: boxes set in the sample; full PDF/X via the `pdfx` package |
| Images | SVG, PNG, JPEG, PDF directly | No SVG: the map had to be converted to PDF |
| Missing glyphs | Silent | Logged (Gentium lacks 〚 〛, U+301A/B, used in the LEB) |
| Templating from data | Reads `book.json` directly; the template is ordinary code | The document is generated as TeX: escaping, catcodes (`%` and `~` break inline Lua), and package interactions (babel inside marks) each cost a debugging round |
| Error messages | Clear, with the template line | Hard to read (macro expansion traces) |
| Install | One 56 MB binary | ~430 MB of TeX Live packages |

## 3. Assessment

- **Typst's strengths are the ones the designer depends on:** live preview of a 1,000-page book (§8), fast builds in a queue worker (several times cheaper per build), data-driven templates (the neutral description loads as JSON), and a small worker image.
- **Its gaps are bounded and known:** drop caps (custom code, or a package to approve), the running-head technique (solved here), and PDF/X boxes (a post-processing step, a new dependency to approve). Justification is a little looser than LaTeX with microtype.
- **LaTeX's strengths are maturity and print polish:** drop caps and microtypography out of the box, PDF/X support, decades of Bible typesetting. Its costs are speed (no practical live preview) and fragility when generated from data.

**Recommendation: Typst**, provided the PDFs' typographic quality satisfies the project owner, with three follow-ups before editions ship:
1. Drop caps that text wraps around (custom code first; a package only with approval).
2. A post-processing step that sets TrimBox and BleedBox (and PDF/X where a printer profile asks for it).
3. A font with the LEB's 〚 〛 marks, or a fallback font for them.

## 4. Files to judge

Built by `./toolbox pnpm --filter @scripturetips/pdf-trial trial` into `tools/pdf-trial/.work/` (not in git):

- `typst/sample.pdf` and `latex/sample.pdf`: the sample (pages 3 and 17 or so show the body and the center column; the last page is the interlinear).
- `typst/sample-cover.pdf` and `latex/sample-cover.pdf`: the covers.
- `typst/whole.pdf` and `latex/whole.pdf`: the whole LEB (with `--whole`).

## 5. Not covered

- Real map artwork, and image preflight (resolution, color) from book-designer.md §6.2.
- Cross-references as a second note stream (no cross-reference data is held yet); the center column carried the translator's notes instead.
- Glosses on the interlinear page are rough (the first definition Strong's marks); real glosses come with the study tools.
