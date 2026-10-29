# @scripturetips/licenses

The license module (domain-model §7, licenses.md §8): each license key's terms as machine-readable rules. Pure TypeScript data, no I/O. A translation names its license by key (`translation.license_key`); nothing about a text's permissions is assumed elsewhere in code.

- **Rules** are a typed union (`LicenseRule`). Only the rule types the loaded translations need are written out so far; add types from licenses.md §8 as texts that need them arrive, with the evidence folder named in a comment.
- **Acted on so far:** `canBeBase` (`not_as_base`), `canCompile` and `canModify` (`no_modification`), used by compilations; `attributionFor` (designation, credit statement and links, from the license evidence), `restrictedNames` (`name_restriction`) and `notesExcluded`, used by publishing and the reader. Share limits and derived licenses come with editions and the sources that need them.
- **An unknown key allows nothing.** Record a license here before loading a text under it.
- The rules live in code for now; domain-model's `License`/`LicenseRule` tables come when staff need to maintain them without a release.

Run: `./toolbox pnpm --filter @scripturetips/licenses test`
