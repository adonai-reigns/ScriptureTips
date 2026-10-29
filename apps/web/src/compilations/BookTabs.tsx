"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { errorCode, useErrorText } from "./errors.ts";

export interface BookTab {
  id: string;
  label: string;
  /**
   * `source`: the catalog ID of the translation the book comes from now, and `abbreviation` its
   * abbreviation; `overridden` when that isn't the base.
   */
  books: {
    osis: string;
    name: string;
    source: string;
    abbreviation: string;
    overridden: boolean;
  }[];
}

/** A translation a book can be taken from. */
export interface BookSourceChoice {
  id: string;
  label: string;
}

/**
 * The compilation's books by section (Old Testament, New Testament, other writings) as tabs: one
 * section's books show at a time. Arrow keys move between tabs, as the ARIA tabs pattern has it;
 * Tab moves through the books, each followed by its menu.
 */
export function BookTabs({
  slug,
  tabs,
  label,
  sources,
  actions,
}: {
  slug: string;
  tabs: BookTab[];
  label: string;
  sources: BookSourceChoice[];
  /** Buttons at the right end of the tab row. */
  actions?: ReactNode;
}) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = tabs.find((t) => t.id === current) ?? tabs[0];

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const next =
      e.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : e.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setCurrent(tabs[next]?.id);
    refs.current[next]?.focus();
  };

  if (!selected) return null;
  return (
    <div className="book-tabs">
      <div className="book-tabs-bar">
        {/* First in Tab order, so Tab goes from the tabs straight into the books; shown on the right. */}
        {actions ? <div className="book-tabs-actions">{actions}</div> : null}
        <div role="tablist" aria-label={label}>
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`book-tab-${tab.id}`}
              aria-selected={tab.id === selected.id}
              aria-controls={`book-panel-${tab.id}`}
              tabIndex={tab.id === selected.id ? 0 : -1}
              onClick={() => setCurrent(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <ul
        role="tabpanel"
        id={`book-panel-${selected.id}`}
        aria-labelledby={`book-tab-${selected.id}`}
      >
        {selected.books.map((b) => (
          <li key={b.osis}>
            {/* It will open the book in the verse editor; until it has that link, Tab reaches it. */}
            {/* biome-ignore lint/a11y/useValidAnchor: the link comes with the verse editor. */}
            <a tabIndex={0} className={b.overridden ? "overridden" : undefined}>
              {b.name} <strong>{b.abbreviation}</strong>
            </a>
            <BookMenu slug={slug} book={b} sources={sources} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A book's menu, opened from the icon at the end of its row: the translations to give the whole
 * book; choosing one, once the warning is confirmed, throws away every narrower choice within it.
 */
function BookMenu({
  slug,
  book,
  sources,
}: {
  slug: string;
  book: BookTab["books"][number];
  sources: BookSourceChoice[];
}) {
  const t = useTranslations("bookTabs");
  const errorText = useErrorText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Where the open menu sits, against the window: it stays out of the book columns, which would
  // otherwise re-balance around it.
  const [place, setPlace] = useState<CSSProperties>({});
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

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
    setOpen(true);
  };

  // Closes on Escape (back to the icon), a click outside or a scroll, and focuses the first item
  // of what opens.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const shut = () => {
      setOpen(false);
      setError(null);
    };
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) shut();
    };
    const away = (e: Event) => {
      if (!menu.current?.contains(e.target as Node)) shut();
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

  const choose = async (source: BookSourceChoice) => {
    if (!window.confirm(t("confirmReplace", { book: book.name, source: source.label }))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/books/${book.osis}/source`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: source.id }),
      });
      if (!res.ok) return setError(await errorCode(res));
      close(true);
      router.refresh();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={root} className={`book-menu${open ? " open" : ""}`}>
      <button
        ref={toggle}
        type="button"
        className="book-menu-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("menuFor", { book: book.name })}
        onClick={() => (open ? close(false) : show())}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open ? (
        <div ref={menu} role="menu" style={place} aria-label={t("newBaseFor", { book: book.name })}>
          <p className="book-menu-heading">{t("newBaseFor", { book: book.name })}</p>
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => choose(s)}
            >
              {s.label}
              {s.id === book.source ? <small> {t("current")}</small> : null}
            </button>
          ))}
          {error ? (
            <p role="alert" className="error">
              {errorText(error)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
