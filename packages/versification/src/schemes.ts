/**
 * The versification schemes (domain-model §2.1). Each maps only to and from the canonical
 * scheme. The tables are generated from STEPBible's TVTMS (`src/data/`, see CHANGES.md there).
 */

import { BOOKS, type BookGroup, type VerseRef } from "@scripturetips/passage";
import { pairs as greek } from "./data/greek.ts";
import { pairs as hebrew } from "./data/hebrew.ts";
import { pairs as kjv } from "./data/kjv.ts";
import { pairs as latin } from "./data/latin.ts";
import { type Mapping, type MappingPairs, MappingTable } from "./mapping.ts";

export type SchemeId = "canonical" | "kjv" | "hebrew" | "latin" | "greek";

export interface VersificationScheme {
  readonly id: SchemeId;
  /** The TVTMS tradition the scheme follows. */
  readonly tradition: string;
  /** The OSIS IDs of the books the scheme numbers. */
  readonly books: ReadonlySet<string>;
}

export class VersificationError extends Error {
  override readonly name = "VersificationError";
}

const booksIn = (...groups: BookGroup[]) =>
  new Set(BOOKS.filter((b) => groups.includes(b.group)).map((b) => b.osis));
const allBooks = booksIn("ot", "nt", "additional");

const definitions: ReadonlyArray<readonly [SchemeId, string, ReadonlySet<string>, MappingPairs]> = [
  // Hebrew for the Old Testament, Greek for the additional books and the New Testament.
  ["canonical", "Hebrew/Greek", allBooks, []],
  ["kjv", "Eng-KJV", allBooks, kjv],
  ["hebrew", "Hebrew", booksIn("ot"), hebrew],
  ["latin", "Latin", allBooks, latin],
  ["greek", "Greek", allBooks, greek],
];

export const SCHEMES: readonly VersificationScheme[] = definitions.map(([id, tradition, books]) =>
  Object.freeze({ id, tradition, books }),
);

const pairsById = new Map(definitions.map(([id, , , pairs]) => [id, pairs]));
const tables = new Map<SchemeId, MappingTable>();

export function schemeById(id: string): VersificationScheme | undefined {
  return SCHEMES.find((s) => s.id === id);
}

function table(scheme: SchemeId, ref: VerseRef): MappingTable {
  const definition = schemeById(scheme);
  if (!definition) throw new VersificationError(`Unknown versification scheme: ${scheme}`);
  if (!definition.books.has(ref.book))
    throw new VersificationError(`The ${scheme} scheme doesn't number ${ref.book}`);
  let t = tables.get(scheme);
  if (!t) {
    t = new MappingTable(pairsById.get(scheme) ?? []);
    tables.set(scheme, t);
  }
  return t;
}

/** The canonical verses for a verse numbered in `scheme`. */
export function toCanonical(scheme: SchemeId, ref: VerseRef): Mapping {
  return table(scheme, ref).toCanonical(ref);
}

/** The verses of `scheme` for a canonical verse. */
export function fromCanonical(scheme: SchemeId, ref: VerseRef): Mapping {
  return table(scheme, ref).fromCanonical(ref);
}
