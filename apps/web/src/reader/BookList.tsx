import type { CanonId } from "@scripturetips/canon";
import { english } from "@scripturetips/reference";
import { getTranslations } from "next-intl/server";
import { arrangeBooks } from "./books.ts";
import { bookSlug } from "./paths.ts";

/** A translation's or compilation's books in the reader's canon order; each opens to its chapters. */
export async function BookList({
  id,
  abbreviation,
  name,
  direction,
  books,
  canon,
  signedIn,
}: {
  /** The reader ID: a translation's, or a compilation's `@handle/slug`. */
  id: string;
  abbreviation: string;
  name: string;
  direction: "ltr" | "rtl";
  books: { osis: string; chapters: number[] }[];
  canon: CanonId | null;
  signedIn: boolean;
}) {
  const t = await getTranslations("reader");
  const bookName = (osis: string) => english.name(osis, "full", "several");
  const chapters = (osis: string, list: readonly number[]) => (
    <ol className="chapters">
      {list.map((c) => (
        <li key={c}>
          <a
            href={`/read/${id}/${bookSlug(osis)}/${c}`}
            aria-label={t("chapterLink", { book: english.name(osis, "full", "one"), chapter: c })}
          >
            {c}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="book-list" dir={direction}>
      <h1>{t("booksTitle", { translation: abbreviation })}</h1>
      {canon ? null : <p className="canon-note">{t(signedIn ? "noCanon" : "noCanonSignedOut")}</p>}
      {arrangeBooks(books, canon).map((section) => (
        <section key={section.id} aria-labelledby={`section-${section.id}`}>
          <h2 id={`section-${section.id}`}>{t(`section.${section.id}`)}</h2>
          <ul className="books">
            {section.books.map((b) => (
              <li key={b.osis}>
                <details>
                  <summary>{bookName(b.osis)}</summary>
                  {chapters(b.osis, b.chapters)}
                  {b.parts.map((p) => (
                    <div key={p.osis} className="book-part">
                      <h3>{bookName(p.osis)}</h3>
                      {chapters(p.osis, p.chapters)}
                    </div>
                  ))}
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="translation-credit">{name}</p>
    </div>
  );
}
