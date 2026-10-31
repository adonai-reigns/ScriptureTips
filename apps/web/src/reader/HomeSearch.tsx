"use client";

import { getSearch } from "@scripturetips/search";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useHydrated } from "../hydrated.ts";

/** The home page's search: its own instance of the core search, which an integration can address. */
export const HOME_SEARCH = "home";

export interface HomeOption {
  readonly id: string;
  readonly label: string;
}

/**
 * The home page's search: a translation, and the core search field (a passage, words or a
 * Strong's number), with its results underneath. Picking a passage or a verse opens it in the
 * reader, in the translation chosen. The translation narrows the search when it's one of the
 * catalog's; a compilation searches them all.
 */
export function HomeSearch({
  compilations,
  translations,
  initial,
  labels,
}: {
  compilations: readonly HomeOption[];
  translations: readonly HomeOption[];
  initial: string;
  labels: {
    translation: string;
    field: string;
    placeholder: string;
    button: string;
    yours: string;
    all: string;
  };
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const id = useId();
  const [translation, setTranslation] = useState(initial);
  const catalog = translations.some((t) => t.id === translation);

  useEffect(() => {
    void import("@scripturetips/search/elements");
  }, []);

  // The search's scope follows the translation.
  useEffect(() => {
    getSearch(HOME_SEARCH, {
      scope: {
        kinds: ["reference", "text", "original"],
        translations: catalog ? [translation] : [],
        limit: 10,
      },
      strings: { label: labels.field, placeholder: labels.placeholder, search: labels.button },
    });
  }, [translation, catalog, labels.field, labels.placeholder, labels.button]);

  // A passage or a verse picked opens in the reader.
  useEffect(
    () =>
      getSearch(HOME_SEARCH).onResultsSelect(({ result }) => {
        if (result.kind === "original") return;
        router.push(
          `/read?t=${encodeURIComponent(translation)}&ref=${encodeURIComponent(result.label)}`,
        );
      }),
    [router, translation],
  );

  return (
    <div className="home-search">
      <div className="search">
        <label>
          <span>{labels.translation}</span>
          <select
            id={id}
            value={translation}
            disabled={!hydrated}
            onChange={(e) => setTranslation(e.target.value)}
          >
            {compilations.length > 0 ? (
              <optgroup label={labels.yours}>
                {compilations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label={labels.all}>
              {translations.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="search-ref">
          <span className="search-label">{labels.field}</span>
          <st-search-input instance={HOME_SEARCH} />
        </div>
      </div>
      <st-search-results instance={HOME_SEARCH} />
    </div>
  );
}
