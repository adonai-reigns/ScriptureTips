import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../account/api.ts";
import { books, translations } from "../../../reader/api.ts";
import { arrangeBooks } from "../../../reader/books.ts";
import { bookSlug } from "../../../reader/paths.ts";

interface Props {
  params: Promise<{ translation: string }>;
}

async function load({ params }: Props) {
  const { translation } = await params;
  const [found, all] = await Promise.all([books(translation), translations()]);
  const summary = all.find((t) => t.id === translation);
  if (!found || !summary) notFound();
  return { translation, summary, found };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { summary } = await load(props);
  return {
    title: (await getTranslations("reader"))("booksTitle", { translation: summary.abbreviation }),
  };
}

/** A translation's books in the reader's canon order; each opens to show its chapters. */
export default async function Books(props: Props) {
  const [{ translation, summary, found }, account] = await Promise.all([
    load(props),
    currentAccount(),
  ]);
  const t = await getTranslations("reader");
  const canon = account?.canon ?? null;
  const name = (osis: string) => english.name(osis, "full", "several");
  const chapters = (osis: string, list: readonly number[]) => (
    <ol className="chapters">
      {list.map((c) => (
        <li key={c}>
          <a
            href={`/read/${translation}/${bookSlug(osis)}/${c}`}
            aria-label={t("chapterLink", { book: english.name(osis, "full", "one"), chapter: c })}
          >
            {c}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="book-list" dir={summary.direction}>
      <h1>{t("booksTitle", { translation: summary.abbreviation })}</h1>
      {canon ? null : <p className="canon-note">{t(account ? "noCanon" : "noCanonSignedOut")}</p>}
      {arrangeBooks(found, canon).map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h2 id={`section-${section.id}`}>{t(`section.${section.id}`)}</h2>
          <ul className="books">
            {section.books.map((b) => (
              <li key={b.osis}>
                <details>
                  <summary>{name(b.osis)}</summary>
                  {chapters(b.osis, b.chapters)}
                  {b.parts.map((p) => (
                    <div key={p.osis} className="book-part">
                      <h3>{name(p.osis)}</h3>
                      {chapters(p.osis, p.chapters)}
                    </div>
                  ))}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="translation-credit">{summary.name}</p>
    </div>
  );
}
