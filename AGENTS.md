# ScriptureTips: agent instructions

ScriptureTips is a personal scripture study tool. Users curate **compilations** (their preferred translation, combining verses from several translations and their own wording), study the original languages, link passages, and print or share their work. The social features are an extension that comes later.

**ScriptureTips must never be monetized in any form** (no sales, subscriptions, advertising, sponsorship or donations). Monetizing would forfeit the right to use the NET and other free, non-commercial texts. See [docs/vision.md](docs/vision.md) §1.1. Never propose or build anything that brings money into the platform.

The project is being rebuilt from scratch as this monorepo. The legacy repos alongside it (`../ScriptureTips-*`, `../tex-bible`) are for reference only. See [docs/vision.md](docs/vision.md) §9.

## Status

So far this repo contains only docs. No code has been scaffolded. The stack and commands below are decided but not yet built. Update this file as they become real.

## Docs map

| Doc | Read it when working on |
|---|---|
| [docs/vision.md](docs/vision.md) | Features, principles, tech stack (§7), conventions (§8), delivery order (§10) |
| [docs/domain-model.md](docs/domain-model.md) | Entities, visibility, publishing, versification, data rules |
| [docs/testing.md](docs/testing.md) | Test layers, commands, definition of done |
| [docs/book-designer.md](docs/book-designer.md) | Editions and print/PDF output |
| [docs/licenses.md](docs/licenses.md), [docs/sources.md](docs/sources.md) | Translation and data licensing, ingestion |
| [docs/license-evidence/](docs/license-evidence/) | Captured license terms and file hashes per source |

## Stack (decided)

All TypeScript, Node 24 LTS. pnpm workspaces + Turborepo. NestJS (Fastify) API, Next.js web, PostgreSQL + Drizzle, Valkey + BullMQ, Better Auth, next-intl, Vitest + Playwright, Biome. Docker Compose for development and hosting. Full table: vision.md §7.

## Commands (planned, see testing.md §2)

- `pnpm verify` checks the affected packages: format, lint, types, boundaries, unit and integration tests.
- `pnpm verify:full` runs everything, including end-to-end, accessibility, PDF and extension tests.
- `pnpm dev:up` / `pnpm dev:down` / `pnpm dev:seed [scenario]` start, stop and seed the local stack.

## Language

- **UI strings:** New Zealand English ("colour", "organise"). The default locale is `en-NZ`.
- **Code, CSS, comments, docs and commit messages:** US English (`color`, `organize`).

## Git

- The project owner runs the git workflow. Agents never stage, unstage, commit or push.
- When a task is done, suggest a commit message with a conventional prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:` …).
- Never carry anything over from the legacy repos' secrets (JWT keys, `.env` files). Treat those keys as compromised.

## Dependencies

Ask before adding any package that isn't already approved. Approved so far: Vitest, Playwright, Biome, and the stack listed in vision.md §7. Testing extras waiting for approval are listed in testing.md §9.

## Licensing and sources

- Translation license terms are a first-class domain module (domain-model.md §7). Never hard-code assumptions about a text's permissions.
- **Evidence policy:** whenever a text or data set is obtained, record its terms in `docs/license-evidence/{name}/` with a `SOURCE.md`. Capture the rendered license and download pages as PDF (screen mode), the raw HTML and HTTP headers, any license files in the download, and the file URL, size, date and SHA-256. Never overwrite a capture. Always look at the captured pages.
- The source files live outside git in `../source-texts/`. Their hashes are in `docs/license-evidence/source-files.json` and `SHA256SUMS`. Verify with `sha256sum -c`.
- Use only public-domain or openly licensed original-language data. Exclusions are listed in sources.md §4 and §6.

## Definition of done (testing.md §7)

1. Tests added or updated for the behavior, named after the spec section where there is one.
2. `pnpm verify` passes.
3. For UI changes: Playwright screenshots of the changed screens, checked.
4. A short report covering what changed, what was tested, anything skipped or weakened and why, and any open questions.
