import { describe, expect, it } from "vitest";
import { fold, snippetOf, strongOf } from "./query.ts";

describe("vision §3.14: what a search query is", () => {
  it("reads a Strong's number however it's typed", () => {
    expect(strongOf("H430")).toEqual({ base: "H0430", extended: null });
    expect(strongOf(" h0430 ")).toEqual({ base: "H0430", extended: null });
    expect(strongOf("G 976")).toEqual({ base: "G0976", extended: null });
    expect(strongOf("H0430g")).toEqual({ base: "H0430", extended: "H0430G" });
  });

  it("takes anything else for words", () => {
    expect(strongOf("430")).toBeNull();
    expect(strongOf("God")).toBeNull();
    expect(strongOf("H430 God")).toBeNull();
    expect(strongOf("")).toBeNull();
  });

  it("folds Hebrew points and Greek accents away, so words match with or without them", () => {
    expect(fold("אֱלֹהִים")).toBe("אלהים");
    expect(fold("אלהים")).toBe("אלהים");
    expect(fold("Λόγος")).toBe("λογος");
    expect(fold("λόγος")).toBe(fold("ΛΟΓΟΣ"));
  });

  it("splits a headline into parts with the matched words flagged", () => {
    expect(snippetOf("For God so ⟦loved⟧ the world, that he gave")).toEqual([
      { t: "For God so " },
      { t: "loved", hit: true },
      { t: " the world, that he gave" },
    ]);
    expect(snippetOf("⟦a⟧⟦b⟧")).toEqual([
      { t: "a", hit: true },
      { t: "b", hit: true },
    ]);
    expect(snippetOf("plain")).toEqual([{ t: "plain" }]);
    expect(snippetOf("")).toEqual([]);
  });
});
