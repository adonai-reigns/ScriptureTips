/**
 * Loads the original-language data (domain-model §2.4) into the database: lexicons and their
 * entries, lemmas, proper names, and the Hebrew and Greek words. A load replaces what an earlier
 * one put there, the alignment included. The alignment with the translations' Strong's tags is
 * a separate step (align.ts), to run after.
 */

import {
  type Database,
  lemma,
  lexicon,
  lexiconEntry,
  properName,
  sourceText,
  token,
  translationAlignment,
} from "@scripturetips/db";
import { sql } from "drizzle-orm";
import { placer } from "./canonical.ts";
import type { AbbottEntry, BdbEntry, DictionaryEntry } from "./dictionary.ts";
import type { ProperNameRecord } from "./names.ts";
import type { OriginalWord, ParsedWords } from "./words.ts";

export interface OriginalInputs {
  readonly strongsHebrew: readonly DictionaryEntry[];
  readonly strongsGreek: readonly DictionaryEntry[];
  readonly bdb: readonly BdbEntry[];
  readonly bdbIndex: ReadonlyMap<string, readonly string[]>;
  readonly abbott: { readonly entries: readonly AbbottEntry[]; readonly unlinked: number };
  readonly names: readonly ProperNameRecord[];
  readonly hebrew: ParsedWords;
  readonly greek: ParsedWords;
}

export interface LoadReport {
  readonly lemmas: number;
  readonly lexiconEntries: Readonly<Record<string, number>>;
  readonly properNames: number;
  readonly tokens: Readonly<Record<string, number>>;
  /** Things worth a look: dictionary entries that couldn't be linked, and so on. */
  readonly notes: readonly string[];
}

const CHUNK = 1000;
function* chunks<T>(list: readonly T[], size = CHUNK): Generator<T[]> {
  for (let i = 0; i < list.length; i += size) yield list.slice(i, i + size);
}

type LemmaRow = typeof lemma.$inferInsert;

/** Strong's Hebrew parts of speech that name a person or a place (`n-pr-m`, `n-pr-loc`). */
function nameKindOf(pos: string | undefined): "person" | "place" | undefined {
  if (!pos) return undefined;
  if (pos.startsWith("n-pr-loc")) return "place";
  if (/^n-pr-[mf]/.test(pos)) return "person";
  return undefined;
}

