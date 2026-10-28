import { getTranslations } from "next-intl/server";
import { translations } from "./api.ts";

/** Pick a translation and type a reference. A plain GET form: it works without scripts. */
export async function SearchForm({
  translation,
  reference,
}: {
  translation?: string;
  reference?: string;
}) {
  const t = await getTranslations("search");
  const list = await translations().catch(() => []);
  return (
    <form className="search" action="/read" method="get">
      <label>
        <span>{t("translation")}</span>
        <select name="t" defaultValue={translation ?? "leb"}>
          {list.map((tr) => (
            <option key={tr.id} value={tr.id}>
              {tr.abbreviation}: {tr.name}
            </option>
          ))}
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
