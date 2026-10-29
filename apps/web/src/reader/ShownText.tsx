/**
 * Draws text from the API's inline markup (as `layout.ts` prepares it): character styles,
 * idiomatic phrases, note marks and designations. Free of server code, so the reader and the
 * compilation editor's client components can both use it.
 */

import type { ReactNode } from "react";
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

export function ShownText({ nodes }: { nodes: readonly Shown[] }): ReactNode {
  return nodes.map((n, i) => {
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
