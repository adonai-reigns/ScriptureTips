import { parseOsisPassage } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../../account/api.ts";
import { myCompilation, myCompilations } from "../../../../compilations/api.ts";
import { books, passage, translations } from "../../../../reader/api.ts";
import {
  designations,
  Statement,
  translationAttribution,
} from "../../../../reader/attributions.tsx";
import { BookList } from "../../../../reader/BookList.tsx";
import {
  arrangeBooks,
  type ChapterRef,
  neighbors,
  readingOrder,
} from "../../../../reader/books.ts";
import { ChapterBar } from "../../../../reader/ChapterBar.tsx";
import { creditLines } from "../../../../reader/credits.ts";
import { Passage } from "../../../../reader/Passage.tsx";
import { PassageTitle, TranslationPicker } from "../../../../reader/PassageEdit.tsx";
import { bookSlug, ownsCompilation, readerTarget, referenceFor } from "../../../../reader/paths.ts";
import { ReaderTabs } from "../../../../reader/ReaderTabs.tsx";

/** How many verses each side the context button adds. */
const CONTEXT = 3;

interface Props {
  params: Promise<{ translation: string; ref: string[] }>;
}

/**
 * A passage (`/read/leb/genesis/1`, `/read/@handle/slug/genesis/1`), or a compilation's book
 * list (`/read/@handle/slug`). Compilations are shown only to their owner.
 */
