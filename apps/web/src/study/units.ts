/**
 * Finding the words study mode draws: those tagged with a Strong's number, and the runs of
 * tagged words that share one number (the Hebrew idiom "eating you shall eat" is "freely eat",
 * both words H0398). Such a run is one piece of the original language, so it's drawn as one.
 */

import type { Shown } from "../reader/layout.ts";

interface Tagged {
  readonly type?: string;
  readonly marker?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly content?: readonly unknown[];
}

/** The Strong's number a `w` node is tagged with, as the API keys it (`H0430`), if any. */
export function tagOf(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const n = node as Tagged;
  if (n.type !== "char" || n.marker !== "w") return undefined;
  const m = /([HG])0*(\d{1,4})/i.exec(n.attributes?.["strong"] ?? "");
  return m ? `${(m[1] ?? "").toUpperCase()}${(m[2] ?? "").padStart(4, "0")}` : undefined;
}

/** Every Strong's number tagged in this markup, once each. */
export function strongsIn(nodes: readonly unknown[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    const tag = tagOf(node);
    if (tag) into.add(tag);
    const content = (node as Tagged | null)?.content;
    if (Array.isArray(content)) strongsIn(content, into);
  }
  return into;
}

/**
 * Wraps each run of tagged words that share a Strong's number (with only spaces between) in a
 * `study-unit` node, which draws as one piece.
 */
export function groupUnits(nodes: readonly Shown[]): Shown[] {
  const out: Shown[] = [];
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i];
    if (node === undefined) break;
    const tag = tagOf(node);
    let last = i;
    if (tag) {
      for (let j = i + 1; j < nodes.length; j++) {
        const next = nodes[j];
        if (typeof next === "string" && next.trim() === "") continue;
        if (tagOf(next) !== tag) break;
        last = j;
      }
    }
    if (last === i) out.push(node);
    else out.push({ type: "char", marker: "study-unit", content: nodes.slice(i, last + 1) });
    i = last + 1;
  }
  return out;
}
