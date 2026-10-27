/**
 * Writes one LEB book (`<book>` in LEB.xml) as USFM 3, keeping the LEB's numbering.
 *
 * - `<pericope>` → `\s1`; `<p>` → `\p` (`\pm` in a quoted letter, `<block>`; `\nb` where the
 *   LEB prints a chapter number inside a running paragraph); `<ul><li1>` poetry lines → `\q1`.
 * - A Psalm title (`<verse-number id="Ps 3:title">`) and the lines up to verse 1 → `\d`.
 * - `<supplied>` → `\add`, `<i>` → `\it`, `<b>` → `\bd`, `<sc>` → `\sc`, `<cite>` → `\ref` to
 *   the verse; `<note>` → `\f`, and a note tagged `NOT_FOR_PRINT` → `\f` with `\cat screen\cat*`.
 * - `<idiom-start />…<idiom-end />` (an idiomatic phrase, printed in lower corner brackets;
 *   the note after it gives the literal wording) → `\w …|x-idiom="N"\w*`, numbered within the
 *   book. usfm-grammar drops custom (`\z`) markers, so the span travels as `\w` with a custom
 *   attribute, and the import turns it back into a span note (domain-model §2.6). Where a span
 *   runs across a verse number or a line, it's closed and reopened with the same number.
 * - Empty `<p />` elements carry nothing and are left out.
 */

import { citeTarget, LEB_BOOKS, SINGLE_CHAPTER } from "./books.ts";
import { textOf, type XmlElement, type XmlNode } from "./xml.ts";

export interface LebBook {
  readonly code: string;
  readonly usfm: string;
  readonly issues: readonly string[];
  /** What was adjusted or left out, by kind, for the conversion report. */
  readonly counts: Readonly<Record<string, number>>;
}

/** U+FEFF, zero-width no-break space. */
const ZWNBSP = String.fromCharCode(0xfeff);

const CHARACTER: Readonly<Record<string, string>> = {
  supplied: "add",
  i: "it",
  b: "bd",
  sc: "sc",
};

