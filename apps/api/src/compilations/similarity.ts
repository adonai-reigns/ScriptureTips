/**
 * How closely a rendering follows a translation (domain-model §2.3.1, `SimilarityReport`;
 * vision §6.1: "92% similar to the NIV"). Words are compared in order, ignoring case,
 * punctuation and spacing. Pure.
 */

import { wordsIn, wordsOf } from "./wording.ts";

/** Shared runs shorter than this are common words, not a matched phrase. */
const MIN_RUN = 3;

export interface Similarity {
  /** The words the two have in common, in order, as a share of both: 0–100. */
  readonly score: number;
  /** Runs of at least `MIN_RUN` words found in both, as the rendering has them, in its order. */
  readonly matched: string[];
}

export function similarity(rendering: string, translation: string): Similarity {
  const a = wordsOf(rendering);
  const b = wordsOf(translation);
  const written = wordsIn(rendering);
  if (a.length + b.length === 0) return { score: 100, matched: [] };
  const w = b.length + 1;
  const lcs = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i * w + j] =
        a[i] === b[j]
          ? (lcs[(i + 1) * w + j + 1] ?? 0) + 1
          : Math.max(lcs[(i + 1) * w + j] ?? 0, lcs[i * w + j + 1] ?? 0);

  // Walk the alignment, collecting runs that are consecutive in both.
  const matched: string[] = [];
  let run: string[] = [];
  const end = () => {
    if (run.length >= MIN_RUN) matched.push(run.join(" "));
    run = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      run.push(written[i] as string);
      i++;
      j++;
    } else {
      end();
      if ((lcs[(i + 1) * w + j] ?? 0) >= (lcs[i * w + j + 1] ?? 0)) i++;
      else j++;
    }
  }
  end();
  return { score: Math.round((200 * (lcs[0] ?? 0)) / (a.length + b.length)), matched };
}

/** True when `pasted` is a run of words (at least `MIN_RUN`, or all of it) from `translation`. */
export function isTakenFrom(pasted: string, translation: string): boolean {
  const p = wordsOf(pasted);
  const t = wordsOf(translation);
  if (p.length === 0 || (p.length < MIN_RUN && p.length < t.length)) return false;
  for (let s = 0; s + p.length <= t.length; s++)
    if (p.every((word, k) => t[s + k] === word)) return true;
  return false;
}
