"use client";

import { getSearch } from "@scripturetips/search";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

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
    /** What the field starts with (and the first search is for). */
    initial: string;
    button: string;
    yours: string;
    all: string;
  };
}) {
  const router = useRouter();
  const id = useId();
  const [translation, setTranslation] = useState(initial);
  const catalog = translations.some((t) => t.id === translation);

  // Why there are two fields: <st-search-input> is a web component, so it only exists once the
  // page's scripts have loaded, and the field would pop in late. A plain field, written into the
  // server's HTML, stands in its place until then (so the page never has a gap, and it still reads
  // a passage with scripts off). When the component is ready, whatever was typed, and the focus,
  // move over to it and the plain field goes.
  const [ready, setReady] = useState(false);
  const fallback = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void import("@scripturetips/search/elements")
      .then(() => customElements.whenDefined("st-search-input"))
      .then(() => {
        const typed = fallback.current?.value ?? "";
        const focused = document.activeElement === fallback.current;
        // The page opens with its example already searched, so the results show what to expect;
        // anything else typed before the component was ready is kept, and left for the visitor.
        if (typed)
          getSearch(HOME_SEARCH).setQuery(typed, typed === labels.initial ? { search: true } : {});
        setReady(true);
        if (focused)
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLElement>(`st-search-input[instance="${HOME_SEARCH}"]`)
              ?.shadowRoot?.querySelector("input")
              ?.focus(),
          );
      });
  }, [labels.initial]);

  // The search's scope follows the translation.
  useEffect(() => {
    getSearch(HOME_SEARCH, {
      scope: {
        kinds: ["reference", "text", "original"],
        translations: catalog ? [translation] : [],
        limit: 10,
        // The example verse shows whole, not cut after a few lines.
        previewLength: 600,
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
            // Named and tied to the stand-in form below, so a submit without scripts carries it.
            name="t"
            form={`${id}-fallback`}
            value={translation}
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
          {/* The stand-in field (see above): the same look as the component, gone once it's ready. */}
          {ready ? null : (
            <form id={`${id}-fallback`} className="home-fallback" action="/read" method="get">
              <input
                ref={fallback}
                name="ref"
                aria-label={labels.field}
                defaultValue={labels.initial}
                placeholder={labels.placeholder}
                maxLength={200}
                required
              />
              <button type="submit">{labels.button}</button>
            </form>
          )}
          {ready ? <st-search-input instance={HOME_SEARCH} /> : null}
        </div>
      </div>
      <st-search-results instance={HOME_SEARCH} />
    </div>
  );
}
