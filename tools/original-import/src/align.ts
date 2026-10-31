/**
 * How a published translation rendered the original words (domain-model §2.4
 * `TranslationAlignment`), derived from the Strong's tags in its verse text: each tagged English
 * word is linked to its lemma by Strong's number, and to the one token it renders where that
 * can be told. Translations without tags get no rows.
 */

import {
  type Database,
  lemma,
  token,
  translation,
  translationAlignment,
  verseText,
} from "@scripturetips/db";
import { eq, inArray } from "drizzle-orm";
import { parseStrong } from "./strong.ts";

export interface TaggedWord {
  /** Which of the verse's `w` nodes, counting every one from 0. */
  readonly position: number;
  /** Base Strong's numbers (`H0430`), a word may have more than one. */
  readonly strongs: readonly string[];
}

/** The verse markup's `w` words in order, with their Strong's numbers (none for an untagged one). */
export function taggedWords(content: unknown): { words: TaggedWord[]; unparsable: number } {
  const words: TaggedWord[] = [];
  let position = 0;
  let unparsable = 0;
  const walk = (nodes: unknown): void => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (typeof node !== "object" || node === null) continue;
      const n = node as {
        type?: string;
        marker?: string;
        attributes?: { strong?: string };
        content?: unknown;
      };
      if (n.type === "char" && n.marker === "w") {
        const raw = n.attributes?.strong;
        if (raw) {
          const found = (raw.match(/[HG]\d{1,4}[A-Za-z]?/gi) ?? []).flatMap((s) => {
            const parsed = parseStrong(s.toUpperCase());
            return parsed ? [parsed.base] : [];
          });
          if (found.length > 0) words.push({ position, strongs: [...new Set(found)] });
          else unparsable++;
        }
        position++;
      }
      walk(n.content);
    }
  };
  walk(content);
  return { words, unparsable };
}

export interface TokenRef {
  readonly id: string;
  /** The lemma's Strong's number. */
  readonly strong: string;
}

/**
 * Pairs a verse's tagged words with its tokens, by Strong's number: the k-th English word with a
 * number goes with the k-th token with it, where the verse has as many of each (or one of each);
 * otherwise only the lemma is known.
 */
export function pairWords(
  words: readonly TaggedWord[],
  tokens: readonly TokenRef[],
): Map<string, string | null> {
  const wordsByStrong = new Map<string, number[]>();
  for (const w of words)
    for (const s of w.strongs) wordsByStrong.set(s, [...(wordsByStrong.get(s) ?? []), w.position]);
  const tokensByStrong = new Map<string, string[]>();
  for (const t of tokens)
    tokensByStrong.set(t.strong, [...(tokensByStrong.get(t.strong) ?? []), t.id]);
  const out = new Map<string, string | null>();
  for (const [strong, positions] of wordsByStrong) {
    const ids = tokensByStrong.get(strong) ?? [];
    positions.forEach((position, k) => {
      out.set(`${position}:${strong}`, ids.length === positions.length ? (ids[k] ?? null) : null);
    });
  }
  return out;
}

export interface AlignReport {
  readonly translation: string;
  readonly verses: number;
  readonly taggedWords: number;
  readonly unparsable: number;
  readonly lemmaLinked: number;
  readonly tokenLinked: number;
}

const CHUNK = 2000;

/** Replaces a translation's alignment rows. */
export async function alignTranslation(db: Database, catalogId: string): Promise<AlignReport> {
  const [t] = await db
    .select({ id: translation.id })
    .from(translation)
    .where(eq(translation.catalogId, catalogId));
  if (!t) throw new Error(`${catalogId}: no such translation`);

  const lemmas = await db
    .select({ id: lemma.id, key: lemma.key, strong: lemma.strong })
    .from(lemma);
  const baseLemma = new Map(lemmas.filter((l) => l.key === l.strong).map((l) => [l.strong, l.id]));
  const strongOfLemma = new Map(lemmas.map((l) => [l.id, l.strong]));

  // Tokens by canonical verse, in reading order.
  const tokenRows = await db
    .select({
      id: token.id,
      lemmaId: token.lemmaId,
      canonical: token.canonical,
      chapter: token.chapter,
      verse: token.verse,
      position: token.position,
    })
    .from(token);
  const byVerse = new Map<string, { ref: TokenRef; order: [number, number, number] }[]>();
  for (const r of tokenRows) {
    const strong = r.lemmaId ? strongOfLemma.get(r.lemmaId) : undefined;
    if (!strong) continue;
    for (const c of r.canonical)
      byVerse.set(c, [
        ...(byVerse.get(c) ?? []),
        { ref: { id: r.id, strong }, order: [r.chapter, r.verse, r.position] },
      ]);
  }

  const verses = await db
    .select({ id: verseText.id, canonical: verseText.canonical, content: verseText.content })
    .from(verseText)
    .where(eq(verseText.translationId, t.id));

  await db
    .delete(translationAlignment)
    .where(
      inArray(
        translationAlignment.verseTextId,
        db.select({ id: verseText.id }).from(verseText).where(eq(verseText.translationId, t.id)),
      ),
    );

  let tagged = 0;
  let unparsable = 0;
  let lemmaLinked = 0;
  let tokenLinked = 0;
  const rows: (typeof translationAlignment.$inferInsert)[] = [];
  const flush = async () => {
    for (let i = 0; i < rows.length; i += CHUNK)
      await db.insert(translationAlignment).values(rows.slice(i, i + CHUNK));
    rows.length = 0;
  };
  for (const v of verses) {
    const { words, unparsable: bad } = taggedWords(v.content);
    unparsable += bad;
    if (words.length === 0) continue;
    const tokens = [...new Set(v.canonical)]
      .flatMap((c) => byVerse.get(c) ?? [])
      .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.order[2] - b.order[2])
      .map((x) => x.ref);
    const paired = pairWords(words, tokens);
    for (const w of words) {
      for (const strong of w.strongs) {
        const tokenId = paired.get(`${w.position}:${strong}`) ?? null;
        const lemmaId = baseLemma.get(strong) ?? null;
        tagged++;
        if (lemmaId) lemmaLinked++;
        if (tokenId) tokenLinked++;
        rows.push({ verseTextId: v.id, position: w.position, strong, lemmaId, tokenId });
      }
    }
    if (rows.length >= CHUNK * 5) await flush();
  }
  await flush();
  return {
    translation: catalogId,
    verses: verses.length,
    taggedWords: tagged,
    unparsable,
    lemmaLinked,
    tokenLinked,
  };
}