async function load({ params }: Props) {
  const { translation, ref } = await params;
  const [target, account] = [readerTarget(translation, ref), await currentAccount()];
  if (!target || !ownsCompilation(target.id, account?.handle)) notFound();
  const { id, segments } = target;
  if (segments.length === 0) {
    const compilation = await myCompilation(id.split("/")[1] ?? "");
    if (!compilation) notFound();
    return { kind: "books" as const, id, account, compilation };
  }
  const reference = referenceFor(segments);
  if (!reference) notFound();
  return { kind: "passage" as const, id, account, reference, result: await passage(id, reference) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const loaded = await load(props);
  const t = await getTranslations("reader");
  if (loaded.kind === "books")
    return { title: t("booksTitle", { translation: loaded.compilation.abbreviation }) };
  if (!loaded.result.ok) return {};
  const label = loaded.result.passages.map((p) => p.label).join("; ");
  return {
    title: t("title", { passage: label, translation: loaded.result.translation.abbreviation }),
  };
}

export default async function Read(props: Props) {
  const loaded = await load(props);
  const { id, account } = loaded;
  const canon = account?.canon ?? null;
  if (loaded.kind === "books") {
    const { compilation } = loaded;
    return (
      <BookList
        id={id}
        abbreviation={compilation.abbreviation}
        name={compilation.title}
        direction={compilation.direction}
        books={(await books(id)) ?? []}
        canon={canon}
        signedIn
      />
    );
  }
  const { reference, result } = loaded;
  const t = await getTranslations("errors");
  const tr = await getTranslations("reader");
  const ts = await getTranslations("search");
  const [catalog, mine] = await Promise.all([translations().catch(() => []), myCompilations()]);
  if (
    !result.ok &&
    (result.code === "unknown-translation" || result.code === "unknown-compilation")
  )
    notFound();
  // Previous and next chapters, in the reader's canon order, for a single passage.
  const only = result.ok && result.passages.length === 1 ? result.passages[0] : undefined;
  let around: { previous?: ChapterRef; next?: ChapterRef } = {};
  const available = await books(id).catch(() => null);
  const reading =
    result.ok && result.passages[0]
      ? parseOsisPassage(result.passages[0].entered).start.book
      : undefined;
  if (only) {
    const { start, end } = parseOsisPassage(only.entered);
    if (available)
      around = neighbors(
        readingOrder(arrangeBooks(available, canon)),
        start.book,
        start.chapter,
        end.chapter,
      );
  }
  // Part of a chapter can be widened by a few verses each side, for context, until it's the whole.
  let wider: string | undefined;
  let chapterPath: string | undefined;
  if (only && !only.wholeChapters) {
    const { start, end } = parseOsisPassage(only.entered);
    if (start.chapter === end.chapter) {
      const whole = await passage(
        id,
        `${english.name(start.book, "full", "one")} ${start.chapter}`,
      );
      const numbers = whole.ok ? (whole.passages[0]?.verses ?? []).map((v) => v.to ?? v.verse) : [];
      const first = Math.min(
        ...(whole.ok ? (whole.passages[0]?.verses ?? []).map((v) => v.verse) : [1]),
      );
      const last = Math.max(...numbers, end.verse);
      const from = Math.max(first, start.verse - CONTEXT);
      const to = Math.min(last, end.verse + CONTEXT);
      chapterPath = `/read/${id}/${bookSlug(start.book)}/${start.chapter}`;
      if (from < start.verse || to > end.verse) {
        wider = from === first && to === last ? chapterPath : `${chapterPath}/${from}-${to}`;
      }
    }
  }
  const chapterLink = (c: ChapterRef, key: "previous" | "next") => (
    <a
      href={`/read/${id}/${bookSlug(c.osis)}/${c.chapter}`}
      rel={key === "previous" ? "prev" : "next"}
    >
      {tr(key, { chapter: `${english.name(c.osis, "full", "one")} ${c.chapter}` })}
    </a>
  );
  const handle = id.startsWith("@") ? (id.split("/")[0] ?? "").slice(1) : "";
  const { credit, notices } = result.ok
    ? await creditLines(result, handle)
    : { credit: null, notices: [] };
  // A translation's own attribution (the owner's private compilation reader shows none yet).
  const attribution = result.ok
    ? translationAttribution(result.translation.id, result.translation.license)
    : null;
  const designationOf = attribution
    ? designations([attribution], result.ok ? result.translation.id : undefined)
    : undefined;
  return (
    <div className="reader">
      <TranslationPicker
        current={id}
        reference={reference}
        compilations={mine.map((c) => ({ id: c.id, label: `${c.abbreviation}: ${c.title}` }))}
        translations={catalog.map((x) => ({ id: x.id, label: `${x.abbreviation}: ${x.name}` }))}
        labels={{
          translation: ts("translation"),
          yours: ts("yourCompilations"),
          all: ts("translations"),
        }}
      />
      {available ? <ReaderTabs id={id} books={available} canon={canon} current={reading} /> : null}
      {/* Held at the top of the window while the chapter scrolls, as in the editor. */}
      {only && available ? (
        <div className="reader-head">
          <ChapterBar
            osis={parseOsisPassage(only.entered).start.book}
            chapter={parseOsisPassage(only.entered).start.chapter}
            chapters={
              available.find((b) => b.osis === parseOsisPassage(only.entered).start.book)
                ?.chapters ?? []
            }
            previous={around.previous}
            next={around.next}
            href={(to, n) => `/read/${id}/${bookSlug(to)}/${n}`}
          />
        </div>
      ) : null}
      <PassageTitle
        translation={id}
        title={result.ok ? result.passages.map((p) => p.label).join("; ") : reference}
        direction={result.ok ? result.translation.direction : "ltr"}
        labels={{ change: tr("changePassage"), field: ts("reference"), read: ts("go") }}
      />
      {chapterPath ? (
        <p className="passage-context">
          {wider && wider !== chapterPath ? (
            <a href={wider} rel="nofollow">
              {tr("context", { count: CONTEXT })}
            </a>
          ) : null}
          <a href={chapterPath}>{tr("wholeChapter")}</a>
        </p>
      ) : null}
      {result.ok ? (
        result.passages.map((p, i) => (
          <Passage
            key={p.entered}
            passage={p}
            index={i}
            direction={result.translation.direction}
            canon={canon}
            sources={result.sources}
            designationOf={designationOf}
            showLabel={false}
          />
        ))
      ) : (
        <p className="error" role="alert">
          {t.has(result.code) ? t(result.code) : t("unavailable")}
        </p>
      )}
      {/* A single chapter has the bar's arrows; other passages link to the books. */}
      {result.ok && !only ? (
        <nav className="chapter-nav" aria-label={tr("chapterNav")}>
          <span>{around.previous ? chapterLink(around.previous, "previous") : null}</span>
          <a href={`/read/${id}`}>{tr("books")}</a>
          <span>{around.next ? chapterLink(around.next, "next") : null}</span>
        </nav>
      ) : null}
      {credit ? <p className="translation-credit">{credit}</p> : null}
      {attribution ? <Statement a={attribution} /> : null}
      {notices.map((n) => (
        <p key={n.kind} className="translation-credit edit-notice">
          {n.text}
        </p>
      ))}
    </div>
  );
}
