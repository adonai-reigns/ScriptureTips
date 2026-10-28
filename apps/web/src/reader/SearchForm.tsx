import { getTranslations } from "next-intl/server";
import { myCompilations } from "../compilations/api.ts";
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
  const [list, mine] = await Promise.all([translations().catch(() => []), myCompilations()]);
  return (
    <form className="search" action="/read" method="get">
      <label>
        <span>{t("translation")}</span>
        <select name="t" defaultValue={translation ?? "leb"}>
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
                {tr.abbreviation}: {tr.name}
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
