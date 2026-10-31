import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { currentAccount } from "../../../account/api.ts";
import { books, translations } from "../../../reader/api.ts";
import { ReaderTabs } from "../../../reader/ReaderTabs.tsx";

interface Props {
  params: Promise<{ translation: string }>;
}

async function load({ params }: Props) {
  const { translation } = await params;
  const [found, all] = await Promise.all([books(translation), translations()]);
  const summary = all.find((t) => t.id === translation);
  if (!found || !summary) notFound();
  return { translation, summary, found };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { summary } = await load(props);
  return {
    title: (await getTranslations("reader"))("booksTitle", { translation: summary.abbreviation }),
  };
}

/** A translation's books. A compilation's are at `/read/@handle/slug` ([...ref]/page.tsx). */
export default async function Books(props: Props) {
  const [{ translation, summary, found }, account] = await Promise.all([
    load(props),
    currentAccount(),
  ]);
  const t = await getTranslations("reader");
  const canon = account?.canon ?? null;
  return (
    <div className="reader" dir={summary.direction}>
      <h1>{t("booksTitle", { translation: summary.abbreviation })}</h1>
      {canon ? null : <p className="canon-note">{t(account ? "noCanon" : "noCanonSignedOut")}</p>}
      <ReaderTabs id={translation} books={found} canon={canon} />
      <p className="translation-credit">{summary.name}</p>
    </div>
  );
}
