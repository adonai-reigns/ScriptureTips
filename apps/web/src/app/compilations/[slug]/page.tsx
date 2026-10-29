import { canCompile } from "@scripturetips/licenses";
import { english } from "@scripturetips/reference";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../account/api.ts";
import { myCompilation } from "../../../compilations/api.ts";
import {
  AddRuleForm,
  DeleteCompilationButton,
  PublishForm,
  RemoveRuleButton,
  RemoveVerseButton,
} from "../../../compilations/forms.tsx";
import { bookSource } from "../../../compilations/sources.ts";
import { LocalDate } from "../../../dates.tsx";
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
 * with its published versions.
 */
export default async function CompilationEditor({ params }: Props) {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const c = await myCompilation((await params).slug);
  if (!c) notFound();
  const t = await getTranslations("compilations");
  const tr = await getTranslations("reader");
  const [available, all, published] = await Promise.all([
    books(c.id),
    translations().catch(() => []),
    myPublication(c.slug),
  ]);
  const scopeLabel = (r: (typeof c.rules)[number]) =>
    r.kind === "section" ? t(`sections.${r.entered as "ot" | "nt" | "additional"}`) : r.label;
  return (
    <div className="compilation">
      <h1>
        {c.title} ({c.abbreviation})
      </h1>
      <p>
        {t("builtOn", { base: c.base.abbreviation })} <a href={`/read/${c.id}`}>{t("read")}</a>
      </p>

      <h2>{t("rules")}</h2>
      {c.rules.length === 0 ? (
        <p>{t("noRules", { base: c.base.abbreviation })}</p>
      ) : (
        <ul className="rule-list">
          {c.rules.map((r) => {
            const text = t("ruleFrom", { scope: scopeLabel(r), source: r.source.abbreviation });
            return (
              <li key={r.id}>
                <span>{text}</span>
                <RemoveRuleButton
                  slug={c.slug}
                  rule={r.id}
                  label={t("removeLabel", { scope: scopeLabel(r), source: r.source.abbreviation })}
                />
              </li>
            );
          })}
        </ul>
      )}

      <h2>{t("addRule")}</h2>
      <AddRuleForm
        slug={c.slug}
        sources={all
          .filter((s) => canCompile(s.license))
          .map((s) => ({ id: s.id, label: `${s.abbreviation}: ${s.name}` }))}
      />

      <h2>{t("verses")}</h2>
      <p>{t("versesIntro")}</p>
      {c.verses.length === 0 ? (
        <p>{t("noVerses")}</p>
      ) : (
        <ul className="rule-list">
          {c.verses.map((v) => {
            const values = { verse: v.label, source: v.source?.abbreviation ?? "" };
            return (
              <li key={v.id}>
                <span>
                  {v.origin === "own"
                    ? t("verseOwn", values)
                    : v.origin === "pasted"
                      ? t("versePasted", values)
                      : v.editKind === "correction"
                        ? t("verseCorrected", values)
                        : v.editKind === "adaptation"
                          ? t("verseAdapted", values)
                          : t("verseFrom", values)}
                  {v.sourceChanged ? (
                    <small className="warning"> {t("sourceChanged", values)}</small>
                  ) : null}
                </span>
                <a
                  href={`/compilations/${c.slug}/verse?ref=${encodeURIComponent(v.label)}`}
                  aria-label={t("changeLabel", { verse: v.label })}
                >
                  {t("change")}
                </a>
                <RemoveVerseButton
                  slug={c.slug}
                  id={v.id}
                  label={t("removeVerseLabel", { verse: v.label })}
                  text={t("remove")}
                />
              </li>
            );
          })}
        </ul>
      )}
      <form className="account-form verse-open" action={`/compilations/${c.slug}/verse`}>
        <label>
          <span>{t("verseField")}</span>
          <input name="ref" required maxLength={200} />
          <small>{t("verseHelp")}</small>
        </label>
        <button type="submit">{t("openVerse")}</button>
      </form>

      <h2>{t("sources")}</h2>
      {arrangeBooks(available ?? [], account.canon).map((section) => (
        <section key={section.id} aria-labelledby={`sources-${section.id}`}>
          <h3 id={`sources-${section.id}`}>{tr(`section.${section.id}`)}</h3>
          <ul className="book-sources">
            {section.books.map((b) => {
              const s = bookSource(b.osis, c.rules, c.base);
              return (
                <li key={b.osis} className={s.rule ? "overridden" : undefined}>
                  <span>{english.name(b.osis, "full", "several")}</span>{" "}
                  <strong>{s.source.abbreviation}</strong>
                  {s.narrower > 0 ? <small> {t("narrower", { count: s.narrower })}</small> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <h2>{t("publishTitle")}</h2>
      <p>{t("publishIntro")}</p>
      <p>
        {!published
          ? t("notPublished")
          : published.visibility === "public"
            ? t.rich("publishedPublic", {
                link: (chunks) => (
                  <a href={publicationPath(published.handle, published.slug)}>{chunks}</a>
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

      <p>
        <DeleteCompilationButton slug={c.slug} title={c.title} />
      </p>
    </div>
  );
}
