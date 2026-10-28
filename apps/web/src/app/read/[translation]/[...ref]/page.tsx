import { parseOsisPassage } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { currentAccount } from "../../../../account/api.ts";
import { myCompilation } from "../../../../compilations/api.ts";
import { books, passage } from "../../../../reader/api.ts";
import { BookList } from "../../../../reader/BookList.tsx";
import {
  arrangeBooks,
  type ChapterRef,
  neighbors,
  readingOrder,
} from "../../../../reader/books.ts";
import { EDIT_MARKS, Passage } from "../../../../reader/Passage.tsx";
import { bookSlug, ownsCompilation, readerTarget, referenceFor } from "../../../../reader/paths.ts";
import { SearchForm } from "../../../../reader/SearchForm.tsx";

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
  if (
    !result.ok &&
    (result.code === "unknown-translation" || result.code === "unknown-compilation")
  )
    notFound();
  // Previous and next chapters, in the reader's canon order, for a single passage.
  const only = result.ok && result.passages.length === 1 ? result.passages[0] : undefined;
  let around: { previous?: ChapterRef; next?: ChapterRef } = {};
  if (only) {
    const available = await books(id).catch(() => null);
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
      href={`/read/${id}/${bookSlug(c.osis)}/${c.chapter}`}
      rel={key === "previous" ? "prev" : "next"}
    >
      {tr(key, { chapter: `${english.name(c.osis, "full", "one")} ${c.chapter}` })}
    </a>
  );
  // A compilation credits the translations its verses came from (vision §3.1).
  const credit =
    result.ok && result.sources
      ? tr("compiledFrom", {
          title: result.translation.name,
          sources: new Intl.ListFormat(await getLocale()).format(result.sources.map((s) => s.name)),
        })
      : result.ok
        ? result.translation.name
        : null;
  // And names who changed which translations' wording, by the mark on those verses.
  const handle = id.startsWith("@") ? (id.split("/")[0] ?? "").slice(1) : "";
  const list = new Intl.ListFormat(await getLocale());
  const notices = result.ok
    ? (["correction", "adaptation"] as const).flatMap((kind) => {
        const ids = new Set(
          result.passages.flatMap((p) =>
            p.verses.flatMap((v) => (v.edit === kind && v.source ? [v.source] : [])),
          ),
        );
        const names = (result.sources ?? []).filter((s) => ids.has(s.id)).map((s) => s.name);
        return names.length
          ? [
              {
                kind,
                text: tr(kind === "correction" ? "correctedFrom" : "adaptedFrom", {
                  mark: EDIT_MARKS[kind],
                  handle,
                  sources: list.format(names),
                }),
              },
            ]
          : [];
      })
    : [];
  return (
    <div className="reader">
      <SearchForm translation={id} reference={reference} />
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
          <a href={`/read/${id}`}>{tr("books")}</a>
          <span>{around.next ? chapterLink(around.next, "next") : null}</span>
        </nav>
      ) : null}
      {credit ? <p className="translation-credit">{credit}</p> : null}
      {notices.map((n) => (
        <p key={n.kind} className="translation-credit edit-notice">
          {n.text}
        </p>
      ))}
    </div>
  );
}
