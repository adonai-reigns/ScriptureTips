"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import type { PdfBuild } from "../compilations/api.ts";
import { errorCode, useErrorText } from "../compilations/errors.ts";
import { LocalDate } from "../dates.tsx";
import { useHydrated } from "../hydrated.ts";

/** How often a page with a build in progress asks how it's going. */
const POLL_MS = 3000;

/**
 * PDF builds of a compilation (book-designer.md §8, §9): request one, of the whole compilation or
 * some books or chapters, follow it while the worker builds it, and download its files.
 */
export function PdfBuilds({ slug, initial }: { slug: string; initial: PdfBuild[] }) {
  const t = useTranslations("pdfBuilds");
  const text = useErrorText();
  const hydrated = useHydrated();
  const [builds, setBuilds] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/compilations/${slug}/pdf-builds`;
  const pending = builds.some((b) => b.status === "queued" || b.status === "building");

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(url);
        if (res.ok) setBuilds(((await res.json()) as { builds: PdfBuild[] }).builds);
      } catch {
        // Asked again at the next tick.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [pending, url]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const scope = String(new FormData(e.currentTarget).get("scope") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(scope ? { scope } : {}),
      });
      if (!res.ok) setError(await errorCode(res));
      else {
        const { build } = (await res.json()) as { build: PdfBuild };
        setBuilds((list) => [build, ...list]);
      }
    } catch {
      setError("unavailable");
    }
    setBusy(false);
  };

  return (
    <>
      <form className="account-form" onSubmit={submit}>
        <label>
          {t("scope")}
          <input name="scope" maxLength={200} aria-describedby="pdf-scope-help" />
        </label>
        <small id="pdf-scope-help">{t("scopeHelp")}</small>
        {error ? (
          <p role="alert" className="error">
            {text(error)}
          </p>
        ) : null}
        <button type="submit" disabled={!hydrated || busy || pending}>
          {t("build")}
        </button>
      </form>
      {builds.length === 0 ? (
        <p>{t("none")}</p>
      ) : (
        <ul className="pdf-builds" aria-live="polite">
          {builds.map((b) => (
            <li key={b.id}>
              <strong>{b.scope ?? t("whole")}</strong> <LocalDate at={b.requestedAt} />{" "}
              <span className={`build-${b.status}`}>
                {b.status === "done"
                  ? t("done", { pages: b.pages ?? 0, spine: b.spine ?? 0 })
                  : t(b.status)}
              </span>
              {b.files.length > 0 ? (
                <ul>
                  {b.files.map((f) => (
                    <li key={f}>
                      <a href={`${url}/${b.id}/${f}`} download>
                        {t(`files.${f.replace(".", "-") as "book-pdf"}`)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
