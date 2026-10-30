"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  Fragment,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { Verse } from "../reader/api.ts";
import type { CompareView } from "./api.ts";
import { CompareList } from "./CompareList.tsx";
import { VerseText, verseLabel } from "./CompareVerse.tsx";
import { errorCode, useErrorText } from "./errors.ts";
import { InPlaceField } from "./forms.tsx";
import { type BookSourceChoice, SourceMenu } from "./SourceMenu.tsx";

/** The most translations shown beside the compilation (the API's `MAX_COMPARE`). */
export const MAX_COLUMNS = 10;

/** Which comparison verse is chosen for a row: row index to column index. */
type Selection = Map<number, number>;

/**
 * The compilation beside up to three translations, verse by verse (the editor's compare and
 * edit modes): one grid row per verse of the compilation, so each translation's verses start
 * level with the verse they match. Each column's translation is chosen in its header and saved
 * with the compilation; its + adds a column after it (up to ten), and its × removes it.
 *
 * In edit mode a comparison verse can be taken into the compilation: a click takes it at once;
 * Shift-click marks the first verse of a run and Shift-click again its last (same column), taken
 * when Shift is let go. Escape drops what's picked.
 */
export function CompareGrid({
  slug,
  view,
  mode,
  bookName,
  abbreviation,
  baseId,
  columnIds,
  options,
  sourceNames,
  chapterOsis,
  sources,
}: {
  /** The chapter shown, in OSIS (`Gen.1`), to give it a new source in edit mode. */
  chapterOsis: string;
  /** The translations a chapter can be taken from (their licenses allow compiling). */
  sources: BookSourceChoice[];
  slug: string;
  view: CompareView;
  mode: "compare" | "edit";
  /** The book's name as references take it ("Psalm"), for the verses taken. */
  bookName: string;
  /** The compilation's abbreviation, heading its own column. */
  abbreviation: string;
  baseId: string;
  /** The translation in each comparison column (catalog IDs), as shown. */
  columnIds: string[];
  /** Every translation a column can show. */
  options: { id: string; label: string }[];
  /** Abbreviations by catalog ID, to say where each of the compilation's verses comes from. */
  sourceNames: Record<string, string>;
}) {
  const t = useTranslations("reading");
  const errorText = useErrorText();
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(new Map());
  const picked = useRef<Selection>(selection);
  const anchor = useRef<{ row: number; col: number } | null>(null);
  const [busy, setBusy] = useState(false);
  // A changed column: saved, then shown greyed with its new choice until the page has reloaded.
  const [changing, setChanging] = useState<{ index: number; id: string } | null>(null);
  const [reloading, startReload] = useTransition();
  const loading = busy || reloading ? changing : null;
  // A new column, drawn at once (greyed, after the column it was added beside) while it's saved
  // and loaded.
  const [adding, setAdding] = useState<{ index: number; id: string } | null>(null);
  const placeholder = busy || reloading ? adding : null;
  const shownColumns = view.columns.length + (placeholder ? 1 : 0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrolls = shownColumns > 3;
  const pane = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const barWidth = useRef<HTMLDivElement>(null);

  // The table is wider than its box, which clips it (so the page, not the box, scrolls down,
  // and the headings stick to the window). The scrollbar above it slides it sideways (`--x`),
  // as do sideways wheel and trackpad movements over it, and keyboard focus moving out of view.
  useEffect(() => {
    const p = pane.current;
    const b = bar.current;
    const inner = barWidth.current;
    const table = p?.querySelector("table");
    if (!scrolls || !p || !b || !inner || !table) return;
    const size = () => {
      inner.style.width = `${table.offsetWidth}px`;
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(table);
    const slide = () => p.style.setProperty("--x", `${b.scrollLeft}px`);
    const wheel = (e: WheelEvent) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      b.scrollLeft += dx;
    };
    // What gets keyboard focus past either edge (or under the compilation's column) slides in.
    const focus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".compare-own")) return;
      // Its whole cell, so the controls beside it come into view too.
      const r = (target.closest("th, td") ?? target).getBoundingClientRect();
      const box = p.getBoundingClientRect();
      const own = p.querySelector("th.compare-own")?.getBoundingClientRect().right ?? box.left;
      if (r.right > box.right) b.scrollLeft += r.right - box.right;
      else if (r.left < own) b.scrollLeft -= own - r.left;
    };
    b.addEventListener("scroll", slide);
    p.addEventListener("wheel", wheel, { passive: false });
    p.addEventListener("focusin", focus);
    return () => {
      observer.disconnect();
      b.removeEventListener("scroll", slide);
      p.removeEventListener("wheel", wheel);
      p.removeEventListener("focusin", focus);
      p.style.removeProperty("--x");
    };
  }, [scrolls]);

  // A column being added past the right edge slides into view as soon as it's drawn.
  const addingAt = placeholder?.index;
  useEffect(() => {
    if (addingAt === undefined) return;
    const p = pane.current;
    const b = bar.current;
    const cell = p?.querySelector("th.compare-adding");
    if (!p || !b || !cell) return;
    const over = cell.getBoundingClientRect().right - p.getBoundingClientRect().right;
    if (over > 0) b.scrollLeft += over;
  }, [addingAt]);

  const select = useCallback((next: Selection) => {
    picked.current = next;
    setSelection(next);
  }, []);

  const take = useCallback(
    async (chosen: Selection) => {
      const choices = [...chosen]
        .sort(([a], [b]) => a - b)
        .flatMap(([row, col]) => {
          const r = view.rows[row];
          const column = view.columns[col];
          if (!r || !column?.compilable || (r.compare[col]?.length ?? 0) === 0) return [];
          return [
            { reference: `${bookName} ${r.verse.chapter}:${r.verse.verse}`, source: column.id },
          ];
        });
      select(new Map());
      anchor.current = null;
      if (choices.length === 0) return;
      setBusy(true);
      setError(null);
      setMessage(t("taking", { count: choices.length }));
      try {
        const res = await fetch(`/api/compilations/${slug}/verses/batch`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ choices }),
        });
        if (!res.ok) {
          setMessage(null);
          setError(await errorCode(res));
          return;
        }
        setMessage(t("taken", { count: choices.length }));
        router.refresh();
      } catch {
        setMessage(null);
        setError("unavailable");
      } finally {
        setBusy(false);
      }
    },
    [view, bookName, slug, router, t, select],
  );

  // A run picked with Shift held is taken when Shift is let go.
  useEffect(() => {
    if (mode !== "edit") return;
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift" && picked.current.size > 0) void take(picked.current);
    };
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        select(new Map());
        anchor.current = null;
      }
    };
    window.addEventListener("keyup", up);
    window.addEventListener("keydown", down);
    return () => {
      window.removeEventListener("keyup", up);
      window.removeEventListener("keydown", down);
    };
  }, [mode, take, select]);

  const onCell = (e: MouseEvent, row: number, col: number) => {
    if (busy) return;
    const next = new Map(picked.current);
    if (e.shiftKey) {
      const from = anchor.current;
      if (from && from.col === col) {
        const [first, last] = from.row <= row ? [from.row, row] : [row, from.row];
        for (let r = first; r <= last; r++)
          if ((view.rows[r]?.compare[col]?.length ?? 0) > 0) next.set(r, col);
        anchor.current = null;
      } else {
        next.set(row, col);
        anchor.current = { row, col };
      }
      select(next);
    } else void take(new Map([[row, col]]));
  };

  const chooseColumn = (index: number, id: string) => {
    const ids = [...columnIds];
    ids[index] = id;
    setChanging({ index, id });
    setAdding(null);
    return saveColumns(ids);
  };

  /** A new column after `index`, showing the first translation not shown yet. */
  const addColumn = (index: number) => {
    const more = options.find((o) => !columnIds.includes(o.id));
    if (!more) return;
    setChanging(null);
    setAdding({ index, id: more.id });
    return saveColumns(columnIds.toSpliced(index + 1, 0, more.id));
  };
  const canAdd = columnIds.length < MAX_COLUMNS && options.some((o) => !columnIds.includes(o.id));

  const removeColumn = (index: number) => {
    setChanging(null);
    setAdding(null);
    return saveColumns(columnIds.filter((_, i) => i !== index));
  };

  const saveColumns = async (ids: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/compare-with`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ translations: [...new Set(ids)] }),
      });
      if (!res.ok) {
        setChanging(null);
        setAdding(null);
        setError(await errorCode(res));
      } else startReload(() => router.refresh());
    } catch {
      setChanging(null);
      setAdding(null);
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };
  const working = busy || reloading;

  // The chapter's one source, if every verse comes from the same translation.
  /** Where a verse of the compilation comes from: own wording, an edit, or a translation. */
  const tagOf = (v: Verse) => {
    const from = v.source ?? baseId;
    if (v.rendering) return t(v.rendering);
    if (v.edit) return t(v.edit, { source: sourceNames[from] ?? "" });
    return sourceNames[from] ?? from;
  };

  const chapterSources = new Set(view.rows.map((r) => r.verse.source ?? baseId));
  const chapterSource = chapterSources.size === 1 ? [...chapterSources][0] : undefined;

  return (
    <div className={`compare compare-${mode}`} aria-busy={working}>
      {mode === "edit" ? (
        <p role="status" className="compare-status">
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {errorText(error)}
        </p>
      ) : null}
      {/* Past three columns beside the compilation's, the table slides sideways in its box, the
          compilation's column held at the left. */}
      {scrolls ? (
        // The table's scrollbar, held under the sticky head so it's always in view. Its thumb can
        // be dragged.
        <div ref={bar} className="compare-scrollbar" aria-hidden="true">
          <div ref={barWidth} />
        </div>
      ) : null}
      <div
        ref={pane}
        className={`compare-pane${scrolls ? " scrolls" : ""}`}
        style={{ "--columns": shownColumns + 1 } as CSSProperties}
      >
        <table className="compare-grid">
          <caption className="visually-hidden">{view.label}</caption>
          <colgroup>
            <col className="compare-own" />
            {view.columns.map((column, i) => (
              <Fragment key={column.id}>
                <col />
                {placeholder?.index === i ? <col /> : null}
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="compare-own">
                {/* The compilation's abbreviation, changed here in place. */}
                <InPlaceField slug={slug} field="abbreviation" value={abbreviation} />
                {mode === "edit" ? (
                  <SourceMenu
                    label={t("chapterMenu", { chapter: view.label })}
                    heading={t("chapterSource", { chapter: view.label })}
                    current={chapterSource}
                    confirmText={(source) =>
                      t("confirmChapter", { chapter: view.label, source: source.label })
                    }
                    endpoint={`/api/compilations/${slug}/chapters/${chapterOsis}/source`}
                    sources={sources}
                  />
                ) : null}
              </th>
              {view.columns.map((column, i) => (
                <Fragment key={column.id}>
                  <th scope="col" className={loading?.index === i ? "compare-loading" : undefined}>
                    <label>
                      <span className="visually-hidden">{t("columnLabel", { n: i + 1 })}</span>
                      <select
                        value={loading?.index === i ? loading.id : column.id}
                        disabled={working}
                        onChange={(e) => chooseColumn(i, e.target.value)}
                      >
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="compare-column-button"
                      disabled={working || !canAdd}
                      aria-label={t("addColumn", { source: column.abbreviation })}
                      title={t("addTooltip")}
                      onClick={() => addColumn(i)}
                    >
                      +
                    </button>
                    {view.columns.length > 1 ? (
                      <button
                        type="button"
                        className="compare-column-button"
                        disabled={working}
                        aria-label={t("removeColumn", { source: column.abbreviation })}
                        title={t("removeTooltip")}
                        onClick={() => removeColumn(i)}
                      >
                        ×
                      </button>
                    ) : null}
                    {loading?.index === i ? (
                      <small role="status" className="compare-loading-note">
                        <span className="spinner" aria-hidden="true" />
                        {t("loadingColumn")}
                      </small>
                    ) : null}
                    {mode === "edit" && !column.compilable ? (
                      <small className="compare-note">{t("notCompilable")}</small>
                    ) : null}
                  </th>
                  {placeholder?.index === i ? (
                    <th scope="col" className="compare-loading compare-adding">
                      <label>
                        <span className="visually-hidden">{t("columnLabel", { n: i + 2 })}</span>
                        <select value={placeholder.id} disabled>
                          {options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <small role="status" className="compare-loading-note">
                        <span className="spinner" aria-hidden="true" />
                        {t("loadingColumn")}
                      </small>
                    </th>
                  ) : null}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r, row) => {
              // The base's verses, unchanged, aren't marked here (the legend names it).
              const v = r.verse;
              const tag =
                v.rendering || v.edit || (v.source && v.source !== baseId) ? tagOf(v) : null;
              return (
                <tr key={`${r.verse.chapter}.${r.verse.verse}`}>
                  <td className="compare-own">
                    <VerseText verse={r.verse} number={verseLabel(r.verse)} />
                    {tag ? <small className="compare-tag"> {tag}</small> : null}
                  </td>
                  {view.columns.map((column, col) => {
                    const verses = r.compare[col] ?? [];
                    const text = verses.map((v) => (
                      <VerseText
                        key={`${v.chapter}.${v.verse}`}
                        verse={v}
                        number={
                          v.chapter === r.verse.chapter
                            ? verseLabel(v)
                            : `${v.chapter}:${verseLabel(v)}`
                        }
                      />
                    ));
                    const takeable = mode === "edit" && column.compilable && verses.length > 0;
                    return (
                      <Fragment key={column.id}>
                        <td
                          dir={column.direction}
                          className={loading?.index === col ? "compare-loading" : undefined}
                        >
                          {takeable ? (
                            <button
                              type="button"
                              className={`compare-take${selection.get(row) === col ? " picked" : ""}`}
                              aria-pressed={selection.get(row) === col}
                              disabled={working}
                              onClick={(e) => onCell(e, row, col)}
                            >
                              <span className="visually-hidden">
                                {t("takeFrom", { source: column.abbreviation })}{" "}
                              </span>
                              {text}
                            </button>
                          ) : (
                            text
                          )}
                        </td>
                        {placeholder?.index === col ? (
                          <td className="compare-loading compare-adding" />
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* On a phone, the chapter in one column instead (CSS shows one or the other). */}
      <CompareList
        tags={view.rows.map((r) => tagOf(r.verse))}
        book={chapterOsis.split(".")[0] ?? ""}
        slug={slug}
        view={view}
        mode={mode}
        bookName={bookName}
        abbreviation={abbreviation}
      />
    </div>
  );
}
