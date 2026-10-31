import type { CanonId } from "@scripturetips/canon";
import { english } from "@scripturetips/reference";
import { getTranslations } from "next-intl/server";
import { BookTabs } from "../compilations/BookTabs.tsx";
import { type AvailableBook, arrangeBooks } from "./books.ts";
import { bookSlug } from "./paths.ts";

/**
 * A translation's or compilation's books as the compilation editor's tabs (`BookTabs`): the
 * sections, then the books of the one chosen. A book opens at its first chapter in the reader.
 * The tabs only pick a book here, so they have no source menus.
 */
export async function ReaderTabs({
  id,
  books,
  canon,
  current,
}: {
  /** The reader ID: a translation's, or a compilation's `@handle/slug`. */
  id: string;
  books: readonly AvailableBook[];
  canon: CanonId | null;
  /** The book being read (OSIS). */
  current?: string | undefined;
}) {
  const t = await getTranslations("reader");
  const tabs = arrangeBooks(books, canon).map((section) => ({
    id: section.id,
    label: t(`section.${section.id}`),
    books: section.books.map((b) => ({
      osis: b.osis,
      name: english.name(b.osis, "full", "several"),
      source: id,
      // The tabs show a source's abbreviation beside a book only where books can differ.
      abbreviation: "",
      overridden: false,
      href: `/read/${id}/${bookSlug(b.osis)}/${b.chapters[0] ?? 1}`,
      current: b.osis === current || b.parts.some((p) => p.osis === current),
    })),
  }));
  return (
    <BookTabs
      slug={id}
      label={t("booksNav")}
      sources={[]}
      tabs={tabs}
      menus={false}
      idPrefix="read"
    />
  );
}
