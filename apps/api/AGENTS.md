# @scripturetips/api

The API: NestJS on Fastify, under `/api`. So far it serves translations and passages from the database (packages/db).

- `GET /api/translations`: the translations that have text loaded.
- `GET /api/translations/{id}/passages?ref=Joel 2:28-32`: the verses of one or more references, read in the translation's numbering (@scripturetips/reference), each with its canonical passage, a display label, headings, markup and translator's notes (domain-model §2.6). At most `MAX_VERSES` (500) per request.
- **Errors are codes, never text** (`unknown-translation`, `no-such-chapter`, `too-many-verses`, `invalid-request` …), with the index where a reference went wrong. The UI words them in the user's language.
- **Compiled, not run from source.** Node can't run decorators from TypeScript, so `tsc -p tsconfig.build.json` writes `dist/`; workspace packages are still loaded from their source. That's why only this app allows non-erasable syntax (`erasableSyntaxOnly: false`); packages Node runs from source must not use it.
- **Inject by token** (`@Inject(TranslationsService)`, `@Inject(DATABASE)`): no decorator metadata is emitted, so constructor types alone don't wire anything.
- **Validation:** Zod schemas through `ZodPipe`.
- **Running it:** `./dev up` starts it with the database, rebuilding and restarting on every change, at http://127.0.0.1:3001/api. Logs: `./dev logs api`.
- **Tests:** integration tests through Fastify's `inject` on a test database (packages/db test support).

Run the tests: `./toolbox pnpm --filter @scripturetips/api test`
