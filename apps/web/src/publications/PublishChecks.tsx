"use client";

import { useTranslations } from "next-intl";
import { Statement } from "../reader/attributions.tsx";
import type { PublishCheck } from "./api.ts";

/**
 * The pre-publish checks (domain-model §1.4, step 2): what stops publishing, what to know first,
 * the license composition, and the attributions readers will be shown.
 */
export function PublishChecks({ check }: { check: PublishCheck }) {
  const t = useTranslations("compilations");
  return (
    <section className="publish-checks" aria-label={t("checksTitle")}>
      <h3>{t("checksTitle")}</h3>
      {check.problems.length > 0 ? (
        <ul className="problems" role="alert">
          {check.problems.map((p) => (
            <li key={`${p.code}-${"source" in p ? p.source : ""}`}>
              {p.code === "pasted-verses"
                ? t("problems.pasted-verses", { verses: p.verses.join(", ") })
                : p.code === "name-restricted"
                  ? t("problems.name-restricted", { source: p.source, term: p.term })
                  : p.code === "slug-published"
                    ? t("problems.slug-published")
                    : t(`problems.${p.code}`, { source: p.source, count: p.verses ?? 0 })}
            </li>
          ))}
        </ul>
      ) : (
        <p>{t("checksPassed")}</p>
      )}
      {check.warnings.map((w) => (
        <div key={w.code} className="warnings">
          <p>{t("similarWarning")}</p>
          <ul>
            {w.verses.map((v) => (
              <li key={`${v.verse}-${v.source}`}>
                {t("similarLine", { verse: v.verse, source: v.source, score: v.score })}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p>{t("composition", { verses: check.verses })}</p>
      <ul>
        {check.sources.map((s) => (
          <li key={s.id}>
            {t("compositionLine", { name: s.name, verses: s.verses, share: s.share })}
          </li>
        ))}
        {check.own > 0 ? <li>{t("compositionOwn", { verses: check.own })}</li> : null}
      </ul>
      {check.attributions.length > 0 ? (
        <>
          <p>{t("attributionsIntro")}</p>
          {check.attributions.map((a) => (
            <Statement key={a.source} a={a} />
          ))}
        </>
      ) : null}
    </section>
  );
}
