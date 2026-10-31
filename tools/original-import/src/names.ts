/**
 * STEPBible's TIPNR (domain-model §2.4): one record per individual person, place or other proper
 * name. A record is a main line (`Abraham@Gen.11.26-1Pe=H0085`, then description, family and
 * type), sub-lines for each form of the name, and `@Brief`, `@Short` and `@Article` lines that
 * an AI wrote in April 2024 (sources.md §6): they're kept, flagged as AI-generated.
 */

export interface ProperNameRecord {
  /** The unified name, e.g. `Abraham@Gen.11.26-1Pe`: what Hebrew tokens refer to. */
  readonly tipnrId: string;
  /** The most common form, e.g. `Abraham`. */
  readonly name: string;
  readonly kind: "person" | "place" | "place_person" | "other";
  /** Disambiguated Strong's numbers, Hebrew and Greek: `H0085`, `G0011`, `H0087`. */
  readonly strongs: readonly string[];
  readonly description?: string;
  readonly summary?: string;
  readonly details: Readonly<Record<string, string>>;
}

const KINDS: Readonly<Record<string, ProperNameRecord["kind"]>> = {
  "PERSON(s)": "person",
  PLACE: "place",
  "PLACE+PERSON": "place_person",
  OTHER: "other",
};

export interface ParsedNames {
  readonly names: ProperNameRecord[];
  /** Records left out (the file's EXCLUDED OTHER section) and rows that couldn't be read. */
  readonly skipped: number;
  readonly problems: readonly string[];
}

const SECTION = /^\$=+\s*([A-Z+() a-z]+?)\s*$/;
// `Name@Gen.1.1-Rev=H0085` (the number may be missing for a name without a tag).
const MAIN = /^([^\t=@]+(?:\|[^\t=@]+)*@[^\t=]+)(?:=([HG]\d{4}[A-Za-z]?))?(?:\t|$)/;

export function parseTipnr(text: string): ParsedNames {
  const names: ProperNameRecord[] = [];
  const problems: string[] = [];
  let skipped = 0;
  let kind: ProperNameRecord["kind"] | null = null;
  let current: {
    tipnrId: string;
    name: string;
    kind: ProperNameRecord["kind"];
    strongs: Set<string>;
    description?: string;
    summary?: string;
    details: Record<string, string>;
  } | null = null;

  const finish = () => {
    if (!current) return;
    names.push({ ...current, strongs: [...current.strongs] });
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    const section = SECTION.exec(line);
    if (section) {
      finish();
      kind = KINDS[section[1] ?? ""] ?? null;
      continue;
    }
    if (line.startsWith("@")) {
      const eq = line.indexOf("=");
      const label = line.slice(1, eq);
      const value = line.slice(eq + 1).trim();
      if (!current || !value) continue;
      if (label === "Briefest") current.details["briefest"] = value;
      else if (label === "Brief") current.description = value;
      else if (label === "Short") current.summary = value;
      else if (label === "Article") current.details["article"] = value;
      continue;
    }
    if (line.startsWith("–")) {
      // A form of the name: `– Named<TAB>Abram|Abraham@…<TAB>H0087«H0087=אַבְרָם=…<TAB>Abram<TAB>refs`.
      const cols = line.split("\t");
      if (current && cols[2]) {
        for (const s of cols[2].match(/[HG]\d{4}[A-Za-z]?/g) ?? []) current.strongs.add(s);
      }
      continue;
    }
    const main = MAIN.exec(line);
    // Anything in the middle of the file that isn't a record (headings, field descriptions).
    if (!main || !/\t/.test(line) || !line.includes("@")) continue;
    if (kind === null) {
      // The file's EXCLUDED OTHER section.
      finish();
      skipped++;
      continue;
    }
    finish();
    const cols = line.split("\t");
    const unified = main[1] ?? "";
    const [name = ""] = (unified.split("@")[0] ?? "").split("|").slice(-1);
    current = {
      tipnrId: unified,
      name,
      kind,
      strongs: new Set(main[2] ? [main[2]] : []),
      ...(cols[1]?.trim() ? { description: cols[1].trim() } : {}),
      details: Object.fromEntries(
        (
          [
            ["parents", cols[2]],
            ["siblings", cols[3]],
            ["partners", cols[4]],
            ["offspring", cols[5]],
            ["tribe", cols[6]],
            ["profile", cols[7]],
          ] as const
        ).flatMap(([k, v]) => (v?.trim() ? [[k, v.trim()]] : [])),
      ),
    };
  }
  finish();
  return { names, skipped, problems };
}
