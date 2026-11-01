"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useMoreTranslations } from "../translations/MoreTranslations.tsx";
import type { TranslationOption } from "../translations/menu.ts";
import { MAX_COLUMNS } from "./CompareGrid.tsx";
import { errorCode, useErrorText } from "./errors.ts";
import { InPlaceField } from "./forms.tsx";
import { usePopupClose } from "./popup.ts";

/**
 * Which translations the compare and edit modes show, ticked in a list behind a ⋮ beside the
 * mode buttons. Each tick is saved at once; a newly ticked translation goes last. At least one
 * stays ticked, and at most `MAX_COLUMNS`. On a phone, which has no comparison table, the
 * compilation's abbreviation is changed here too (the table's first heading elsewhere).
 */
export function CompareChoice({
  abbreviation,
  slug,
  chosen,
  options,
  modes,
}: {
  /** The compilation's abbreviation, changed here on a phone. */
  abbreviation: string;
  slug: string;
  /** The translations compared with now, in order (catalog IDs). */
  chosen: string[];
  options: TranslationOption[];
  /** The read, compare and edit buttons, on a phone while study mode is on (they leave the head). */
  modes?: React.ReactNode;
}) {
  const t = useTranslations("reading");
  const tSearch = useTranslations("search");
  const errorText = useErrorText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Choosing another mode in the menu opens the page for it: the menu closes.
  const mode = useSearchParams().get("mode");
  // biome-ignore lint/correctness/useExhaustiveDependencies: it closes when the mode changes.
  useEffect(() => setOpen(false), [mode]);
  const [ids, setIds] = useState(chosen);
  const list = useMoreTranslations(options, ids);
  const [saving, setSaving] = useState(false);
  const [reloading, startReload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<CSSProperties>({});
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // What the page shows wins once it arrives (after a save, or a change made elsewhere).
  useEffect(() => setIds(chosen), [chosen]);

  const show = () => {
    const r = toggle.current?.getBoundingClientRect();
    if (r) setPlace({ right: Math.max(8, window.innerWidth - r.right), top: r.bottom + 4 });
    setError(null);
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);
  usePopupClose(open, close, toggle, panel, "input");

  const tick = async (id: string, on: boolean) => {
    const next = on ? [...ids, id] : ids.filter((x) => x !== id);
    const before = ids;
    setIds(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/compare-with`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ translations: next }),
      });
      if (!res.ok) {
        setIds(before);
        return setError(await errorCode(res));
      }
      startReload(() => router.refresh());
    } catch {
      setIds(before);
      setError("unavailable");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || reloading;
  const full = ids.length >= MAX_COLUMNS;

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="book-menu-toggle compare-choice-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("compareChoice")}
        onClick={() => (open ? close() : show())}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={panel}
              role="dialog"
              className="book-menu-popup compare-choice"
              style={place}
              aria-labelledby="compare-choice-heading"
              aria-busy={busy}
            >
              {modes}
              <div className="compare-choice-abbreviation">
                <p className="book-menu-heading">{t("abbreviationHeading")}</p>
                <InPlaceField slug={slug} field="abbreviation" value={abbreviation} />
              </div>
              <p id="compare-choice-heading" className="book-menu-heading">
                {t("compareChoiceHeading", { max: MAX_COLUMNS })}
                {busy ? <span className="spinner" aria-hidden="true" /> : null}
              </p>
              {list.shown.map((o) => {
                const on = ids.includes(o.id);
                return (
                  <label key={o.id}>
                    <input
                      type="checkbox"
                      checked={on}
                      // The last one stays, and no more than the most columns.
                      disabled={saving || (on ? ids.length === 1 : full)}
                      onChange={(e) => tick(o.id, e.target.checked)}
                    />
                    {o.label}
                  </label>
                );
              })}
              {list.hidden ? (
                <button type="button" className="link-button" onClick={list.showAll}>
                  {tSearch("showAll")}
                </button>
              ) : null}
              {error ? (
                <p role="alert" className="error">
                  {errorText(error)}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
