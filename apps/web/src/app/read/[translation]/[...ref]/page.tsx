import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { passage } from "../../../../reader/api.ts";
import { Passage } from "../../../../reader/Passage.tsx";
import { referenceFor } from "../../../../reader/paths.ts";
import { SearchForm } from "../../../../reader/SearchForm.tsx";

interface Props {
  params: Promise<{ translation: string; ref: string[] }>;
}

async function load({ params }: Props) {
  const { translation, ref } = await params;
  const reference = referenceFor(ref);
  if (!reference) notFound();
  return { translation, reference, result: await passage(translation, reference) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { result } = await load(props);
  if (!result.ok) return {};
  const t = await getTranslations("reader");
  const label = result.passages.map((p) => p.label).join("; ");
  return { title: t("title", { passage: label, translation: result.translation.abbreviation }) };
}

export default async function Read(props: Props) {
  const { translation, reference, result } = await load(props);
  const t = await getTranslations("errors");
  if (!result.ok && result.code === "unknown-translation") notFound();
  return (
    <div className="reader">
      <SearchForm translation={translation} reference={reference} />
      {result.ok ? (
        result.passages.map((p, i) => (
          <Passage key={p.entered} passage={p} index={i} direction={result.translation.direction} />
        ))
      ) : (
        <p className="error" role="alert">
          {t.has(result.code) ? t(result.code) : t("unavailable")}
        </p>
      )}
      {result.ok ? <p className="translation-credit">{result.translation.name}</p> : null}
    </div>
  );
}
