"use client";

import { useEffect, useState } from "react";

/**
 * False until the page's scripts have taken over. Forms handled by script keep their submit
 * button disabled until then, so an early click can't submit the form natively, which would put
 * what was typed (an email address, say) into the URL.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
