"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useHydrated } from "../hydrated.ts";

/**
 * Study mode's switch, beside the modes: it moves between the reading area's two addresses (the
 * page's `study` setting is part of its address, so it stays through chapters and modes).
 */
export function StudyToggle({ on, href, label }: { on: boolean; href: string; label: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={`study-toggle${on ? " on" : ""}`}
      aria-pressed={on}
      disabled={!hydrated}
      onClick={() => start(() => router.replace(href, { scroll: false }))}
    >
      {label}
      {pending ? <span className="spinner link-pending" aria-hidden="true" /> : null}
    </button>
  );
}
