import type { CanonId } from "@scripturetips/canon";
import { canCompile } from "@scripturetips/licenses";
import { english } from "@scripturetips/reference";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { passage, type Translation } from "../reader/api.ts";
import { type ChapterRef, neighbors } from "../reader/books.ts";
import { ChapterBar } from "../reader/ChapterBar.tsx";
import { Passage } from "../reader/Passage.tsx";
import { studyWords } from "../study/api.ts";
import { StudyLegend } from "../study/StudyLegend.tsx";
import { StudyMenu } from "../study/StudyMenu.tsx";
import { StudyProvider } from "../study/StudyProvider.tsx";
import { StudySelection } from "../study/StudySelection.tsx";
import { strongsIn } from "../study/units.ts";
import { type MenuPreferences, translationOptions } from "../translations/menu.ts";
import { type Compilation, compareView } from "./api.ts";
import { CompareChoice } from "./CompareChoice.tsx";
import { CompareGrid } from "./CompareGrid.tsx";
import { LinkPending } from "./LinkPending.tsx";
import { ReadChoice } from "./ReadChoice.tsx";

export type ReadingMode = "read" | "compare" | "edit";
export const READING_MODES: readonly ReadingMode[] = ["read", "compare", "edit"];

/**
 * The editor's address for a chapter in a mode; in read mode, `read` is the translation read
 * instead of the compilation (catalog ID).
 */
export const readingHref = (
  osis: string,
  chapter: number,
  mode: ReadingMode,
  read?: string | null,
  study?: boolean,
): string =>
  `?${new URLSearchParams({
    book: osis,
    chapter: String(chapter),
    mode,
    ...(mode === "read" && read ? { read } : {}),
    // Study mode is for comparing and editing.
    ...(mode !== "read" && study ? { study: "1" } : {}),
  })}`;

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
  preferences = null,
  books,
  read,
  study = false,
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
  /** The viewer's favorite translations, for the order and "only favorites" in menus. */
  preferences?: MenuPreferences | null;
  /** The book tabs, opened from the book's name on a phone while comparing or editing. */
  books?: React.ReactNode;
  /** In read mode, the translation read instead of the compilation (catalog ID), if any. */
  read?: string | null;
  /** In compare and edit, study mode is on: words with Strong's numbers are drawn as pieces. */
  study?: boolean;
}) {
  const picker = mode !== "read" && books;
  const t = await getTranslations("reading");
  const bookName = english.name(osis, "full", "one");
  const ref = `${bookName} ${chapter}`;
  const { previous, next } = neighbors(order, osis, chapter, chapter);

  // The comparison columns: those saved with the compilation, or until it has some, three.
  const others = all.filter((x) => x.id !== c.base.id);
  const columnIds = [...c.compareWith];
  for (const x of others) {
    if (columnIds.length >= 3 || c.compareWith.length > 0) break;
    if (!columnIds.includes(x.id)) columnIds.push(x.id);
  }

  const options = translationOptions(others, preferences, columnIds);
  const abbreviations = new Map(all.map((x) => [x.id, x.abbreviation]));
  let body: React.ReactNode;
  if (mode === "read") {
    const result = await passage(read ?? c.id, ref);
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
    // What each tagged word is, for study mode: one request for the whole chapter.
    const words =
      study && view
        ? await studyWords([
            ...strongsIn(
              view.rows.flatMap((r) => [r.verse, ...r.compare.flat()].flatMap((v) => v.content)),
            ),
          ])
        : null;
    const grid = view ? (
      <CompareGrid
        key={`${osis}.${chapter}`}
        slug={c.slug}
        view={view}
        mode={mode}
        bookName={bookName}
        abbreviation={c.abbreviation}
        baseId={c.base.id}
        columnIds={view.columns.map((col) => col.id)}
        options={options}
        sourceNames={Object.fromEntries(all.map((x) => [x.id, x.abbreviation]))}
        chapterOsis={`${osis}.${chapter}`}
        sources={translationOptions(
          all.filter((x) => canCompile(x.license)),
          preferences,
        )}
      />
    ) : null;
    body = !grid ? (
      <p className="error">{t("unavailable")}</p>
    ) : words ? (
      <StudyProvider words={words}>
        {grid}
        <StudySelection />
      </StudyProvider>
    ) : (
      grid
    );
  }

  return (
    <section
      className="reading"
      aria-labelledby="reading-title"
      data-study={study && mode !== "read" ? "" : undefined}
    >
      {/* The modes and the chapter bar stay at the top of the window while it scrolls. */}
      <div className="reading-head">
        <div className="reading-tools">
          <nav className="reading-modes" aria-label={t("modes")}>
            {READING_MODES.map((m) => (
              <Link
                scroll={false}
                key={m}
                href={readingHref(osis, chapter, m, null, study)}
                aria-current={m === mode ? "page" : undefined}
              >
                {t(`mode.${m}`)}
                <LinkPending />
              </Link>
            ))}
          </nav>
          {mode !== "read" ? (
            <StudyMenu
              on={study}
              href={readingHref(osis, chapter, mode, read, !study)}
              label={t("studyToggle")}
              switchLabel={t("studySwitch")}
              closeLabel={t("studyClose")}
              searchTranslations={[...new Set([c.base.id, ...columnIds])]}
            >
              {/* What the colors mean, beside the switch: grey until word types are shown. */}
              <StudyLegend />
            </StudyMenu>
          ) : null}
          {mode === "read" ? (
            <ReadChoice
              current={read ?? c.id}
              options={[
                {
                  id: c.id,
                  abbreviation: c.abbreviation,
                  label: `${c.abbreviation}: ${c.title}`,
                  href: readingHref(osis, chapter, "read"),
                },
                ...translationOptions(all, preferences, read ? [read] : []).map((o) => ({
                  ...o,
                  abbreviation: abbreviations.get(o.id) ?? o.id,
                  href: readingHref(osis, chapter, "read", o.id),
                })),
              ]}
            />
          ) : (
            <CompareChoice
              abbreviation={c.abbreviation}
              slug={c.slug}
              chosen={columnIds}
              options={options}
            />
          )}
        </div>
        <ChapterBar
          osis={osis}
          chapter={chapter}
          chapters={chapters}
          previous={previous}
          next={next}
          href={(to, n) => readingHref(to, n, mode, read, study)}
          books={picker ? books : undefined}
        />
      </div>
      {body}
    </section>
  );
}
