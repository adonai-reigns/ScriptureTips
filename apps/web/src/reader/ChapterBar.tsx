import { english } from "@scripturetips/reference";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LinkPending } from "../compilations/LinkPending.tsx";
import type { ChapterRef } from "./books.ts";

/**
 * The blue bar over a chapter: the book's name and the chapter number (hover it for the book's
 * chapters), with arrows to the previous and next chapters. The compilation editor's reading
 * area and the reader share it; `href` is each one's address for a chapter.
 */
export async function ChapterBar({
  osis,
  chapter,
  chapters,
  previous,
  next,
  href,
  books,
}: {
  osis: string;
  chapter: number;
  /** The book's chapters, for the list under the chapter number. */
  chapters: readonly number[];
  previous?: ChapterRef | undefined;
  next?: ChapterRef | undefined;
  /** The address of a chapter. */
  href: (osis: string, chapter: number) => string;
  /** The book tabs, opened from the book's name on a phone, if the page offers them there. */
  books?: ReactNode;
}) {
  const t = await getTranslations("reading");
  const bookName = english.name(osis, "full", "one");
  const chapterLabel = (to: ChapterRef) => `${english.name(to.osis, "full", "one")} ${to.chapter}`;
  return (
    <header className="reading-bar">
      {previous ? (
        <Link
          scroll={false}
          className="reading-step"
          href={href(previous.osis, previous.chapter)}
          rel="prev"
          // Loaded ahead (in a production build), so stepping through chapters is instant.
          prefetch
          aria-label={t("previous", { chapter: chapterLabel(previous) })}
        >
          ‹
          <LinkPending />
        </Link>
      ) : (
        <span className="reading-step" aria-hidden="true" />
      )}
      {/* A new chapter's title is a new element, so the list it was picked from closes. */}
      <div className="reading-title" key={`${osis}.${chapter}`}>
        <h2 id="reading-title">
          {books ? (
            <>
              {/* On a phone the name opens the books, as a popover (closed by a tap outside). */}
              <span className="book-name">{bookName}</span>
              <button type="button" className="book-button" popoverTarget="book-picker">
                {bookName}
              </button>
            </>
          ) : (
            bookName
          )}{" "}
          <button type="button" className="chapter-button" aria-haspopup="true">
            {chapter}
          </button>
        </h2>
        {books ? (
          <nav id="book-picker" popover="auto" className="book-picker" aria-label={t("books")}>
            {books}
          </nav>
        ) : null}
        {/* Shown while the chapter number is hovered or focused, or the list itself is. */}
        <nav className="chapter-list" aria-label={t("chapters")}>
          {chapters.map((n) => (
            <Link
              scroll={false}
              prefetch={false}
              key={n}
              href={href(osis, n)}
              aria-current={n === chapter ? "page" : undefined}
            >
              {n}
              <LinkPending />
            </Link>
          ))}
        </nav>
      </div>
      {next ? (
        <Link
          scroll={false}
          className="reading-step"
          href={href(next.osis, next.chapter)}
          rel="next"
          prefetch
          aria-label={t("next", { chapter: chapterLabel(next) })}
        >
          ›
          <LinkPending />
        </Link>
      ) : (
        <span className="reading-step" aria-hidden="true" />
      )}
    </header>
  );
}
