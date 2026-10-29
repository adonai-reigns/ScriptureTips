import { attributionFor } from "@scripturetips/licenses";
import type { ReactNode } from "react";
import type { Verse } from "./api.ts";
import type { DesignationOf } from "./layout.ts";

/** What a source's text must carry wherever it's shown (licenses.md §8, `attribution`). */
export interface Attribution {
  /** The source's catalog ID. */
  source: string;
  designation: string;
  statement: string;
  links: readonly { text: string; url: string }[];
}

/** A translation's attribution, read straight from its license (the plain reader). */
export function translationAttribution(id: string, license: string): Attribution | null {
  const a = attributionFor(license);
  return a ? { source: id, ...a } : null;
}

/**
 * The designation after each verse: its source's, in a compilation or publication; in a single
 * translation (`whole`), every verse's.
 */
export function designations(attributions: readonly Attribution[], whole?: string): DesignationOf {
  const of = (a: Attribution) => ({
    text: a.designation,
    ...(a.links.find((l) => l.text === a.designation)
      ? { url: a.links.find((l) => l.text === a.designation)?.url as string }
      : {}),
  });
  const by = new Map(attributions.map((a) => [a.source, of(a)]));
  return (v: Verse) => by.get(v.source ?? whole ?? "");
}

/** A credit statement, with the words its license asks to link linked. */
export function Statement({ a }: { a: Attribution }): ReactNode {
  const parts: ReactNode[] = [];
  let rest = a.statement;
  // Longest first, so "Lexham English Bible" is linked whole rather than as "LEB" inside it.
  const links = [...a.links].sort((x, y) => y.text.length - x.text.length);
  for (;;) {
    let at = -1;
    let link: (typeof links)[number] | undefined;
    for (const l of links) {
      const i = rest.indexOf(l.text);
      if (i >= 0 && (at < 0 || i < at)) [at, link] = [i, l];
    }
    if (!link) break;
    parts.push(rest.slice(0, at));
    parts.push(
      <a key={parts.length} href={link.url}>
        {link.text}
      </a>,
    );
    rest = rest.slice(at + link.text.length);
  }
  parts.push(rest);
  return <p className="translation-credit attribution">{parts}</p>;
}
