"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { errorCode, useErrorText } from "./errors.ts";

/** A translation a book or chapter can be taken from. */
export interface BookSourceChoice {
  id: string;
  label: string;
}

/** A translation menu's content: what it changes, and how it asks first. */
export interface SourceMenuSpec {
  /** The menu's heading ("Change the translation of Genesis"). */
  heading: string;
  /** The source it has now, marked in the list; none when it's mixed. */
  current?: string | undefined;
  /** The warning to confirm before replacing. */
  confirmText: (source: BookSourceChoice) => string;
  /** Where to `PUT {source}`. */
  endpoint: string;
}

/**
 * Giving `endpoint` a new source after the warning, then `done()` and the page reloaded; shared by
 * the ⋮ menu and the dialog a long press opens on a phone.
 */
export function useSourceChange(
  { confirmText, endpoint }: Pick<SourceMenuSpec, "confirmText" | "endpoint">,
  done: () => void,
) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choose = async (source: BookSourceChoice) => {
    if (!window.confirm(confirmText(source))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: source.id }),
      });
      if (!res.ok) return setError(await errorCode(res));
      done();
      router.refresh();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, choose };
}

/**
 * A menu of translations behind a ⋮ icon, to give a whole book or chapter a new source after a
 * warning (the book tabs and the edit mode's chapter column). It's placed against the window,
 * so the book columns don't re-balance around it, and drawn at the end of the page, above the
 * sticky headings.
 */
export function SourceMenu({
  label,
  heading,
  current,
  confirmText,
  endpoint,
  sources,
}: SourceMenuSpec & {
  /** The icon's name ("Options for Genesis"). */
  label: string;
  sources: BookSourceChoice[];
}) {
  const t = useTranslations("bookTabs");
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  // Where the open menu sits, against the window: it stays out of the book columns, which would
  // otherwise re-balance around it.
  const [place, setPlace] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const { busy, error, setError, choose } = useSourceChange({ confirmText, endpoint }, () =>
    close(true),
  );

  const close = (refocus: boolean) => {
    setOpen(false);
    setError(null);
    if (refocus) toggle.current?.focus();
  };

  const show = () => {
    const r = toggle.current?.getBoundingClientRect();
    if (r) {
      const right = window.innerWidth - r.right;
      // Opens upward when there isn't room below.
      setPlace(
        window.innerHeight - r.bottom < 360
          ? { right, bottom: window.innerHeight - r.top + 4 }
          : { right, top: r.bottom + 4 },
      );
    }
    setError(null);
    setOpen(true);
  };

  // Kept on screen: lined up with the icon's right edge, unless that runs it off the left edge
  // (an icon in the left column on a phone), when it moves right to fit.
  useLayoutEffect(() => {
    const el = menu.current;
    if (!open || !el) return;
    const r = el.getBoundingClientRect();
    if (r.left < 8) el.style.right = `${Math.max(8, window.innerWidth - r.width - 8)}px`;
  }, [open]);

  // Closes on Escape (back to the icon), a click outside, or a scroll or resize that moves the
  // icon away from the menu; and focuses the first item of what opens.
  useEffect(() => {
    if (!open) return;
    // Without scrolling: a scroll closes the menu, and the table it can open from scrolls sideways.
    menu.current
      ?.querySelector<HTMLButtonElement>("[role=menuitem]")
      ?.focus({ preventScroll: true });
    const shut = () => setOpen(false);
    const outside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !menu.current?.contains(target)) shut();
    };
    const at = toggle.current?.getBoundingClientRect();
    const away = (e: Event) => {
      if (menu.current?.contains(e.target as Node)) return;
      const now = toggle.current?.getBoundingClientRect();
      if (!at || !now || now.top !== at.top || now.right !== at.right) shut();
    };
    const onEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      shut();
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", away, true);
      window.removeEventListener("resize", away);
    };
  }, [open]);

  return (
    <div ref={root} className={`book-menu${open ? " open" : ""}`}>
      <button
        ref={toggle}
        type="button"
        className="book-menu-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close(false) : show())}
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
              ref={menu}
              role="menu"
              className="book-menu-popup"
              style={place}
              aria-label={heading}
            >
              <p className="book-menu-heading">{heading}</p>
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => choose(s)}
                >
                  {s.label}
                  {s.id === current ? <small> {t("current")}</small> : null}
                </button>
              ))}
              {error ? (
                <p role="alert" className="error">
                  {errorText(error)}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
