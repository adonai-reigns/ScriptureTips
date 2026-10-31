/**
 * Strong's numbers and STEPBible's extended ("disambiguated") ones: `H7225G` is Strong's `H7225`
 * with a letter that tells apart words sharing the number. Numbers are padded to four digits
 * (`H0430`), as the Strong's tags in the verse text are.
 */

import { BOOKS } from "@scripturetips/passage";

export interface StrongNumber {
  /** `H0430` or `G0976`. */
  readonly base: string;
  /** `H0430G` where the number carries a letter, else null. */
  readonly extended: string | null;
  readonly language: "heb" | "grc";
  /** STEPBible's own affix numbers (`H9003`, the prefix "in") aren't Strong's: 9000 and up. */
  readonly affix: boolean;
}

const STRONG = /^([HG])0*(\d{1,4})([A-Za-z]?)$/;

/** Reads a Strong's number as written (`H430`, `H0430G`, `G0976`), or null if it isn't one. */
export function parseStrong(raw: string): StrongNumber | null {
  const m = STRONG.exec(raw.trim());
  if (!m) return null;
  const letter = m[1] as "H" | "G";
  const base = `${letter}${(m[2] ?? "").padStart(4, "0")}`;
  return {
    base,
    extended: m[3] ? `${base}${m[3]}` : null,
    language: letter === "H" ? "heb" : "grc",
    affix: Number(m[2]) >= 9000,
  };
}

/** The number of a dictionary entry written without its letter (`1`, `00001`). */
export const strongOf = (language: "heb" | "grc", digits: string): string =>
  `${language === "heb" ? "H" : "G"}${String(Number(digits.replace(/\D/g, ""))).padStart(4, "0")}`;

const BY_USFM = new Map(BOOKS.map((b) => [b.usfm.toLowerCase(), b.osis]));

/** The OSIS ID for a STEPBible book code (`Gen`, `1Sa`, `Mrk`: USFM codes in title case). */
export const osisBook = (code: string): string | undefined => BY_USFM.get(code.toLowerCase());
