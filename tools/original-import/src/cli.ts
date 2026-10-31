/**
 * Loads the original-language data into the database (DATABASE_URL):
 *
 *   node src/cli.ts load <source-texts folder>
 *   node src/cli.ts align [translation id …]
 *
 * `load` reads the dictionaries, TIPNR, TAHOT and TAGNT under the source-texts folder and
 * replaces what an earlier load put in the database. `align` then links each translation's
 * Strong's tags to the words and lemmas (all translations, or those named by catalog ID).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connect, databaseUrl, translation } from "@scripturetips/db";
import { alignTranslation } from "./align.ts";
import {
  parseAbbottSmith,
  parseBdb,
  parseLexicalIndex,
  parseStrongsGreek,
  parseStrongsHebrew,
} from "./dictionary.ts";
import { loadOriginal, type OriginalInputs } from "./load.ts";
import { parseTipnr } from "./names.ts";
import { type ParsedWords, parseTagnt, parseTahot } from "./words.ts";

const [command, ...args] = process.argv.slice(2);

function merge(parts: ParsedWords[]): ParsedWords {
  const skipped: Record<string, number> = {};
  for (const p of parts)
    for (const [k, v] of Object.entries(p.skipped)) skipped[k] = (skipped[k] ?? 0) + v;
  return {
    words: parts.flatMap((p) => p.words),
    skipped,
    problems: parts.flatMap((p) => p.problems),
  };
}

const { db, close } = connect(databaseUrl());
try {
  if (command === "load") {
    const root = args[0];
    if (!root) throw new Error("usage: load <source-texts folder>");
    const read = (path: string) => readFileSync(join(root, path), "utf8");
    const step = join("stepbible-data", "Translators Amalgamated OT+NT");
    const started = Date.now();
    const names = parseTipnr(
      read(
        "stepbible-data/Proper Nouns/TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt",
      ),
    );
    const input: OriginalInputs = {
      strongsHebrew: parseStrongsHebrew(read("open-scriptures-hebrew-lexicon/HebrewStrong.xml")),
      strongsGreek: parseStrongsGreek(read("strongs-greek/strongsgreek.xml")),
      bdb: parseBdb(read("open-scriptures-hebrew-lexicon/BrownDriverBriggs.xml")),
      bdbIndex: parseLexicalIndex(read("open-scriptures-hebrew-lexicon/LexicalIndex.xml")),
      abbott: parseAbbottSmith(read("abbott-smith/abbott-smith.tei.xml")),
      names: names.names,
      hebrew: merge(
        ["Gen-Deu", "Jos-Est", "Job-Sng", "Isa-Mal"].map((part) =>
          parseTahot(
            read(
              `${step}/TAHOT ${part} - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`,
            ),
          ),
        ),
      ),
      greek: merge(
        ["Mat-Jhn", "Act-Rev"].map((part) =>
          parseTagnt(
            read(
              `${step}/TAGNT ${part} - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`,
            ),
          ),
        ),
      ),
    };
    console.log(
      `read: ${input.strongsHebrew.length} Hebrew and ${input.strongsGreek.length} Greek Strong's entries, ${input.bdb.length} BDB, ${input.abbott.entries.length} Abbott-Smith, ${names.names.length} names (${names.skipped} excluded), ${input.hebrew.words.length} Hebrew and ${input.greek.words.length} Greek words`,
    );
    console.log(
      "left out:",
      JSON.stringify({ hebrew: input.hebrew.skipped, greek: input.greek.skipped }),
    );
    const report = await loadOriginal(db, input);
    console.log(JSON.stringify(report, null, 2));
    console.log(`loaded in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  } else if (command === "align") {
    const ids =
      args.length > 0
        ? args
        : (await db.select({ id: translation.catalogId }).from(translation)).map((r) => r.id);
    for (const id of ids) {
      const started = Date.now();
      const r = await alignTranslation(db, id);
      console.log(
        `${id}: ${r.verses} verses, ${r.taggedWords} tagged words, ${r.lemmaLinked} linked to a lemma, ${r.tokenLinked} to a word, ${r.unparsable} untagged or unreadable numbers, ${((Date.now() - started) / 1000).toFixed(1)} s`,
      );
    }
  } else {
    console.log("usage: node src/cli.ts load <source-texts folder> | align [translation id …]");
    process.exitCode = 1;
  }
} finally {
  await close();
}
