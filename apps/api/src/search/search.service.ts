import { Inject, Injectable } from "@nestjs/common";
import { and, type Database as Db, inArray, isNull, lemma, sql } from "@scripturetips/db";
import { BOOKS } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";
import { editableText } from "../compilations/wording.ts";
import { DATABASE } from "../database.ts";
import { categoryOf, type StudyCategory } from "../study/categories.ts";
import { TranslationsService } from "../translations/translations.service.ts";
import {
  escapeRegex,
  FOLDED_MARKS,
  fold,
  HIT_CLOSE,
  HIT_OPEN,
  type SearchKind,
  type SnippetPart,
  snippetOf,
  strongOf,
} from "./query.ts";

export interface SearchParams {
  readonly q: string;
  readonly kinds: ReadonlySet<SearchKind>;
  /** The translations to search (catalog IDs); null for every one. */
  readonly translations: readonly string[] | null;
  /** The most results of each kind. */
  readonly limit: number;
}

/** A passage the query names ("jn 3 16"), in the first translation searched. */
export interface ReferenceResult {
  readonly kind: "reference";
  readonly id: string;
  /** "John 3:16". */
  readonly label: string;
  /** As written, in the translation's numbering (OSIS). */
  readonly reference: string;
  readonly translation: { readonly id: string; readonly abbreviation: string };
  /** The start of the passage, as plain text. */
  readonly preview: string;
}

/** A verse whose words match, with the matched words flagged. */
export interface TextResult {
  readonly kind: "text";
  readonly id: string;
  readonly label: string;
  /** The verse in its translation's numbering (OSIS): `John.3.16`. */
  readonly reference: string;
  readonly translation: { readonly id: string; readonly abbreviation: string };
  readonly snippet: readonly SnippetPart[];
}

/** A Hebrew or Greek word (a lemma) the query is, or whose gloss or form it matches. */
export interface OriginalResult {
  readonly kind: "original";
  readonly id: string;
  /** `H0430`. */
  readonly strong: string;
  readonly headword: string | null;
  readonly transliteration: string | null;
  readonly gloss: string | null;
  readonly partOfSpeech: string | null;
  readonly category: StudyCategory;
  /** How often it occurs in the original text. */
  readonly occurrences: number;
}

export type SearchResult = ReferenceResult | TextResult | OriginalResult;

export interface SearchResponse {
  readonly query: string;
  readonly results: SearchResult[];
  /** Kinds asked for that this engine doesn't search (yet). */
  readonly unavailable: string[];
  readonly tookMs: number;
}

export interface Suggestion {
  /** A book to start a reference with, or a word from the dictionaries. */
  readonly kind: "book" | "word";
  readonly text: string;
}

/** How ts_headline marks a match: brackets that don't occur in scripture. */
const HEADLINE = `StartSel=${HIT_OPEN}, StopSel=${HIT_CLOSE}, MaxFragments=1, MaxWords=32, MinWords=14, ShortWord=2`;

const clip = (text: string, length: number) =>
  text.length > length ? `${text.slice(0, length).replace(/\s+\S*$/, "")}…` : text;

