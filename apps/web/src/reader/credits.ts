import { getLocale, getTranslations } from "next-intl/server";
import type { PassageResult, Source, Translation } from "./api.ts";
import { VERSE_MARKS } from "./Passage.tsx";

/**
 * The credit lines under a passage: the translation's name, or the translations a compilation
 * or publication drew on (vision §3.1); then who corrected or adapted which translations'
 * wording, and who wrote their own, by the mark on those verses ("translated by [user]").
 */
export async function creditLines(
  result: { translation: Translation; passages: PassageResult[]; sources?: Source[] | undefined },
  /** The compiler's handle; empty for a translation. */
  handle: string,
): Promise<{ credit: string; notices: { kind: string; text: string }[] }> {
  const tr = await getTranslations("reader");
  const list = new Intl.ListFormat(await getLocale());
  const credit = result.sources
    ? tr("compiledFrom", {
        title: result.translation.name,
        sources: list.format(result.sources.map((s) => s.name)),
      })
    : result.translation.name;
  const notices: { kind: string; text: string }[] = (["correction", "adaptation"] as const).flatMap(
    (kind) => {
      const ids = new Set(
        result.passages.flatMap((p) =>
          p.verses.flatMap((v) => (v.edit === kind && v.source ? [v.source] : [])),
        ),
      );
      const names = (result.sources ?? []).filter((s) => ids.has(s.id)).map((s) => s.name);
      return names.length
        ? [
            {
              kind,
              text: tr(kind === "correction" ? "correctedFrom" : "adaptedFrom", {
                mark: VERSE_MARKS[kind],
                handle,
                sources: list.format(names),
              }),
            },
          ]
        : [];
    },
  );
  for (const kind of ["own", "pasted"] as const)
    if (result.passages.some((p) => p.verses.some((v) => v.rendering === kind)))
      notices.push({
        kind,
        text: tr(kind === "own" ? "ownBy" : "pastedBy", { mark: VERSE_MARKS[kind], handle }),
      });
  return { credit, notices };
}
