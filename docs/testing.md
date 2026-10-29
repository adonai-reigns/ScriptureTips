# Testing and agent verification

ScriptureTips is a large system that will be built largely with LLM coding agents. This document sets out how every change gets verified, by agents and by people, so the code base stays manageable as it grows.

## 1. Principles

1. **One command answers "is it working?"** An agent or a person runs `pnpm verify` and gets a clear pass or fail. If something isn't covered by that command, it isn't verified.
2. **Fast feedback first.** Most checks finish in seconds and run only on what changed. The slow checks run before merging and nightly.
3. **Agents check their own work.** An agent must be able to start the system, seed it, test it, look at the UI and read the logs without asking a person.
4. **Specs map to tests.** Behavior described in the docs (vision, domain model, book designer) gets acceptance tests that name the section they cover, e.g. `describe('domain-model §1.5: deleting a never-referenced version')`.
5. **Tests are hard to weaken.** Agents may not delete, skip or loosen a test, or accept a new snapshot, without saying so and giving the reason in their report.
6. **Real dependencies where it matters.** Integration tests use real PostgreSQL and Valkey, not mocks, because the risky logic (row locks, triggers, visibility rules) lives there.

## 2. The commands

| Command | What it runs | Typical time |
|---|---|---|
| `pnpm verify` | Formatting, lint, type-check, dependency-boundary check, unit tests and integration tests **for the packages affected by the change** (Turborepo, with caching) | Under 1–2 minutes |
| `pnpm verify:full` | Everything in `verify` for all packages, plus end-to-end, accessibility, PDF render and extension tests | 10–20 minutes |
| `pnpm verify:nightly` | `verify:full` plus mutation testing on the core packages, large fixture corpora and performance budgets | Longer |
| `./dev up` / `./dev down` | Starts or stops the full stack locally (Docker Compose) with seeded data. Run on the host: Docker isn't available inside the toolbox | About 1 minute |
| `pnpm dev:seed [scenario]` | Loads a named data scenario (e.g. `empty`, `solo-user`, `group-with-publications`, `moderation-queue`) | Seconds |

- **Run through the toolbox:** every command runs inside the development toolbox container (`./toolbox pnpm verify`). The host needs only Docker (AGENTS.md, "Development environment").
- **The pipeline is plain scripts in the repo.** No checks or steps live in a vendor's config or UI. Anything that triggers a run (a git hook, a script, a CI server later) only calls these commands.
- **Clean-room runs:** `pnpm ci` runs `verify:full` inside a fresh container built from the repo's own Dockerfile, at a given commit, and keeps the report and logs under `.ci/runs/{timestamp}-{commit}/`. This is what "CI" means for ScriptureTips: the same run, on any machine, with nothing installed beyond Docker.
- **Output built for agents:** each command ends with a short summary, failures first, with file and line, the failing assertion, and the command to rerun only that test. A JSON report is also written to `.verify/report.json`. Passing tests stay quiet.

## 3. Test layers

| Layer | Tool | What it covers |
|---|---|---|
| **Static** | TypeScript (strict), linter, formatter, dependency-boundary rules | Type errors; packages importing things they shouldn't (e.g. the web app importing the database layer directly) |
| **Unit** | Vitest | Pure logic, especially in the domain packages |
| **Property-based** | fast-check (with Vitest) | Rules that must hold for *any* input. See §4. |
| **Fixture corpora** | Vitest with versioned fixture files | Large sets of real-world examples with expected results (see §4) |
| **Integration** | Vitest + real PostgreSQL and Valkey from a **Docker Compose test profile** | Repositories, migrations, DB triggers, queues, the publishing procedure, deletion, permissions |
| **API contract** | Generated OpenAPI spec + contract tests | The public API (passages, notes, oEmbed) can't change shape by accident; generated clients stay in sync |
| **End-to-end** | Playwright | Main user journeys in the web app, against a seeded stack |
| **Browser extension** | Playwright with the extension loaded in Chromium | Page scanning, the note composer, **insert at cursor** in each editor type (§5) |
| **Website widget** | Playwright against fixture pages | Scanning only the chosen area, leaving links alone, rescanning, the JavaScript API |
| **Accessibility** | axe-core in Playwright | Every main page and dialog |
| **PDF output** | Render pages to images and compare against approved images; preflight checks | The book designer: page count, spine width, TOC and labels, fonts embedded, bleed |
| **Language** | Spelling checker with two dictionaries | US English in code and docs; en-NZ in UI strings; no missing translation keys |

## 4. Where the risk is: core packages get the deepest tests

These packages hold the logic that's hardest to get right and most expensive to get wrong. They are pure TypeScript with no framework, so they're fast to test and easy for an agent to work on in isolation.

