"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useHydrated } from "../hydrated.ts";
import { errorCode, useErrorText } from "./errors.ts";

/** A translation offered as a base or a source: `label` is "KJV: King James Version". */
export interface Choice {
  id: string;
  label: string;
}

/** Sends JSON to the API (through the web app's proxy); returns the error code, if any. */
async function send(method: "POST" | "DELETE", url: string, body?: object): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      ...(body
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
        : {}),
    });
    return res.ok ? null : await errorCode(res);
  } catch {
    return "unavailable";
  }
}

function useSubmit() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  const run = async (action: () => Promise<string | null>, done: () => void) => {
    setBusy(true);
    setError(null);
    const code = await action();
    setBusy(false);
    if (code) setError(code);
    else done();
  };
  return { error, busy, hydrated, run };
}

function ErrorText({ code }: { code: string | null }) {
  const text = useErrorText();
  return code ? (
    <p role="alert" className="error">
      {text(code)}
    </p>
  ) : null;
}

export function NewCompilationForm({ bases }: { bases: Choice[] }) {
  const t = useTranslations("compilations");
  const { error, busy, hydrated, run } = useSubmit();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const abbreviation = String(form.get("abbreviation") ?? "");
    run(
      () =>
        send("POST", "/api/compilations", {
          title: String(form.get("title") ?? ""),
          abbreviation,
          base: String(form.get("base") ?? ""),
        }),
      () => window.location.assign(`/compilations/${abbreviation.toLowerCase()}`),
    );
  };
  return (
    <form className="account-form" onSubmit={submit}>
      <label>
        <span>{t("titleField")}</span>
        <input name="title" required maxLength={100} />
        <small>{t("titleHelp")}</small>
      </label>
      <label>
        <span>{t("abbreviation")}</span>
        <input name="abbreviation" required pattern="[A-Za-z0-9]{2,12}" maxLength={12} />
        <small>{t("abbreviationHelp")}</small>
      </label>
      <label>
        <span>{t("base")}</span>
        <select name="base" required defaultValue="">
          <option value="" disabled />
          {bases.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <small>{t("baseHelp")}</small>
      </label>
      <ErrorText code={error} />
      <button type="submit" disabled={busy || !hydrated}>
        {t("create")}
      </button>
    </form>
  );
}