export async function loadOriginal(db: Database, input: OriginalInputs): Promise<LoadReport> {
  const notes: string[] = [];
  return db.transaction(async (tx) => {
    // ---- Lexicons.
    const lexicons = [
      {
        catalogId: "strongs-hebrew",
        name: "Strong's Hebrew Dictionary",
        author: "James Strong",
        year: 1890,
        language: "heb" as const,
        licenseKey: "oshb-lexicon",
      },
      {
        catalogId: "strongs-greek",
        name: "Strong's Greek Dictionary",
        author: "James Strong",
        year: 1890,
        language: "grc" as const,
        licenseKey: "public-domain",
      },
      {
        catalogId: "bdb",
        name: "Brown-Driver-Briggs Hebrew and English Lexicon",
        author: "Francis Brown, S. R. Driver and Charles A. Briggs",
        year: 1906,
        language: "heb" as const,
        licenseKey: "oshb-lexicon",
      },
      {
        catalogId: "abbott-smith",
        name: "A Manual Greek Lexicon of the New Testament",
        author: "George Abbott-Smith",
        year: 1922,
        language: "grc" as const,
        licenseKey: "public-domain",
      },
    ];
    const lexiconId = new Map<string, string>();
    for (const l of lexicons) {
      const values = { ...l, report: {} };
      const [row] = await tx
        .insert(lexicon)
        .values(values)
        .onConflictDoUpdate({
          target: lexicon.catalogId,
          set: { ...values, importedAt: new Date() },
        })
        .returning({ id: lexicon.id });
      if (!row) throw new Error(`${l.catalogId}: no lexicon row`);
      lexiconId.set(l.catalogId, row.id);
    }
    // A load replaces everything an earlier one put there, so nothing stale is left (a lemma
    // whose number changed, a name no longer in TIPNR). The alignment hangs from the lemmas and
    // tokens, so it goes too, and is made again by `align`.
    await tx.delete(translationAlignment);
    await tx.delete(token);
    await tx.delete(lexiconEntry);
    await tx.delete(lemma);
    await tx.delete(properName);

    // ---- Proper names (before lemmas, which may point at one).
    const nameIds = new Map<string, string>();
    for (const part of chunks(input.names)) {
      const rows = await tx
        .insert(properName)
        .values(
          part.map((n) => ({
            tipnrId: n.tipnrId,
            name: n.name,
            kind: n.kind,
            strongs: [...n.strongs],
            description: n.description ?? null,
            summary: n.summary ?? null,
            details: n.details,
            aiGenerated: true,
          })),
        )
        .onConflictDoUpdate({
          target: properName.tipnrId,
          set: {
            name: sqlExcluded("name"),
            kind: sqlExcluded("kind"),
            strongs: sqlExcluded("strongs"),
            description: sqlExcluded("description"),
            summary: sqlExcluded("summary"),
            details: sqlExcluded("details"),
          },
        })
        .returning({ id: properName.id, tipnrId: properName.tipnrId });
      for (const r of rows) nameIds.set(r.tipnrId, r.id);
    }

    // ---- Lemmas: one base lemma per Strong's number, then the extended ones under them.
    const words: readonly OriginalWord[] = [...input.hebrew.words, ...input.greek.words];
    const base = new Map<string, LemmaRow>();
    const dictionary = [...input.strongsHebrew, ...input.strongsGreek];
    for (const e of dictionary) {
      const kind = nameKindOf(e.partOfSpeech);
      base.set(e.strong, {
        language: e.language,
        strong: e.strong,
        key: e.strong,
        headword: e.headword,
        transliteration: e.transliteration ?? null,
        partOfSpeech: e.partOfSpeech ?? null,
        nameKind: kind ?? null,
      });
    }
    const extended = new Map<string, LemmaRow>();
    for (const w of words) {
      // What the words say about their lemma, for numbers and variants the dictionaries lack.
      const row: LemmaRow = {
        language: w.language,
        strong: w.lemmaBase,
        key: w.lemmaKey,
        headword: w.headword || null,
        partOfSpeech: w.partOfSpeech || null,
        gloss: w.lemmaGloss || null,
        nameKind: w.nameKind ?? null,
      };
      if (w.lemmaKey === w.lemmaBase) {
        const known = base.get(w.lemmaBase);
        base.set(w.lemmaBase, {
          ...row,
          ...known,
          gloss: known?.gloss ?? row.gloss ?? null,
          partOfSpeech: row.partOfSpeech ?? known?.partOfSpeech ?? null,
          nameKind: known?.nameKind ?? row.nameKind ?? null,
        });
      } else if (!extended.has(w.lemmaKey)) {
        extended.set(w.lemmaKey, { ...row, extendedStrong: w.lemmaKey });
        if (!base.has(w.lemmaBase))
          base.set(w.lemmaBase, { ...row, key: w.lemmaBase, extendedStrong: null });
      }
    }
    // A base lemma takes its gloss and part of speech from its first variant if it has none.
    for (const e of extended.values()) {
      const b = base.get(e.strong);
      if (b) {
        base.set(e.strong, {
          ...b,
          gloss: b.gloss ?? e.gloss ?? null,
          partOfSpeech: b.partOfSpeech ?? e.partOfSpeech ?? null,
        });
      }
    }

    // Which names a lemma could be, by its number: a lemma is linked to a name only if
    // exactly one name has that number, and takes its kind from the names that have it.
    const byNumber = new Map<string, ProperNameRecord[]>();
    for (const n of input.names)
      for (const s of n.strongs) byNumber.set(s, [...(byNumber.get(s) ?? []), n]);
    const withName = (row: LemmaRow): LemmaRow => {
      const matching = byNumber.get(row.key) ?? [];
      const only = matching.length === 1 ? matching[0] : undefined;
      const kinds = new Set(matching.map((n) => n.kind));
      const kind =
        kinds.size === 1 && matching[0]
          ? matching[0].kind === "person"
            ? "person"
            : matching[0].kind === "place"
              ? "place"
              : "other"
          : undefined;
      return {
        ...row,
        properNameId: only ? (nameIds.get(only.tipnrId) ?? null) : null,
        nameKind: kind ?? row.nameKind ?? null,
      };
    };

    const lemmaId = new Map<string, string>();
    const insertLemmas = async (rows: LemmaRow[]) => {
      for (const part of chunks(rows)) {
        const out = await tx
          .insert(lemma)
          .values(part)
          .onConflictDoUpdate({
            target: lemma.key,
            set: {
              language: sqlExcluded("language"),
              strong: sqlExcluded("strong"),
              extendedStrong: sqlExcluded("extended_strong"),
              baseLemmaId: sqlExcluded("base_lemma_id"),
              headword: sqlExcluded("headword"),
              transliteration: sqlExcluded("transliteration"),
              partOfSpeech: sqlExcluded("part_of_speech"),
              nameKind: sqlExcluded("name_kind"),
              properNameId: sqlExcluded("proper_name_id"),
              gloss: sqlExcluded("gloss"),
            },
          })
          .returning({ id: lemma.id, key: lemma.key });
        for (const r of out) lemmaId.set(r.key, r.id);
      }
    };
    await insertLemmas([...base.values()].map(withName));
    await insertLemmas(
      [...extended.values()].map((e) => ({
        ...withName(e),
        baseLemmaId: lemmaId.get(e.strong) ?? null,
      })),
    );

    // ---- Lexicon entries, hung from the base lemma of their Strong's number.
    const entryCounts: Record<string, number> = {};
    const insertEntries = async (
      catalogId: string,
      rows: { strong: string; entryRef: string; headword: string; body: Record<string, unknown> }[],
    ) => {
      const id = lexiconId.get(catalogId);
      if (!id) throw new Error(`${catalogId}: no lexicon`);
      const linked = rows.flatMap((r) => {
        const lemmaRowId = lemmaId.get(r.strong);
        return lemmaRowId ? [{ ...r, lemmaRowId }] : [];
      });
      if (linked.length < rows.length)
        notes.push(
          `${catalogId}: ${rows.length - linked.length} entries' Strong's numbers have no lemma`,
        );
      for (const part of chunks(linked)) {
        await tx
          .insert(lexiconEntry)
          .values(
            part.map((r) => ({
              lexiconId: id,
              lemmaId: r.lemmaRowId,
              entryRef: r.entryRef,
              headword: r.headword,
              body: r.body,
            })),
          )
          .onConflictDoNothing();
      }
      entryCounts[catalogId] = linked.length;
    };
    await insertEntries(
      "strongs-hebrew",
      input.strongsHebrew.map((e) => ({
        strong: e.strong,
        entryRef: "",
        headword: e.headword,
        body: e.body,
      })),
    );
    await insertEntries(
      "strongs-greek",
      input.strongsGreek.map((e) => ({
        strong: e.strong,
        entryRef: "",
        headword: e.headword,
        body: e.body,
      })),
    );
    const bdbById = new Map(input.bdb.map((e) => [e.id, e]));
    const bdbRows = [...input.bdbIndex].flatMap(([strong, ids]) =>
      ids.flatMap((id) => {
        const e = bdbById.get(id);
        return e
          ? [
              {
                strong,
                entryRef: e.id,
                headword: e.headword,
                body: {
                  text: e.text,
                  definitions: e.definitions,
                  ...(e.partOfSpeech ? { partOfSpeech: e.partOfSpeech } : {}),
                },
              },
            ]
          : [];
      }),
    );
    await insertEntries("bdb", bdbRows);
    notes.push(
      `bdb: ${input.bdb.length - new Set(bdbRows.map((r) => r.entryRef)).size} of ${input.bdb.length} entries have no Strong's number in the lexical index, so no lemma`,
    );
    await insertEntries(
      "abbott-smith",
      input.abbott.entries.map((e) => ({
        strong: e.strong,
        entryRef: e.headword,
        headword: e.headword,
        body: { text: e.text, glosses: e.glosses },
      })),
    );
    if (input.abbott.unlinked > 0)
      notes.push(`abbott-smith: ${input.abbott.unlinked} entries have no Strong's number`);

    // ---- Tokens.
    const tokenCounts: Record<string, number> = {};
    const sources = [
      {
        catalogId: "tahot",
        name: "Translators Amalgamated Hebrew OT (TAHOT)",
        language: "heb" as const,
        tradition: "Masoretic: the Leningrad codex, following the Qere",
        licenseKey: "stepbible-data",
        scheme: "hebrew" as const,
        parsed: input.hebrew,
      },
      {
        catalogId: "tagnt",
        name: "Translators Amalgamated Greek NT (TAGNT)",
        language: "grc" as const,
        tradition: "Textus Receptus, critical and Byzantine (words in the SBLGNT, TR or Byzantine)",
        licenseKey: "stepbible-data",
        scheme: "kjv" as const,
        parsed: input.greek,
      },
    ];
    for (const s of sources) {
      const values = {
        catalogId: s.catalogId,
        name: s.name,
        language: s.language,
        tradition: s.tradition,
        licenseKey: s.licenseKey,
        report: {
          words: s.parsed.words.length,
          skipped: s.parsed.skipped,
          problems: s.parsed.problems,
        },
      };
      const [row] = await tx
        .insert(sourceText)
        .values(values)
        .onConflictDoUpdate({
          target: sourceText.catalogId,
          set: { ...values, importedAt: new Date() },
        })
        .returning({ id: sourceText.id });
      if (!row) throw new Error(`${s.catalogId}: no source text row`);
      const place = placer(s.scheme);
      let count = 0;
      for (const part of chunks(s.parsed.words)) {
        await tx.insert(token).values(
          part.map((w) => {
            const placed = place(w.book, w.chapter, w.verse);
            return {
              sourceTextId: row.id,
              book: w.book,
              chapter: w.chapter,
              verse: w.verse,
              position: w.position,
              reading: w.reading,
              surface: w.surface,
              transliteration: w.transliteration || null,
              lemmaId: lemmaId.get(w.lemmaKey) ?? null,
              properNameId: w.properName ? (nameIds.get(w.properName) ?? null) : null,
              affixes: w.affixes.length > 0 ? w.affixes : null,
              morphology: w.morphology,
              gloss: w.gloss || null,
              editions: w.editions ? [...w.editions] : null,
              canonical: placed.canonical,
              canonicalRange: placed.range,
            };
          }),
        );
        count += part.length;
      }
      tokenCounts[s.catalogId] = count;
      if (s.parsed.problems.length > 0)
        notes.push(`${s.catalogId}: ${s.parsed.problems.length} rows couldn't be read`);
    }

    return {
      lemmas: lemmaId.size,
      lexiconEntries: entryCounts,
      properNames: nameIds.size,
      tokens: tokenCounts,
      notes,
    };
  });
}

/** `excluded.<column>`: the value an insert tried to write, for `on conflict do update`. */
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}
