# ScriptureTips: agent instructions

ScriptureTips is a personal scripture study tool. Users curate **compilations** (their preferred translation, combining verses from several translations and their own wording), study the original languages, link passages, and print or share their work. The social features are an extension that comes later.

**ScriptureTips must never be monetized in any form** (no sales, subscriptions, advertising, sponsorship or donations). Monetizing would forfeit the right to use the NET and other free, non-commercial texts. See [docs/vision.md](docs/vision.md) §1.1. Never propose or build anything that brings money into the platform.

The project is being rebuilt from scratch as this monorepo. The legacy repos alongside it (`../ScriptureTips-*`, `../tex-bible`) are for reference only. See [docs/vision.md](docs/vision.md) §9.

## Status

The monorepo is scaffolded. Built so far: the toolbox, `pnpm verify`, the web app in [`apps/web`](apps/web/AGENTS.md) (landing page, reader view with canon labels, book list and chapter links, credits, sign-in and account page with the canon choice, and the compilation editor), the API in [`apps/api`](apps/api/AGENTS.md) (translations, passages, accounts with sign-in by one-time email code, and compilations: layered rules by section, book, chapter or passage, single verses, corrections and adaptations, own renderings with authorship evidence, translator's notes, and publishing them as numbered versions read at `/p/{handle}/{slug}`, after an automated license check and consent, with the attributions licenses require), the core packages [`packages/passage`](packages/passage/AGENTS.md), [`packages/versification`](packages/versification/AGENTS.md) (mapping tables generated from TVTMS) and [`packages/reference`](packages/reference/AGENTS.md) (the reference parser), [`packages/canon`](packages/canon/AGENTS.md) (canon profiles: Protestant, Catholic, Orthodox), [`packages/licenses`](packages/licenses/AGENTS.md) (translation license rules as data), [`packages/db`](packages/db/AGENTS.md) (PostgreSQL schema for scripture text, accounts and compilations, migrations, test databases), the translation import and loader in [`tools/scripture-import`](tools/scripture-import/AGENTS.md), and the source-text converters in [`tools/source-conversion`](tools/source-conversion/AGENTS.md) (JPS 1917, the LEB, and the TVTMS versification import), and the PDF engine trial in [`tools/pdf-trial`](tools/pdf-trial/AGENTS.md) (Typst vs LuaLaTeX; results in [docs/pdf-engine-trial.md](docs/pdf-engine-trial.md)). The rest of the stack below is decided but not yet built. Update this file as parts become real.

## Development environment

**Nothing is installed on the host except Docker.** Node, pnpm and every tool run in the toolbox container (`infra/docker/toolbox/`). Never install development software on the host (no `nvm install`, global npm packages or apt packages). If a tool is missing, add it to the toolbox image.

Run every project command through the wrapper, from the repo root:

```bash
./toolbox pnpm install
./toolbox pnpm verify
./toolbox pnpm --filter @scripturetips/passage test
```

The repo is mounted at `/workspace` and commands run as your own user ID, so files stay owned by you. pnpm only installs package versions that have been out for a while (its minimum release age policy). Don't add exceptions to get around it; use an older version instead.

## Docs map

| Doc | Read it when working on |
|---|---|
| [docs/vision.md](docs/vision.md) | Features, principles, tech stack (§7), conventions (§8), delivery order (§10) |
| [docs/domain-model.md](docs/domain-model.md) | Entities, visibility, publishing, versification, data rules |
| [docs/testing.md](docs/testing.md) | Test layers, commands, definition of done |
| [docs/book-designer.md](docs/book-designer.md) | Editions and print/PDF output |
| [docs/branding.md](docs/branding.md) | Logo, palette, artwork and its rights, type |
| [docs/licenses.md](docs/licenses.md), [docs/sources.md](docs/sources.md) | Translation and data licensing, ingestion |
| [docs/license-evidence/](docs/license-evidence/) | Captured license terms and file hashes per source |

## Stack (decided)

All TypeScript (6.x: dependency-cruiser and other tools don't support TypeScript 7 yet), Node 24 LTS. pnpm workspaces + Turborepo. NestJS (Fastify) API, Next.js web, PostgreSQL + Drizzle, Valkey + BullMQ, Better Auth, next-intl, Vitest + Playwright, Biome. Docker Compose for development and hosting. Full table: vision.md §7.

## Commands (see testing.md §2)

Run each through `./toolbox`.

- `pnpm verify`: Biome lint and format check, dependency boundaries, spelling, then type-check and tests for the packages affected by the change. **Built.**
- `pnpm verify:full`: the same for every package. **Built.** End-to-end, accessibility, PDF and extension tests are added as those parts are built.
- `pnpm format`: apply Biome formatting, import sorting and safe fixes.
- `./dev up [--lan]` / `./dev down` / `./dev logs`: start, stop and follow the local stack (`--lan` also serves the web app to the local network), run on the host (Docker isn't available inside the toolbox). **Built** with PostgreSQL, Valkey, Mailpit (catches outgoing email: http://127.0.0.1:8025), the API and the web app; the other services are added as they're built. `pnpm dev:seed [scenario]` is **planned**.

**Claude Code hooks** (`.claude/settings.json`, scripts in `scripts/claude-hooks/`): every edited file is formatted with Biome, and `pnpm verify` runs before the agent finishes a turn that changed code. A failure is sent back to the agent to fix.

Markdown isn't formatted by Biome yet (it's excluded in `biome.json`), and cspell doesn't check `docs/` yet.

## Language

<!-- cspell:ignore colour organise -->

- **UI strings:** New Zealand English ("colour", "organise"). The default locale is `en-NZ`.
- **Code, CSS, comments, docs and commit messages:** US English (`color`, `organize`).

## Git

- The project owner runs the git workflow. Agents never stage, unstage, commit or push.
- When a task is done, suggest a commit message with a conventional prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:` …).
- Never carry anything over from the legacy repos' secrets (JWT keys, `.env` files). Treat those keys as compromised.

## Dependencies

Ask before adding any package that isn't already approved. Approved so far: Vitest, Playwright, Biome, the stack listed in vision.md §7, and for accounts: ALTCHA (`altcha`, `altcha-lib`), nodemailer, ioredis and Mailpit. Testing extras waiting for approval are listed in testing.md §9.

## Licensing and sources

- Translation license terms are a first-class domain module (domain-model.md §7). Never hard-code assumptions about a text's permissions.
- **Evidence policy:** whenever a text or data set is obtained, record its terms in `docs/license-evidence/{name}/` with a `SOURCE.md`. Capture the rendered license and download pages as PDF (screen mode), the raw HTML and HTTP headers, any license files in the download, and the file URL, size, date and SHA-256. Never overwrite a capture. Always look at the captured pages.
- The source files live outside git in `../source-texts/`. Their hashes are in `docs/license-evidence/source-files.json` and `SHA256SUMS`. Verify with `sha256sum -c`.
- **Unresolved items go in one place:** [sources.md](docs/sources.md) §8 ("Still open"). That covers open questions, decisions, and captures or downloads that couldn't be completed (blocked sites, dead links). Other docs record only facts and point to the §8 item; don't scatter "try again later" notes through them.
- **When a site blocks automated access, stop and tell the project owner** before working around it. They can open it in their Chrome for the browser tools to read.
- Use only public-domain or openly licensed original-language data. Exclusions are listed in sources.md §4 and §6.

## Definition of done (testing.md §7)

1. Tests added or updated for the behavior, named after the spec section where there is one.
2. `pnpm verify` passes.
3. For UI changes: Playwright screenshots of the changed screens, checked.
4. A short report covering what changed, what was tested, anything skipped or weakened and why, and any open questions.
