import type { Strings } from "./types.ts";

/** New Zealand English, like the rest of the product's interface. */
export const DEFAULT_STRINGS: Strings = {
  label: "Search",
  placeholder: "Search words, a passage or a Strong's number",
  search: "Search",
  searching: "Searching…",
  noResults: "No results.",
  failed: "The search didn't work. Try again.",
  unavailable: "Not searched yet: {kinds}",
  suggestions: "Suggestions",
  results: "Search results",
  kinds: {
    reference: "Passages",
    original: "Hebrew and Greek words",
    text: "Verses",
  },
  occurrences: "{count} times in the original",
};

/** Fills `{name}` placeholders. */
export const fill = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole));
