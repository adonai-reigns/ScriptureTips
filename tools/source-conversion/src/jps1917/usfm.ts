/** Writes a parsed JPS 1917 book as USFM 3. */

import { NOTE_CHAR, type ParsedBook } from "./parse.ts";

/** Where each lost Hebrew passage sits, for the conversion report. */
export interface LostHebrewAt {
  readonly ref: string;
  readonly source: string;
}

export interface UsfmResult {
  readonly usfm: string;
  readonly lostHebrew: readonly LostHebrewAt[];
}

/** "LORD" and "GOD" are printed in small capitals for the divine name. */
function markDivineName(text: string): string {
  return text.replace(/\b(LORD|GOD)\b/g, "\\nd $1\\nd*");
}

export function toUsfm(book: ParsedBook, identification: string): UsfmResult {
  const { info, events, notes } = book;
  const out: string[] = [
    `\\id ${info.code} ${identification}`,
    "\\usfm 3.0",
    "\\ide UTF-8",
    `\\h ${info.name}`,
    `\\toc1 ${info.name}`,
    `\\toc2 ${info.name}`,
    `\\mt2 ${info.hebrew}`,
    `\\mt1 ${info.name}`,
  ];
  const lostHebrew: LostHebrewAt[] = [];
  let chapter = 0;
  let verse = 0;
  let line = "";
  const newLine = (start: string) => {
    if (line !== "") out.push(line.trimEnd());
    line = start;
  };
  const inline = (text: string) => {
    let s = "";
    for (const ch of markDivineName(text)) {
      if (NOTE_CHAR.test(ch)) {
        const note = notes[ch.charCodeAt(0) - 0xe000];
        if (!note) throw new Error(`${info.code} ${chapter}:${verse}: unknown note`);
        s += `\\f ${note.caller} \\fr ${chapter}:${verse} \\ft ${markDivineName(note.text)}\\f*`;
      } else s += ch;
    }
    return s;
  };

  for (const e of events) {
    switch (e.kind) {
      case "chapter":
        chapter = e.number;
        verse = 0;
        newLine(`\\c ${chapter}`);
        break;
      case "break":
        if (e.stanza && e.style === "q") newLine("\\b");
        newLine(e.style === "q" ? "\\q1" : `\\${e.style}`);
        break;
      case "verse":
        verse = e.number;
        line += `${line === "" || line.endsWith(" ") ? "" : " "}\\v ${verse} `;
        break;
      case "text":
        line += `${line === "" || line.endsWith(" ") ? "" : " "}${inline(e.text)}`;
        break;
      case "heading":
        newLine(`\\${e.style} ${e.text}`);
        break;
      case "acrostic":
        line += `${line === "" || line.endsWith(" ") ? "" : " "}\\qac ${e.letter}\\qac* `;
        break;
      case "lost-hebrew":
        lostHebrew.push({ ref: `${info.code} ${chapter}:${verse}`, source: e.source });
        break;
      case "repeat":
        newLine(`\\lit ${inline(e.text)}`);
        break;
    }
  }
  newLine("");
  return { usfm: `${out.join("\n")}\n`, lostHebrew };
}
