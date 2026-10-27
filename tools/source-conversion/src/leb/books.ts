/** The LEB's book IDs (`<book id="Ge">`, and in cross-reference targets), in its order. */

export const LEB_BOOKS: Readonly<Record<string, string>> = {
  Ge: "GEN",
  Ex: "EXO",
  Le: "LEV",
  Nu: "NUM",
  Dt: "DEU",
  Jos: "JOS",
  Jdg: "JDG",
  Ru: "RUT",
  "1 Sa": "1SA",
  "2 Sa": "2SA",
  "1 Ki": "1KI",
  "2 Ki": "2KI",
  "1 Ch": "1CH",
  "2 Ch": "2CH",
  Ezr: "EZR",
  Ne: "NEH",
  Es: "EST",
  Job: "JOB",
  Ps: "PSA",
  Pr: "PRO",
  Ec: "ECC",
  So: "SNG",
  Is: "ISA",
  Je: "JER",
  La: "LAM",
  Eze: "EZK",
  Da: "DAN",
  Ho: "HOS",
  Joe: "JOL",
  Am: "AMO",
  Ob: "OBA",
  Jon: "JON",
  Mic: "MIC",
  Na: "NAM",
  Hab: "HAB",
  Zep: "ZEP",
  Hag: "HAG",
  Zec: "ZEC",
  Mal: "MAL",
  Mt: "MAT",
  Mk: "MRK",
  Lk: "LUK",
  Jn: "JHN",
  Ac: "ACT",
  Ro: "ROM",
  "1 Co": "1CO",
  "2 Co": "2CO",
  Ga: "GAL",
  Eph: "EPH",
  Php: "PHP",
  Col: "COL",
  "1 Th": "1TH",
  "2 Th": "2TH",
  "1 Ti": "1TI",
  "2 Ti": "2TI",
  Titus: "TIT",
  Phm: "PHM",
  Heb: "HEB",
  Jas: "JAS",
  "1 Pe": "1PE",
  "2 Pe": "2PE",
  "1 Jn": "1JN",
  "2 Jn": "2JN",
  "3 Jn": "3JN",
  Jud: "JUD",
  Re: "REV",
};

/** Books of one chapter, whose verse IDs have no chapter (`Ob 1` is verse 1). */
export const SINGLE_CHAPTER = new Set(["OBA", "PHM", "2JN", "3JN", "JUD"]);

const PART = String.raw`(\d+)(?::(\d+))?[a-z]?`;
const TARGET = new RegExp(String.raw`^BibleLEB2:\s*((?:\d )?[A-Z][a-z]+) ${PART}(?:[–-]${PART})?$`);

/**
 * A cross-reference target (`<cite title="BibleLEB2: Ps 95:7b–8">`) as a USFM reference
 * (`PSA 95:7-8`), the form `\ref` takes. Part-verse letters are dropped: the link goes to
 * the verse. Undefined if the target can't be read.
 */
export function citeTarget(title: string): string | undefined {
  const m = TARGET.exec(title);
  const code = m?.[1] ? LEB_BOOKS[m[1]] : undefined;
  if (!m || !code) return undefined;
  const [, , c1, v1, c2, v2] = m;
  // In a book of one chapter, "2 Jn 7" is verse 7.
  const start = SINGLE_CHAPTER.has(code) && !v1 ? `1:${c1}` : v1 ? `${c1}:${v1}` : `${c1}`;
  if (c2 === undefined) return `${code} ${start}`;
  return `${code} ${start}-${v2 ? `${c2}:${v2}` : c2}`;
}
