/**
 * Edits to a verse's wording (domain-model §2.3, `edited`). The user edits the verse as plain
 * text; the change is carried back into the source verse's markup, so character styles (words
 * of Jesus, italics), idiom spans, note marks and paragraph breaks stay where they were. How many
 * words and punctuation marks changed decides whether the edit can be a correction. Pure.
 */

import { createHash } from "node:crypto";

/** A verse's inline markup, as the import stores it (tools/scripture-import). */
export type Inline =
  | string
  | { type: "char"; marker: string; content: Inline[]; attributes?: Record<string, string> }
  | { type: "span"; span: string; content: Inline[] }
  | { type: "block"; marker: string }
  | { type: "heading"; marker: string; content: Inline[] }
  | { type: "note"; position: number };

type Wrapper = Extract<Inline, { type: "char" | "span" }>;
type Atom = Extract<Inline, { type: "block" | "heading" | "note" }>;

/** The verse's text as read: the words in its styles and spans, without notes or headings. */
export function plainText(content: readonly Inline[]): string {
  return content
    .map((n) =>
      typeof n === "string"
        ? n
        : n.type === "char" || n.type === "span"
          ? plainText(n.content)
          : "",
    )
    .join("");
}

/** The text a user edits: the verse's text with its spacing collapsed. */
export const editableText = (content: readonly Inline[]): string => collapse(plainText(content));

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

interface Token {
  readonly text: string;
  readonly kind: "word" | "space" | "mark";
}

const TOKEN = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|\s+|[^\s\p{L}\p{M}\p{N}]/gu;

function tokens(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map(([t]) => ({
    text: t,
    kind: /^\s/.test(t) ? "space" : /^[\p{L}\p{M}\p{N}]/u.test(t) ? "word" : "mark",
  }));
}

/** Any spacing matches any other: re-spacing a verse isn't a change. */
const same = (a: Token, b: Token) => a.kind === b.kind && (a.kind === "space" || a.text === b.text);

type Op =
  | { readonly op: "equal"; readonly a: Token; readonly b: Token }
  | { readonly op: "delete"; readonly a: Token }
  | { readonly op: "insert"; readonly b: Token };

/** A token diff (longest common subsequence; a verse is a few hundred tokens at most). */
function diff(a: readonly Token[], b: readonly Token[]): Op[] {
  const w = b.length + 1;
  const lcs = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i * w + j] = same(a[i] as Token, b[j] as Token)
        ? (lcs[(i + 1) * w + j + 1] ?? 0) + 1
        : Math.max(lcs[(i + 1) * w + j] ?? 0, lcs[i * w + j + 1] ?? 0);
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const ta = a[i];
    const tb = b[j];
    if (ta && tb && same(ta, tb)) {
      ops.push({ op: "equal", a: ta, b: tb });
      i++;
      j++;
    } else if (ta && (!tb || (lcs[(i + 1) * w + j] ?? 0) >= (lcs[i * w + j + 1] ?? 0))) {
      ops.push({ op: "delete", a: ta });
      i++;
    } else if (tb) {
      ops.push({ op: "insert", b: tb });
      j++;
    }
  }
  return ops;
}

/**
 * Words and punctuation marks added, removed or replaced between two wordings; a replaced one
 * counts once. Punctuation counts like a word (domain-model §2.3: not a jot or tittle passes
 * unnoticed, Matthew 5:18); only spacing doesn't.
 */
export function changes(before: string, after: string): number {
  let count = 0;
  let removed = 0;
  let added = 0;
  const flush = () => {
    count += Math.max(removed, added);
    removed = 0;
    added = 0;
  };
  for (const o of diff(tokens(before), tokens(after))) {
    if (o.op === "equal") flush();
    else if (o.op === "delete") removed += o.a.kind === "space" ? 0 : 1;
    else added += o.b.kind === "space" ? 0 : 1;
  }
  flush();
  return count;
}

export const wordCount = (text: string): number =>
  tokens(text).filter((t) => t.kind === "word").length;

interface Item {
  readonly path: readonly Wrapper[];
  readonly text?: string;
  readonly atom?: Atom;
}

/**
 * The verse's markup with its text changed to `text`. Unchanged text keeps its own styles and
 * spacing; new words take the styles of the words they replace (or of the text before them);
 * notes and breaks keep their place among the unchanged words. A word-level wrapper with
 * attributes (Strong's numbers, lemmas) is dropped where its word changed, since they'd no
 * longer describe it.
 */
