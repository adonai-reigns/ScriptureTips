import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../account/api.ts";
import { myCompilations } from "../compilations/api.ts";
import { translations } from "../reader/api.ts";
import { HomeSearch } from "../reader/HomeSearch.tsx";

interface Props {
  searchParams: Promise<{ t?: string; error?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { t: translation, error } = await searchParams;
  const t = await getTranslations("site");
  const errors = await getTranslations("errors");
  const s = await getTranslations("search");
  const ta = await getTranslations("account");
  const account = await currentAccount();
  const [catalog, mine] = await Promise.all([translations().catch(() => []), myCompilations()]);
  return (
    <section className="landing">
      <div className="landing-art">
        <div className="landing-card">
          {account ? (
            // Signed in, the book is how to reach the account page (the header has nothing here).
            // It looks like the plain logo: nothing marks it as a link.
            <a href="/account" className="landing-logo" aria-label={ta("yourAccount")}>
              <Image src="/brand/logo-128.png" width={128} height={128} alt="" />
            </a>
          ) : (
            <Image src="/brand/logo-128.png" width={128} height={128} alt="" />
          )}
          <h1>{t("name")}</h1>
          <p>{t("tagline")}</p>
        </div>
      </div>
      <HomeSearch
        initial={translation ?? "leb"}
        compilations={mine.map((c) => ({ id: c.id, label: `${c.abbreviation}: ${c.title}` }))}
        translations={catalog.map((tr) => ({ id: tr.id, label: `${tr.abbreviation}: ${tr.name}` }))}
        labels={{
          translation: s("translation"),
          field: s("homeField"),
          placeholder: s("homePlaceholder"),
          initial: s("homeInitial"),
          button: s("homeGo"),
          yours: s("yourCompilations"),
          all: s("translations"),
        }}
      />
      {error ? (
        <p className="error" role="alert">
          {errors.has(error) ? errors(error) : errors("unavailable")}
        </p>
      ) : null}
      {account ? null : (
        <p className="landing-signin">
          <a href="/sign-in">{ta("signIn")}</a>
        </p>
      )}
    </section>
  );
}
