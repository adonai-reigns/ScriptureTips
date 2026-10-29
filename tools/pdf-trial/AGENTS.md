# @scripturetips/pdf-trial

The PDF engine trial (docs/book-designer.md §9): the same sample book typeset with Typst and with LuaLaTeX, to choose the engine for editions. Results: [docs/pdf-engine-trial.md](../../docs/pdf-engine-trial.md).

- `src/book.ts`: the **neutral book description** (regions, elements, resolved content, settings, in mm). The part to keep whichever engine wins.
- `src/describe.ts`: builds it from the passages API (the LEB, as the reader has it) and `src/oshb.ts` (the Open Scriptures Hebrew Bible, glossed from Strong's). Sample: Genesis 1–11, Genesis 12 with its notes in a center column, a full-bleed map spread (placeholder art), Ruth, and a Hebrew interlinear page.
- `templates/book.typ`, `templates/cover.typ`: the Typst renderer, reading `book.json`.
- `src/latex.ts`: the LuaLaTeX renderer, generating the document (two passes; center-column notes placed from positions recorded in the first).
- **Running it:** with the dev stack up (`./dev up`), `./toolbox pnpm --filter @scripturetips/pdf-trial trial [typst|latex] [--whole]`. Output, timings and page counts go to `.work/` (ignored by git). `--whole` also builds the whole LEB, which takes minutes. **The trial is over** (Typst chosen): TeX Live has been taken out of the toolbox, so `latex` no longer runs there; the code stays as the record of what was compared.
- **Inputs outside git:** the fonts (Gentium, Ezra SIL) and the OSHB files are read from `/source-texts` (docs/license-evidence). The engines are in the toolbox image for the trial only; production builds will run in their own worker container (book-designer.md §9).
- No tests: this is an experiment, judged by looking at its PDFs.
