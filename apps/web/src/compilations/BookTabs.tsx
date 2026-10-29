"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { type BookSourceChoice, SourceMenu } from "./SourceMenu.tsx";

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
    /** Opens the book in the reading area. */
    href: string;
    /** It's the book the reading area shows. */
    current: boolean;
  }[];
}

/**
 * The compilation's books by section (Old Testament, New Testament, other writings) as tabs: one
 * section's books show at a time. Arrow keys move between tabs, as the ARIA tabs pattern has it;
 * Tab moves through the books, each followed by its menu. A book's link opens it in the
 * reading area.
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
  const t = useTranslations("bookTabs");
  // Opens on the section of the book being read.
  const [current, setCurrent] = useState(
    (tabs.find((tab) => tab.books.some((b) => b.current)) ?? tabs[0])?.id,
  );
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
            <Link
              href={b.href}
              scroll={false}
              className={b.overridden ? "overridden" : undefined}
              aria-current={b.current ? "page" : undefined}
            >
              {b.name} <strong>{b.abbreviation}</strong>
            </Link>
            <SourceMenu
              label={t("menuFor", { book: b.name })}
              heading={t("newBaseFor", { book: b.name })}
              current={b.source}
              confirmText={(source) => t("confirmReplace", { book: b.name, source: source.label })}
              endpoint={`/api/compilations/${slug}/books/${b.osis}/source`}
              sources={sources}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