export function bookToUsfm(book: XmlElement, identification: string): LebBook {
  const id = book.attributes["id"] ?? "";
  const code = LEB_BOOKS[id];
  if (!code) throw new Error(`Unknown LEB book ${id}`);
  const out = [`\\id ${code} ${identification}`, "\\usfm 3.0", "\\ide UTF-8"];
  const issues: string[] = [];
  const counts: Record<string, number> = {};
  const count = (what: string) => {
    counts[what] = (counts[what] ?? 0) + 1;
  };
  let chapter = 0;
  let verse = "";
  let line = "";
  /** The open idiom span's number, 0 when none is open. */
  let idiom = 0;
  let idioms = 0;
  /** Where the open piece of the span starts in `line`. */
  let pieceStart = 0;
  /** After a Psalm title's verse number, until verse 1: lines are title lines (`\d`). */
  let inTitle = false;
  const where = () => `${code} ${chapter}:${verse}`;

  const write = (s: string) => {
    line += s;
  };
  const openPiece = () => {
    pieceStart = line.length;
    write("\\w ");
  };
  /** Closes the open piece of the span; an empty piece is taken out again. */
  const closePiece = () => {
    if (line.slice(pieceStart) === "\\w ") line = line.slice(0, pieceStart);
    else write(`|x-idiom="${idiom}"\\w*`);
  };
  const endLine = () => {
    if (idiom) closePiece();
    if (line.trim() !== "") out.push(line.trimEnd());
    line = "";
  };
  const startLine = (marker: string) => {
    endLine();
    line = `\\${marker} `;
    if (idiom) openPiece();
  };

  const startVerse = (n: string) => {
    if (idiom) closePiece();
    verse = n;
    write(`${line.endsWith(" ") ? "" : " "}\\v ${n} `);
    if (idiom) openPiece();
  };

  /** Inline content. `nested`: inside a note or a character span, where USFM writes `\+`. */
  const inline = (nodes: readonly XmlNode[], nested: boolean, inNote: boolean) => {
    for (const node of nodes) {
      if (typeof node === "string") {
        // U+FEFF (zero-width no-break space) starts most screen-only notes and sits between a
        // few adjacent notes. It's invisible and carries nothing, so it's removed.
        const stray = node.split(ZWNBSP).length - 1;
        for (let i = 0; i < stray; i++) count("U+FEFF removed");
        write(node.replaceAll(ZWNBSP, "").replace(/\s+/g, " "));
        continue;
      }
      // Inside an idiom span (a `\w`), character markers are nested too.
      const plus = nested || idiom ? "+" : "";
      switch (node.name) {
        case "verse-number": {
          if (inNote) {
            issues.push(`${where()}: verse number inside a note`);
            break;
          }
          const vid = node.attributes["id"] ?? "";
          const [, number = ""] = /(?::|\s)(\w+)$/.exec(vid) ?? [];
          if (vid.endsWith(":title")) {
            inTitle = true;
            count("Psalm title written as \\d");
          } else if (!vid.includes(":") && !SINGLE_CHAPTER.has(code)) {
            // A chapter number printed inside the paragraph: `<chapter>` gives the chapter.
            if (Number(number) !== chapter) issues.push(`${where()}: chapter number ${vid}`);
          } else {
            inTitle = false;
            startVerse(number);
          }
          break;
        }
        case "supplied":
        case "i":
        case "b":
        case "sc": {
          const marker = `\\${plus}${CHARACTER[node.name]}`;
          write(`${marker} `);
          inline(node.children, true, inNote);
          write(`${marker}*`);
          break;
        }
        case "cite": {
          const loc = citeTarget(node.attributes["title"] ?? "");
          if (!loc) {
            issues.push(`${where()}: unreadable cross-reference ${node.attributes["title"]}`);
            inline(node.children, nested, inNote);
            break;
          }
          // `\ref` takes no `+` when nested: usfm-grammar rejects `\+ref` in a note.
          write(`\\ref ${textOf(node).replace(/\s+/g, " ")}|loc="${loc}"\\ref*`);
          break;
        }
        case "note": {
          if (inNote) issues.push(`${where()}: note inside a note`);
          const screen = node.attributes["tag"] === "NOT_FOR_PRINT";
          if (screen) count("screen-only note (\\cat screen)");
          else if (node.attributes["tag"])
            issues.push(`${where()}: note tag ${node.attributes["tag"]}`);
          write(`\\f + ${screen ? "\\cat screen\\cat*" : ""}\\ft `);
          inline(node.children, true, true);
          write("\\f*");
          break;
        }
        case "idiom-start":
          if (idiom) issues.push(`${where()}: idiom starts inside an idiom`);
          if (inNote) issues.push(`${where()}: idiom inside a note`);
          idiom = ++idioms;
          count("idiom span written as \\w with x-idiom");
          openPiece();
          break;
        case "idiom-end":
          if (!idiom) issues.push(`${where()}: idiom ends outside an idiom`);
          closePiece();
          idiom = 0;
          break;
        default:
          issues.push(`${where()}: unexpected <${node.name}> inside a line`);
          inline(node.children, nested, inNote);
      }
    }
  };

  /** Paragraph-level content of a chapter (or of a one-chapter book). */
  const blocks = (nodes: readonly XmlNode[], inBlock: boolean) => {
    for (const node of nodes) {
      if (typeof node === "string") {
        if (node.trim() !== "") issues.push(`${where()}: text between paragraphs`);
        continue;
      }
      switch (node.name) {
        case "pericope": {
          // A heading of its own: an idiom running on around it isn't reopened inside it, and
          // goes on in the next line.
          endLine();
          const open = idiom;
          idiom = 0;
          line = "\\s1 ";
          inline(node.children, false, false);
          out.push(line.trim());
          line = "";
          idiom = open;
          break;
        }
        case "p": {
          if (node.children.every((c) => typeof c === "string" && c.trim() === "")) {
            count("empty <p /> left out");
            break;
          }
          const [first] = node.children.filter((c) => typeof c !== "string" || c.trim() !== "");
          const runsOn =
            typeof first !== "string" &&
            first?.name === "verse-number" &&
            !first.attributes["id"]?.includes(":") &&
            !SINGLE_CHAPTER.has(code);
          if (runsOn) count("chapter number in a running paragraph written as \\nb");
          startLine(runsOn ? "nb" : inBlock ? "pm" : "p");
          inline(node.children, false, false);
          break;
        }
        case "ul":
          for (const item of node.children) {
            if (typeof item === "string") {
              if (item.trim() !== "") issues.push(`${where()}: text in a list`);
              continue;
            }
            const level = /^li([1-3])$/.exec(item.name)?.[1];
            if (!level) {
              issues.push(`${where()}: unexpected <${item.name}> in a list`);
              continue;
            }
            const numbers = item.children.flatMap((c) =>
              typeof c !== "string" && c.name === "verse-number" ? [c.attributes["id"] ?? ""] : [],
            );
            const opensTitle = numbers.some((n) => n.endsWith(":title"));
            const startsVerse = numbers.length > 0 && !opensTitle;
            startLine(opensTitle || (inTitle && !startsVerse) ? "d" : `q${level}`);
            // A paragraph inside a line (8 in the LEB) is part of the line.
            inline(
              item.children.flatMap((c) =>
                typeof c !== "string" && c.name === "p" ? c.children : [c],
              ),
              false,
              false,
            );
          }
          break;
        case "block":
          blocks(node.children, true);
          break;
        default:
          issues.push(`${where()}: unexpected <${node.name}>`);
      }
    }
  };

  const chapters = book.children.filter(
    (c): c is XmlElement => typeof c !== "string" && c.name === "chapter",
  );
  if (chapters.length === 0) {
    chapter = 1;
    out.push("\\c 1");
    blocks(book.children, false);
  } else {
    for (const c of chapters) {
      endLine();
      chapter = Number(/(\d+)$/.exec(c.attributes["id"] ?? "")?.[1]);
      verse = "";
      out.push(`\\c ${chapter}`);
      blocks(c.children, false);
    }
    if (book.children.some((c) => typeof c !== "string" && c.name !== "chapter"))
      issues.push(`${code}: content outside the chapters`);
  }
  endLine();
  if (idiom) issues.push(`${code}: an idiom never ends`);
  return { code, usfm: `${out.join("\n")}\n`, issues, counts };
}
