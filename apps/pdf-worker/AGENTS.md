# @scripturetips/pdf-worker

The PDF worker (book-designer.md §9): takes builds from the BullMQ queue on Valkey (`pdf-builds`), one at a time, reads each build's `book.json` from the file store, renders the interior and the cover with Typst (packages/book templates), and stores the PDFs and the Typst sources beside it. The API (apps/api `PdfBuildsService`) queues builds and reads their state from the queue.

- **Its own container** (`infra/docker/pdf-worker`): Node, Typst, poppler-utils (page count) and the fonts (Gentium, Ezra SIL, downloaded and checked against the hashes in docs/license-evidence), never in the API's or web app's. In development it runs the workspace's code (`./dev up` starts it, restarted on change); production packaging comes with hosting.
- Environment: `VALKEY_URL`, `FONT_PATH` (default `/fonts`), the file store's `STORAGE_*`.
- Fonts come only from `FONT_PATH` (`--ignore-system-fonts`).
- A job is tried once; a failure is reported with Typst's message.
- **Tests** (`build.test.ts`) render a real book with Typst and the fonts the toolbox image carries. Run: `./toolbox pnpm --filter @scripturetips/pdf-worker test`
