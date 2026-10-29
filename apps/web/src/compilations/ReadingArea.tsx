import type { CanonId } from "@scripturetips/canon";
import { canCompile } from "@scripturetips/licenses";
import { english } from "@scripturetips/reference";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { passage, type Translation } from "../reader/api.ts";
import { type ChapterRef, neighbors } from "../reader/books.ts";
import { Passage } from "../reader/Passage.tsx";
import { type Compilation, compareView } from "./api.ts";
import { CompareGrid } from "./CompareGrid.tsx";

export type ReadingMode = "read" | "compare" | "edit";
export const READING_MODES: readonly ReadingMode[] = ["read", "compare", "edit"];

/** The editor's address for a chapter in a mode. */
export const readingHref = (osis: string, chapter: number, mode: ReadingMode): string =>
  `?${new URLSearchParams({ book: osis, chapter: String(chapter), mode })}`;

/**
 * The compilation editor's reading area: one chapter of the compilation, chosen from the book
 * tabs and the header bar (previous, next, and the chapter number's list), in one of three modes. *Read* shows the text as printed, in
 * columns; *Compare* lines it up verse by verse beside up to three translations; *Edit* does the
 * same and lets their verses be taken into the compilation (`CompareGrid`).
 */
export async function ReadingArea({
  c,
  osis,
  chapter,
  chapters,
  order,
  mode,
  canon,
  all,
}: {
  c: Compilation;
  osis: string;
  chapter: number;
  /** The book's chapters, in the compilation's numbering. */
  chapters: number[];
  /** Every chapter in reading order, for previous and next. */
  order: ChapterRef[];
  mode: ReadingMode;
  canon: CanonId | null;
  /** Every translation, for the comparison columns. */
  all: Translation[];
}) {
  const t = await getTranslations("reading");
  const bookName = english.name(osis, "full", "one");
  const ref = `${bookName} ${chapter}`;
  const { previous, next } = neighbors(order, osis, chapter, chapter);
  const chapterLabel = (to: ChapterRef) => `${english.name(to.osis, "full", "one")} ${to.chapter}`;

  // The comparison columns: those saved with the compilation, or until it has some, three.
  const others = all.filter((x) => x.id !== c.base.id);
  const columnIds = [...c.compareWith];
  for (const x of others) {
    if (columnIds.length >= 3 || c.compareWith.length > 0) break;
    if (!columnIds.includes(x.id)) columnIds.push(x.id);
  }

  let body: React.ReactNode;
  if (mode === "read") {
    const result = await passage(c.id, ref);
    body = result.ok ? (
      <div className="reading-columns">
        {result.passages.map((p, i) => (
          <Passage
            key={p.entered}
            passage={p}
            index={i}
            direction={result.translation.direction}
            canon={canon}
            sources={result.sources}
            showLabel={false}
          />
        ))}
      </div>
    ) : (
      <p className="error">{t("unavailable")}</p>
    );
  } else {
    const view = await compareView(c.slug, ref, columnIds);
    body = view ? (
      <CompareGrid
        key={`${osis}.${chapter}`}
        slug={c.slug}
        view={view}
        mode={mode}
        bookName={bookName}
        abbreviation={c.abbreviation}
        baseId={c.base.id}
        columnIds={view.columns.map((col) => col.id)}
        options={others.map((x) => ({ id: x.id, label: `${x.abbreviation}: ${x.name}` }))}
        sourceNames={Object.fromEntries(all.map((x) => [x.id, x.abbreviation]))}
        chapterOsis={`${osis}.${chapter}`}
        sources={all
          .filter((x) => canCompile(x.license))
          .map((x) => ({ id: x.id, label: `${x.abbreviation}: ${x.name}` }))}
      />
    ) : (
      <p className="error">{t("unavailable")}</p>
    );
  }

  return (
    <section className="reading" aria-labelledby="reading-title">
      {/* The modes and the chapter bar stay at the top of the window while it scrolls. */}
      <div className="reading-head">
        <nav className="reading-modes" aria-label={t("modes")}>
          {READING_MODES.map((m) => (
            <Link
              scroll={false}
              key={m}
              href={readingHref(osis, chapter, m)}
              aria-current={m === mode ? "page" : undefined}
            >
              {t(`mode.${m}`)}
            </Link>
          ))}
        </nav>
        <header className="reading-bar">
          {previous ? (
            <Link
              scroll={false}
              className="reading-step"
              href={readingHref(previous.osis, previous.chapter, mode)}
              rel="prev"
              aria-label={t("previous", { chapter: chapterLabel(previous) })}
            >
              ‹
            </Link>
          ) : (
            <span className="reading-step" aria-hidden="true" />
          )}
          {/* A new chapter's title is a new element, so the list it was picked from closes. */}
          <div className="reading-title" key={`${osis}.${chapter}`}>
            <h2 id="reading-title">
              {bookName}{" "}
              <button type="button" className="chapter-button" aria-haspopup="true">
                {chapter}
              </button>
            </h2>
            {/* Shown while the chapter number is hovered or focused, or the list itself is. */}
            <nav className="chapter-list" aria-label={t("chapters")}>
              {chapters.map((n) => (
                <Link
                  scroll={false}
                  prefetch={false}
                  key={n}
                  href={readingHref(osis, n, mode)}
                  aria-current={n === chapter ? "page" : undefined}
                >
                  {n}
                </Link>
              ))}
            </nav>
          </div>
          {next ? (
            <Link
              scroll={false}
              className="reading-step"
              href={readingHref(next.osis, next.chapter, mode)}
              rel="next"
              aria-label={t("next", { chapter: chapterLabel(next) })}
            >
              ›
            </Link>
          ) : (
            <span className="reading-step" aria-hidden="true" />
          )}
        </header>
      </div>
      {body}
    </section>
  );
}
