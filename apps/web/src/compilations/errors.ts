"use client";

import { useTranslations } from "next-intl";

/** The error code in an API response, or `unavailable`. */
export async function errorCode(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: unknown };
    return typeof body.code === "string" ? body.code : "unavailable";
  } catch {
    return "unavailable";
  }
}

/** Words an error code: compilation errors first, then the reference parser's (`errors`). */
export function useErrorText(): (code: string) => string {
  const tc = useTranslations("compilationErrors");
  const te = useTranslations("errors");
  return (code) => (tc.has(code) ? tc(code) : te.has(code) ? te(code) : tc("unavailable"));
}
