import Image from "next/image";
import { getTranslations } from "next-intl/server";
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
  const [catalog, mine] = await Promise.all([translations().catch(() => []), myCompilations()]);
  return (
    <section className="landing">
      <div className="landing-art">
        <div className="landing-card">
          <Image src="/brand/logo-128.png" width={128} height={128} alt="" />
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
    </section>
  );
}
