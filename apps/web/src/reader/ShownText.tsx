/**
 * Draws text from the API's inline markup (as `layout.ts` prepares it): character styles,
 * idiomatic phrases, note marks and designations. Free of server code, so the reader and the
 * compilation editor's client components can both use it.
 */

import type { ReactNode } from "react";
import type { StudyWords } from "../study/types.ts";
import { groupUnits, tagOf } from "../study/units.ts";
import type { Shown } from "./layout.ts";

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

/**
 * `study`: study mode's words (the compilation editor's compare and edit modes): each word
 * tagged with a Strong's number it knows is drawn as a piece of its own, and runs of words with
 * one number as one piece. Both are painted only (a background, an outline), so the text doesn't
 * move.
 */
export function ShownText({
  nodes,
  study,
  grouped = false,
}: {
  nodes: readonly Shown[];
  study?: StudyWords | null | undefined;
  /** The nodes are already one study unit's: they aren't grouped again. */
  grouped?: boolean;
}): ReactNode {
  const shown = study && !grouped ? groupUnits(nodes) : nodes;
  return shown.map((n, i) => {
    const key = `${i}`;
    if (typeof n === "string") return n;
    if (n.type === "designation")
      return (
        <span key={key} className="designation">
          {" ("}
          {n.url ? <a href={n.url}>{n.text}</a> : n.text}
          {")"}
        </span>
      );
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
          <ShownText nodes={n.content} study={study} />
          {IDIOM_CLOSE}
        </span>
      );
    if (n.marker === "study-unit")
      return (
        <span key={key} className="c-study-unit">
          <ShownText nodes={n.content} study={study} grouped />
        </span>
      );
    const tag = study ? tagOf(n) : undefined;
    const word = tag && study ? study[tag] : undefined;
    if (tag && word)
      return (
        <span
          key={key}
          className="study-word"
          data-category={word.category}
          data-strong={tag}
          title={[word.headword, tag, word.gloss].filter(Boolean).join(" \u00b7 ")}
        >
          <ShownText nodes={n.content} study={study} />
        </span>
      );
    if (PLAIN.has(n.marker)) return <ShownText key={key} nodes={n.content} study={study} />;
    const Element = ELEMENTS[n.marker];
    if (Element)
      return (
        <Element key={key}>
          <ShownText nodes={n.content} study={study} />
        </Element>
      );
    return (
      <span key={key} className={`c-${n.marker}`}>
        <ShownText nodes={n.content} study={study} />
      </span>
    );
  });
}
