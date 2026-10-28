# @scripturetips/db

The PostgreSQL schema (Drizzle), its migrations, the connection, and databases for integration tests. So far: scripture text (domain-model §2): `translation`, `translation_book`, `verse_text`, `translator_note` (§2.6) and `translation_import`. Loaded by `tools/scripture-import`.

- **Schema changes go through migrations.** Edit `src/schema.ts`, then `./toolbox pnpm --filter @scripturetips/db generate <name>`, and commit the SQL in `migrations/`. Never edit a migration that has been applied; write a new one.
- **Keys are UUIDv7** (domain-model §1.1), made by PostgreSQL 18's `uuidv7()`.
- **Passages** are stored as canonical ordinal ranges (`int4range`, inclusive, from @scripturetips/passage) with a GiST index, so "what overlaps this passage" is one query.
- **Development database:** `./dev up` (on the host), then `./toolbox pnpm --filter @scripturetips/db migrate`. The toolbox reaches it through `DATABASE_URL` (compose.yaml).
- **Integration tests** (testing.md §10) run on the `postgres-test` service, which starts with the toolbox and keeps its data in memory. Add `@scripturetips/db/test-support/global-setup` to a package's `vitest.config.ts`: each run migrates its own template database, and `testDatabase()` gives each test file a fresh clone.

Run the tests: `./toolbox pnpm --filter @scripturetips/db test`
