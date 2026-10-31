/** What study mode draws for a Strong's number (apps/api `StudyWord`). */
export interface StudyWord {
  readonly category: StudyCategory;
  /** The dictionary form, in Hebrew or Greek. */
  readonly headword: string | null;
  readonly gloss: string | null;
  readonly partOfSpeech: string | null;
}

/** Strong's number (`H0430`) to its word, for the numbers on a page. */
export type StudyWords = Readonly<Record<string, StudyWord>>;

export type StudyCategory =
  | "person"
  | "place"
  | "name"
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "particle"
  | "other";

/**
 * The translations whose Strong's tags line up with the original text word for word (the KJV
 * family: about nine tagged words in ten link to the exact Hebrew or Greek word). Other tagged
 * translations (the WEB editions, ASV, RV, DRA, MSB, NET, OEB) tag the wrong words often, so study
 * mode doesn't mark them.
 */
export const STUDY_SOURCES: ReadonlySet<string> = new Set(["eng-kjv", "eng-kjv2006"]);
