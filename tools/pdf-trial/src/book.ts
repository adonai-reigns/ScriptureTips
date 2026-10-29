/**
 * The neutral book description (book-designer.md §9): what to print, with every piece of content
 * resolved, and no engine's syntax in it. Each engine's renderer turns it into a PDF, so the
 * engine can be replaced without touching the designer or the data. Measurements are in mm.
 */

export interface Book {
  title: string;
  subtitle: string;
  format: Format;
  fonts: { body: string; hebrew: string };
  /** The attribution and license page (book-designer.md §3): one paragraph per source. */
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
      book: string;
      name: string;
      chapters: Chapter[];
      /** Where the translator's notes go: the foot of the column, or a center column. */
      notes: "foot" | "center";
      /** False when it continues the book of the element before it (no book title). */
      opensBook: boolean;
    }
  | {
      type: "spread";
      label: string;
      caption: string;
      /** An image twice the trim width plus bleed on every side, starting on a left-hand page. */
      image: { svg: string; pdf: string };
    }
  | { type: "interlinear"; title: string; credit: string; verses: InterlinearVerse[] };

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
  | { t: "chapter"; number: number }
  | { t: "verse"; label: string; ref: string }
  | { t: "note"; ref: string; body: Run[] };

export interface InterlinearVerse {
  ref: string;
  words: { hebrew: string; gloss: string; strong: string }[];
}
