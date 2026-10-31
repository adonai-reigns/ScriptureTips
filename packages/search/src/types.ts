/** What a search instance searches: set once, per instance (see `SearchOptions`). */
export interface SearchScope {
  /**
   * The kinds of result to ask for: `reference` (a passage the query names), `text` (verses whose
   * words match), `original` (Hebrew and Greek words). Others (the user's notes …) can be named
   * as the engine learns them; a kind the server doesn't search comes back in `unavailable`.
   * All three when left out.
   */
  readonly kinds?: readonly string[];
  /** The translations to search (catalog IDs). The server's default (every one) when left out. */
  readonly translations?: readonly string[];
  /** The most results of each kind. */
  readonly limit?: number;
  /**
   * How many characters of a passage a reference result's preview shows before it's cut at a
   * word and ended with "…". The server's own (160) when left out.
   */
  readonly previewLength?: number;
}

/** A passage the query names ("jn 3 16"). */
export interface ReferenceResult {
  readonly kind: "reference";
  readonly id: string;
  /** "John 3:16". */
  readonly label: string;
  /** As written, in the translation's numbering (OSIS): `John.3.16`. */
  readonly reference: string;
  readonly translation: { readonly id: string; readonly abbreviation: string };
  /** The start of the passage, as plain text. */
  readonly preview: string;
}

/** A piece of a verse, the words the search matched flagged. */
export interface SnippetPart {
  readonly t: string;
  readonly hit?: true;
}

/** A verse whose words match. */
export interface TextResult {
  readonly kind: "text";
  readonly id: string;
  readonly label: string;
  readonly reference: string;
  readonly translation: { readonly id: string; readonly abbreviation: string };
  readonly snippet: readonly SnippetPart[];
}

/** A Hebrew or Greek word. */
export interface OriginalResult {
  readonly kind: "original";
  readonly id: string;
  /** `H0430`, `G0026`. */
  readonly strong: string;
  readonly headword: string | null;
  readonly transliteration: string | null;
  readonly gloss: string | null;
  readonly partOfSpeech: string | null;
  /** `person`, `place`, `noun`, `verb` … */
  readonly category: string;
  /** How often it occurs in the original text. */
  readonly occurrences: number;
}

export type SearchResult = ReferenceResult | TextResult | OriginalResult;

/** The server's answer to a search. */
export interface SearchResponse {
  readonly query: string;
  readonly results: readonly SearchResult[];
  /** Kinds asked for that the server doesn't search (yet). */
  readonly unavailable: readonly string[];
  readonly tookMs: number;
}

export interface Suggestion {
  /** A book to start a reference with, or a word. */
  readonly kind: "book" | "word";
  readonly text: string;
}

/** Where searching happens. The default asks the ScriptureTips API; tests and other backends can swap it. */
export interface Transport {
  search(query: string, scope: SearchScope, signal: AbortSignal): Promise<SearchResponse>;
  suggest(query: string, scope: SearchScope, signal: AbortSignal): Promise<readonly Suggestion[]>;
}

/** The words the widget shows (en-NZ). Any can be replaced per instance, to translate it. */
export interface Strings {
  readonly label: string;
  readonly placeholder: string;
  readonly search: string;
  readonly searching: string;
  readonly noResults: string;
  readonly failed: string;
  /** "Not searched yet: {kinds}". */
  readonly unavailable: string;
  readonly suggestions: string;
  readonly results: string;
  readonly kinds: Readonly<Record<string, string>>;
  /** "{count} times in the original". */
  readonly occurrences: string;
}

export interface SearchOptions {
  /** The API's search address. `/api/search` by default. */
  readonly endpoint?: string;
  readonly scope?: SearchScope;
  /** How long typing pauses before suggestions are asked for (ms). 200 by default. */
  readonly debounceMs?: number;
  readonly transport?: Transport;
  readonly strings?: Partial<Strings>;
}

export type SearchStatus = "idle" | "searching" | "done" | "error";

/** Everything the elements draw, and an integration can read. */
export interface SearchState {
  /** What's in the search field. */
  readonly query: string;
  /** The query the results (or the search under way) are for. */
  readonly searched: string;
  readonly status: SearchStatus;
  readonly results: readonly SearchResult[];
  readonly unavailable: readonly string[];
  readonly suggestions: readonly Suggestion[];
  readonly selected: string | null;
  readonly error: string | null;
}

/** The events a subscriber can listen for, with what each carries. */
export interface SearchEvents {
  /** The query changed: typed by the user, or set through the API. */
  type: { query: string; source: "user" | "api" };
  /** Suggestions for the query arrived. */
  suggest: { query: string; suggestions: readonly Suggestion[] };
  /** A search began. */
  search: { query: string; scope: SearchScope };
  /** A search's results arrived. */
  results: {
    query: string;
    results: readonly SearchResult[];
    unavailable: readonly string[];
    tookMs: number;
  };
  /** A result was picked. */
  select: { query: string; result: SearchResult };
  /** A search or suggestion failed. */
  error: { query: string; error: Error };
}

export type SearchEventName = keyof SearchEvents;
export type Unsubscribe = () => void;
