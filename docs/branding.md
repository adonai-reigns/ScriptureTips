# ScriptureTips: Branding

The identity carries over from the legacy apps: the book-and-quill logo, the sky-blue palette and the clouds-and-birds artwork. The reading surface stays plain, so long passages and notes are easy to read.

## 1. Assets and their rights

| Asset | Origin | Rights | Credit |
|---|---|---|---|
| **Logo** (open book with a quill, in blues) | Commissioned from buzzzy on Fiverr (legacy `ScriptureTips-App/src/assets/images/site/st-logo-*.png`) | Commissioned for ScriptureTips | "Logo by buzzzy at Fiverr.com", as the legacy credits gave it |
| **Clouds and birds** (background artwork) | "Clouds And Birds", freevector.com (legacy `bg-clouds-and-birds.svg`) | **CC BY-NC 4.0** ([license-evidence/clouds-and-birds](license-evidence/clouds-and-birds/SOURCE.md)). Non-commercial use only, which ScriptureTips always is | "Clouds And Birds" by Akira / Garcya.us, FreeVector.com, CC BY-NC 4.0, with links (which name, sources.md §8, item 19) |

- **Data credited alongside the assets:** the reserved-username lists (The Big Username Blocklist and shouldbee/reserved-usernames, MIT: [license-evidence/big-username-blocklist](license-evidence/big-username-blocklist/SOURCE.md), [license-evidence/shouldbee-reserved-usernames](license-evidence/shouldbee-reserved-usernames/SOURCE.md)).
- **Artwork isn't covered by the code's AGPL license.** Each asset keeps its own license, recorded here and in `license-evidence/`. Anyone reusing the code must check the artwork separately (CC BY-NC rules out a commercial fork using the background).
- **A credits page** in the app lists every asset and font with its credit and license, as the legacy acknowledgements page did.

## 2. Palette

Taken from the artwork's own colors.

| Token | Color | Use |
|---|---|---|
| `sky` | `#44c8f5` | Accents, highlights, decorative backgrounds. Not for text on white (too little contrast) |
| `sky-mid` | `#209bd6` | Secondary accents, focus rings |
| `deep` | `#0054a5` | Links, buttons and actions: strong contrast on white |
| `pale` | `#c6e9fa` | Selected and highlighted passages, quiet backgrounds |
| `sky-legacy` | `#62d1f7` | The legacy extension's page color, behind the artwork |

- **Text contrast meets WCAG AA**, checked with axe (testing.md §3). A color only goes behind text where it passes.

## 3. Where the artwork goes

- **The page background:** the artwork fills the viewport and stays fixed while the content scrolls over it, on every page. Also in the extension's popup.
- **Never directly behind text.** Content sits on a plain paper-colored panel over the artwork, so scripture and notes keep full contrast. On narrow screens the panel spans the full width, and the artwork shows around the header.

## 4. Type

To be chosen with the reader view: a serif with good Hebrew and Greek companions for scripture, and a clean sans-serif for the interface. Fonts must be openly licensed and self-hosted (no third-party font requests), and are credited on the credits page.
