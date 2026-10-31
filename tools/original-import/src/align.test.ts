import { describe, expect, it } from "vitest";
import { pairWords, taggedWords } from "./align.ts";

const w = (text: string, strong?: string) => ({
  type: "char",
  marker: "w",
  content: [text],
  ...(strong ? { attributes: { strong } } : {}),
});

describe("taggedWords", () => {
  it("counts every w node, and reports those with Strong's numbers", () => {
    const content = [
      { type: "block", marker: "p" },
      "In the ",
      w("beginning", "H7225"),
      " ",
      w("the"),
      " ",
      w("God", "H0430"),
      { type: "char", marker: "wj", content: [w("created", "H1254a H1255")] },
    ];
    const { words, unparsable } = taggedWords(content);
    expect(words).toEqual([
      { position: 0, strongs: ["H7225"] },
      { position: 2, strongs: ["H0430"] },
      { position: 3, strongs: ["H1254", "H1255"] },
    ]);
    expect(unparsable).toBe(0);
  });

  it("counts a tag it can't read, and an untagged verse has no words", () => {
    expect(taggedWords([w("x", "?!")]).unparsable).toBe(1);
    expect(taggedWords(["plain text"]).words).toEqual([]);
  });
});

describe("pairWords", () => {
  const tokens = [
    { id: "t1", strong: "H0430" },
    { id: "t2", strong: "H0853" },
    { id: "t3", strong: "H0853" },
  ];

  it("pairs the k-th word with a number to the k-th token with it when the counts match", () => {
    const paired = pairWords(
      [
        { position: 0, strongs: ["H0430"] },
        { position: 3, strongs: ["H0853"] },
        { position: 5, strongs: ["H0853"] },
      ],
      tokens,
    );
    expect(paired.get("0:H0430")).toBe("t1");
    expect(paired.get("3:H0853")).toBe("t2");
    expect(paired.get("5:H0853")).toBe("t3");
  });

  it("leaves a word unpaired where the counts differ, or no token has the number", () => {
    const paired = pairWords(
      [
        { position: 0, strongs: ["H0853"] },
        { position: 1, strongs: ["H9999"] },
      ],
      tokens,
    );
    expect(paired.get("0:H0853")).toBeNull();
    expect(paired.get("1:H9999")).toBeNull();
  });
});
