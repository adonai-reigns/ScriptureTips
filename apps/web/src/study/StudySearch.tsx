"use client";

import { useEffect } from "react";

/** The study window's search: the instance's name, which an integration can address too. */
export const STUDY_SEARCH = "study";

/**
 * The search widget in the study window: its field, and its results below as a list. Both are
 * the core search elements, bound to the "study" instance (set up in `StudyMenu`), so the
 * tooltip can send a query to it whether or not the window has been opened yet.
 */
export function StudySearch() {
  // The elements need a browser: loaded here, once the window is open.
  useEffect(() => {
    void import("@scripturetips/search/elements");
  }, []);
  return (
    <div className="study-search">
      <st-search-input instance={STUDY_SEARCH} />
      <st-search-results instance={STUDY_SEARCH} />
    </div>
  );
}
