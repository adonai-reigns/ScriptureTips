import { describe, expect, it } from "vitest";
import type { Rule } from "./api.ts";
import { bookSource } from "./sources.ts";

const kjv = { id: "eng-kjv", abbreviation: "KJV", name: "King James Version" };
const leb = { id: "leb", abbreviation: "LEB", name: "Lexham English Bible" };
const web = { id: "eng-web", abbreviation: "WEB", name: "World English Bible" };
const rules: Rule[] = [
  { id: "1", kind: "section", entered: "nt", label: "nt", source: web },
  { id: "2", kind: "book", entered: "Gen.1.1-Gen.50.26", label: "Genesis", source: leb },
  { id: "3", kind: "chapter", entered: "Gen.1.1-Gen.1.31", label: "Genesis 1", source: web },
  { id: "4", kind: "range", entered: "Gen.3.14-Gen.3.15", label: "Genesis 3:14–15", source: kjv },
];

describe("vision §3.1: the composition overview", () => {
  it("names each book's source, with its narrower choices", () => {
    expect(bookSource("Gen", rules, kjv)).toMatchObject({ source: leb, narrower: 2 });
    expect(bookSource("John", rules, kjv)).toMatchObject({ source: web, narrower: 0 });
    expect(bookSource("Exod", rules, kjv)).toEqual({ source: kjv, narrower: 0 });
  });
});
