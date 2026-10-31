"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useMoreTranslations } from "../translations/MoreTranslations.tsx";
import { usePopupClose } from "./popup.ts";

/**
 * Which translation read mode shows, chosen behind a ⋮ beside the mode buttons: the compilation
 * (first), or any translation, read whole. The choice is in the page's address (`read`), so the
 * chapter links keep it. The ⋮ names the one being read, with a spinner while a new choice loads.
 */
export function ReadChoice({
  current,
  options,
}: {
  /** The one being read: the compilation's, or a translation's (catalog ID). */
  current: string;
  /** The compilation first, then the translations, each with where it's read. */
  options: { id: string; abbreviation: string; label: string; href: string; more?: true }[];
}) {
  const t = useTranslations("reading");
  const tSearch = useTranslations("search");
  const list = useMoreTranslations(options, [current]);
  const router = useRouter();
  const [loading, startLoading] = useTransition();
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties>({});
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  usePopupClose(open, close, toggle, panel, "[aria-checked=true]");

  const show = () => {
    const r = toggle.current?.getBoundingClientRect();
    if (r) setPlace({ right: Math.max(8, window.innerWidth - r.right), top: r.bottom + 4 });
    setOpen(true);
  };
  const reading = options.find((o) => o.id === current);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="book-menu-toggle compare-choice-toggle naming"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          reading ? t("readChoiceNamed", { source: reading.abbreviation }) : t("readChoice")
        }
        onClick={() => (open ? close() : show())}
      >
        {reading ? <span aria-hidden="true">{reading.abbreviation}</span> : null}
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
        {/* Dims the reading area while it shows (globals.css). */}
        {loading ? <span className="spinner link-pending" aria-hidden="true" /> : null}
      </button>
      {open
        ? createPortal(
            <div
              ref={panel}
              role="menu"
              className="book-menu-popup"
              style={place}
              aria-label={t("readChoiceHeading")}
            >
              <p className="book-menu-heading">{t("readChoiceHeading")}</p>
              {list.shown.map((o) => (
                <Link
                  key={o.id}
                  role="menuitemradio"
                  aria-checked={o.id === current}
                  href={o.href}
                  scroll={false}
                  onClick={(e) => {
                    close();
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                    // Loaded in a transition, so the ⋮ can show it's on its way.
                    e.preventDefault();
                    startLoading(() => router.push(o.href, { scroll: false }));
                  }}
                >
                  {o.label}
                </Link>
              ))}
              {list.hidden ? (
                <button type="button" className="link-button" onClick={list.showAll}>
                  {tSearch("showAll")}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
