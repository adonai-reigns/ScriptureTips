/**
 * usfm-grammar returns an empty document for some whole books it can't read (the BSB's
 * Gospels, several JPS books), though no small sample reproduces it. The parser is mocked
 * here to return what it returned for them.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("./usj.ts", () => ({
  parseUsfm: () => ({
    usj: { type: "USJ", content: [] },
    errors: ["At 45:3, Error: \\wj "],
    normalizations: [],
  }),
}));

const { importBook } = await import("./import-book.ts");

describe("nothing is dropped silently", () => {
  it("reports a book the parser returns nothing for, rather than taking it for front matter", () => {
    const result = importBook("\\id JHN test\n\\c 1\n\\p \\v 1 In the beginning.");
    expect(result.book).toBeUndefined();
    expect(result.issues).toEqual([
      "JHN: the parser returned no content (1 errors)",
      "JHN: parser: At 45:3, Error: \\wj ",
    ]);
  });

  it("still takes a file without a book's \\id for front matter", () => {
    expect(importBook("\\id FRT front matter\n\\p Preface.").issues).toEqual([]);
  });
});
