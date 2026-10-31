import { getTranslations } from "next-intl/server";
import type { StudyCategory } from "./types.ts";

/** The looks study mode draws, each shown as itself. Categories not listed share `other`. */
const LEGEND: readonly StudyCategory[] = [
  "person",
  "place",
  "name",
  "conjunction",
  "verb",
  "noun",
  "other",
];

export async function StudyLegend() {
  const t = await getTranslations("study");
  return (
    <ul className="study-legend" aria-label={t("legend")}>
      {LEGEND.map((category) => (
        <li key={category}>
          <span className="study-word" data-category={category}>
            {t(`category.${category}`)}
          </span>
        </li>
      ))}
      <li>
        <span className="c-study-unit">
          <span className="study-word" data-category="other">
            {t("together1")}
          </span>{" "}
          <span className="study-word" data-category="other">
            {t("together2")}
          </span>
        </span>
      </li>
      <li className="study-legend-note">{t("only")}</li>
    </ul>
  );
}
