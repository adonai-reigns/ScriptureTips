import { canBeBase } from "@scripturetips/licenses";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../account/api.ts";
import { myCompilations } from "../../compilations/api.ts";
import { NewCompilationForm } from "../../compilations/forms.tsx";
import { translations } from "../../reader/api.ts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("compilations"))("title") };
}

/** The signed-in user's compilations, and a form to start one (domain-model §2.3). */
export default async function Compilations() {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const t = await getTranslations("compilations");
  if (!account.handle)
    return (
      <>
        <h1>{t("title")}</h1>
        <p>
          <a href="/account">{t("needHandle")}</a>
        </p>
      </>
    );
  const [mine, all] = await Promise.all([myCompilations(), translations().catch(() => [])]);
  return (
    <div className="compilations">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      {mine.length === 0 ? (
        <p>{t("none")}</p>
      ) : (
        <ul className="compilation-list">
          {mine.map((c) => (
            <li key={c.id}>
              <a href={`/compilations/${c.slug}`}>
                <strong>{c.title}</strong> ({c.abbreviation})
              </a>
              <small>{t("builtOn", { base: c.base.abbreviation })}</small>
              <a href={`/read/${c.id}`}>{t("read")}</a>
            </li>
          ))}
        </ul>
      )}
      <h2>{t("new")}</h2>
      <NewCompilationForm
        bases={all
          .filter((tr) => canBeBase(tr.license))
          .map((tr) => ({ id: tr.id, label: `${tr.abbreviation}: ${tr.name}` }))}
      />
    </div>
  );
}
