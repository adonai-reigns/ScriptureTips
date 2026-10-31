import { describe, expect, it } from "vitest";
import type { Shown } from "../reader/layout.ts";
import { groupUnits, strongsIn, tagOf } from "./units.ts";

const w = (text: string, strong?: string): Shown => ({
  type: "char",
  marker: "w",
  content: [text],
  ...(strong ? { attributes: { strong } } : {}),
});

describe("tagOf", () => {
  it("reads a tag as the API keys it", () => {
    expect(tagOf(w("God", "H0430"))).toBe("H0430");
    expect(tagOf(w("God", "h430"))).toBe("H0430");
    expect(tagOf(w("Word", "G3056"))).toBe("G3056");
  });

  it("finds nothing in an untagged word, other markup or text", () => {
    expect(tagOf(w("the"))).toBeUndefined();
    expect(tagOf({ type: "char", marker: "it", content: ["x"] })).toBeUndefined();
    expect(tagOf("text")).toBeUndefined();
    expect(tagOf(undefined)).toBeUndefined();
  });
});

describe("strongsIn", () => {
  it("collects each number once, including inside other markup", () => {
    const nodes: Shown[] = [
      "In ",
      w("beginning", "H7225"),
      { type: "char", marker: "wj", content: [w("God", "H0430"), " ", w("God", "H0430")] },
    ];
    expect([...strongsIn(nodes)]).toEqual(["H7225", "H0430"]);
  });
});

describe("groupUnits", () => {
  it("makes one unit of adjacent words with the same number", () => {
    const nodes: Shown[] = ["And ", w("freely", "H0398"), " ", w("eat", "H0398"), ", said God."];
    expect(groupUnits(nodes)).toEqual([
      "And ",
      {
        type: "char",
        marker: "study-unit",
        content: [w("freely", "H0398"), " ", w("eat", "H0398")],
      },
      ", said God.",
    ]);
  });

  it("leaves words apart when anything but a space is between them, or the numbers differ", () => {
    const apart: Shown[] = [w("light", "H0216"), " and ", w("light", "H0216")];
    expect(groupUnits(apart)).toEqual(apart);
    const different: Shown[] = [w("God", "H0430"), " ", w("created", "H1254")];
    expect(groupUnits(different)).toEqual(different);
  });

  it("joins three in a row, and never an untagged word", () => {
    const three: Shown[] = [w("a", "H0001"), " ", w("b", "H0001"), " ", w("c", "H0001")];
    const [unit] = groupUnits(three);
    expect(unit).toMatchObject({ marker: "study-unit" });
    expect(groupUnits([w("the"), " ", w("the")])).toHaveLength(3);
  });
});
