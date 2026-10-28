# @scripturetips/api

The API: NestJS on Fastify, under `/api`. So far it serves translations and passages from the database (packages/db), and accounts.

- `GET /api/translations`: the translations that have text loaded.
- `GET /api/translations/{id}/passages?ref=Joel 2:28-32`: the verses of one or more references, read in the translation's numbering (@scripturetips/reference), each with its canonical passage, a display label, headings, markup and translator's notes (domain-model §2.6). At most `MAX_VERSES` (500) per request.
- **Accounts** (`src/auth/`, vision §11 "Sign-in"): Better Auth under `/api/auth/*`, mounted on Fastify by `AuthModule`. Sign-in is a one-time email code (6 digits, 10 minutes, 3 attempts, stored hashed) with **no passwords**; a new address becomes an account on its first sign-in. Asking for a code (`POST /api/auth/email-otp/send-verification-otp`) needs a solved ALTCHA bot check in the `x-bot-check` header, and is limited to 5 codes an hour per address and 60 requests an hour per IP. Then `POST /api/auth/sign-in/email-otp` sets the session cookie (30 days, renewed daily). Rate limits and spent bot-check solutions live in Valkey (`KeyStore`); email goes over SMTP (`Mailer`, Mailpit in development).
- `GET /api/account/bot-check`: a bot-check puzzle. `GET /api/account`: the signed-in user (email, handle, display name, locale, canon profile, trust level). `PUT /api/account`: set the handle (once, for now; checked against domain-model §1.6 and a reserved list), display name (checked against the reserved names in any script) and canon profile (`@scripturetips/canon`, no default, changeable).
- **Settings** come from the environment (`src/auth/config.ts`; compose.yaml sets them for development). Tests pass their own: `testAccounts()` gives a memory store, a list of sent mail and an easy bot check.
- **Errors are codes, never text** (`unknown-translation`, `no-such-chapter`, `too-many-verses`, `invalid-request` …), with the index where a reference went wrong. The UI words them in the user's language.
- **Compiled, not run from source.** Node can't run decorators from TypeScript, so `tsc -p tsconfig.build.json` writes `dist/`; workspace packages are still loaded from their source. That's why only this app allows non-erasable syntax (`erasableSyntaxOnly: false`); packages Node runs from source must not use it.
- **Inject by token** (`@Inject(TranslationsService)`, `@Inject(DATABASE)`): no decorator metadata is emitted, so constructor types alone don't wire anything.
- **Validation:** Zod schemas through `ZodPipe`.
- **Running it:** `./dev up` starts it with the database, Valkey and Mailpit, rebuilding and restarting on every change, at http://127.0.0.1:3001/api. Logs: `./dev logs api`.
- **Tests:** integration tests through Fastify's `inject` on a test database (packages/db test support).

Run the tests: `./toolbox pnpm --filter @scripturetips/api test`
