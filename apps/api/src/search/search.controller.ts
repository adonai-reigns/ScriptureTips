import { Controller, Get, Header, Inject, Query } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../zod-pipe.ts";
import { SEARCH_KINDS, type SearchKind } from "./query.ts";
import { type SearchResponse, SearchService, type Suggestion } from "./search.service.ts";

/** A comma separated list whose items each match `pattern`. */
const List = (pattern: RegExp) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").filter(Boolean) : undefined))
    .pipe(z.array(z.string().regex(pattern)).max(40).optional());

const Params = z.object({
  q: z.string().trim().min(1).max(200),
  /** Which kinds of result, comma separated; unknown kinds are reported, not an error. */
  kinds: List(/^[a-z][a-z-]{0,19}$/),
  /** Which translations to search (catalog IDs); all if left out. */
  translations: List(/^[A-Za-z0-9_-]{1,40}$/),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  /** How many characters of a passage a reference result's preview shows, before it's cut. */
  previewLength: z.coerce.number().int().min(20).max(2000).default(160),
});

type Parsed = z.infer<typeof Params>;

/** The kinds asked for that this engine searches, and those it doesn't. */
function kindsOf(asked: string[] | undefined): { known: Set<SearchKind>; unknown: string[] } {
  const wanted = asked ?? [...SEARCH_KINDS];
  const known = new Set(
    wanted.filter((k): k is SearchKind => (SEARCH_KINDS as readonly string[]).includes(k)),
  );
  return { known, unknown: wanted.filter((k) => !known.has(k as SearchKind)) };
}

/**
 * The core search engine's endpoints (vision §3.14). Public data only for now: scripture text in
 * the translations asked for, and the original-language words. Other kinds (the user's notes …)
 * are named in `unavailable` until they exist.
 */
@Controller("search")
export class SearchController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  @Header("cache-control", "public, max-age=60")
  async find(@Query(new ZodPipe(Params)) p: Parsed): Promise<SearchResponse> {
    const { known, unknown } = kindsOf(p.kinds);
    const found = await this.search.search({
      q: p.q,
      kinds: known,
      translations: p.translations ?? null,
      limit: p.limit,
      previewLength: p.previewLength,
    });
    return { ...found, unavailable: unknown };
  }

  /** What the text typed so far could become, for a widget's suggestions as the user types. */
  @Get("suggest")
  @Header("cache-control", "public, max-age=300")
  async suggest(
    @Query(new ZodPipe(Params)) p: Parsed,
  ): Promise<{ query: string; suggestions: Suggestion[] }> {
    const { known } = kindsOf(p.kinds);
    return {
      query: p.q,
      suggestions: await this.search.suggest(p.q, known, Math.min(p.limit, 10)),
    };
  }
}
