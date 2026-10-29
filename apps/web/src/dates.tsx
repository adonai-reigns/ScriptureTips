"use client";

import { useLocale } from "next-intl";
import { useHydrated } from "./hydrated.ts";

/**
 * A moment the system holds in UTC, shown as a date in the reader's own time zone. The time zone
 * is the browser's, so the server renders it in UTC (marked as such) until the page's scripts
 * take over.
 */
export function LocalDate({ at }: { at: string }) {
  const locale = useLocale();
  const hydrated = useHydrated();
  const date = new Date(at);
  return (
    <time dateTime={date.toISOString()}>
      {hydrated
        ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date)
        : `${new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(date)} (UTC)`}
    </time>
  );
}
