import { getTranslations } from "next-intl/server";
import { currentAccount } from "../account/api.ts";
import { myCompilations } from "../compilations/api.ts";
import { defaultTranslation, translationOptions } from "../translations/menu.ts";
import { translations } from "./api.ts";

/**
 * Pick a translation (or one of your compilations) and type a reference. A plain GET form: it
 * works without scripts.
 */
export async function SearchForm({
  translation,
  reference,
}: {
  translation?: string;
  reference?: string;
}) {
  const t = await getTranslations("search");
  const [catalog, mine, account] = await Promise.all([
    translations().catch(() => []),
    myCompilations(),
    currentAccount(),
  ]);
  const start = translation ?? defaultTranslation(catalog, account, "leb");
  // This form works without scripts, so it has no "show all": only favorites, and what's chosen.
  const list = translationOptions(catalog, account, [start]).filter((tr) => !tr.more);
  return (
    <form className="search" action="/read" method="get">
      <label>
        <span>{t("translation")}</span>
        <select name="t" defaultValue={start}>
          {mine.length > 0 ? (
            <optgroup label={t("yourCompilations")}>
              {mine.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.abbreviation}: {c.title}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={t("translations")}>
            {list.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <label className="search-ref">
        <span>{t("reference")}</span>
        <input
          name="ref"
          defaultValue={reference}
          placeholder={t("placeholder")}
          required
          maxLength={200}
        />
      </label>
      <button type="submit">{t("go")}</button>
    </form>
  );
}