export function applyWording(content: readonly Inline[], text: string): Inline[] {
  const chars: { ch: string; path: readonly Wrapper[] }[] = [];
  const atoms: { atom: Atom; at: number; path: readonly Wrapper[] }[] = [];
  const flatten = (nodes: readonly Inline[], path: readonly Wrapper[]) => {
    for (const n of nodes) {
      if (typeof n === "string") for (const ch of n) chars.push({ ch, path });
      else if (n.type === "char" || n.type === "span") flatten(n.content, [...path, n]);
      else atoms.push({ atom: n, at: chars.length, path });
    }
  };
  flatten(content, []);

  // The verse's leading and trailing spacing stays as it was.
  const old = chars.map((c) => c.ch);
  const joined = old.join("");
  const lead = /^\s*/.exec(joined)?.[0] ?? "";
  const trail = joined.trim() === "" ? "" : (/\s*$/.exec(joined)?.[0] ?? "");
  const wanted = lead + collapse(text) + trail;

  const out: { ch: string; path: readonly Wrapper[] }[] = [];
  /** Where each boundary in the old text (before old char i) lands in the new. */
  const moved = new Int32Array(old.length + 1);
  const touched = new Set<Wrapper>();
  const pathAt = (i: number) => chars[i]?.path ?? [];
  const charsOf = (t: Token) => [...t.text];

  const ops = diff(tokens(joined), tokens(wanted));
  let at = 0;
  for (let k = 0; k < ops.length; ) {
    const o = ops[k] as Op;
    if (o.op === "equal") {
      for (const _ of charsOf(o.a)) {
        moved[at] = out.length;
        out.push({ ch: old[at] ?? "", path: pathAt(at) });
        at++;
      }
      k++;
      continue;
    }
    // A run of changes: what it removed, and what it put in their place.
    const start = at;
    const inserted: string[] = [];
    for (; k < ops.length && (ops[k] as Op).op !== "equal"; k++) {
      const c = ops[k] as Op;
      if (c.op === "delete") at += charsOf(c.a).length;
      else if (c.op === "insert") inserted.push(...charsOf(c.b));
    }
    const path = at > start ? pathAt(start) : start > 0 ? pathAt(start - 1) : pathAt(start);
    for (let i = start; i < at; i++) for (const w of pathAt(i)) touched.add(w);
    for (const w of path) if (inserted.length > 0) touched.add(w);
    moved[start] = out.length;
    for (const ch of inserted) out.push({ ch, path });
    // A note after a replaced word follows its replacement.
    for (let i = start + 1; i < at; i++) moved[i] = out.length;
  }
  moved[old.length] = out.length;

  const items: Item[] = [];
  const placed = atoms.map((a) => ({ ...a, at: moved[a.at] ?? out.length }));
  let next = 0;
  for (let p = 0; p <= out.length; p++) {
    while (next < placed.length && (placed[next]?.at ?? 0) <= p) {
      const a = placed[next++];
      if (a) items.push({ path: a.path, atom: a.atom });
    }
    const c = out[p];
    if (c) items.push({ path: c.path, text: c.ch });
  }
  return build(items, 0, touched);
}

function build(items: readonly Item[], depth: number, touched: ReadonlySet<Wrapper>): Inline[] {
  const out: Inline[] = [];
  const push = (n: Inline) => {
    const last = out[out.length - 1];
    if (typeof n === "string" && typeof last === "string") out[out.length - 1] = last + n;
    else out.push(n);
  };
  for (let i = 0; i < items.length; ) {
    const item = items[i] as Item;
    const w = item.path[depth];
    if (!w) {
      if (item.atom) push(item.atom);
      else if (item.text !== undefined) push(item.text);
      i++;
      continue;
    }
    let j = i;
    while (j < items.length && items[j]?.path[depth] === w) j++;
    const inner = build(items.slice(i, j), depth + 1, touched);
    if (w.type === "char" && w.attributes && touched.has(w)) for (const n of inner) push(n);
    else push({ ...w, content: inner });
    i = j;
  }
  return out;
}

/** JSON with its keys sorted, so the same value always hashes the same. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** SHA-256 of a snapshot: an edited verse's source no longer matches when it's re-imported. */
export const snapshotHash = (snapshot: unknown): string =>
  createHash("sha256").update(stableJson(snapshot)).digest("hex");
