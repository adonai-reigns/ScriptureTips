"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type CSSProperties, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePopupClose } from "./popup.ts";

/**
 * Which translation read mode shows, chosen behind a ⋮ beside the mode buttons: the compilation
 * (first), or any translation, read whole. The choice is in the page's address (`read`), so the
 * chapter links keep it. While another translation is read, the ⋮ names it.
 */
export function ReadChoice({
  current,
  options,
}: {
  /** The one being read: the compilation's, or a translation's (catalog ID). */
  current: string;
  /** The compilation first, then the translations, each with where it's read. */
  options: { id: string; abbreviation: string; label: string; href: string }[];
}) {
  const t = useTranslations("reading");
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
  const other = reading && reading !== options[0] ? reading : null;

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className={`book-menu-toggle compare-choice-toggle${other ? " naming" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={other ? t("readChoiceOther", { source: other.abbreviation }) : t("readChoice")}
        onClick={() => (open ? close() : show())}
      >
        {other ? <span aria-hidden="true">{other.abbreviation}</span> : null}
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
              role="menu"
              className="book-menu-popup"
              style={place}
              aria-label={t("readChoiceHeading")}
            >
              <p className="book-menu-heading">{t("readChoiceHeading")}</p>
              {options.map((o) => (
                <Link
                  key={o.id}
                  role="menuitemradio"
                  aria-checked={o.id === current}
                  href={o.href}
                  scroll={false}
                  onClick={close}
                >
                  {o.label}
                </Link>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