export function AddRuleForm({ slug, sources }: { slug: string; sources: Choice[] }) {
  const t = useTranslations("compilations");
  const router = useRouter();
  const [kind, setKind] = useState<"passage" | "section">("passage");
  const { error, busy, hydrated, run } = useSubmit();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    const form = new FormData(target);
    const scope =
      kind === "section"
        ? { section: String(form.get("section") ?? "") }
        : { reference: String(form.get("reference") ?? "") };
    run(
      () =>
        send("POST", `/api/compilations/${slug}/rules`, {
          scope,
          source: String(form.get("source") ?? ""),
        }),
      () => {
        target.reset();
        router.refresh();
      },
    );
  };
  return (
    <form className="account-form" onSubmit={submit}>
      <fieldset className="choices">
        <legend>{t("scope")}</legend>
        <label className="choice">
          <input
            type="radio"
            name="kind"
            checked={kind === "passage"}
            onChange={() => setKind("passage")}
          />
          <span>{t("scopePassage")}</span>
        </label>
        <label className="choice">
          <input
            type="radio"
            name="kind"
            checked={kind === "section"}
            onChange={() => setKind("section")}
          />
          <span>{t("scopeSection")}</span>
        </label>
      </fieldset>
      {kind === "passage" ? (
        <label>
          <span>{t("passage")}</span>
          <input name="reference" required maxLength={200} />
          <small>{t("passageHelp")}</small>
        </label>
      ) : (
        <label>
          <span>{t("section")}</span>
          <select name="section">
            {(["ot", "nt", "additional"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`sections.${s}`)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>{t("source")}</span>
        <select name="source" required defaultValue="">
          <option value="" disabled />
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <ErrorText code={error} />
      <button type="submit" disabled={busy || !hydrated}>
        {t("add")}
      </button>
    </form>
  );
}

export function RemoveRuleButton({
  slug,
  rule,
  label,
}: {
  slug: string;
  rule: string;
  label: string;
}) {
  const t = useTranslations("compilations");
  const router = useRouter();
  const { error, busy, hydrated, run } = useSubmit();
  return (
    <>
      <button
        type="button"
        className="link-button"
        aria-label={label}
        disabled={busy || !hydrated}
        onClick={() =>
          run(
            () => send("DELETE", `/api/compilations/${slug}/rules/${rule}`),
            () => router.refresh(),
          )
        }
      >
        {t("remove")}
      </button>
      <ErrorText code={error} />
    </>
  );
}

export function DeleteCompilationButton({ slug, title }: { slug: string; title: string }) {
  const t = useTranslations("compilations");
  const { error, busy, hydrated, run } = useSubmit();
  return (
    <>
      <button
        type="button"
        className="link-button danger"
        disabled={busy || !hydrated}
        onClick={() => {
          if (window.confirm(t("confirmDelete", { title })))
            run(
              () => send("DELETE", `/api/compilations/${slug}`),
              () => window.location.assign("/compilations"),
            );
        }}
      >
        {t("deleteCompilation")}
      </button>
      <ErrorText code={error} />
    </>
  );
}

/** Takes one verse from a translation, unchanged (domain-model §2.3, CompilationVerse `source`). */
export function UseVerseButton({
  slug,
  reference,
  source,
  label,
}: {
  slug: string;
  reference: string;
  source: string;
  label: string;
}) {
  const t = useTranslations("compilations");
  const router = useRouter();
  const { error, busy, hydrated, run } = useSubmit();
  return (
    <>
      <button
        type="button"
        className="secondary"
        aria-label={label}
        disabled={busy || !hydrated}
        onClick={() =>
          run(
            () => send("POST", `/api/compilations/${slug}/verses`, { reference, source }),
            () => router.refresh(),
          )
        }
      >
        {t("useThis")}
      </button>
      <ErrorText code={error} />
    </>
  );
}

/** A translation whose wording may be changed, with what the editor starts from. */
export interface Editable {
  id: string;
  label: string;
  abbreviation: string;
  text: string;
  correctionLimit: number;
}

/**
 * Corrects or adapts one translation's wording of a verse (domain-model §2.3, `edited`). The API
 * decides the kind: a change beyond the correction limit is an adaptation, whatever was chosen.
 */
export function VerseEditForm({
  slug,
  reference,
  sources,
  initial,
}: {
  slug: string;
  reference: string;
  sources: Editable[];
  /** The source to start from, and its text (the compilation's own, if it already edited it). */
  initial: { source: string; text: string };
}) {
  const t = useTranslations("compilations");
  const router = useRouter();
  const [source, setSource] = useState(initial.source);
  const [text, setText] = useState(initial.text);
  const [saved, setSaved] = useState<string | null>(null);
  const { error, busy, hydrated, run } = useSubmit();
  const from = sources.find((s) => s.id === source) ?? sources[0];
  const choose = (id: string) => {
    setSource(id);
    setText(id === initial.source ? initial.text : (sources.find((s) => s.id === id)?.text ?? ""));
  };
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const kind = String(form.get("kind") ?? "correction");
    setSaved(null);
    run(
      async () => {
        try {
          const res = await fetch(`/api/compilations/${slug}/verses`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              reference,
              source,
              text,
              kind,
              changeNote: String(form.get("changeNote") ?? ""),
            }),
          });
          if (!res.ok) return errorCode(res);
          const body = (await res.json()) as {
            choice: { origin: string; editKind: string | null; source: { abbreviation: string } };
            changes: number;
          };
          const { choice } = body;
          setSaved(
            choice.origin === "source"
              ? t("savedSource", { source: choice.source.abbreviation })
              : choice.editKind === "adaptation" && kind === "correction"
                ? t("becameAdaptation", { count: body.changes })
                : choice.editKind === "adaptation"
                  ? t("savedAdaptation")
                  : t("savedCorrection"),
          );
          return null;
        } catch {
          return "unavailable";
        }
      },
      () => router.refresh(),
    );
  };
  return (
    <form className="account-form" onSubmit={submit}>
      <label>
        <span>{t("startFrom")}</span>
        {/* Not editable until hydrated: text typed earlier would be mixed with the original. */}
        <select value={source} disabled={!hydrated} onChange={(e) => choose(e.target.value)}>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("wording")}</span>
        <textarea
          name="text"
          required
          maxLength={5000}
          rows={5}
          readOnly={!hydrated}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <fieldset className="choices">
        <legend>{t("kind")}</legend>
        <label className="choice">
          <input type="radio" name="kind" value="correction" defaultChecked />
          <span>
            <strong>{t("correction")}</strong>{" "}
            <small>{t("correctionHelp", { limit: from?.correctionLimit ?? 3 })}</small>
          </span>
        </label>
        <label className="choice">
          <input type="radio" name="kind" value="adaptation" />
          <span>
            <strong>{t("adaptation")}</strong> <small>{t("adaptationHelp")}</small>
          </span>
        </label>
      </fieldset>
      <label>
        <span>{t("changeNote")}</span>
        <input name="changeNote" maxLength={1000} />
      </label>
      <ErrorText code={error} />
      {saved ? (
        <p role="status" className="saved">
          {saved}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !hydrated}>
        {t("save")}
      </button>
    </form>
  );
}

/** Resets a single verse to inherited (domain-model §2.3); its history is kept. */
export function RemoveVerseButton({
  slug,
  id,
  label,
  text,
}: {
  slug: string;
  id: string;
  /** For screen readers: which verse. */
  label: string;
  text: string;
}) {
  const router = useRouter();
  const { error, busy, hydrated, run } = useSubmit();
  return (
    <>
      <button
        type="button"
        className="link-button"
        aria-label={label}
        disabled={busy || !hydrated}
        onClick={() =>
          run(
            () => send("DELETE", `/api/compilations/${slug}/verses/${id}`),
            () => router.refresh(),
          )
        }
      >
        {text}
      </button>
      <ErrorText code={error} />
    </>
  );
}
