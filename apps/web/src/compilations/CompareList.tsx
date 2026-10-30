"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import type { CompareView } from "./api.ts";
import { VerseText, verseLabel } from "./CompareVerse.tsx";
import { errorCode, useErrorText } from "./errors.ts";
import { VerseInPlace } from "./VerseInPlace.tsx";

/** How far a finger must travel sideways for a swipe to change the translation. */
const SWIPE = 50;
/** The most time between the taps of a double tap (ms), and the most a tap may move (px). */
const DOUBLE_TAP = 350;
const TAP = 10;

/**
 * The compare and edit modes on a phone (shown instead of `CompareGrid`'s table, by screen
 * width): the chapter in one column, the compilation's wording by default. Swiping a verse left
 * shows it in the next translation it's compared with, and right the one before, round to the
 * compilation's again; the arrow keys do the same for a focused verse.
 *
 * In compare mode, the translation each verse is shown in is remembered for the user (saved a
 * moment after each swipe, without waiting on it), and shown again next time, on any device.
 *
 * In edit mode, a double tap (or Enter) changes a verse's wording in place, starting from the
 * translation it shows. A verse left showing another translation is a change not yet saved: a footer
 * held at the bottom of the window appears while there are any, to take them all into the
 * compilation, or put them back.
 */
export function CompareList({
  tags,
  book,
  slug,
  view,
  mode,
  bookName,
  abbreviation,
}: {
  /** Where each of the compilation's verses comes from ("KJV", "Own wording"), by row. */
  tags: string[];
  /** The book's OSIS ID, for the verses remembered. */
  book: string;
  slug: string;
  view: CompareView;
  mode: "compare" | "edit";
  /** The book's name, for the references of verses taken. */
  bookName: string;
  /** The compilation's abbreviation, naming its own wording. */
  abbreviation: string;
}) {
  const t = useTranslations("reading");
  // Which translation each verse shows (by row): 0 the compilation's, then each column's.
  const remembers = mode === "compare";
  const [shown, setShown] = useState<ReadonlyMap<number, number>>(
    () =>
      new Map(
        remembers
          ? view.rows.flatMap((r, row) => {
              const at = view.columns.findIndex((c) => c.id === r.shown);
              return at >= 0 ? [[row, at + 1] as const] : [];
            })
          : [],
      ),
  );
  const count = view.columns.length + 1;
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Saved a moment after the last swipe of a verse, so a run of swipes saves once. Fire and
  // forget: if it's lost, the verse just opens in the compilation's wording next time.
  const remember = (row: number, at: number) => {
    const r = view.rows[row];
    if (!remembers || !r) return;
    clearTimeout(timers.current.get(row));
    timers.current.set(
      row,
      setTimeout(() => {
        timers.current.delete(row);
        fetch(`/api/compilations/${slug}/compare-shown`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            verse: `${book}.${r.verse.chapter}.${r.verse.verse}`,
            source: at === 0 ? null : (view.columns[at - 1]?.id ?? null),
          }),
          keepalive: true,
        }).catch(() => {});
      }, 600),
    );
  };

  // The latest choices, so swipes quicker than a redraw each build on the one before.
  const latest = useRef(shown);
  latest.current = shown;
  const turn = (row: number, by: number) => {
    const at = ((latest.current.get(row) ?? 0) + by + count) % count;
    latest.current = new Map(latest.current).set(row, at);
    setShown(latest.current);
    remember(row, at);
  };
  const router = useRouter();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  // The verse being changed in place (by row), in edit mode.
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The changes to save: verses shown in a translation that can be compiled and has them (not
  // the one being changed in place, which saves itself).
  const changes =
    mode === "edit"
      ? [...shown].flatMap(([row, at]) => {
          const r = row === editing ? undefined : view.rows[row];
          const column = view.columns[at - 1];
          if (!r || !column?.compilable || (r.compare[at - 1]?.length ?? 0) === 0) return [];
          return [
            { reference: `${bookName} ${r.verse.chapter}:${r.verse.verse}`, source: column.id },
          ];
        })
      : [];

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/verses/batch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ choices: changes }),
      });
      if (!res.ok) return setError(await errorCode(res));
      // The compilation now has them as its own wording.
      setShown(new Map());
      router.refresh();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="compare-phone">
      <p id="compare-list-hint" className="visually-hidden">
        {mode === "edit" ? t("swipeEditHint") : t("swipeHint")}
      </p>
      <ol className={editing === null ? "compare-list" : "compare-list in-place"}>
        {view.rows.map((r, row) => {
          const at = shown.get(row) ?? 0;
          const column = at === 0 ? null : view.columns[at - 1];
          const verses = column ? (r.compare[at - 1] ?? []) : [r.verse];
          // Kept while it's changed in place, so the verse doesn't move.
          const label =
            at > 0 ? (
              <small className="compare-list-source">
                {column?.abbreviation}
                <span className="compare-list-dots" aria-hidden="true">
                  {Array.from({ length: count }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: one dot per translation, in order.
                    <span key={i} className={i === at ? "on" : undefined} />
                  ))}
                </span>
              </small>
            ) : (
              <small className="compare-list-source own">
                <span className="visually-hidden">{abbreviation}: </span>
                {tags[row]}
              </small>
            );
          if (editing === row)
            return (
              <li key={`${r.verse.chapter}.${r.verse.verse}`} className="compare-list-editing">
                {label}
                <VerseInPlace
                  slug={slug}
                  reference={`${bookName} ${r.verse.chapter}:${r.verse.verse}`}
                  source={column?.id}
                  shown={verses[0]}
                  number={verseLabel(verses[0] ?? r.verse)}
                  onClose={(saved) => {
                    setEditing(null);
                    // Saved, it's the compilation's own wording now.
                    if (saved) {
                      const next = new Map(shown);
                      next.delete(row);
                      setShown(next);
                    }
                  }}
                />
              </li>
            );
          return (
            <SwipeVerse
              key={`${r.verse.chapter}.${r.verse.verse}`}
              direction={column?.direction}
              onTurn={(by) => turn(row, by)}
              onEdit={mode === "edit" ? () => setEditing(row) : undefined}
            >
              {label}
              {verses.length > 0 ? (
                verses.map((v) => (
                  <VerseText
                    key={`${v.chapter}.${v.verse}`}
                    verse={v}
                    number={
                      v.chapter === r.verse.chapter
                        ? verseLabel(v)
                        : `${v.chapter}:${verseLabel(v)}`
                    }
                  />
                ))
              ) : (
                <span className="compare-list-missing">
                  {t("notIn", { source: column?.abbreviation ?? "" })}
                </span>
              )}
            </SwipeVerse>
          );
        })}
      </ol>
      {changes.length > 0 ? (
        <section className="compare-save" aria-label={t("unsavedRegion")}>
          {error ? (
            <p role="alert" className="error">
              {errorText(error)}
            </p>
          ) : (
            <p aria-live="polite">{t("unsaved", { count: changes.length })}</p>
          )}
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              setShown(new Map());
              setError(null);
            }}
          >
            {t("undoChanges")}
          </button>
          <button type="button" className="action-button" disabled={busy} onClick={save}>
            {busy ? t("saving") : t("saveChanges")}
          </button>
        </section>
      ) : null}
    </div>
  );
}

