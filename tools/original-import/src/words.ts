/**
 * The original-language words (domain-model §2.4 `Token`) as the import reads them from
 * STEPBible's TAHOT (Hebrew Old Testament) and TAGNT (Greek New Testament): one record per
 * word, with its lemma (root), prefixes and suffixes, morphology and gloss.
 *
 * Both files list each verse as a header block, then a table of words (`Gen.1.1#01=L`); only the
 * table rows are read. TAHOT follows the Leningrad codex and the Qere; its variant readings
 * (the Ketiv, other manuscripts) are rows the import leaves out. TAGNT's Spanish translation
 * and sub-meanings are never read (sources.md §6), and a word that is in none of the
 * SBLGNT, Byzantine or Textus Receptus is left out.
 */

import { osisBook, parseStrong } from "./strong.ts";

export interface Affix {
  /** STEPBible's number for the morpheme (`H9003`, the prefix "in"). */
  readonly strong: string;
  readonly form: string;
  readonly gloss: string;
  readonly role: "prefix" | "suffix";
}

export interface OriginalWord {
  /** OSIS book ID. */
  readonly book: string;
  /** The source's own numbering: Hebrew for the Old Testament, English for the New. */
  readonly chapter: number;
  readonly verse: number;
  readonly position: number;
  /** `L`, `Q`, `R`, `X` (Hebrew) or `NKO`, `N(k)O` … (Greek). */
  readonly reading: string;
  readonly surface: string;
  readonly transliteration: string;
  /** The word's English gloss in context, as the source gives it. */
  readonly gloss: string;
  readonly language: "heb" | "arc" | "grc";
  /** The root's number: `H7225G` (extended) or `H0430` (base). */
  readonly lemmaKey: string;
  readonly lemmaBase: string;
  readonly headword: string;
  readonly lemmaGloss: string;
  readonly partOfSpeech: string;
  readonly nameKind?: "person" | "place" | "other";
  /** TIPNR's unified name for a Hebrew name (`Abraham@Gen.11.26-1Pe`). */
  readonly properName?: string;
  readonly affixes: readonly Affix[];
  /** The source's morphology code, e.g. `HR/Ncfsa` or `N-NSF`. */
  readonly morphology: string;
  readonly editions?: readonly string[];
}

export interface ParsedWords {
  readonly words: OriginalWord[];
  /** Rows left out, by why: `variant reading`, `not in SBL, Byzantine or TR` … */
  readonly skipped: Readonly<Record<string, number>>;
  /** Rows that couldn't be read at all. */
  readonly problems: readonly string[];
}

const REF = /^([A-Za-z0-9]{3})\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?#(\d+)=(\S+)$/;

const HEBREW_POS: Readonly<Record<string, string>> = {
  N: "noun",
  V: "verb",
  A: "adjective",
  R: "preposition",
  C: "conjunction",
  D: "adverb",
  T: "particle",
  P: "pronoun",
  S: "suffix",
};
const GREEK_POS: Readonly<Record<string, string>> = {
  N: "noun",
  V: "verb",
  A: "adjective",
  T: "article",
  P: "personal pronoun",
  R: "relative pronoun",
  D: "demonstrative pronoun",
  C: "reciprocal pronoun",
  K: "correlative pronoun",
  I: "interrogative pronoun",
  X: "indefinite pronoun",
  F: "reflexive pronoun",
  S: "possessive pronoun",
  Q: "correlative or interrogative pronoun",
  ADV: "adverb",
  CONJ: "conjunction",
  COND: "conditional",
  PRT: "particle",
  PREP: "preposition",
  INJ: "interjection",
  ARAM: "Aramaic transliteration",
  HEB: "Hebrew transliteration",
  N_PRT: "particle",
};

/** The expanded tag of a morpheme: `{H7225G=רֵאשִׁית=: beginning»first:1_beginning}`. */
const TAG = /^\{?([HG]\d{4}[A-Za-z]?)=([^=]*)=([\s\S]*?)\}?$/;

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** The part of a gloss before the sub-meaning (`: beginning»first:1_beginning` → `beginning`). */
const briefGloss = (gloss: string): string =>
  (gloss.split("»")[0] ?? "").replace(/^:\s*/, "").replace(/_/g, " ").trim();

/** The unified TIPNR name in a tag's gloss (`Abram»Abraham@Gen.11.26-1Pe` → `Abraham@…`). */
function nameIn(gloss: string): string | undefined {
  const at = gloss.indexOf("@");
  if (at === -1) return undefined;
  const afterArrow = gloss.slice(gloss.indexOf("»") + 1);
  return afterArrow.includes("@") ? afterArrow : gloss;
}

