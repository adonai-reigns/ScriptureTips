/**
 * The book registry.
 *
 * Each book's `number` is part of every stored passage ordinal (see ordinal.ts), so the registry
 * is append-only: never renumber, reorder or remove an entry. Display order and which books a
 * user sees come from their canon profile, not from these numbers.
 *
 * `osis` is the OSIS 2.1.1 book ID used in stored references. `usfm` is the Paratext/USFM book
 * code used by the source files we import.
 */

export type BookGroup = "ot" | "nt" | "additional";

export interface Book {
  readonly number: number;
  readonly osis: string;
  readonly usfm: string;
  readonly group: BookGroup;
}

/** Ordinals are stored as PostgreSQL int4, which allows book numbers up to 214. */
export const MAX_BOOK_NUMBER = 214;

const entries: ReadonlyArray<readonly [string, string, BookGroup]> = [
  // 1–39: Old Testament
  ["Gen", "GEN", "ot"],
  ["Exod", "EXO", "ot"],
  ["Lev", "LEV", "ot"],
  ["Num", "NUM", "ot"],
  ["Deut", "DEU", "ot"],
  ["Josh", "JOS", "ot"],
  ["Judg", "JDG", "ot"],
  ["Ruth", "RUT", "ot"],
  ["1Sam", "1SA", "ot"],
  ["2Sam", "2SA", "ot"],
  ["1Kgs", "1KI", "ot"],
  ["2Kgs", "2KI", "ot"],
  ["1Chr", "1CH", "ot"],
  ["2Chr", "2CH", "ot"],
  ["Ezra", "EZR", "ot"],
  ["Neh", "NEH", "ot"],
  ["Esth", "EST", "ot"],
  ["Job", "JOB", "ot"],
  ["Ps", "PSA", "ot"],
  ["Prov", "PRO", "ot"],
  ["Eccl", "ECC", "ot"],
  ["Song", "SNG", "ot"],
  ["Isa", "ISA", "ot"],
  ["Jer", "JER", "ot"],
  ["Lam", "LAM", "ot"],
  ["Ezek", "EZK", "ot"],
  ["Dan", "DAN", "ot"],
  ["Hos", "HOS", "ot"],
  ["Joel", "JOL", "ot"],
  ["Amos", "AMO", "ot"],
  ["Obad", "OBA", "ot"],
  ["Jonah", "JON", "ot"],
  ["Mic", "MIC", "ot"],
  ["Nah", "NAM", "ot"],
  ["Hab", "HAB", "ot"],
  ["Zeph", "ZEP", "ot"],
  ["Hag", "HAG", "ot"],
  ["Zech", "ZEC", "ot"],
  ["Mal", "MAL", "ot"],
  // 40–66: New Testament
  ["Matt", "MAT", "nt"],
  ["Mark", "MRK", "nt"],
  ["Luke", "LUK", "nt"],
  ["John", "JHN", "nt"],
  ["Acts", "ACT", "nt"],
  ["Rom", "ROM", "nt"],
  ["1Cor", "1CO", "nt"],
  ["2Cor", "2CO", "nt"],
  ["Gal", "GAL", "nt"],
  ["Eph", "EPH", "nt"],
  ["Phil", "PHP", "nt"],
  ["Col", "COL", "nt"],
  ["1Thess", "1TH", "nt"],
  ["2Thess", "2TH", "nt"],
  ["1Tim", "1TI", "nt"],
  ["2Tim", "2TI", "nt"],
  ["Titus", "TIT", "nt"],
  ["Phlm", "PHM", "nt"],
  ["Heb", "HEB", "nt"],
  ["Jas", "JAS", "nt"],
  ["1Pet", "1PE", "nt"],
  ["2Pet", "2PE", "nt"],
  ["1John", "1JN", "nt"],
  ["2John", "2JN", "nt"],
  ["3John", "3JN", "nt"],
  ["Jude", "JUD", "nt"],
  ["Rev", "REV", "nt"],
  // 67+: additional writings (vision §3.4), shown only in canon profiles that include them
  ["Tob", "TOB", "additional"],
  ["Jdt", "JDT", "additional"],
  ["EsthGr", "ESG", "additional"],
  ["Wis", "WIS", "additional"],
  ["Sir", "SIR", "additional"],
  ["Bar", "BAR", "additional"],
  ["EpJer", "LJE", "additional"],
  ["PrAzar", "S3Y", "additional"],
  ["Sus", "SUS", "additional"],
  ["Bel", "BEL", "additional"],
  ["1Macc", "1MA", "additional"],
  ["2Macc", "2MA", "additional"],
  ["3Macc", "3MA", "additional"],
  ["4Macc", "4MA", "additional"],
  ["PrMan", "MAN", "additional"],
  ["1Esd", "1ES", "additional"],
  ["2Esd", "2ES", "additional"],
  ["AddPs", "PS2", "additional"],
  ["Odes", "ODA", "additional"],
  ["PssSol", "PSS", "additional"],
  ["DanGr", "DAG", "additional"],
  ["EpLao", "LAO", "additional"],
];

export const BOOKS: readonly Book[] = entries.map(([osis, usfm, group], index) =>
  Object.freeze({ number: index + 1, osis, usfm, group }),
);

const byOsis = new Map(BOOKS.map((book) => [book.osis, book]));
const byUsfm = new Map(BOOKS.map((book) => [book.usfm, book]));
const byNumber = new Map(BOOKS.map((book) => [book.number, book]));

export function bookByOsis(osis: string): Book | undefined {
  return byOsis.get(osis);
}

export function bookByUsfm(usfm: string): Book | undefined {
  return byUsfm.get(usfm.toUpperCase());
}

export function bookByNumber(number: number): Book | undefined {
  return byNumber.get(number);
}
