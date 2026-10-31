/**
 * The kinds of word study mode tells apart (a small set, so each can look different on the
 * page). A lemma's category comes from what the sources say about it: STEPBible's part of speech
 * (`noun`, `conjunction` …) or the dictionary's own (`n-m`, `conj`), and whether it's a name.
 */

export const STUDY_CATEGORIES = [
  "person",
  "place",
  "name",
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "particle",
  "other",
] as const;

export type StudyCategory = (typeof STUDY_CATEGORIES)[number];

export interface CategoryInput {
  readonly partOfSpeech: string | null;
  readonly nameKind: "person" | "place" | "other" | null;
}

/** Strong's own abbreviations, and STEPBible's words, by the first word of the part of speech. */
const PARTS: ReadonlyArray<readonly [RegExp, StudyCategory]> = [
  [/^(conj|conjunction)\b/, "conjunction"],
  [/^(prep|preposition)\b/, "preposition"],
  [/pron|^dp\b|^pron/, "pronoun"],
  [/^(adv|adverb|d)\b/, "adverb"],
  [/^(adj|adjective|a)\b/, "adjective"],
  [/^(v|verb)\b/, "verb"],
  [/^(n|noun)\b|^n-/, "noun"],
  [/^(part|particle|inj|interjection|conditional|article|prt|aram|heb)\b/, "particle"],
];

/** A lemma's category: names first (a person or a place), then its part of speech. */
export function categoryOf({ partOfSpeech, nameKind }: CategoryInput): StudyCategory {
  if (nameKind === "person") return "person";
  if (nameKind === "place") return "place";
  const pos = (partOfSpeech ?? "").trim().toLowerCase();
  // A proper noun with no kind known (or a name like "LORD" that is neither) is just a name.
  if (nameKind === "other" || pos === "proper noun" || /^n-pr\b/.test(pos)) return "name";
  for (const [pattern, category] of PARTS) if (pattern.test(pos)) return category;
  return "other";
}
