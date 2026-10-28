# @scripturetips/web

The web app: Next.js (App Router), server-rendered, with next-intl for every user-facing string. So far: the landing page, the reader view and the credits page. It reads scripture from the API (`API_URL`).

- **Reader view:** `/read/{translation}/{book}/{chapter}[/{verses}]` (domain-model §1.6), e.g. `/read/leb/genesis/2/18-25`, `/read/kjv/psalms/23`; several passages as `/read/{translation}/passage/joel.2.28,joel.3.1`. The search form posts to `/read?t=&ref=`, which reads the reference through the API and redirects to the canonical path.
- **Rendering** (`src/reader/`): `layout.ts` lays verses out as printed (paragraphs and poetry lines running across verses, headings, verse numbers where each verse's text begins, verse 0 as a title without a number) and letters note marks in reading order, nested ones included. `Passage.tsx` draws it: idiomatic phrases in lower corner brackets, translator's notes listed below with links both ways.
- **UI strings** live in `messages/en-NZ.json` (New Zealand English). Errors from the API arrive as codes and are worded there.
- **Branding:** docs/branding.md. Assets in `public/brand/` (their rights: docs/license-evidence/ and the credits page). The artwork is the fixed page background; content sits on a plain panel over it.
- **Running it:** `./dev up` starts it with the API and database, with hot reload, at http://127.0.0.1:3000. `./dev up --lan` serves the web app to the local network too (to try it on a phone); `./dev up` again goes back to localhost only.
- **Tests:** unit tests (`*.test.ts`, in `pnpm verify`), and Playwright end-to-end tests in `e2e/` against the running stack: `./dev up`, then `./toolbox sh -c 'cd apps/web && npx playwright test'`. They save desktop and phone screenshots to `test-results/screens/`; look at them for any UI change (definition of done). They aren't in `pnpm verify` yet, since they need the stack running.

Run the unit tests: `./toolbox pnpm --filter @scripturetips/web test`
