"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef, useState } from "react";
import { useLongPress } from "./longPress.ts";
import { SourceDialog } from "./SourceDialog.tsx";
import { type BookSourceChoice, SourceMenu, type SourceMenuSpec } from "./SourceMenu.tsx";

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
 * reading area. Each tab is followed by its section's menu, to give the whole section a new
 * translation. On a phone, which can't hover to show the menus' ⋮, a long press on a tab or a
 * book opens its menu as a dialog instead.
 */
export function BookTabs({
  slug,
  tabs,
  label,
  sources,
  menus = true,
  idPrefix = "book",
}: {
  slug: string;
  tabs: BookTab[];
  label: string;
  sources: BookSourceChoice[];
  /** The sections' and books' menus; left out where the tabs only pick a book. */
  menus?: boolean;
  /** Starts the tabs' and panel's IDs, unique when the tabs show twice on a page. */
  idPrefix?: string;
}) {
  const t = useTranslations("bookTabs");
  // Opens on the section of the book being read.
  const [current, setCurrent] = useState(
    (tabs.find((tab) => tab.books.some((b) => b.current)) ?? tabs[0])?.id,
  );
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // The tab (or its menu) under the pointer: its menu's icon shows, as a book's does on hover.
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = tabs.find((t) => t.id === current) ?? tabs[0];
  // The menu a long press opened.
  const [pressed, setPressed] = useState<SourceMenuSpec | null>(null);
  const longPress = useLongPress(setPressed);

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
  // A section's one source, if every book in it comes from the same translation.
  const sectionSource = (tab: BookTab) => {
    const all = new Set(tab.books.map((b) => b.source));
    return all.size === 1 ? [...all][0] : undefined;
  };
  const sectionMenu = (tab: BookTab): SourceMenuSpec => ({
    heading: t("newBaseForSection", { section: tab.label }),
    current: sectionSource(tab),
    confirmText: (source) => t("confirmSection", { section: tab.label, source: source.label }),
    endpoint: `/api/compilations/${slug}/sections/${tab.id}/source`,
  });
  const bookMenu = (b: BookTab["books"][number]): SourceMenuSpec => ({
    heading: t("newBaseFor", { book: b.name }),
    current: b.source,
    confirmText: (source) => t("confirmReplace", { book: b.name, source: source.label }),
    endpoint: `/api/compilations/${slug}/books/${b.osis}/source`,
  });
  return (
    <div className="book-tabs">
      <div className="book-tabs-bar">
        <div role="tablist" aria-label={label}>
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${tab.id}`}
              aria-selected={tab.id === selected.id}
              aria-controls={`${idPrefix}-panel-${tab.id}`}
              tabIndex={tab.id === selected.id ? 0 : -1}
              style={{ order: 2 * i }}
              {...(menus ? longPress(sectionMenu(tab)) : {})}
              onPointerEnter={() => setHovered(tab.id)}
              onPointerLeave={() => setHovered(null)}
              onClick={(e) => {
                if (menus) longPress(sectionMenu(tab)).onClick(e);
                if (!e.defaultPrevented) setCurrent(tab.id);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Outside the tab list, which may hold only tabs; each is placed after its tab. */}
        {(menus ? tabs : []).map((tab, i) => (
          <div
            key={tab.id}
            className={`book-tab-menu${hovered === tab.id ? " shown" : ""}`}
            style={{ order: 2 * i + 1 }}
            onPointerEnter={() => setHovered(tab.id)}
            onPointerLeave={() => setHovered(null)}
          >
            <SourceMenu
              label={t("menuForSection", { section: tab.label })}
              {...sectionMenu(tab)}
              sources={sources}
            />
          </div>
        ))}
      </div>
      <ul
        role="tabpanel"
        id={`${idPrefix}-panel-${selected.id}`}
        aria-labelledby={`${idPrefix}-tab-${selected.id}`}
      >
        {selected.books.map((b) => (
          <li key={b.osis}>
            <Link
              href={b.href}
              scroll={false}
              className={b.overridden ? "overridden" : undefined}
              aria-current={b.current ? "page" : undefined}
              {...(menus ? longPress(bookMenu(b)) : {})}
            >
              {b.name} {b.abbreviation ? <strong>{b.abbreviation}</strong> : null}
            </Link>
            {menus ? (
              <SourceMenu
                label={t("menuFor", { book: b.name })}
                {...bookMenu(b)}
                sources={sources}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <SourceDialog menu={pressed} sources={sources} onClose={() => setPressed(null)} />
    </div>
  );
}
