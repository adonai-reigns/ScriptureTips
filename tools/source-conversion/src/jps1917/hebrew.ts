/**
 * Restores the Hebrew the transcription lost. The conversion from JPS's PDF turned every Hebrew
 * character into a dot, so headings and margin letters survive only as runs of dots. Each kind
 * comes from a fixed list, read from the 1917 scan (unpointed, as printed):
 *
 * - the Hebrew book title above the English one (`BookInfo.hebrew`); the transcription has it as
 *   dots at the end of the previous book, which are dropped here;
 * - the name of each weekly Torah portion, set as a centered heading where the portion begins;
 * - the Hebrew name of each of the five books of Psalms, above "BOOK I" to "BOOK V";
 * - acrostic letters, printed in the margin beside the verses of Psalms 25, 34, 37, 111, 112,
 *   145, Proverbs 31 and Lamentations 1–4, and before each English letter name in Psalm 119.
 */

import type { Event, ParsedBook } from "./parse.ts";

const ALPHABET = "אבגדהוזחטיכלמנסעפצקרשת";

/** The alphabet with פ before ע, as in Lamentations 2–4. */
const PE_AYIN = ALPHABET.replace("עפ", "פע");

/** The letters each acrostic chapter prints, in order. Scan pages: Ps 25 p.791–792, Ps 34 p.798, Ps 37 p.800–802, Lam 2 p.981. */
export const ACROSTICS: ReadonlyMap<string, readonly string[]> = new Map([
  // Ps 25 prints ה and ו together at verse 5, and has no ק.
  ["PSA 25", [..."אבגד", "הו", ..."זחטיכלמנסעפצרשת"]],
  ["PSA 34", [...ALPHABET]],
  // Ps 37 has no ע.
  ["PSA 37", [...ALPHABET.replace("ע", "")]],
  ["PSA 111", [...ALPHABET]],
  ["PSA 112", [...ALPHABET]],
  ["PSA 119", [...ALPHABET]],
  // Ps 145 has no נ.
  ["PSA 145", [...ALPHABET.replace("נ", "")]],
  ["PRO 31", [...ALPHABET]],
  ["LAM 1", [...ALPHABET]],
  ["LAM 2", [...PE_AYIN]],
  ["LAM 3", [...PE_AYIN]],
  ["LAM 4", [...PE_AYIN]],
]);

/** Weekly Torah portion names, keyed by the verse each portion begins with. */
export const PORTIONS: ReadonlyMap<string, string> = new Map([
  ["GEN 6:9", "נח"],
  ["GEN 12:1", "לך לך"],
  ["GEN 18:1", "וירא"],
  ["GEN 23:1", "חיי שרה"],
  ["GEN 25:19", "תולדת"],
  ["GEN 28:10", "ויצא"],
  ["GEN 32:4", "וישלח"],
  ["GEN 37:1", "וישב"],
  ["GEN 41:1", "מקץ"],
  ["GEN 44:18", "ויגש"],
  ["GEN 47:28", "ויחי"],
  ["EXO 6:2", "וארא"],
  ["EXO 10:1", "בא"],
  ["EXO 13:17", "בשלח"],
  ["EXO 18:1", "יתרו"],
  ["EXO 21:1", "משפטים"],
  ["EXO 25:1", "תרומה"],
  ["EXO 27:20", "תצוה"],
  ["EXO 30:11", "כי תשא"],
  ["EXO 35:1", "ויקהל"],
  ["EXO 38:21", "פקודי"],
  ["LEV 6:1", "צו"],
  ["LEV 9:1", "שמיני"],
  ["LEV 12:1", "תזריע"],
  ["LEV 14:1", "מצרע"],
  ["LEV 16:1", "אחרי מות"],
  ["LEV 19:1", "קדשים"],
  ["LEV 21:1", "אמר"],
  ["LEV 25:1", "בהר"],
  ["LEV 26:3", "בחקתי"],
  ["NUM 4:21", "נשא"],
  ["NUM 8:1", "בהעלתך"],
  ["NUM 13:1", "שלח"],
  ["NUM 16:1", "קרח"],
  ["NUM 19:1", "חקת"],
  ["NUM 22:2", "בלק"],
  ["NUM 25:10", "פינחס"],
  ["NUM 30:2", "מטות"],
  ["NUM 33:1", "מסעי"],
  ["DEU 3:23", "ואתחנן"],
  ["DEU 7:12", "עקב"],
  ["DEU 11:26", "ראה"],
  ["DEU 16:18", "שפטים"],
  ["DEU 21:10", "כי תצא"],
  ["DEU 26:1", "כי תבוא"],
  ["DEU 29:9", "נצבים"],
  ["DEU 31:1", "וילך"],
  ["DEU 32:1", "האזינו"],
  ["DEU 33:1", "וזאת הברכה"],
]);

