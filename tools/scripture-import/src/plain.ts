/**
 * A verse's words as plain text, for search: the text in its character styles and spans, without
 * notes, headings or paragraph marks, with its spacing collapsed. (The same text the compilation
 * editor edits: apps/api `wording.ts` `editableText`.)
 */

interface Node {
  readonly type?: string;
  readonly content?: readonly unknown[];
}

function words(nodes: readonly unknown[]): string {
  return nodes
    .map((n) => {
      if (typeof n === "string") return n;
      if (typeof n !== "object" || n === null) return "";
      const node = n as Node;
      return (node.type === "char" || node.type === "span") && node.content
        ? words(node.content)
        : "";
    })
    .join("");
}

/** The pilcrow some texts print at a paragraph's start is a mark, not a word. */
const PILCROW = /\u00b6/g;

export const plainText = (content: readonly unknown[]): string =>
  words(content).replace(PILCROW, "").replace(/\s+/g, " ").trim();
