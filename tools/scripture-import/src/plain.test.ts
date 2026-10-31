import { describe, expect, it } from "vitest";
import { plainText } from "./plain.ts";

describe("plain text of a verse", () => {
  it("joins the words in their styles and spans, leaving out notes, headings and paragraph marks", () => {
    const content = [
      { type: "block", marker: "p" },
      { type: "heading", marker: "s1", content: ["The Creation"] },
      "In the ",
      { type: "char", marker: "w", content: ["beginning"], attributes: { strong: "H7225" } },
      { type: "note", position: 0 },
      ", ",
      { type: "span", span: "1", content: ["God", "  created"] },
      {
        type: "char",
        marker: "wj",
        content: [{ type: "char", marker: "it", content: [" the heavens"] }],
      },
      ".",
    ];
    expect(plainText(content)).toBe("In the beginning, God created the heavens.");
  });

  it("leaves out the pilcrow that marks a paragraph's start", () => {
    expect(plainText(["\u00b6 For God so loved the world, \u00b6that he gave"])).toBe(
      "For God so loved the world, that he gave",
    );
  });

  it("is empty for a verse with no words", () => {
    expect(plainText([])).toBe("");
    expect(plainText([{ type: "block", marker: "b" }])).toBe("");
  });
});