/** TAHOT's table rows (Hebrew and Aramaic). */
export function parseTahot(text: string): ParsedWords {
  const words: OriginalWord[] = [];
  const skipped: Record<string, number> = {};
  const problems: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = REF.exec(line.slice(0, line.indexOf("\t") === -1 ? 0 : line.indexOf("\t")));
    if (!m) continue;
    const [, code = "", ch = "", vs = "", hebCh, hebVs, number = "", type = ""] = m;
    const book = osisBook(code);
    if (!book) {
      problems.push(`${code}: unknown book code`);
      continue;
    }
    // The main text: Leningrad, the Qere, restored and LXX words. The rest are variants.
    if (!/^[LQRX]/.test(type)) {
      increment(skipped, "variant reading");
      continue;
    }
    const cols = line.split("\t");
    const [, hebrew = "", translit = "", translation = "", dstrongs = "", grammar = ""] = cols;
    const expanded = cols[11] ?? "";
    const where = `${code}.${ch}.${vs}#${number}`;
    // A Qere that stands for no word (a slot the Ketiv fills), shown as `[ ]`.
    if (hebrew.trim() === "") {
      increment(skipped, "empty Qere slot");
      continue;
    }

    const morphemes = (dstrongs.split("\\")[0] ?? "")
      .split("/")
      .map((p) => p.replace(/[+{}]/g, ""));
    const rootIndex = (dstrongs.split("\\")[0] ?? "").split("/").findIndex((p) => p.includes("{"));
    const index =
      rootIndex === -1 ? morphemes.findIndex((p) => !(parseStrong(p)?.affix ?? true)) : rootIndex;
    const root = parseStrong(morphemes[index] ?? "");
    if (!root || index === -1) {
      problems.push(`${where}: no root in "${dstrongs}"`);
      continue;
    }
    const codes = (grammar.split("\\")[0] ?? "").split("/");
    const rootCode = (codes[index] ?? "").replace(index === 0 ? /^[HA]/ : /^$/, "");
    const language = (grammar[0] === "A" ? "arc" : "heb") as "heb" | "arc";
    const tags = expanded
      .split(/[/\\]/)
      .map((part) => TAG.exec(part))
      .filter((t): t is RegExpExecArray => t !== null);
    const rootTag = tags.find((t) => parseStrong(t[1] ?? "")?.base === root.base);
    const affixes: Affix[] = morphemes.flatMap((p, i) => {
      if (i === index) return [];
      const tag = tags.find((t) => t[1] === p);
      const n = parseStrong(p);
      if (!n || !tag || !n.affix) return [];
      return [
        {
          strong: p,
          form: tag[2] ?? "",
          gloss: briefGloss(tag[3] ?? ""),
          role: i < index ? ("prefix" as const) : ("suffix" as const),
        },
      ];
    });
    const name = nameIn(rootTag?.[3] ?? "");
    words.push({
      book,
      chapter: Number(hebCh ?? ch),
      verse: Number(hebVs ?? vs),
      position: Number(number),
      reading: type,
      surface: hebrew.replace(/[/\\]/g, ""),
      transliteration: translit.replace(/[/\\]/g, ""),
      gloss: translation.replace(/\//g, "").replace(/\s+/g, " ").trim(),
      language,
      lemmaKey: root.extended ?? root.base,
      lemmaBase: root.base,
      headword: rootTag?.[2] ?? "",
      lemmaGloss: briefGloss(rootTag?.[3] ?? ""),
      partOfSpeech: rootCode.startsWith("Np")
        ? "proper noun"
        : (HEBREW_POS[rootCode[0] ?? ""] ?? ""),
      ...(name ? { properName: name } : {}),
      affixes,
      morphology: grammar,
    });
  }
  return { words, skipped, problems };
}

const EDITIONS_WANTED = ["SBL", "TR", "Byz"];

/** TAGNT's table rows (Greek New Testament). */
export function parseTagnt(text: string): ParsedWords {
  const words: OriginalWord[] = [];
  const skipped: Record<string, number> = {};
  const problems: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const tab = line.indexOf("\t");
    const m = tab === -1 ? null : REF.exec(line.slice(0, tab));
    if (!m) continue;
    const [, code = "", ch = "", vs = "", , , number = "", type = ""] = m;
    const book = osisBook(code);
    if (!book) {
      problems.push(`${code}: unknown book code`);
      continue;
    }
    // Columns: 1 Greek (translit), 2 English, 3 dStrong=grammar, 4 form=gloss, 5 editions.
    // Columns 8 and 9 (Spanish, sub-meaning) are never read.
    const cols = line.split("\t");
    const [, greek = "", english = "", tagged = "", lemmaGloss = "", editionList = ""] = cols;
    const editions = editionList.split("+").filter(Boolean);
    if (!editions.some((e) => EDITIONS_WANTED.includes(e))) {
      increment(skipped, "not in SBL, Byzantine or TR");
      continue;
    }
    const where = `${code}.${ch}.${vs}#${number}`;
    const [strongRaw = "", grammar = ""] = tagged.split("=");
    const strong = parseStrong(strongRaw);
    if (!strong) {
      problems.push(`${where}: no Strong's number in "${tagged}"`);
      continue;
    }
    const spelled = /^(.*?)\s*\(([^)]*)\)$/.exec(greek);
    const [headword = "", ...rest] = lemmaGloss.split("=");
    const segments = grammar.split("-");
    const last = segments.length > 2 ? segments[segments.length - 1] : undefined;
    const kind = last === "P" ? "person" : last === "L" ? "place" : undefined;
    words.push({
      book,
      chapter: Number(ch),
      verse: Number(vs),
      position: Number(number),
      reading: type,
      surface: spelled?.[1] ?? greek,
      transliteration: spelled?.[2] ?? "",
      gloss: english.trim(),
      language: "grc",
      lemmaKey: strong.extended ?? strong.base,
      lemmaBase: strong.base,
      headword,
      lemmaGloss: rest.join("=").trim(),
      partOfSpeech: GREEK_POS[(segments[0] ?? "").replace(/[()]/g, "")] ?? "",
      ...(kind ? { nameKind: kind } : {}),
      affixes: [],
      morphology: grammar,
      editions,
    });
  }
  return { words, skipped, problems };
}
