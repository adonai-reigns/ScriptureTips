import type { StudyWords } from "./types.ts";

const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

/**
 * How study mode draws each Strong's number (`H0430`): its category and the word it is. Server
 * components only. A number the API has no lemma for is simply left out, and so is anything on
 * a failure: the page then shows the text without study marks.
 */
export async function studyWords(strongs: readonly string[]): Promise<StudyWords> {
  if (strongs.length === 0) return {};
  try {
    const res = await fetch(`${API}/study/words`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ strongs }),
      cache: "no-store",
    });
    if (!res.ok) return {};
    return ((await res.json()) as { words: StudyWords }).words;
  } catch {
    return {};
  }
}
