/**
 * The pure parts of search: what a query is, and how text is folded for matching. (The queries
 * themselves are in `search.service.ts`.)
 */

/** The kinds of result the engine can give; a client asks for any of them. */
export const SEARCH_KINDS = ["reference", "text", "original"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

/** A Strong's number typed as `H430`, `h0430`, `G 976` or `H0430G`, as the lemma table keys it. */
export function strongOf(query: string): { base: string; extended: string | null } | null {
  const m = /^\s*([HG])\s*0*(\d{1,4})([A-Za-z]?)\s*$/i.exec(query);
  if (!m) return null;
  const base = `${(m[1] ?? "").toUpperCase()}${(m[2] ?? "").padStart(4, "0")}`;
  return { base, extended: m[3] ? `${base}${m[3].toUpperCase()}` : null };
}

/** Hebrew vowel points and accents (niqqud and cantillation), and Greek accents, are removed. */
export const FOLDED_MARKS = "[̀-֑ͯ-ׇ]";

/** Text as it's compared: no vowel points or accents, lower case. */
export const fold = (text: string): string =>
  text.normalize("NFD").replace(new RegExp(FOLDED_MARKS, "g"), "").toLowerCase().trim();

/** A search phrase as a regular expression's literal text (for matching a gloss's whole words). */
export const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What `ts_headline` marks a matched word with (see `search.service.ts`). */
export const HIT_OPEN = "⟦";
export const HIT_CLOSE = "⟧";

export interface SnippetPart {
  readonly t: string;
  readonly hit?: true;
}

/** A headline's text as parts, the matched words flagged: no HTML, so nothing to escape. */
export function snippetOf(headline: string): SnippetPart[] {
  const parts: SnippetPart[] = [];
  let rest = headline;
  while (rest.length > 0) {
    const open = rest.indexOf(HIT_OPEN);
    if (open === -1) {
      parts.push({ t: rest });
      break;
    }
    if (open > 0) parts.push({ t: rest.slice(0, open) });
    const close = rest.indexOf(HIT_CLOSE, open);
    const end = close === -1 ? rest.length : close;
    parts.push({ t: rest.slice(open + 1, end), hit: true });
    rest = close === -1 ? "" : rest.slice(close + 1);
  }
  return parts;
}
