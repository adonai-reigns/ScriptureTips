import { type CanonId, standing } from "@scripturetips/canon";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { PassageResult } from "./api.ts";
import { type Block, type DesignationOf, layOut, noteBody, type VerseMark } from "./layout.ts";
import { ShownText } from "./ShownText.tsx";

const HEADINGS: Readonly<Record<string, "h2" | "h3" | "h4" | "p">> = {
  ms: "h2",
  ms1: "h2",
  ms2: "h3",
  ms3: "h3",
  mr: "p",
  s: "h3",
  s1: "h3",
  s2: "h4",
  s3: "h4",
  s4: "h4",
  qa: "h4",
};

/**
 * A compilation's verses that differ from a translation's: † corrected, ‡ adapted (vision §3.1,
 * modification notices), § the user's own rendering, * pasted and not yet declared their own.
 */
export const VERSE_MARKS: Readonly<Record<VerseMark, string>> = {
  correction: "†",
  adaptation: "‡",
  own: "§",
  pasted: "*",
};

function BlockView({
  block,
  edited,
}: {
  block: Block;
  /** Words read out after a changed verse's number, for screen readers. */
  edited: Record<VerseMark, string>;
}): ReactNode {
  if (block.kind === "heading") {
    const Element = HEADINGS[block.marker] ?? "p";
    return (
      <Element className={`h-${block.marker}`}>
        <ShownText nodes={block.content} />
      </Element>
    );
  }
  if (block.marker === "b") return <div className="b-b" aria-hidden="true" />;
  return (
    <p className={`b-${block.marker}`}>
      {block.pieces.map((p) =>
        p.kind === "verse" ? (
          <sup key={p.id} id={p.id} className={p.mark ? "verse edited" : "verse"}>
            {p.label}
            {p.mark ? (
              <>
                <span aria-hidden="true">{VERSE_MARKS[p.mark]}</span>
                <span className="visually-hidden"> {edited[p.mark]}</span>
              </>
            ) : null}
          </sup>
        ) : (
          <ShownText key={p.key} nodes={[p.shown]} />
        ),
      )}
    </p>
  );
}

/** One passage: its text, then its translator's notes (domain-model §2.6). */
export async function Passage({
  passage,
  index,
  direction,
  canon,
  sources,
  designationOf,
  showLabel = true,
}: {
  /** False where the page already names the passage (the compilation editor). */
  showLabel?: boolean;
  /** The attribution each verse's text must be followed by (`attributions.ts`). */
  designationOf?: DesignationOf | undefined;
  passage: PassageResult;
  /** In a compilation: the translations its verses came from, to credit adapted notes. */
  sources?: readonly { id: string; abbreviation: string }[] | undefined;
  index: number;
  direction: "ltr" | "rtl";
  /** The reader's canon profile; null when signed out or not chosen yet. */
  canon: CanonId | null;
}) {
  const t = await getTranslations("reader");
  const tc = await getTranslations("canons");
  // A passage's verses all come from its first book (translations.service `versesIn`).
  const place = standing(passage.entered.split(".")[0] ?? "", canon);
  const { blocks, notes } = layOut(passage.verses, `p${index}`, designationOf);
  return (
    <article className="passage" dir={direction}>
      {showLabel ? <h1 className="passage-label">{passage.label}</h1> : null}
      {place === "additional" && canon ? (
        <p className="canon-note">{t("additional", { canon: tc(canon) })}</p>
      ) : place === "varies" ? (
        <p className="canon-note">{t("varies")}</p>
      ) : null}
      {passage.verses.length === 0 ? <p>{t("noVerses")}</p> : null}
      <div className="scripture">
        {blocks.map((b) => (
          <BlockView
            key={b.key}
            block={b}
            edited={{
              correction: t("corrected"),
              adaptation: t("adapted"),
              own: t("ownRendering"),
              pasted: t("pasted"),
            }}
          />
        ))}
      </div>
      {notes.length > 0 ? (
        <section className="notes" aria-label={t("notes")}>
          <h2>{t("notes")}</h2>
          <ol>
            {notes.map((n) => (
              <li key={n.id} id={n.id}>
                <a className="note-letter" href={`#${n.id}-mark`}>
                  {n.letter}
                </a>{" "}
                <span className="note-verse">{n.verse}</span>{" "}
                <ShownText nodes={noteBody(n.note.body)} />
                {n.note.origin ? (
                  <small className="note-origin">
                    {" "}
                    {n.note.origin === "own"
                      ? t("noteOwn")
                      : t("noteAdapted", {
                          source: sources?.find((s) => s.id === n.source)?.abbreviation ?? "",
                        })}
                  </small>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
