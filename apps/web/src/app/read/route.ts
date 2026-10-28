import type { NextRequest } from "next/server";
import { passage } from "../../reader/api.ts";
import { pathFor } from "../../reader/paths.ts";

/**
 * The search form's target: reads the reference through the API and redirects to the
 * passage's canonical path (domain-model §1.6), or back with the error code. The redirect is
 * relative, so it holds behind any host or proxy.
 */
export async function GET(request: NextRequest) {
  const translation = request.nextUrl.searchParams.get("t") ?? "";
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  const result = await passage(translation, ref);
  const location =
    result.ok && result.passages.length > 0
      ? pathFor(translation, result.passages)
      : `/?${new URLSearchParams({ t: translation, ref, error: result.ok ? "invalid-request" : result.code })}`;
  return new Response(null, { status: 303, headers: { Location: location } });
}
