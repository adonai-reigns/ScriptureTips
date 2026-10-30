"use client";

import { useLinkStatus } from "next/link";

/**
 * A spinner inside a `Link` while the page it opens is loading. The reading area dims its
 * content while one shows (globals.css).
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="spinner link-pending" aria-hidden="true" /> : null;
}
