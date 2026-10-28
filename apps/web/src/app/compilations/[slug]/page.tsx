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
  RemoveRuleButton,
} from "../../../compilations/forms.tsx";
import { bookSource } from "../../../compilations/sources.ts";
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
 * layered choices with "reset to inherited" (remove), and a form to add one.
 */
export default async function CompilationEditor({ params }: Props) {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const c = await myCompilation((await params).slug);
  if (!c) notFound();
  const t = await getTranslations("compilations");
  const tr = await getTranslations("reader");
  const [available, all] = await Promise.all([books(c.id), translations().catch(() => [])]);
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

      <p>
        <DeleteCompilationButton slug={c.slug} title={c.title} />
      </p>
    </div>
  );
}
