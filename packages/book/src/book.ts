/**
 * The neutral book description (book-designer.md §9): what to print, with every piece of content
 * resolved, and no engine's syntax in it. The Typst templates (`templates/`) turn it into a PDF,
 * so the engine could be replaced without touching the designer or the data. Measurements are in
 * mm. Stored with each build as `book.json`.
 */

export interface Book {
  title: string;
  subtitle: string;
  format: Format;
  fonts: { body: string; hebrew: string };
  /** The attribution and license page (book-designer.md §3): one paragraph each. */
  credits: string[];
  body: Element[];
}

export interface Format {
  /** Trim size. */
  width: number;
  height: number;
  /** Printed past the trim on full-bleed pages. */
  bleed: number;
  margins: { top: number; bottom: number; inner: number; outer: number };
  /** Between the two text columns; wide enough for a center column of notes when used. */
  gutter: number;
  /** Body type size and line spacing, in points. */
  fontSize: number;
  leading: number;
  /** Paper thickness, for the spine width (book-designer.md §6.1). */
  caliper: number;
}

export type Element =
  | { type: "title" }
  | { type: "credits" }
  | {
      type: "scripture";
      /** OSIS ID. */
      book: string;
      /** The book's title ("Psalms"), and its name before a chapter ("Psalm 23:1–6"). */
      name: string;
      headName: string;
      chapters: Chapter[];
      /** Where the translator's notes go: the foot of the column, or a center column. */
      notes: "foot" | "center";
    };

export interface Chapter {
  number: number;
  blocks: Block[];
}

/** A paragraph, a poetry line, a heading or a stanza break, as the translation lays it out. */
export type Block =
  | { kind: "paragraph" | "poetry1" | "poetry2"; runs: Run[] }
  | { kind: "heading"; runs: Run[] }
  | { kind: "break" };

export type Run =
  | { t: "text"; text: string }
  | { t: "style"; style: "italic" | "bold" | "smallcaps"; runs: Run[] }
  /** The LEB's marks around an idiomatic phrase. */
  | { t: "idiom"; runs: Run[] }
  /** A chapter's number, at the start of its first verse. */
  | { t: "chapter"; number: number; mark?: string }
  /** `cv`: "3:16", for the running head. `mark`: how the verse differs from its source (†‡§). */
  | { t: "verse"; label: string; cv: string; mark?: string }
  | { t: "note"; cv: string; body: Run[] }
  /** A source's designation after its verses ("LEB"), as its license asks. */
  | { t: "designation"; text: string };
