# @scripturetips/original-import

Loads the original-language data (domain-model §2.4) into the database (packages/db): lexicons, lemmas, proper names, every Hebrew and Greek word, and the alignment of each translation's Strong's tags with them. Runs by hand when a source changes, not in the app.

```bash
./toolbox pnpm --filter @scripturetips/db migrate
./toolbox pnpm --filter @scripturetips/original-import run load /source-texts
./toolbox pnpm --filter @scripturetips/original-import run align            # every translation
./toolbox pnpm --filter @scripturetips/original-import run align eng-kjv    # or by catalog ID
```

- **`load`** reads the sources under `../source-texts/` (evidence in `docs/license-evidence/`) and **replaces** everything an earlier load put there: `lexicon`, `lexicon_entry`, `lemma`, `proper_name`, `source_text`, `token`, and the alignment (which hangs from lemmas and tokens, so run `align` again after). It takes about two minutes. It prints what it read, what it left out, and notes worth a look (entries that couldn't be linked, rows that couldn't be read); the same counts for each text are in `source_text.report`.
- **`align`** derives `translation_alignment` from the Strong's tags in each translation's verse text (`w` nodes with a `strong` attribute): each tagged word gets its lemma, and its token where the verse has as many words with that number as the English has (the k-th with the k-th), otherwise only the lemma. It replaces a translation's rows. Reloading a translation with `tools/scripture-import` deletes its rows too (cascade).

## The data

| Source | Becomes | Notes |
|---|---|---|
| STEPBible TAHOT (Hebrew OT) | `token` (305,630 words), `lemma` | Leningrad text following the Qere; variant readings aren't loaded. Hebrew numbering, placed through the `hebrew` scheme. Prefixes and suffixes are `token.affixes`; `lemma` is the root. |
| STEPBible TAGNT (Greek NT) | `token`, `lemma` | Only words in the SBLGNT, Byzantine or Textus Receptus (`token.editions`). The Spanish and sub-meaning columns are never read (sources.md §6). Placed through the `kjv` scheme. |
| STEPBible TIPNR | `proper_name` | One row per individual; descriptions were written by an AI (`ai_generated`). A Hebrew token names its individual through TAHOT's own tag (`token.proper_name_id`). |
| Strong's Hebrew, Strong's Greek | `lemma` (base), `lexicon_entry` | The part of speech `n-pr-m`/`n-pr-loc` gives a name's kind. |
| Brown-Driver-Briggs | `lexicon_entry` | Through the lexical index: only entries with a Strong's number. Plain text. |
| Abbott-Smith | `lexicon_entry` | Entries with a Strong's number (`G…`). Plain text. |

- **Lemmas.** A Strong's number (`H0430`) has a *base lemma* (the one lexicon entries hang from); STEPBible's extended number (`H0430G`, which tells apart words sharing one) is an *extended lemma* pointing to it by `base_lemma_id`. `lemma.key` is the extended number, or the base one. Numbers are padded to four digits everywhere, as the tags in the verse text are (`strong.ts`).
- **Left out, reported.** `source_text.report` and the load's output list rows not loaded and why: variant readings, empty Qere slots (the source's "no word here"), TAGNT words outside the three editions, and rows with an unreadable number (the source's own typos, `G20447`, `G20833`: sources.md §8).
- **No XML dependency.** `xml.ts` is a small reader for the four lexicon files; STEPBible's files are tab-separated.
- **Licenses.** `stepbible-data` and `oshb-lexicon` are in `packages/licenses` with the credit CC BY requires (shown on the credits page); the two public-domain dictionaries use `public-domain`. STEPBible asks that we load their data and link back, not republish the files: they stay outside git.
- **Not loaded yet:** the morphology code expansions (TEHMC and TEGMC are obtained), TAHOT's variant readings (the `Variant` entity), and the Hebrew letter forms.

Run the tests: `./toolbox pnpm --filter @scripturetips/original-import test` (parsers on real rows; `load.test.ts` and the alignment on the test database).
