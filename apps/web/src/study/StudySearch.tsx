"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/** The study window's search: the instance's name, which an integration can address too. */
export const STUDY_SEARCH = "study";

/**
 * The search widget in the study window: its field, and its results below as a list. Both are
 * the core search elements, bound to the "study" instance (set up in `StudyMenu`), so the
 * tooltip can send a query to it whether or not the window has been opened yet. Until a search is
 * made, the results area holds a short welcome (the widget's idle slot).
 */
export function StudySearch() {
  const t = useTranslations("reading");
  // The elements need a browser: loaded here, once the window is open.
  useEffect(() => {
    void import("@scripturetips/search/elements");
  }, []);
  return (
    <div className="study-search">
      <st-search-input instance={STUDY_SEARCH} />
      <st-search-results instance={STUDY_SEARCH}>
        <div slot="idle" className="study-welcome">
          {/* A tip card, as a row: our logo, then "Tip" over its text. */}
          <aside className="study-hint">
            <Image
              className="study-hint-icon"
              src="/brand/logo-128.png"
              width={128}
              height={128}
              alt=""
            />
            <div className="study-hint-text">
              <strong>{t("studyTipLabel")}</strong>
              <p>{t("studyTip")}</p>
            </div>
          </aside>
        </div>
      </st-search-results>
    </div>
  );
}
