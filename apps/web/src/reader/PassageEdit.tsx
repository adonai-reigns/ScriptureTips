"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "../hydrated.ts";

export interface TranslationOption {
  readonly id: string;
  readonly label: string;
}

/**
 * The reader's translation, as a select at the top of the page. Choosing another opens the same
 * passage in it (the form's GET, like the reader's passage form always was).
 */
export function TranslationPicker({
  current,
  reference,
  compilations,
  translations,
  labels,
}: {
  current: string;
  reference: string;
  compilations: readonly TranslationOption[];
  translations: readonly TranslationOption[];
  labels: { translation: string; yours: string; all: string };
}) {
  const hydrated = useHydrated();
  return (
    <form className="reader-translation" action="/read" method="get">
      <input type="hidden" name="ref" value={reference} />
      <label>
        <span className="visually-hidden">{labels.translation}</span>
        <select
          name="t"
          value={current}
          disabled={!hydrated}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
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
    </form>
  );
}

/**
 * The passage's bold title, edited in place: pressing it turns it into a field, with a Read
 * button beside it, to type another passage or range ("John 3:16", "Joel 2:28–32"). Escape puts
 * the title back. Reading it is the reader's GET form, so it needs no script to go.
 */
export function PassageTitle({
  translation,
  title,
  direction,
  labels,
}: {
  translation: string;
  title: string;
  direction: "ltr" | "rtl";
  labels: { change: string; field: string; read: string };
}) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (!editing)
    return (
      <h1 className="passage-label passage-title" dir={direction}>
        <button
          type="button"
          className="passage-title-button"
          disabled={!hydrated}
          title={labels.change}
          onClick={() => setEditing(true)}
        >
          {title}
          {/* A pencil, so it's known to be editable. */}
          <svg
            className="passage-title-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </h1>
    );
  return (
    <form
      className="passage-title-form"
      action="/read"
      method="get"
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
      // Leaving the field (and its button) puts the title back.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false);
      }}
    >
      <input type="hidden" name="t" value={translation} />
      <input
        ref={input}
        name="ref"
        aria-label={labels.field}
        defaultValue={title}
        required
        maxLength={200}
      />
      {/* Pressing it keeps the focus in the field (some browsers don't focus a button), so the
          press isn't taken for leaving. */}
      <button type="submit" onMouseDown={(e) => e.preventDefault()}>
        {labels.read}
      </button>
    </form>
  );
}
