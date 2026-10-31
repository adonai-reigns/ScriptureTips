/**
 * The core ScriptureTips search engine (vision §3.14), with no DOM: named instances that hold a
 * query, a scope and results, and the events around them. The elements are in
 * `@scripturetips/search/elements`.
 */

export { SearchEngine } from "./engine.ts";
export {
  configureSearch,
  DEFAULT_INSTANCE,
  getSearch,
  removeSearch,
  ScriptureTipsSearch,
  searchNames,
} from "./registry.ts";
export { DEFAULT_STRINGS, fill } from "./strings.ts";
export { fetchTransport, queryString } from "./transport.ts";
export type {
  OriginalResult,
  ReferenceResult,
  SearchEventName,
  SearchEvents,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchScope,
  SearchState,
  SearchStatus,
  SnippetPart,
  Strings,
  Suggestion,
  TextResult,
  Transport,
  Unsubscribe,
} from "./types.ts";
