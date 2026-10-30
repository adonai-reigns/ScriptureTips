import { getTranslations } from "next-intl/server";

/**
 * Shown for any address with nothing at it: an unknown page, or a compilation that isn't
 * published (`/p/{handle}/{slug}`), which isn't told apart from one that doesn't exist.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="not-found">
      <h1>{t("title")}</h1>
      <p>{t("text")}</p>
      <p>
        <a href="/">{t("home")}</a>
      </p>
    </div>
  );
}
