/**
 * Canon profiles (vision §3.4, domain-model §1): which books a tradition counts as scripture,
 * in what order, and in which section. Books a profile doesn't count are listed after its New
 * Testament as additional writings, in registry order, so every profile places every book.
 *
 * Memberships follow the Latin Catholic and Greek Orthodox columns of Wikipedia's "Books of the
 * Bible" table (read 2026-10-28). The Catholic order is that of modern Catholic editions, with
 * 1–2 Maccabees after Esther; the Orthodox order is the Septuagint order used in Greek Orthodox
 * Bibles, with 4 Maccabees as an appendix (additional) and the Prayer of Manasseh among the Odes.
 */

import { BOOKS } from "@scripturetips/passage";

export const CANON_IDS = ["protestant", "catholic", "orthodox"] as const;
export type CanonId = (typeof CANON_IDS)[number];

export type CanonSection = "ot" | "nt" | "additional";

export interface CanonBook {
  /** OSIS book ID (`@scripturetips/passage` registry). */
  readonly osis: string;
  /** 1-based position in the profile's order. */
  readonly order: number;
  readonly status: "canonical" | "additional";
  readonly section: CanonSection;
  /**
   * The book this one is printed inside (Greek Esther in Esther, the additions in Daniel, the
   * Letter of Jeremiah as Baruch 6 in Catholic Bibles). It counts with that book, not on its own.
   */
  readonly partOf?: string;
}

export interface CanonProfile {
  readonly id: CanonId;
  readonly books: readonly CanonBook[];
}

/** A book in a profile's order: its OSIS ID, or [ID, the book it's printed inside]. */
type Entry = string | readonly [string, string];

const PENTATEUCH_TO_KINGS = [
  "Gen",
  "Exod",
  "Lev",
  "Num",
  "Deut",
  "Josh",
  "Judg",
  "Ruth",
  "1Sam",
  "2Sam",
  "1Kgs",
  "2Kgs",
  "1Chr",
  "2Chr",
];
const MINOR_PROPHETS = [
  "Hos",
  "Joel",
  "Amos",
  "Obad",
  "Jonah",
  "Mic",
  "Nah",
  "Hab",
  "Zeph",
  "Hag",
  "Zech",
  "Mal",
];
const NEW_TESTAMENT = BOOKS.filter((b) => b.group === "nt").map((b) => b.osis);

const OLD_TESTAMENTS: Record<CanonId, readonly Entry[]> = {
  protestant: BOOKS.filter((b) => b.group === "ot").map((b) => b.osis),
  catholic: [
    ...PENTATEUCH_TO_KINGS,
    "Ezra",
    "Neh",
    "Tob",
    "Jdt",
    "Esth",
    ["EsthGr", "Esth"],
    "1Macc",
    "2Macc",
    "Job",
    "Ps",
    "Prov",
    "Eccl",
    "Song",
    "Wis",
    "Sir",
    "Isa",
    "Jer",
    "Lam",
    "Bar",
    ["EpJer", "Bar"],
    "Ezek",
    "Dan",
    ["DanGr", "Dan"],
    ["PrAzar", "Dan"],
    ["Sus", "Dan"],
    ["Bel", "Dan"],
    ...MINOR_PROPHETS,
  ],
  orthodox: [
    ...PENTATEUCH_TO_KINGS,
    "1Esd",
    "Ezra",
    "Neh",
    "Tob",
    "Jdt",
    "Esth",
    ["EsthGr", "Esth"],
    "1Macc",
    "2Macc",
    "3Macc",
    "Ps",
    ["AddPs", "Ps"],
    "Job",
    "Prov",
    "Eccl",
    "Song",
    "Wis",
    "Sir",
    "Hos",
    "Amos",
    "Mic",
    "Joel",
    "Obad",
    "Jonah",
    "Nah",
    "Hab",
    "Zeph",
    "Hag",
    "Zech",
    "Mal",
    "Isa",
    "Jer",
    "Bar",
    "Lam",
    "EpJer",
    "Ezek",
    "Dan",
    ["DanGr", "Dan"],
    ["PrAzar", "Dan"],
    ["Sus", "Dan"],
    ["Bel", "Dan"],
  ],
};

function profile(id: CanonId): CanonProfile {
  const books: CanonBook[] = [];
  const add = (entry: Entry, status: CanonBook["status"], section: CanonSection) => {
    const [osis, partOf] = typeof entry === "string" ? [entry, undefined] : entry;
    books.push({ osis, order: books.length + 1, status, section, ...(partOf ? { partOf } : {}) });
  };
  for (const e of OLD_TESTAMENTS[id]) add(e, "canonical", "ot");
  for (const e of NEW_TESTAMENT) add(e, "canonical", "nt");
  const placed = new Set(books.map((b) => b.osis));
  for (const b of BOOKS) if (!placed.has(b.osis)) add(b.osis, "additional", "additional");
  return { id, books };
}

export const CANONS: Readonly<Record<CanonId, CanonProfile>> = Object.fromEntries(
  CANON_IDS.map((id) => [id, profile(id)]),
) as Record<CanonId, CanonProfile>;

export function isCanonId(value: unknown): value is CanonId {
  return typeof value === "string" && (CANON_IDS as readonly string[]).includes(value);
}

/** Where a book stands in a profile, or across all of them when the reader has none. */
export type Standing = "canonical" | "additional" | "varies";

export function standing(osis: string, canon: CanonId | null): Standing | undefined {
  const statuses = new Set(
    (canon ? [canon] : CANON_IDS).map(
      (id) => CANONS[id].books.find((b) => b.osis === osis)?.status,
    ),
  );
  if (statuses.has(undefined)) return undefined;
  return statuses.size > 1 ? "varies" : (statuses.values().next().value as Standing);
}
