import { SearchEngine } from "./engine.ts";
import type { SearchOptions } from "./types.ts";

/**
 * The searches on a page, by name. Elements with the same `instance` share one engine, and a
 * page script gets the same one by that name, even when the script and the elements came in
 * separate bundles (the registry lives on `globalThis`).
 */
const KEY = Symbol.for("scripturetips.search.registry");

type Registry = Map<string, SearchEngine>;

function registry(): Registry {
  const root = globalThis as unknown as Record<symbol, Registry | undefined>;
  let found = root[KEY];
  if (!found) {
    found = new Map();
    root[KEY] = found;
  }
  return found;
}

/** The name an element uses when it has no `instance`. */
export const DEFAULT_INSTANCE = "default";

/** The search with this name, made at once if there isn't one yet. */
export function getSearch(name: string = DEFAULT_INSTANCE, options?: SearchOptions): SearchEngine {
  const all = registry();
  let engine = all.get(name);
  if (!engine) {
    engine = new SearchEngine(name, options);
    all.set(name, engine);
  } else if (options) {
    engine.configure(options);
  }
  return engine;
}

/** Sets up (or changes) a named search: its scope, endpoint, words. */
export const configureSearch = (name: string, options: SearchOptions): SearchEngine =>
  getSearch(name, options);

/** The names of the searches on this page. */
export const searchNames = (): string[] => [...registry().keys()];

/** Ends a named search and forgets it. */
export function removeSearch(name: string): void {
  const all = registry();
  all.get(name)?.destroy();
  all.delete(name);
}

/** What a page script reaches as `ScriptureTipsSearch`. */
export const ScriptureTipsSearch = {
  get: getSearch,
  configure: configureSearch,
  names: searchNames,
  remove: removeSearch,
} as const;