| Package | Tests |
|---|---|
| **Reference parser** | A corpus of thousands of real-world strings (forum posts, sermons, abbreviations, "1 John" vs "John", ranges, BBCode and HTML containing existing links) with expected results. Property tests, e.g. "parse → format → parse gives the same reference" and "text that's already a link never changes". |
| **Versification** | TVTMS mapping fixtures; property tests such as "mapping to the canonical scheme and back returns the original verse", and "every verse in a scheme maps somewhere, or is marked omitted". |
| **Compilation resolver** | Layered overrides (section → book → chapter → range → verse): property tests that the most specific rule always wins, and fixtures for the examples in the vision (NIV base, Genesis from KJV, one verse own words). |
| **License engine** | A table of scenarios: a publication's sources, intended use and countries in, DerivedLicense and warnings out. For example, an LEB-based work for sale at 24% vs 26%. Each of the 18 rule types gets its own cases. |
| **Visibility and permissions** | **An authorization matrix test:** every content type × every visibility (`private`, `contacts`, `group`, `unlisted`, `public`) × every viewer role (owner, contact, group member, signed-in stranger, anonymous, moderator), with the expected allow or deny for each. Because "private until published" is a core promise, this runs against the real API and database, and adding a new content type fails the test until it's added to the matrix. |
| **Published history** | Immutability (published versions can't be changed, enforced by the DB trigger); the two-phase deletion of never-referenced versions, including concurrent attempts; tombstones. |
| **URL resolution** | Path with and without ID, slug history redirects, retired handles, unlisted keys never resolving by path. |

**Mutation testing** (Stryker) runs nightly on these packages. It makes small changes to the code and checks that some test fails, which shows whether the tests really check the behavior, rather than just running the code. That matters when agents write both the code and its tests.

## 5. The browser extension's "editor zoo"

Inserting a note link at the cursor has to work in many kinds of text editors. A set of local fixture pages reproduces the common ones:

- plain `textarea` and `input`;
- `contenteditable`;
- popular rich-text editors (e.g. TinyMCE, CKEditor, ProseMirror/Tiptap, Quill);
- a Discourse-style Markdown composer and a phpBB-style BBCode editor;
- an editor inside an iframe;
- a React-controlled input.

The zoo starts with the most common editors and grows from user reports:
- **Insert is verified:** after inserting, the extension checks that the link actually appears in the editor. If it doesn't, the link is copied to the clipboard and the user is told to paste it (Ctrl+V).
- **"Report this editor":** the same message offers a one-click report. It sends only the site's domain and a technical fingerprint of the editor (e.g. element type and editor library detected), never the user's text. Reports are grouped by editor, so the most-reported ones get supported and added to the zoo first.

Each test opens the composer, inserts a link, and checks that the link is at the saved cursor position, in the right format, that the site's own state noticed the change, and that undo still works. **The page scanning tests use the same zoo**, checking that references are converted and existing links are left alone.

## 6. Test data

- **Only public-domain and openly licensed texts** in fixtures and seed data (e.g. KJV, WEB, and openly licensed original-language data), so the repo never contains copyrighted translations.
- **Texts under custom licenses** (the LEB, the NET) aren't used as committed fixtures. They're loaded from `source-texts/` by the importer.
- **Deterministic tests:** a controllable clock, seeded random IDs and fixed time zones, so tests give the same results every run.
- **Factories** for building test objects (`aUser()`, `aPublication().withVersions(3)`), so tests stay short and readable.
- **Named seed scenarios** (§2) shared by end-to-end tests, local development and agents.

## 7. Equipping agents

- **Instructions in the repo:** a root `AGENTS.md` (read by Claude Code through `CLAUDE.md`) and a short one in each package. They say what the package does, its boundaries, the commands to run and the definition of done.
- **Definition of done for every task:**
  1. tests added or updated for the behavior, named after the spec section where there is one;
  2. `pnpm verify` passes;
  3. for UI changes, Playwright screenshots of the changed screens, checked by the agent;
  4. a short report: what changed, what was tested, anything skipped or weakened and why, and any open questions.
- **Automatic checks in Claude Code:** project hooks run the formatter after edits, and the affected type-check and tests before the agent finishes its turn, so the agent sees failures before handing back.
- **Seeing the running system:** the agent can start the stack (`./dev up`), load a scenario, read structured logs (one file per service) and take screenshots with Playwright.
- **Small tasks:** work is planned as thin vertical slices (a feature from the database to the UI, with its tests), each small enough to review in one sitting. Package boundaries keep the code an agent needs to read small.
- **Review by people stays the final step.** Agents never commit; you review and build the change set in your IDE, as now.

## 8. Keeping it healthy

- **Coverage thresholds** on the core packages (§4) only. Coverage is a weak measure on UI code, so the main check there is end-to-end tests of the journeys.
- **Time budgets:** `verify` must stay fast. Slow tests are moved to the full or nightly runs, and a test that becomes slow is flagged.
- **Flaky tests** are quarantined (still run and reported, but not blocking) and fixed within a set time; they are never just retried until they pass.
- **Performance budgets** for the public endpoints (passage API, note pages, widget script size), checked nightly.

## 9. Testing dependencies

All approved. Each is added when the first test that needs it is written:

| Package | Purpose |
|---|---|
| fast-check | Property-based tests |
| @axe-core/playwright | Accessibility checks |
| Stryker | Mutation testing |
| cspell | Spelling checks (US code, en-NZ UI) |
| dependency-cruiser | Package boundary rules |
| Biome | Lint and format (decided). ESLint is added only if a specific rule we need is missing from Biome, limited to that rule. |
| MSW | Fake responses from outside services (AI providers, timestamp services) in tests |

## 10. Open questions

None at the moment.

**Decided:**
- **No hosted CI service.** CI runs locally from scripts in the repo (`pnpm ci`, §2). Optional triggers, chosen by the developer: a git `pre-push` hook that runs `verify`, or a scheduled local run of `verify:nightly`. If a CI server is ever needed (e.g. several contributors), use a self-hosted, open-source one (e.g. Woodpecker CI) that only calls the same scripts, so it can be swapped without rewriting anything. Deployment follows the same rule: a script (`pnpm deploy`) that builds the images and deploys them to the server over SSH.
- **Integration tests use a Docker Compose test profile** (no Testcontainers), separate from the development stack so test runs never touch development data. Each test worker gets its own database, cloned from a migrated template database, so tests can run in parallel and resetting takes milliseconds. The test file store is a Garage node in memory (`garage-test`); each test file uses its own key prefix, and the file store contract test runs against it (packages/storage). Move away from this only when it stops serving our needs.
- **Biome** for linting and formatting.
- **The editor zoo starts with the most common editors** and grows from "Report this editor" submissions (§5).
