import { type CanonId, standing } from "@scripturetips/canon";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { PassageResult } from "./api.ts";
import { type Block, layOut, noteBody, type Shown } from "./layout.ts";

/** Lower corner brackets (U+2E24, U+2E25): the LEB's marks around an idiomatic phrase. */
const IDIOM_OPEN = String.fromCharCode(0x2e24);
const IDIOM_CLOSE = String.fromCharCode(0x2e25);

/** Character styles drawn as elements; any other style is a `span` with its marker as class. */
const ELEMENTS: Readonly<Record<string, "em" | "strong" | "sup">> = {
  it: "em",
  em: "em",
  tl: "em",
  fq: "em",
  fqa: "em",
  bd: "strong",
  fk: "strong",
  fr: "strong",
  xo: "strong",
  sup: "sup",
  fv: "sup",
};

/** Word-level markup (Strong's numbers, lemmas) has no look of its own. */
const PLAIN = new Set(["w", "wh", "wg", "wa", "ft", "xt"]);

export function ShownText({ nodes }: { nodes: readonly Shown[] }): ReactNode {
  return nodes.map((n, i) => {
    const key = `${i}`;
    if (typeof n === "string") return n;
    if (n.type === "mark")
      return (
        <sup key={key} className="note-mark">
          <a href={`#${n.noteId}`} id={`${n.noteId}-mark`}>
            {n.letter}
          </a>
        </sup>
      );
    if (n.type === "span")
      return (
        <span key={key} className="idiom">
          {IDIOM_OPEN}
          <ShownText nodes={n.content} />
          {IDIOM_CLOSE}
        </span>
      );
    if (PLAIN.has(n.marker)) return <ShownText key={key} nodes={n.content} />;
    const Element = ELEMENTS[n.marker];
    if (Element)
      return (
        <Element key={key}>
          <ShownText nodes={n.content} />
        </Element>
      );
    return (
      <span key={key} className={`c-${n.marker}`}>
        <ShownText nodes={n.content} />
      </span>
    );
  });
}

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

function BlockView({ block }: { block: Block }): ReactNode {
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
          <sup key={p.id} id={p.id} className="verse">
            {p.label}
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
}: {
  passage: PassageResult;
  index: number;
  direction: "ltr" | "rtl";
  /** The reader's canon profile; null when signed out or not chosen yet. */
  canon: CanonId | null;
}) {
  const t = await getTranslations("reader");
  const tc = await getTranslations("canons");
  // A passage's verses all come from its first book (translations.service `versesIn`).
  const place = standing(passage.entered.split(".")[0] ?? "", canon);
  const { blocks, notes } = layOut(passage.verses, `p${index}`);
  return (
    <article className="passage" dir={direction}>
      <h1 className="passage-label">{passage.label}</h1>
      {place === "additional" && canon ? (
        <p className="canon-note">{t("additional", { canon: tc(canon) })}</p>
      ) : place === "varies" ? (
        <p className="canon-note">{t("varies")}</p>
      ) : null}
      {passage.verses.length === 0 ? <p>{t("noVerses")}</p> : null}
      <div className="scripture">
        {blocks.map((b) => (
          <BlockView key={b.key} block={b} />
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
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
