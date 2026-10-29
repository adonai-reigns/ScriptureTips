/**
 * The license module (domain-model §7): each license key's terms as machine-readable rules,
 * so nothing about a text's permissions is assumed in code. A translation names its license
 * by key (`translation.license_key`). Rule types follow licenses.md §8; only the ones the
 * loaded translations need are written out so far. Acted on: `not_as_base`, `no_modification`
 * and `correction_limit` (compilations); `attribution`, `name_restriction` and
 * `notes_excluded` (publishing and reading).
 *
 * An unknown key allows nothing: a text whose terms haven't been recorded can't be built on.
 */

export type LicenseRule =
  | { readonly type: "public_domain" }
  /**
   * The designation after each quotation ("LEB", shown as "(LEB)"), the credit statement, and
   * the words in either that must link to the rights holder's sites in electronic use.
   */
  | {
      readonly type: "attribution";
      readonly designation: string;
      readonly statement: string;
      readonly links: readonly { readonly text: string; readonly url: string }[];
    }
  | { readonly type: "give_away_only" }
  | { readonly type: "no_standalone_sale" }
  | {
      readonly type: "max_share_of_work";
      readonly percent: number;
      readonly unit: "verses" | "words";
      readonly context: "sold";
    }
  | { readonly type: "notes_excluded" }
  | { readonly type: "name_restriction"; readonly term: string }
  | { readonly type: "reporting_obligation" }
  | { readonly type: "not_as_base" }
  | { readonly type: "no_modification" }
  /** Overrides how many words or punctuation marks a correction may change (domain-model §2.3). */
  | { readonly type: "correction_limit"; readonly words: number };

export interface License {
  readonly key: string;
  readonly name: string;
  readonly url: string;
  readonly rules: readonly LicenseRule[];
}

const list: readonly License[] = [
  {
    key: "public-domain",
    name: "Public domain",
    url: "https://creativecommons.org/publicdomain/mark/1.0/",
    rules: [{ type: "public_domain" }],
  },
  {
    key: "cc0-1.0",
    name: "CC0 1.0",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
    rules: [{ type: "public_domain" }],
  },
  // licenses.md §3.1; evidence in license-evidence/lexham-english-bible/.
  {
    key: "leb",
    name: "Lexham English Bible license",
    url: "https://lexhamenglishbible.com/license/",
    rules: [
      // license-evidence/lexham-english-bible/license-text.txt: the statement is required from
      // 100 verses in a work; it's always shown, which is never less than required.
      {
        type: "attribution",
        designation: "LEB",
        statement:
          "Scripture quotations marked (LEB) are from the Lexham English Bible. Copyright 2012 Logos Bible Software. Lexham is a registered trademark of Logos Bible Software.",
        links: [
          { text: "LEB", url: "http://www.lexhamenglishbible.com" },
          { text: "Lexham English Bible", url: "http://www.lexhamenglishbible.com" },
          { text: "Logos Bible Software", url: "http://www.logos.com" },
        ],
      },
      { type: "no_standalone_sale" },
      { type: "max_share_of_work", percent: 25, unit: "verses", context: "sold" },
      { type: "reporting_obligation" },
      { type: "name_restriction", term: "Lexham" },
    ],
  },
  // licenses.md §3.2; evidence in license-evidence/net-bible/.
  {
    key: "net-bible",
    name: "NET Bible® copyright terms",
    url: "https://netbible.com/copyright",
    rules: [
      // license-evidence/net-bible/SOURCE.md: "(NET)" after the quoted text, linked to
      // the NET Bible site in software, and the current copyright acknowledgment.
      {
        type: "attribution",
        designation: "NET",
        statement:
          "Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. http://netbible.com All rights reserved.",
        links: [
          { text: "NET", url: "http://netbible.org" },
          { text: "http://netbible.com", url: "http://netbible.com" },
        ],
      },
      { type: "give_away_only" },
      { type: "notes_excluded" },
    ],
  },
];

export const LICENSES: ReadonlyMap<string, License> = new Map(list.map((l) => [l.key, l]));

export function licenseFor(key: string): License | undefined {
  return LICENSES.get(key);
}

const has = (key: string, type: LicenseRule["type"]) =>
  licenseFor(key)?.rules.some((r) => r.type === type) ?? true;

/** True if a text under this license can be a compilation's base (domain-model §2.3). */
export const canBeBase = (key: string): boolean => LICENSES.has(key) && !has(key, "not_as_base");

/** True if verses under this license may be taken into a compilation, in layers or picked. */
export const canCompile = (key: string): boolean => LICENSES.has(key);

/** True if a compilation may change the wording of verses under this license. */
export const canModify = (key: string): boolean =>
  LICENSES.has(key) && !has(key, "no_modification");

/** Words or punctuation marks a correction may change (each added, removed or replaced). */
export const CORRECTION_LIMIT = 3;

/** The correction limit for verses under this license: its own, or `CORRECTION_LIMIT`. */
export function correctionLimit(key: string): number {
  for (const r of licenseFor(key)?.rules ?? []) if (r.type === "correction_limit") return r.words;
  return CORRECTION_LIMIT;
}

/** What a text under this license must carry wherever it's shown; null if nothing. */
export function attributionFor(key: string): Extract<LicenseRule, { type: "attribution" }> | null {
  for (const r of licenseFor(key)?.rules ?? []) if (r.type === "attribution") return r;
  return null;
}

/** Terms a work drawing on a text under this license may not use in its title (trademarks). */
export const restrictedNames = (key: string): string[] =>
  (licenseFor(key)?.rules ?? []).flatMap((r) => (r.type === "name_restriction" ? [r.term] : []));

/** True if the translators' notes of a text under this license may not be passed on. */
export const notesExcluded = (key: string): boolean =>
  (licenseFor(key)?.rules ?? []).some((r) => r.type === "notes_excluded");
