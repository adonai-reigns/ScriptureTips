import { Inject, Injectable } from "@nestjs/common";
import { and, inArray, isNull, lemma } from "@scripturetips/db";
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
}
