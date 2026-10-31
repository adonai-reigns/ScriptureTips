import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  countryFromText,
  countryName,
  countryOptions,
  isCountryCode,
} from "./index.ts";

describe("the country list", () => {
  it("has every ISO 3166-1 entry and Kosovo, and nothing that isn't a country entry", () => {
    // ISO 3166-1 has 249 entries; CLDR's list adds Kosovo (XK).
    expect(COUNTRY_CODES).toHaveLength(250);
    for (const code of ["NZ", "US", "TW", "PS", "HK", "MO", "XK", "GL", "PR", "AQ"])
      expect(isCountryCode(code)).toBe(true);
    for (const code of ["ZZ", "EU", "UN", "AC", "IC", "YU", "nz", "NZL", ""])
      expect(isCountryCode(code)).toBe(false);
  });

  it("is sorted and has no repeats", () => {
    expect([...COUNTRY_CODES]).toEqual([...new Set(COUNTRY_CODES)].sort());
  });
});

describe("names", () => {
  it("are in the asked language", () => {
    expect(countryName("NZ", "en-NZ")).toBe("New Zealand");
    expect(countryName("DE", "de")).toBe("Deutschland");
    expect(countryName("XK", "en")).toBe("Kosovo");
  });

  it("every country has one (never just its code)", () => {
    for (const o of countryOptions("en-NZ")) expect(o.name).not.toBe(o.code);
  });

  it("are listed alphabetically in their language", () => {
    const names = countryOptions("en-NZ").map((o) => o.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en-NZ")));
  });
});

describe("reading what was typed", () => {
  it("finds a country by its name or code, ignoring case and spaces", () => {
    expect(countryFromText("new zealand", "en-NZ")).toBe("NZ");
    expect(countryFromText("  New Zealand ", "en-NZ")).toBe("NZ");
    expect(countryFromText("nz", "en-NZ")).toBe("NZ");
  });

  it("finds nothing for what isn't on the list", () => {
    expect(countryFromText("Narnia", "en-NZ")).toBeUndefined();
    expect(countryFromText("", "en-NZ")).toBeUndefined();
  });
});
