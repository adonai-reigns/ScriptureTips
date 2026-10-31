import { ScriptureTipsSearch } from "../registry.ts";
import { StSearchInput } from "./input.ts";
import { StSearchResults } from "./results.ts";
import { StSearch } from "./search.ts";

const ELEMENTS: readonly (readonly [string, CustomElementConstructor])[] = [
  ["st-search-input", StSearchInput],
  ["st-search-results", StSearchResults],
  ["st-search", StSearch],
];

/** Registers the search elements (once: asking again does nothing). */
export function defineSearchElements(): void {
  for (const [name, element] of ELEMENTS)
    if (!customElements.get(name)) customElements.define(name, element);
}

defineSearchElements();
// The page script's handle on the searches: `ScriptureTipsSearch.get("main")`.
const page = globalThis as { ScriptureTipsSearch?: typeof ScriptureTipsSearch };
page.ScriptureTipsSearch ??= ScriptureTipsSearch;
