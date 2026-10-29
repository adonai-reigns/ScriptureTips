/**
 * The Typst templates that render a book description (`book.json`) to PDF: `book.typ` the
 * interior, `cover.typ` the cover, whose spine width comes from the interior's page count
 * (`--input pages=N`). Stored with each build beside its `book.json`, so a build can be
 * downloaded and compiled again as it was.
 */

export const TEMPLATES = ["book.typ", "cover.typ"] as const;

export const templatePath = (name: (typeof TEMPLATES)[number]) =>
  new URL(`../templates/${name}`, import.meta.url).pathname;
