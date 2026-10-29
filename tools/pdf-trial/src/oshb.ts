/**
 * Hebrew words for the trial's interlinear page: the Open Scriptures Hebrew Bible's OSIS text
 * (docs/license-evidence/open-scriptures-hebrew-bible), glossed from Strong's dictionary
 * (open-scriptures-hebrew-lexicon). The Hebrew is kept exactly as the file has it, without
 * normalization, which the Ezra SIL font needs.
 */

import { readFileSync } from "node:fs";
import type { InterlinearVerse } from "./book.ts";

const SOURCES = process.env["SOURCE_TEXTS"] ?? "/source-texts";

/** OSHB's prefix letters in a lemma ("b/7225"), glossed. */
const PREFIXES: Readonly<Record<string, string>> = {
  b: "in",
  c: "and",
  d: "the",
  k: "like",
  l: "to",
  m: "from",
  s: "that",
  i: "?",
};

let glosses: Map<string, string> | undefined;

/** A short gloss for each Strong's number: the first word its definition marks. */
function strongs(): Map<string, string> {
  if (glosses) return glosses;
  glosses = new Map();
  const xml = readFileSync(`${SOURCES}/open-scriptures-hebrew-lexicon/HebrewStrong.xml`, "utf8");
  for (const m of xml.matchAll(/<entry id="H(\d+)">([\s\S]*?)<\/entry>/g)) {
    const def = m[2]?.match(/<def>([^<]+)<\/def>/)?.[1];
    if (def && m[1]) glosses.set(m[1], def.trim());
  }
  return glosses;
}

export function interlinear(
  book: string,
  chapter: number,
  from: number,
  to: number,
): InterlinearVerse[] {
  const xml = readFileSync(`${SOURCES}/open-scriptures-hebrew-bible/${book}.xml`, "utf8");
  const verses: InterlinearVerse[] = [];
  for (let v = from; v <= to; v++) {
    const body = xml.match(
      new RegExp(`<verse osisID="${book}\\.${chapter}\\.${v}">([\\s\\S]*?)</verse>`),
    )?.[1];
    if (!body) throw new Error(`${book} ${chapter}:${v} not found`);
    const words = [...body.matchAll(/<w lemma="([^"]+)"[^>]*>([^<]+)<\/w>/g)].map((m) => {
      const parts = (m[1] ?? "").split("/");
      const strong = (parts.at(-1) ?? "").replace(/\D/g, "");
      const prefixes = parts.slice(0, -1).map((p) => PREFIXES[p] ?? p);
      return {
        hebrew: (m[2] ?? "").replaceAll("/", ""),
        gloss: [...prefixes, strongs().get(strong) ?? "?"].join(" "),
        strong: `H${strong}`,
      };
    });
    verses.push({ ref: `${chapter}:${v}`, words });
  }
  return verses;
}