const list = (values: readonly string[]) =>
  sql.join(
    values.map((v) => sql`${v}`),
    sql`, `,
  );

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE) private readonly db: Db,
    @Inject(TranslationsService) private readonly translations: TranslationsService,
  ) {}

  async search(params: SearchParams): Promise<SearchResponse> {
    const started = Date.now();
    const results: SearchResult[] = [];
    // Each kind is searched at once; the answer lists reference, original, then text.
    const [reference, original, text] = await Promise.all([
      params.kinds.has("reference") ? this.reference(params) : [],
      params.kinds.has("original") ? this.original(params) : [],
      params.kinds.has("text") ? this.text(params) : [],
    ]);
    results.push(...reference, ...original, ...text);
    return { query: params.q, results, unavailable: [], tookMs: Date.now() - started };
  }

  /** The passage the query names, if it names one, in the first translation searched. */
  private async reference({ q, translations }: SearchParams): Promise<ReferenceResult[]> {
    const id = translations?.[0] ?? (await this.translations.list())[0]?.id;
    if (!id) return [];
    const found = await this.translations.passage(id, q);
    if (!found.ok) return [];
    return found.passages.map((p) => ({
      kind: "reference",
      id: `reference:${id}:${p.entered}`,
      label: p.label,
      reference: p.entered,
      translation: { id, abbreviation: found.translation.abbreviation },
      preview: clip(
        editableText((p.verses[0]?.content ?? []) as never).replace(/\u00b6\s*/g, ""),
        160,
      ),
    }));
  }

  /** Verses whose words match, stemmed ("forgiven" finds "forgive"); "quoted phrases" stay together. */
  private async text({ q, translations, limit }: SearchParams): Promise<TextResult[]> {
    if (translations?.length === 0) return [];
    const scope = translations ? sql`and t.catalog_id in (${list(translations)})` : sql``;
    const rows = await this.db.execute<{
      translation: string;
      abbreviation: string;
      book: string;
      chapter: number;
      verse: number;
      headline: string;
    }>(sql`
      with q as (select websearch_to_tsquery('english', ${q}) as tsq)
      select t.catalog_id as translation, t.abbreviation, v.book, v.chapter, v.verse,
             ts_headline('english', v.plain, q.tsq, ${HEADLINE}) as headline
      from verse_text v
      join translation t on t.id = v.translation_id
      cross join q
      where v.search @@ q.tsq ${scope}
      order by ts_rank_cd(v.search, q.tsq) desc, t.catalog_id, v.chapter, v.verse
      limit ${limit}`);
    return rows.map((r) => ({
      kind: "text",
      id: `text:${r.translation}:${r.book}.${r.chapter}.${r.verse}`,
      label: `${english.name(r.book, "full", "one")} ${r.chapter}:${r.verse}`,
      reference: `${r.book}.${r.chapter}.${r.verse}`,
      translation: { id: r.translation, abbreviation: r.abbreviation },
      snippet: snippetOf(r.headline),
    }));
  }

  /**
   * Hebrew and Greek words: by Strong's number (`H430`), by English gloss (whole words), or by
   * their own form, with or without vowel points and accents.
   */
  private async original({ q, limit }: SearchParams): Promise<OriginalResult[]> {
    const strong = strongOf(q);
    const found = await this.db.execute<{
      id: string;
      strong: string;
      headword: string | null;
      transliteration: string | null;
      gloss: string | null;
      part_of_speech: string | null;
      name_kind: "person" | "place" | "other" | null;
    }>(
      strong
        ? sql`
          select id, strong, headword, transliteration, gloss, part_of_speech, name_kind
          from lemma where base_lemma_id is null and strong = ${strong.base}
          limit ${limit}`
        : sql`
          select id, strong, headword, transliteration, gloss, part_of_speech, name_kind
          from lemma
          where base_lemma_id is null and (
            lower(gloss) = lower(${q})
            or gloss ~* ${`\\m${escapeRegex(q.trim())}\\M`}
            or lower(regexp_replace(normalize(headword, NFD), ${FOLDED_MARKS}, '', 'g')) = ${fold(q)}
          )
          order by (lower(gloss) = lower(${q})) desc nulls last, strong
          limit ${limit * 4}`,
    );
    if (found.length === 0) return [];
    const counts = await this.db.execute<{ base: string; n: number }>(sql`
      select coalesce(l.base_lemma_id, l.id) as base, count(*)::int as n
      from token t join lemma l on l.id = t.lemma_id
      where coalesce(l.base_lemma_id, l.id) in (${list(found.map((r) => r.id))})
      group by 1`);
    const used = new Map(counts.map((c) => [c.base, c.n]));
    return (
      found
        .map((r, order) => ({ r, order }))
        // The exact matches stay first; commoner words come before rarer ones.
        .sort(
          (a, b) =>
            (strong ? 0 : a.order - b.order) || (used.get(b.r.id) ?? 0) - (used.get(a.r.id) ?? 0),
        )
        .slice(0, limit)
        .map(({ r }) => ({
          kind: "original",
          id: `original:${r.strong}`,
          strong: r.strong,
          headword: r.headword,
          transliteration: r.transliteration,
          gloss: r.gloss,
          partOfSpeech: r.part_of_speech,
          category: categoryOf({ partOfSpeech: r.part_of_speech, nameKind: r.name_kind }),
          occurrences: used.get(r.id) ?? 0,
        }))
    );
  }

  /** What the typed text could become: a book to start a reference with, or a word. */
  async suggest(
    text: string,
    kinds: ReadonlySet<SearchKind>,
    limit: number,
  ): Promise<Suggestion[]> {
    const typed = text.trim();
    if (typed.length === 0) return [];
    const suggestions: Suggestion[] = [];
    if (kinds.has("reference") && !/\d/.test(typed)) {
      const start = fold(typed);
      for (const b of BOOKS) {
        const name = english.name(b.osis, "full", "several");
        if (fold(name).startsWith(start)) suggestions.push({ kind: "book", text: name });
      }
    }
    if (kinds.has("original") && suggestions.length < limit) {
      const words = await this.db
        .selectDistinct({ gloss: lemma.gloss })
        .from(lemma)
        .where(
          and(
            isNull(lemma.baseLemmaId),
            sql`lower(${lemma.gloss}) like ${`${typed.toLowerCase()}%`}`,
          ),
        )
        .orderBy(lemma.gloss)
        .limit(limit);
      for (const w of words) if (w.gloss) suggestions.push({ kind: "word", text: w.gloss });
    }
    return suggestions.slice(0, limit);
  }
}
