import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lemma,
  lexicon,
  lexiconEntry,
  sql,
  token,
} from "@scripturetips/db";
import { DATABASE, type Database } from "../database.ts";
import { categoryOf, type StudyCategory } from "./categories.ts";

/** What study mode needs to draw a Strong's number's word (`H0430`). */
export interface StudyWord {
  readonly category: StudyCategory;
  /** The dictionary form, in Hebrew or Greek. */
  readonly headword: string | null;
  readonly gloss: string | null;
  readonly partOfSpeech: string | null;
}

/** One dictionary's entry for a word, shortened to what a tooltip shows. */
export interface StudyEntry {
  /** The dictionary's catalog ID (`strongs-hebrew`, `bdb`, `abbott-smith` …). */
  readonly lexicon: string;
  readonly name: string;
  readonly headword: string | null;
  readonly summary: string;
}

/** A word in full: what it is, how often it's used, and what the dictionaries say. */
export interface StudyLemma extends StudyWord {
  readonly strong: string;
  /** Every occurrence in the Hebrew or Greek text (all its extended lemmas too). */
  readonly occurrences: number;
  readonly entries: readonly StudyEntry[];
}

const LONGEST = 600;
const shorten = (text: string) =>
  text.length > LONGEST ? `${text.slice(0, LONGEST).replace(/\s+\S*$/, "")}…` : text;

/** The part of a dictionary entry's body a tooltip shows, by dictionary. */
export function summaryOf(catalogId: string, body: Record<string, unknown>): string {
  const text = (key: string): string =>
    typeof body[key] === "string" ? (body[key] as string) : "";
  const list = (key: string): string => {
    const v = body[key];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").join("; ") : "";
  };
  const parts =
    catalogId === "strongs-hebrew"
      ? [text("meaning"), text("usage")]
      : catalogId === "strongs-greek"
        ? [text("definition"), text("kjv")]
        : catalogId === "bdb"
          ? [list("definitions") || text("text")]
          : [list("glosses") || text("text")];
  return shorten(parts.filter(Boolean).join(" \u2014 "));
}

/** Strong's first, then the fuller dictionaries. */
const ORDER = ["strongs-hebrew", "strongs-greek", "bdb", "abbott-smith"];

@Injectable()
export class StudyService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Each Strong's number given that has a lemma, by number. Numbers with none are left out. */
  async words(strongs: readonly string[]): Promise<Record<string, StudyWord>> {
    if (strongs.length === 0) return {};
    const rows = await this.db
      .select({
        key: lemma.key,
        headword: lemma.headword,
        gloss: lemma.gloss,
        partOfSpeech: lemma.partOfSpeech,
        nameKind: lemma.nameKind,
      })
      .from(lemma)
      .where(and(inArray(lemma.key, [...strongs]), isNull(lemma.baseLemmaId)));
    return Object.fromEntries(
      rows.map((r) => [
        r.key,
        {
          category: categoryOf(r),
          headword: r.headword,
          gloss: r.gloss,
          partOfSpeech: r.partOfSpeech,
        },
      ]),
    );
  }

  /** One Strong's number in full, or null if there is no lemma for it. */
  async lemma(strong: string): Promise<StudyLemma | null> {
    const [base] = await this.db
      .select()
      .from(lemma)
      .where(and(eq(lemma.key, strong), isNull(lemma.baseLemmaId)));
    if (!base) return null;
    const [count] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(token)
      .innerJoin(lemma, eq(lemma.id, token.lemmaId))
      .where(sql`${lemma.id} = ${base.id} or ${lemma.baseLemmaId} = ${base.id}`);
    const rows = await this.db
      .select({
        lexicon: lexicon.catalogId,
        name: lexicon.name,
        headword: lexiconEntry.headword,
        body: lexiconEntry.body,
      })
      .from(lexiconEntry)
      .innerJoin(lexicon, eq(lexicon.id, lexiconEntry.lexiconId))
      .where(eq(lexiconEntry.lemmaId, base.id))
      .orderBy(asc(lexiconEntry.entryRef));
    const entries = rows
      .map((r) => ({
        lexicon: r.lexicon,
        name: r.name,
        headword: r.headword,
        summary: summaryOf(r.lexicon, r.body as Record<string, unknown>),
      }))
      .filter((e) => e.summary !== "")
      .sort((a, b) => ORDER.indexOf(a.lexicon) - ORDER.indexOf(b.lexicon));
    return {
      strong,
      category: categoryOf(base),
      headword: base.headword,
      gloss: base.gloss,
      partOfSpeech: base.partOfSpeech,
      occurrences: count?.n ?? 0,
      entries,
    };
  }
}
