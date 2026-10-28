import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../../account/api.ts";
import { myCompilation, verseEditor } from "../../../../compilations/api.ts";
import {
  RemoveVerseButton,
  UseVerseButton,
  VerseEditForm,
} from "../../../../compilations/forms.tsx";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, { ref }] = await Promise.all([params, searchParams]);
  const c = await myCompilation(slug);
  return c ? { title: typeof ref === "string" ? `${ref}: ${c.title}` : c.title } : {};
}

/**
 * One verse of a compilation (vision §3.1): how the compilation has it, every translation's
 * wording to take instead, and a form to correct or adapt a translation's wording.
 */
export default async function VerseEditorPage({ params, searchParams }: Props) {
  const account = await currentAccount();
  if (!account) redirect("/sign-in");
  const [{ slug }, { ref }] = await Promise.all([params, searchParams]);
  const c = await myCompilation(slug);
  if (!c) notFound();
  const t = await getTranslations("compilations");
  const te = await getTranslations("compilationErrors");
  const tp = await getTranslations("errors");
  const back = (
    <p>
      <a href={`/compilations/${c.slug}`}>{t("back", { title: c.title })}</a>
    </p>
  );
  const reference = typeof ref === "string" ? ref.trim() : "";
  if (!reference)
    return (
      <div className="compilation">
        {back}
        <h1>{t("verses")}</h1>
        <p>{t("needVerse")}</p>
      </div>
    );
  const found = await verseEditor(c.slug, reference);
  if (!found.ok)
    return (
      <div className="compilation">
        {back}
        <h1>{reference}</h1>
        <p className="error" role="alert">
          {te.has(found.code)
            ? te(found.code)
            : tp.has(found.code)
              ? tp(found.code)
              : te("unavailable")}
        </p>
      </div>
    );

  const v = found.verse;
  const now = v.current;
  const editable = v.options.filter((o) => o.modifiable);
  const start = editable.find((o) => o.translation.id === now.source.id) ?? editable[0];
  return (
    <div className="compilation verse-editor">
      {back}
      <h1>{v.label}</h1>

      <h2>{t("verseNow", { title: c.title })}</h2>
      <blockquote className="verse-text">{now.text}</blockquote>
      <p>
        {now.edit === "correction"
          ? t("nowCorrected", { source: now.source.abbreviation })
          : now.edit === "adaptation"
            ? t("nowAdapted", { source: now.source.abbreviation })
            : t("nowFrom", { source: now.source.abbreviation })}{" "}
        {v.choice ? (
          <RemoveVerseButton
            slug={c.slug}
            id={v.choice.id}
            label={t("removeVerseLabel", { verse: v.label })}
            text={t("resetVerse")}
          />
        ) : null}
      </p>
      {v.choice?.sourceChanged ? (
        <p className="warning">{t("sourceChanged", { source: v.choice.source.abbreviation })}</p>
      ) : null}

      <h2>{t("inEach")}</h2>
      <ul className="verse-options">
        {v.options.map((o) => {
          const inUse = !now.edit && o.translation.id === now.source.id;
          return (
            <li key={o.translation.id}>
              <strong>{o.translation.abbreviation}</strong> <small>{o.translation.name}</small>
              <p>{o.text}</p>
              {inUse ? (
                <small className="in-use">{t("inUse")}</small>
              ) : (
                <UseVerseButton
                  slug={c.slug}
                  reference={v.label}
                  source={o.translation.id}
                  label={t("useThisLabel", { source: o.translation.abbreviation })}
                />
              )}
            </li>
          );
        })}
      </ul>

      <h2>{t("editWording")}</h2>
      {start ? (
        <VerseEditForm
          key={`${now.source.id}-${now.edit ?? ""}-${now.text}`}
          slug={c.slug}
          reference={v.label}
          sources={editable.map((o) => ({
            id: o.translation.id,
            label: `${o.translation.abbreviation}: ${o.translation.name}`,
            abbreviation: o.translation.abbreviation,
            text: o.text,
            correctionLimit: o.correctionLimit,
          }))}
          initial={{
            source: start.translation.id,
            text: start.translation.id === now.source.id ? now.text : start.text,
          }}
        />
      ) : (
        <p>{t("noModifiable")}</p>
      )}
    </div>
  );
}
