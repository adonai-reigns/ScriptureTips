import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SearchForm } from "../reader/SearchForm.tsx";

interface Props {
  searchParams: Promise<{ t?: string; ref?: string; error?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { t: translation, ref, error } = await searchParams;
  const t = await getTranslations("site");
  const errors = await getTranslations("errors");
  return (
    <section className="landing">
      <div className="landing-art">
        <div className="landing-card">
          <Image src="/brand/logo-128.png" width={128} height={128} alt="" />
          <h1>{t("name")}</h1>
          <p>{t("tagline")}</p>
        </div>
      </div>
      <SearchForm {...(translation ? { translation } : {})} {...(ref ? { reference: ref } : {})} />
      {error ? (
        <p className="error" role="alert">
          {errors.has(error) ? errors(error) : errors("unavailable")}
        </p>
      ) : null}
    </section>
  );
}
