# @scripturetips/book

The neutral book description (book-designer.md §9) and its Typst templates. Pure; the PDF worker renders it.

- `src/book.ts`: the description (`Book`): format in mm, credits, and elements (title, credits, scripture), with every run of text resolved. No engine syntax.
- `src/describe.ts`: `describeCompilation()` lays a compilation's verses out as the reader does (paragraphs, poetry, headings, styles, notes; a note the markup doesn't place still prints), places each source's designation after its runs of verses (a run ends at the latest where its book ends), marks changed verses (†‡§*, as the reader), and writes the credits page: each attribution, what the marks mean, the font's license. `DEFAULT_FORMAT` is the trial's 152 × 229 mm.
- `src/build.ts`: what a build is: the queue name, the job, and the files kept under `pdf-builds/{id}/` (`book.pdf`, `cover.pdf`, `book.json`, `book.typ`, `cover.typ`), all downloadable.
- `templates/book.typ`, `templates/cover.typ`: the interior and the cover (spine = pages × caliper, from `--input pages=N`). The running head uses `state` (querying every verse from every page never finishes on a whole Bible: pdf-engine-trial.md).
- Known gaps (pdf-engine-trial.md §3): no wrap-around drop caps, no TrimBox/BleedBox, Gentium lacks the LEB's 〚 〛.

Run the tests: `./toolbox pnpm --filter @scripturetips/book test`
