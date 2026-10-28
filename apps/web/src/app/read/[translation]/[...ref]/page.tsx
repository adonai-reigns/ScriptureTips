import { parseOsisPassage } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../../account/api.ts";
import { books, passage } from "../../../../reader/api.ts";
import {
  arrangeBooks,
  type ChapterRef,
  neighbors,
  readingOrder,
} from "../../../../reader/books.ts";
import { Passage } from "../../../../reader/Passage.tsx";
import { bookSlug, referenceFor } from "../../../../reader/paths.ts";
import { SearchForm } from "../../../../reader/SearchForm.tsx";

interface Props {
  params: Promise<{ translation: string; ref: string[] }>;
}

async function load({ params }: Props) {
  const { translation, ref } = await params;
  const reference = referenceFor(ref);
  if (!reference) notFound();
  return { translation, reference, result: await passage(translation, reference) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { result } = await load(props);
  if (!result.ok) return {};
  const t = await getTranslations("reader");
  const label = result.passages.map((p) => p.label).join("; ");
  return { title: t("title", { passage: label, translation: result.translation.abbreviation }) };
}

export default async function Read(props: Props) {
  const [{ translation, reference, result }, account] = await Promise.all([
    load(props),
    currentAccount(),
  ]);
  const t = await getTranslations("errors");
  const tr = await getTranslations("reader");
  const canon = account?.canon ?? null;
  // Previous and next chapters, in the reader's canon order, for a single passage.
  const only = result.ok && result.passages.length === 1 ? result.passages[0] : undefined;
  let around: { previous?: ChapterRef; next?: ChapterRef } = {};
  if (only) {
    const available = await books(translation).catch(() => null);
    const { start, end } = parseOsisPassage(only.entered);
    if (available)
      around = neighbors(
        readingOrder(arrangeBooks(available, canon)),
        start.book,
        start.chapter,
        end.chapter,
      );
  }
  const chapterLink = (c: ChapterRef, key: "previous" | "next") => (
    <a
      href={`/read/${translation}/${bookSlug(c.osis)}/${c.chapter}`}
      rel={key === "previous" ? "prev" : "next"}
    >
      {tr(key, { chapter: `${english.name(c.osis, "full", "one")} ${c.chapter}` })}
    </a>
  );
  if (!result.ok && result.code === "unknown-translation") notFound();
  return (
    <div className="reader">
      <SearchForm translation={translation} reference={reference} />
      {result.ok ? (
        result.passages.map((p, i) => (
          <Passage
            key={p.entered}
            passage={p}
            index={i}
            direction={result.translation.direction}
            canon={canon}
          />
        ))
      ) : (
        <p className="error" role="alert">
          {t.has(result.code) ? t(result.code) : t("unavailable")}
        </p>
      )}
      {result.ok ? (
        <nav className="chapter-nav" aria-label={tr("chapterNav")}>
          <span>{around.previous ? chapterLink(around.previous, "previous") : null}</span>
          <a href={`/read/${translation}`}>{tr("books")}</a>
          <span>{around.next ? chapterLink(around.next, "next") : null}</span>
        </nav>
      ) : null}
      {result.ok ? <p className="translation-credit">{result.translation.name}</p> : null}
    </div>
  );
}