/** How long the old wording takes to fade out, and the new one to fade in (ms). */
const FADE_OUT = 120;
const FADE_IN = 180;

/**
 * One verse swiped sideways: let go past `SWIPE`, it turns to the next translation (swiped
 * left) or the one before (swiped right), fading out and the new wording fading in. Up and down
 * stay the page's scrolling (`touch-action: pan-y`).
 */
function SwipeVerse({
  direction,
  onTurn,
  onEdit,
  children,
}: {
  direction: "ltr" | "rtl" | undefined;
  onTurn: (by: 1 | -1) => void;
  /** A double tap (or Enter): changes the wording, in edit mode. */
  onEdit?: (() => void) | undefined;
  children: React.ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const lastTap = useRef(0);

  const turn = async (by: 1 | -1) => {
    const el = body.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return onTurn(by);
    // Held faded until the new wording is drawn, then faded in over it.
    const out = el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: FADE_OUT,
      easing: "ease-in",
      fill: "forwards",
    });
    await out.finished.catch(() => {});
    onTurn(by);
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN, easing: "ease-out" });
    out.cancel();
  };
  const end = (e: PointerEvent, cancelled: boolean) => {
    const from = start.current;
    if (!from || from.id !== e.pointerId) return;
    start.current = null;
    const dx = e.clientX - from.x;
    if (cancelled) return;
    if (Math.abs(dx) >= SWIPE) return turn(dx < 0 ? 1 : -1);
    // A tap: the second of two quick ones edits.
    if (!onEdit || Math.abs(dx) > TAP || Math.abs(e.clientY - from.y) > TAP) return;
    if (e.timeStamp - lastTap.current < DOUBLE_TAP) {
      lastTap.current = 0;
      onEdit();
    } else lastTap.current = e.timeStamp;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && onEdit) {
      e.preventDefault();
      return onEdit();
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    turn(e.key === "ArrowRight" ? 1 : -1);
  };

  return (
    <li
      dir={direction}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the swipe's keyboard equivalent. */}
      <div
        ref={body}
        className="compare-list-verse"
        // cspell:ignore Noninteractive
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the arrow keys turn a focused verse.
        tabIndex={0}
        aria-describedby="compare-list-hint"
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </li>
  );
}
