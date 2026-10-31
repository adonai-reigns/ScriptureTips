/**
 * The dictionaries' entries as the import reads them: Strong's Hebrew and Greek, Brown-Driver-
 * Briggs (through its lexical index) and Abbott-Smith. Each entry is keyed by a Strong's number,
 * the way they hang from lemmas in the database. Bodies are plain text, in the dictionary's own
 * parts; the markup (cross-references, foreign words) is flattened.
 */

import { strongOf } from "./strong.ts";
import { child, descendants, parseXml, textOf, type XmlElement } from "./xml.ts";

export interface DictionaryEntry {
  readonly language: "heb" | "arc" | "grc";
  /** `H0430`. */
  readonly strong: string;
  readonly headword: string;
  readonly transliteration?: string;
  readonly partOfSpeech?: string;
  /** The entry's parts, by name: `source`, `meaning`, `usage`, `derivation`, `definition` … */
  readonly body: Readonly<Record<string, string>>;
}

const present = (parts: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(Object.entries(parts).filter(([, v]) => v)) as Record<string, string>;

/** Strong's Hebrew and Aramaic dictionary (`HebrewStrong.xml`: `<entry id="H1"><w pos="n-m" …>`). */
export function parseStrongsHebrew(xml: string): DictionaryEntry[] {
  const out: DictionaryEntry[] = [];
  for (const entry of descendants(parseXml(xml), "entry")) {
    const id = entry.attrs["id"];
    const w = child(entry, "w");
    if (!id || !w) continue;
    const text = (name: string) => {
      const e = child(entry, name);
      return e ? textOf(e) : undefined;
    };
    out.push({
      language: w.attrs["xml:lang"] === "arc" ? "arc" : "heb",
      strong: strongOf("heb", id),
      headword: textOf(w),
      ...(w.attrs["xlit"] ? { transliteration: w.attrs["xlit"] } : {}),
      ...(w.attrs["pos"] ? { partOfSpeech: w.attrs["pos"] } : {}),
      body: present({ source: text("source"), meaning: text("meaning"), usage: text("usage") }),
    });
  }
  return out;
}

/** Strong's Greek dictionary (`strongsgreek.xml`: `<entry strongs="00001"><greek unicode=…/>`). */
export function parseStrongsGreek(xml: string): DictionaryEntry[] {
  const out: DictionaryEntry[] = [];
  for (const entry of descendants(parseXml(xml), "entry")) {
    const number = entry.attrs["strongs"];
    const greek = child(entry, "greek");
    if (!number || !greek) continue;
    const text = (name: string) => {
      const e = child(entry, name);
      return e ? textOf(e) : undefined;
    };
    out.push({
      language: "grc",
      strong: strongOf("grc", number),
      headword: greek.attrs["unicode"] ?? "",
      ...(greek.attrs["translit"] ? { transliteration: greek.attrs["translit"] } : {}),
      body: present({
        pronunciation: child(entry, "pronunciation")?.attrs["strongs"],
        derivation: text("strongs_derivation"),
        definition: text("strongs_def"),
        kjv: text("kjv_def"),
      }),
    });
  }
  return out;
}

/** A Brown-Driver-Briggs entry, linked to Strong's numbers by the lexical index. */
export interface BdbEntry {
  /** BDB's own ID (`a.ab.ab`). */
  readonly id: string;
  readonly headword: string;
  readonly partOfSpeech?: string;
  /** The entry in running text, and the glosses it marks as definitions. */
  readonly text: string;
  readonly definitions: readonly string[];
}

export function parseBdb(xml: string): BdbEntry[] {
  const out: BdbEntry[] = [];
  for (const entry of descendants(parseXml(xml), "entry")) {
    const id = entry.attrs["id"];
    if (!id) continue;
    // The status note is the project's, not the dictionary's.
    const body: XmlElement = {
      ...entry,
      children: entry.children.filter((c) => typeof c === "string" || c.name !== "status"),
    };
    const pos = child(entry, "pos");
    out.push({
      id,
      headword: descendants(entry, "w")[0] ? textOf(descendants(entry, "w")[0] as XmlElement) : "",
      ...(pos ? { partOfSpeech: textOf(pos) } : {}),
      text: textOf(body),
      definitions: descendants(entry, "def").map(textOf),
    });
  }
  return out;
}

/** Which BDB entries hold each Strong's number (`LexicalIndex.xml`'s `<xref bdb strong>`). */
export function parseLexicalIndex(xml: string): Map<string, string[]> {
  const byStrong = new Map<string, string[]>();
  for (const xref of descendants(parseXml(xml), "xref")) {
    const bdb = xref.attrs["bdb"];
    const strong = xref.attrs["strong"];
    if (!bdb || !strong || !/^\d+$/.test(strong)) continue;
    const key = strongOf("heb", strong);
    const list = byStrong.get(key) ?? [];
    if (!list.includes(bdb)) list.push(bdb);
    byStrong.set(key, list);
  }
  return byStrong;
}

/** An Abbott-Smith entry (`<entry n="Ἀαρών|G2">`), linked to its Strong's number. */
export interface AbbottEntry {
  readonly strong: string;
  readonly headword: string;
  readonly glosses: readonly string[];
  readonly text: string;
}

export function parseAbbottSmith(xml: string): { entries: AbbottEntry[]; unlinked: number } {
  const entries: AbbottEntry[] = [];
  let unlinked = 0;
  for (const entry of descendants(parseXml(xml), "entry")) {
    const n = entry.attrs["n"] ?? "";
    const [headword = "", ...ids] = n.split("|");
    const numbers = ids.flatMap((id) => (/^G\d+$/.test(id) ? [strongOf("grc", id)] : []));
    if (numbers.length === 0) {
      unlinked++;
      continue;
    }
    const glosses = descendants(entry, "gloss").map(textOf);
    for (const strong of numbers) entries.push({ strong, headword, glosses, text: textOf(entry) });
  }
  return { entries, unlinked };
}
