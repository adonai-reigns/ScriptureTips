import { parseOsisPassage } from "@scripturetips/passage";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../../../account/api.ts";
import { LocalDate } from "../../../../../dates.tsx";
import {
  publicationBooks,
  publicationPassage,
  publicationPath,
  type ReaderPublication,
} from "../../../../../publications/api.ts";
import { splitVersion } from "../../../../../publications/paths.ts";
import { designations, Statement } from "../../../../../reader/attributions.tsx";
import { BookList } from "../../../../../reader/BookList.tsx";
import {
  arrangeBooks,
  type ChapterRef,
  neighbors,
  readingOrder,
} from "../../../../../reader/books.ts";
import { creditLines } from "../../../../../reader/credits.ts";
import { Passage } from "../../../../../reader/Passage.tsx";
import { bookSlug, referenceFor } from "../../../../../reader/paths.ts";

interface Props {
  params: Promise<{ handle: string; slug: string; rest?: string[] }>;
}

/**
 * A published compilation (domain-model §1.6): `/p/{handle}/{slug}` lists its books, and
 * `/p/{handle}/{slug}/{book}/{chapter}[/{verses}]` reads a passage, each at its latest version
 * (if it's public) or pinned to the version whose ID ends the path. Readable without an account.
 */
async function load({ params }: Props) {
  const { handle, slug, rest = [] } = await params;
  if (!/^[a-z0-9-]{3,30}$/i.test(handle) || !/^[a-z0-9]{2,12}$/i.test(slug)) notFound();
  const { segments, version } = splitVersion(rest);
  if (segments.length === 0) {
    const found = await publicationBooks(handle, slug, version);
    if (!found) notFound();
    return { kind: "books" as const, handle, slug, version, segments, ...found };
  }
  const reference = referenceFor(segments);
  if (!reference) notFound();
  const result = await publicationPassage(handle, slug, reference, version);
  if (!result.ok && result.status === 404) notFound();
  return { kind: "passage" as const, handle, slug, version, segments, result };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const loaded = await load(props);
  const t = await getTranslations("reader");
  const p =
    loaded.kind === "books"
      ? loaded.publication
      : loaded.result.ok
        ? loaded.result.publication
        : null;
  if (!p) return {};
  const rest = loaded.segments.length ? `/${loaded.segments.join("/")}` : "";
  return {
    title:
      loaded.kind === "passage" && loaded.result.ok
        ? t("title", {
            passage: loaded.result.passages.map((x) => x.label).join("; "),
            translation: p.abbreviation,
          })
        : t("booksTitle", { translation: p.abbreviation }),
    // The pinned form is canonical; an unlisted publication stays out of search.
    alternates: { canonical: publicationPath(p.handle, p.slug, rest, p.version.id) },
    ...(p.visibility === "unlisted" ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Which version this is, a newer one if there is, and this version's permanent link. */
async function VersionNotice({
  p,
  rest,
  pinned,
}: {
  p: ReaderPublication;
  rest: string;
  pinned: boolean;
}) {
  const t = await getTranslations("reader");
  const newer = p.latest && p.latest.number > p.version.number ? p.latest : null;
  return (
    <p className="version-notice">
      {t.rich("versionPublished", {
        number: p.version.number,
        date: () => <LocalDate at={p.version.publishedAt} />,
      })}{" "}
      {newer ? (
        <a href={publicationPath(p.handle, p.slug, rest)}>
          {t("newerVersion", { number: newer.number })}
        </a>
      ) : pinned ? null : (
        <a href={publicationPath(p.handle, p.slug, rest, p.version.id)}>{t("permalink")}</a>
      )}
    </p>
  );
}

export default async function ReadPublication(props: Props) {
  const loaded = await load(props);
  const { handle, slug, version } = loaded;
  const account = await currentAccount();
  const canon = account?.canon ?? null;
  const suffix = version ? `/${version}` : "";
  const rest = loaded.segments.length ? `/${loaded.segments.join("/")}` : "";

  if (loaded.kind === "books") {
    const p = loaded.publication;
    return (
      <>
        <BookList
          id={`${p.handle}/${p.slug}`}
          abbreviation={p.abbreviation}
          name={p.title}
          direction={p.direction}
          books={loaded.books}
          canon={canon}
          signedIn={account !== null}
          href={publicationPath(handle, slug)}
          suffix={suffix}
        />
        <VersionNotice p={p} rest="" pinned={version !== undefined} />
      </>
    );
  }

  const { result } = loaded;
  const t = await getTranslations("errors");
  const tr = await getTranslations("reader");
  if (!result.ok)
    return (
      <div className="reader">
        <p className="error" role="alert">
          {t.has(result.code) ? t(result.code) : t("unavailable")}
        </p>
      </div>
    );
  const p = result.publication;
  // Previous and next chapters, in the reader's canon order, for a single passage.
  const only = result.passages.length === 1 ? result.passages[0] : undefined;
  let around: { previous?: ChapterRef; next?: ChapterRef } = {};
  if (only) {
    const available = await publicationBooks(handle, slug, version);
    const { start, end } = parseOsisPassage(only.entered);
    if (available)
      around = neighbors(
        readingOrder(arrangeBooks(available.books, canon)),
        start.book,
        start.chapter,
        end.chapter,
      );
  }
  const chapterLink = (c: ChapterRef, key: "previous" | "next") => (
    <a
      href={publicationPath(handle, slug, `/${bookSlug(c.osis)}/${c.chapter}`, version)}
      rel={key === "previous" ? "prev" : "next"}
    >
      {tr(key, { chapter: `${english.name(c.osis, "full", "one")} ${c.chapter}` })}
    </a>
  );
  const { credit, notices } = await creditLines(result, p.handle);
  const designationOf = designations(result.attributions);
  return (
    <div className="reader">
      <VersionNotice p={p} rest={rest} pinned={version !== undefined} />
      {result.passages.map((x, i) => (
        <Passage
          key={x.entered}
          passage={x}
          index={i}
          direction={result.translation.direction}
          canon={canon}
          sources={result.sources}
          designationOf={designationOf}
        />
      ))}
      <nav className="chapter-nav" aria-label={tr("chapterNav")}>
        <span>{around.previous ? chapterLink(around.previous, "previous") : null}</span>
        <a href={publicationPath(handle, slug, "", version)}>{tr("books")}</a>
        <span>{around.next ? chapterLink(around.next, "next") : null}</span>
      </nav>
      <p className="translation-credit">{credit}</p>
      {result.attributions.map((a) => (
        <Statement key={a.source} a={a} />
      ))}
      {notices.map((n) => (
        <p key={n.kind} className="translation-credit edit-notice">
          {n.text}
        </p>
      ))}
    </div>
  );
}