/** The Hebrew names of the five books of Psalms (scan p.799, 827, 849, 863, 876). */
export const PSALM_BOOKS: ReadonlyMap<string, string> = new Map([
  ["BOOK I", "ספר ראשון"],
  ["BOOK II", "ספר שני"],
  ["BOOK III", "ספר שלישי"],
  ["BOOK IV", "ספר רביעי"],
  ["BOOK V", "ספר חמישי"],
]);

/** Replaces each run of lost Hebrew with what the printing has there. */
export function restoreHebrew(book: ParsedBook): ParsedBook {
  const { info, events } = book;
  const issues = [...book.issues];
  const out: Event[] = [];
  const letters = new Map<number, string[]>();
  let chapter = 0;
  const nextRef = (from: number): { ref: string; heading?: string } => {
    let c = chapter;
    for (let k = from; k < events.length; k++) {
      const e = events[k] as Event;
      if (e.kind === "chapter") c = e.number;
      if (e.kind === "heading") return { ref: "", heading: e.text };
      if (e.kind === "verse") return { ref: `${info.code} ${c}:${e.number}` };
    }
    return { ref: "end" };
  };
  const nextLetter = (): string | undefined => {
    const sequence = ACROSTICS.get(`${info.code} ${chapter}`);
    if (!sequence) return undefined;
    const used = letters.get(chapter) ?? [];
    letters.set(chapter, used);
    const letter = sequence[used.length];
    if (letter) used.push(letter);
    return letter;
  };

  events.forEach((e, i) => {
    if (e.kind === "chapter") chapter = e.number;
    if (e.kind === "heading" && e.style === "qa") {
      const letter = nextLetter();
      out.push({ ...e, text: letter ? `${letter} ${e.text}` : e.text });
      if (!letter) issues.push(`${info.code} ${chapter}: acrostic heading without a letter`);
      return;
    }
    if (e.kind !== "lost-hebrew") {
      out.push(e);
      return;
    }
    const next = nextRef(i + 1);
    // One or two margin letters (Ps 25:5 prints ה and ו together).
    if ((e.source === "." || e.source === "..") && ACROSTICS.has(`${info.code} ${chapter}`)) {
      const letter = nextLetter();
      if (letter) out.push({ kind: "acrostic", letter });
      else
        issues.push(
          `${info.code} ${chapter}: a margin letter beyond the acrostic, before ${next.ref}`,
        );
      return;
    }
    const psalmBook = next.heading && PSALM_BOOKS.get(next.heading);
    const portion = PORTIONS.get(next.ref);
    if (psalmBook) out.push({ kind: "heading", style: "ms1", text: psalmBook });
    else if (portion) out.push({ kind: "heading", style: "s2", text: portion });
    // The next book's title, set before its heading; restored there from BookInfo.hebrew.
    else if (next.ref !== "end") issues.push(`${info.code}: unknown Hebrew before ${next.ref}`);
  });

  for (const [key, sequence] of ACROSTICS) {
    const [code, ch] = key.split(" ");
    if (code !== info.code) continue;
    const used = letters.get(Number(ch))?.length ?? 0;
    if (used !== sequence.length)
      issues.push(`${key}: ${used} acrostic letters found, the printing has ${sequence.length}`);
  }
  for (const [ref] of PORTIONS) {
    if (
      ref.startsWith(`${info.code} `) &&
      !out.some((e) => e.kind === "heading" && e.style === "s2" && e.text === PORTIONS.get(ref))
    )
      issues.push(`${ref}: portion heading not placed`);
  }

  return { ...book, events: moveLettersToVerses(out), issues };
}

/** A margin letter belongs after the line break and verse number that follow it. */
function moveLettersToVerses(events: readonly Event[]): Event[] {
  const out = [...events];
  for (let i = 0; i < out.length; i++) {
    if (out[i]?.kind !== "acrostic") continue;
    let j = i;
    while (out[j + 1]?.kind === "break" || out[j + 1]?.kind === "verse") j++;
    if (j > i) out.splice(j, 0, ...out.splice(i, 1));
    i = j;
  }
  return out;
}
