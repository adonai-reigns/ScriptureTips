"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Verse } from "../reader/api.ts";
import type { VerseEditor } from "./api.ts";
import { VerseHeadings } from "./CompareVerse.tsx";
import { errorCode, useErrorText } from "./errors.ts";

/**
 * A verse's wording changed in place, in the editor's edit mode (clicked on a computer, double
 * tapped on a phone): a translation's wording, corrected or adapted (domain-model §2.3,
 * `edited`; the API decides which, by the correction limit). It starts from the translation
 * `source` (the one shown), or the one the verse has now. Its headings and number stay as they're
 * shown, so the verse doesn't move. Leaving it (or Enter) saves a change;
 * Escape drops it. The user's own wording, a translation whose license forbids changes, and the
 * verse's notes are changed on the verse's page.
 */
export function VerseInPlace({
  slug,
  reference,
  source,
  shown,
  number,
  onClose,
}: {
  slug: string;
  /** The verse, as the API takes it ("Genesis 1:3"). */
  reference: string;
  /** The translation to start from (catalog ID); the verse's own source if not given. */
  source?: string | undefined;
  /** The verse as it's shown now, for its headings. */
  shown?: Verse | undefined;
  /** Its number, as it's shown. */
  number: string;
  /** Closed: saved (`true`) or left unchanged. */
  onClose: (saved: boolean) => void;
}) {
  const t = useTranslations("verseInPlace");
  const errorText = useErrorText();
  const router = useRouter();
  const [verse, setVerse] = useState<VerseEditor | null>(null);
  const [start, setStart] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const lead = useRef<HTMLSpanElement>(null);
  // The first line starts after the number, as the verse's words do.
  const [indent, setIndent] = useState(0);
  // Set once it's closing, so the blur that follows doesn't save or close again.
  const done = useRef(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/compilations/${slug}/verses?${new URLSearchParams({ ref: reference })}`)
      .then(async (res) => {
        if (!live) return;
        if (!res.ok) return setError(await errorCode(res));
        const v = (await res.json()) as VerseEditor;
        const id = source ?? v.current.source?.id;
        const option = v.options.find((o) => o.translation.id === id);
        const from =
          id === v.current.source?.id && v.current.origin === "edited"
            ? v.current.text
            : (option?.text ?? "");
        setVerse(v);
        setStart(from);
        setText(from);
      })
      .catch(() => live && setError("unavailable"));
    return () => {
      live = false;
    };
  }, [slug, reference, source]);

  // Focused once loaded (the caret at the end, or the note when it can't be changed here).
  useEffect(() => {
    if (!verse) return;
    const el = box.current;
    if (el) {
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    } else note.current?.focus({ preventScroll: true });
  }, [verse]);
  // (After each render: React skips the update when the width is the same.)
  useLayoutEffect(() => {
    setIndent(lead.current?.offsetWidth ?? 0);
  });
  // Tall enough for the whole verse.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  });

  const id = source ?? verse?.current.source?.id;
  const option = verse?.options.find((o) => o.translation.id === id);
  const own = !source && (verse?.current.origin === "own" || verse?.current.origin === "pasted");

  const close = (saved: boolean) => {
    done.current = true;
    onClose(saved);
  };

  const save = async () => {
    if (done.current || busy) return;
    if (!option || text.trim() === start.trim() || text.trim() === "") return close(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/compilations/${slug}/verses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference,
          source: option.translation.id,
          text: text.trim(),
          kind: "correction",
          changeNote: "",
        }),
      });
      if (!res.ok) return setError(await errorCode(res));
      close(true);
      router.refresh();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  const page = `/compilations/${slug}/verse?${new URLSearchParams({ ref: reference })}`;

  return (
    <div className="verse-in-place">
      {shown ? <VerseHeadings verse={shown} /> : null}
      {!verse && !error ? <p className="verse-in-place-note">{t("loading")}</p> : null}
      {verse && (own || !option?.modifiable) ? (
        // Nothing to change here: a tap elsewhere closes it.
        <p
          ref={note}
          tabIndex={-1}
          className="verse-in-place-note"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) close(false);
          }}
        >
          {own
            ? t.rich("own", { link: (chunks) => <a href={page}>{chunks}</a> })
            : t("locked", { source: option?.translation.abbreviation ?? "" })}
        </p>
      ) : null}
      {verse && !own && option?.modifiable ? (
        <div className="verse-in-place-text">
          <span ref={lead} className="verse-in-place-number" aria-hidden="true">
            <sup className="compare-number">{number}</sup>
            {"\u00a0"}
          </span>
          <textarea
            ref={box}
            style={{ textIndent: indent }}
            value={text}
            maxLength={5000}
            readOnly={busy}
            aria-label={t("wording", { verse: reference })}
            onChange={(e) => setText(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                close(false);
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                save();
              }
            }}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}
