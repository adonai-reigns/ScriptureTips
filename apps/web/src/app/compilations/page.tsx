import { canBeBase } from "@scripturetips/licenses";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../account/api.ts";
import { myCompilations } from "../../compilations/api.ts";
import { CompositionChart } from "../../compilations/Composition.tsx";
import { NewCompilationForm } from "../../compilations/forms.tsx";
import { ModalButton } from "../../compilations/ModalButton.tsx";
import { translations } from "../../reader/api.ts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("compilations"))("title") };
}

/**
 * The signed-in user's compilations as a list of cards (the logo, the title, and where its verses
 * come from), and under it a button opening the form that starts one (domain-model §2.3).
 */
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
        <ul className="compilation-cards">
          {mine.map((c) => (
            <li key={c.id} className="compilation-card">
              <div className="compilation-card-icon">
                <Image src="/brand/logo-128.png" width={128} height={128} alt="" />
              </div>
              <div className="compilation-card-body">
                {/* The link covers the whole card (globals.css). */}
                <a href={`/compilations/${c.slug}`} className="compilation-card-title">
                  {c.title}
                </a>
                <CompositionChart slug={c.slug} base={c.base.id} choices="" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* Design convention: the button that adds to a list sits at its bottom right. */}
      <div className="list-add">
        <ModalButton label={t("newButton")} title={t("new")} closeLabel={t("close")}>
          <NewCompilationForm
            bases={all
              .filter((tr) => canBeBase(tr.license))
              .map((tr) => ({ id: tr.id, label: `${tr.abbreviation}: ${tr.name}` }))}
          />
        </ModalButton>
      </div>
    </div>
  );
}
