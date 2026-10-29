import { canCompile } from "@scripturetips/licenses";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../account/api.ts";
import { myCompilation, myPdfBuilds } from "../../../compilations/api.ts";
import { BookTabs } from "../../../compilations/BookTabs.tsx";
import { CompositionChart } from "../../../compilations/Composition.tsx";
import { DeleteCompilationForm, InPlaceField, PublishForm } from "../../../compilations/forms.tsx";
import { ModalButton } from "../../../compilations/ModalButton.tsx";
import { bookSource } from "../../../compilations/sources.ts";
import { LocalDate } from "../../../dates.tsx";
import { PdfBuilds } from "../../../pdf-builds/PdfBuilds.tsx";
import { myPublication, publicationPath } from "../../../publications/api.ts";
import { books, translations } from "../../../reader/api.ts";
import { arrangeBooks } from "../../../reader/books.ts";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await myCompilation((await params).slug);
  return c ? { title: c.title } : {};
}

/**
 * The compilation editor (vision §3.1): the composition overview (each book's source), the
 * layered choices with "reset to inherited" (remove), and a form to add one; and publishing it,
 * with its published versions; and printing it as a PDF.
 */
export default async function CompilationEditor({ params }: Props) {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const c = await myCompilation((await params).slug);
  if (!c) notFound();
  const t = await getTranslations("compilations");
  const tr = await getTranslations("reader");
  const tp = await getTranslations("pdfBuilds");
  const [available, all, published, pdfBuilds] = await Promise.all([
    books(c.id),
    translations().catch(() => []),
    myPublication(c.slug),
    myPdfBuilds(c.slug),
  ]);
  const sections = arrangeBooks(available ?? [], account.canon);
  const compilable = all.filter((s) => canCompile(s.license));
  // What the composition depends on: each choice and where it takes its verses from.
  const choices = [
    ...c.rules.map((r) => `r${r.id}:${r.source.id}`),
    ...c.verses.map((v) => `v${v.id}:${v.origin}:${v.source?.id ?? ""}`),
  ].join(",");
  return (
    <div className="compilation">
      <div className="compilation-top">
        <div className="compilation-top-side">
          <h1 className="compilation-heading">
            <Image
              src="/brand/logo-128.png"
              width={128}
              height={128}
              alt=""
              className="heading-logo"
            />
            <InPlaceField slug={c.slug} field="title" value={c.title} />
            <span className="heading-break" />
            <InPlaceField slug={c.slug} field="abbreviation" value={c.abbreviation} />
          </h1>
          <CompositionChart slug={c.slug} base={c.base.id} choices={choices} />
        </div>
        <div className="compilation-top-main">
          <BookTabs
            slug={c.slug}
            label={t("bookMenus")}
            actions={
              <>
                <ModalButton
                  label={t("publishButton")}
                  title={t("publishTitle")}
                  closeLabel={t("close")}
                >
                  <p>{t("publishIntro")}</p>
                  <p>
                    {!published
                      ? t("notPublished")
                      : published.visibility === "public"
                        ? t.rich("publishedPublic", {
                            link: (chunks) => (
                              <a href={publicationPath(published.handle, published.slug)}>
                                {chunks}
                              </a>
                            ),
                          })
                        : t("publishedUnlisted")}
                  </p>
                  <PublishForm
                    slug={c.slug}
                    visibility={published?.visibility ?? null}
                    published={published !== null}
                  />
                  {published ? (
                    <>
                      <h3>{t("versionsTitle")}</h3>
                      <ol className="versions" reversed>
                        {published.versions.map((v) => (
                          <li key={v.id}>
                            <a href={publicationPath(published.handle, published.slug, "", v.id)}>
                              {t.rich("versionLine", {
                                number: v.number,
                                date: () => <LocalDate at={v.publishedAt} />,
                              })}
                            </a>
                            {v.changedVerses !== null ? (
                              <small> {t("versionChanges", { count: v.changedVerses })}</small>
                            ) : null}
                            {v.changeNote ? <small> {v.changeNote}</small> : null}
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </ModalButton>
                <ModalButton label={tp("button")} title={tp("title")} closeLabel={t("close")}>
                  <p>{tp("intro")}</p>
                  <PdfBuilds slug={c.slug} initial={pdfBuilds} />
                </ModalButton>
                <ModalButton
                  label={t("deleteButton")}
                  title={t("deleteTitle")}
                  closeLabel={t("close")}
                  danger
                >
                  <DeleteCompilationForm slug={c.slug} title={c.title} />
                </ModalButton>
              </>
            }
            sources={compilable.map((s) => ({ id: s.id, label: `${s.abbreviation}: ${s.name}` }))}
            tabs={sections.map((section) => ({
              id: section.id,
              label: tr(`section.${section.id}`),
              books: section.books.map((b) => {
                const s = bookSource(b.osis, c.rules, c.base);
                return {
                  osis: b.osis,
                  name: english.name(b.osis, "full", "several"),
                  source: s.source.id,
                  abbreviation: s.source.abbreviation,
                  overridden: s.rule !== undefined,
                };
              }),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
