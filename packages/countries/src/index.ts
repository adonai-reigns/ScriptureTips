import { COUNTRY_CODES } from "./countries.generated.ts";

export { COUNTRY_CODES };

/** An ISO 3166-1 alpha-2 code (and Kosovo's `XK`) from the list. */
export type CountryCode = (typeof COUNTRY_CODES)[number];

const CODES: ReadonlySet<string> = new Set(COUNTRY_CODES);

/** Whether this is one of the codes: the case matters (`NZ`, not `nz`). */
export const isCountryCode = (value: string): value is CountryCode => CODES.has(value);

/** A country's name in a language (CLDR's, through the runtime's `Intl`). */
export function countryName(code: CountryCode, locale: string): string {
  return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
}

export interface CountryOption {
  readonly code: CountryCode;
  readonly name: string;
}

/** Every country with its name in a language, in that language's alphabetical order. */
export function countryOptions(locale: string): CountryOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}

/**
 * The country a name stands for in a language, ignoring case and extra spaces; the code itself
 * (`nz`) is taken too. Undefined where it isn't one of the list's.
 */
export function countryFromText(text: string, locale: string): CountryCode | undefined {
  const wanted = text.trim().toLocaleLowerCase(locale);
  if (wanted === "") return undefined;
  const byCode = wanted.toUpperCase();
  if (isCountryCode(byCode)) return byCode;
  return countryOptions(locale).find((o) => o.name.toLocaleLowerCase(locale) === wanted)?.code;
}
