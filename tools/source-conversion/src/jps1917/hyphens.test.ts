// cspell:ignore knowl lehem nlehem
import { describe, expect, it } from "vitest";
import { resolveLineEndHyphens, restoreCompounds, SOFT_HYPHEN } from "./hyphens.ts";

describe("resolveLineEndHyphens", () => {
  it("drops a hyphen when the word is set solid elsewhere", () => {
    const { text, decisions } = resolveLineEndHyphens("knowledge is good\nthe knowl-\nedge of");
    expect(text.split("\n")[1]).toBe(`the knowl${SOFT_HYPHEN}`);
    expect(decisions[0]).toMatchObject({ left: "knowl", right: "edge", soft: true });
  });

  it("keeps a hyphen when the word is hyphenated within a line elsewhere", () => {
    const { text } = resolveLineEndHyphens("in Beth-lehem now\nto Beth-\nlehem");
    expect(text.split("\n")[1]).toBe("to Beth-");
  });

  it("keeps a hyphen with no evidence either way", () => {
    const { text, decisions } = resolveLineEndHyphens("a reed-\ngrass");
    expect(text).toBe("a reed-\ngrass");
    expect(decisions[0]).toMatchObject({ solid: 0, hyphenated: 0, soft: false });
  });

  it("keeps the hyphen of a listed compound even if the solid form occurs", () => {
    const { text } = resolveLineEndHyphens("the firstborn son\nthe first-\nborn", ["first-born"]);
    expect(text.split("\n")[1]).toBe("the first-");
  });

  it("looks past a page break for the second half", () => {
    const { decisions } = resolveLineEndHyphens("knowledge\nthe knowl-\n\n12\n\f\nedge");
    expect(decisions[0]?.right).toBe("edge");
  });
});

describe("restoreCompounds", () => {
  it("hyphenates solid spellings, keeping their case", () => {
    expect(restoreCompounds("the Firstborn and firstborn", ["first-born"])).toBe(
      "the First-born and first-born",
    );
  });

  it("leaves longer words and already hyphenated forms alone", () => {
    expect(restoreCompounds("firstborns first-born", ["first-born"])).toBe("firstborns first-born");
  });
});
