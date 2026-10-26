// cspell:ignore knowl lehem
/**
 * Line-end hyphens. The transcription keeps the printing's line breaks, so a hyphen at the end of
 * a line is either a soft hyphen that splits a word ("knowl-" / "edge") or part of a compound
 * that happens to break there ("Beth-" / "lehem"). The text itself decides: a word the printing
 * also sets solid elsewhere loses the hyphen; one it sets hyphenated mid-line keeps it.
 */

/** Marks a soft hyphen at a line end; `joinLines` drops it and joins the halves. */
export const SOFT_HYPHEN = "­";

export interface HyphenDecision {
  /** The two halves, e.g. "knowl" and "edge". */
  readonly left: string;
  readonly right: string;
  /** How often the word appears solid, and hyphenated within a line, elsewhere in the text. */
  readonly solid: number;
  readonly hyphenated: number;
  readonly soft: boolean;
}

const TRAILING = /([A-Za-z]+)-$/;
const LEADING = /^([A-Za-z]+)/;

function count(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Hyphenates the solid spellings of compounds the printing always hyphenates. */
export function restoreCompounds(text: string, compounds: readonly string[]): string {
  let result = text;
  for (const compound of compounds) {
    const [left, right] = compound.split("-") as [string, string];
    const solid = new RegExp(`(?<![A-Za-z-])(${left})(${right})(?![A-Za-z-])`, "gi");
    result = result.replace(solid, "$1-$2");
  }
  return result;
}

/** Replaces each soft line-end hyphen with SOFT_HYPHEN; returns the text and every decision. */
export function resolveLineEndHyphens(
  text: string,
  compounds: readonly string[] = [],
): {
  text: string;
  decisions: HyphenDecision[];
} {
  const lines = text.split("\n");
  const solid = new Map<string, number>();
  const hyphenated = new Map<string, number>();
  for (const line of lines) {
    // Only whole words inside a line count: the last word may be cut by a line break.
    const body = line.replace(/\S*-\s*$/, "");
    for (const w of body.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) ?? []) {
      if (w.includes("-")) count(hyphenated, w);
      else count(solid, w);
    }
  }

  const decisions: HyphenDecision[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] as string).trimEnd();
    const left = TRAILING.exec(line)?.[1];
    if (!left || line.endsWith("\u2014")) continue;
    // The word goes on in the next line of text (past a page number and form feed if need be).
    let j = i + 1;
    while (j < lines.length && j < i + 8 && !/[A-Za-z]/.test(lines[j] as string)) j++;
    const right = LEADING.exec((lines[j] ?? "").trim())?.[1];
    if (!right) continue;
    const word = `${left}${right}`.toLowerCase();
    const d = {
      left,
      right,
      solid: solid.get(word) ?? 0,
      hyphenated: hyphenated.get(`${left}-${right}`.toLowerCase()) ?? 0,
    };
    const known = compounds.some((c) => c.toLowerCase() === `${left}-${right}`.toLowerCase());
    const soft = !known && d.solid > d.hyphenated;
    decisions.push({ ...d, soft });
    if (soft) lines[i] = `${line.slice(0, -1)}${SOFT_HYPHEN}`;
  }
  return { text: lines.join("\n"), decisions };
}
