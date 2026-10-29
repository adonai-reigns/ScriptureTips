"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Verse } from "../reader/api.ts";
import { noteBody } from "../reader/layout.ts";
import { ShownText } from "../reader/ShownText.tsx";
import type { CompareView } from "./api.ts";
import { errorCode, useErrorText } from "./errors.ts";
import { type BookSourceChoice, SourceMenu } from "./SourceMenu.tsx";

/** The most translations shown beside the compilation (the API's `MAX_COMPARE`). */
const MAX_COLUMNS = 10;

/** Which comparison verse is chosen for a row: row index to column index. */
type Selection = Map<number, number>;

const label = (v: Verse) => v.published ?? (v.to ? `${v.verse}–${v.to}` : String(v.verse));

function VerseText({ verse, number }: { verse: Verse; number: string }) {
  return (
    <>
      {verse.headings.map((h, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a verse's headings never reorder.
        <span key={i} className="compare-heading">
          <ShownText nodes={noteBody(h.content)} />
        </span>
      ))}
      <sup className="compare-number">{number}</sup> <ShownText nodes={noteBody(verse.content)} />
    </>
  );
}

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrolls = view.columns.length > 3;
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
    return saveColumns(ids);
  };

  /** A new column after `index`, showing the first translation not shown yet. */
  const addColumn = (index: number) => {
    const more = options.find((o) => !columnIds.includes(o.id));
    if (more) return saveColumns(columnIds.toSpliced(index + 1, 0, more.id));
  };
  const canAdd = columnIds.length < MAX_COLUMNS && options.some((o) => !columnIds.includes(o.id));

  const removeColumn = (index: number) => saveColumns(columnIds.filter((_, i) => i !== index));

  const saveColumns = async (ids: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/compare-with`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ translations: [...new Set(ids)] }),
      });
      if (!res.ok) setError(await errorCode(res));
      else router.refresh();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  // The chapter's one source, if every verse comes from the same translation.
  const chapterSources = new Set(view.rows.map((r) => r.verse.source ?? baseId));
  const chapterSource = chapterSources.size === 1 ? [...chapterSources][0] : undefined;

  return (
    <div className={`compare compare-${mode}`} aria-busy={busy}>
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
        style={{ "--columns": view.columns.length + 1 } as CSSProperties}
      >
        <table className="compare-grid">
          <caption className="visually-hidden">{view.label}</caption>
          <colgroup>
            <col className="compare-own" />
            {view.columns.map((column) => (
              <col key={column.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="compare-own">
                {abbreviation}
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
                <th scope="col" key={column.id}>
                  <label>
                    <span className="visually-hidden">{t("columnLabel", { n: i + 1 })}</span>
                    <select
                      value={column.id}
                      disabled={busy}
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
                    disabled={busy || !canAdd}
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
                      disabled={busy}
                      aria-label={t("removeColumn", { source: column.abbreviation })}
                      title={t("removeTooltip")}
                      onClick={() => removeColumn(i)}
                    >
                      ×
                    </button>
                  ) : null}
                  {mode === "edit" && !column.compilable ? (
                    <small className="compare-note">{t("notCompilable")}</small>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r, row) => {
              const from = r.verse.source;
              const tag = r.verse.rendering
                ? t(r.verse.rendering)
                : r.verse.edit
                  ? t(r.verse.edit, { source: sourceNames[from ?? ""] ?? "" })
                  : from && from !== baseId
                    ? (sourceNames[from] ?? from)
                    : null;
              return (
                <tr key={`${r.verse.chapter}.${r.verse.verse}`}>
                  <td className="compare-own">
                    <VerseText verse={r.verse} number={label(r.verse)} />
                    {tag ? <small className="compare-tag"> {tag}</small> : null}
                  </td>
                  {view.columns.map((column, col) => {
                    const verses = r.compare[col] ?? [];
                    const text = verses.map((v) => (
                      <VerseText
                        key={`${v.chapter}.${v.verse}`}
                        verse={v}
                        number={
                          v.chapter === r.verse.chapter ? label(v) : `${v.chapter}:${label(v)}`
                        }
                      />
                    ));
                    const takeable = mode === "edit" && column.compilable && verses.length > 0;
                    return (
                      <td key={column.id} dir={column.direction}>
                        {takeable ? (
                          <button
                            type="button"
                            className={`compare-take${selection.get(row) === col ? " picked" : ""}`}
                            aria-pressed={selection.get(row) === col}
                            disabled={busy}
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
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
