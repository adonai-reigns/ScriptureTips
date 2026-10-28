import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("credits");
  return { title: t("title") };
}

/** Every asset's credit and license (docs/branding.md §1). */
export default async function Credits() {
  const t = await getTranslations("credits");
  return (
    <section className="credits">
      <h1>{t("title")}</h1>
      <p>{t("intro")}</p>
      <ul>
        <li>
          <a href="https://www.fiverr.com/buzzzy">{t("logo")}</a>
        </li>
        <li>
          <a href="https://www.freevector.com/clouds-and-birds/">{t("background")}</a>{" "}
          <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a>
        </li>
        <li>
          {t.rich("reservedNames", {
            big: (chunks) => (
              <a href="https://github.com/marteinn/The-Big-Username-Blocklist">{chunks}</a>
            ),
            shouldbee: (chunks) => (
              <a href="https://github.com/shouldbee/reserved-usernames">{chunks}</a>
            ),
          })}
        </li>
        <li>{t("translations")}</li>
      </ul>
    </section>
  );
}
