import { describe, expect, it } from "vitest";
import { categoryOf } from "./categories.ts";

const of = (partOfSpeech: string | null, nameKind: "person" | "place" | "other" | null = null) =>
  categoryOf({ partOfSpeech, nameKind });

describe("study categories", () => {
  it("put a person or a place first, whatever the part of speech", () => {
    expect(of("noun", "person")).toBe("person");
    expect(of("proper noun", "place")).toBe("place");
    expect(of("n-pr-loc", "place")).toBe("place");
  });

  it("call a proper noun with no known kind, or a name that is neither, a name", () => {
    expect(of("proper noun")).toBe("name");
    expect(of("noun", "other")).toBe("name");
    expect(of("n-pr")).toBe("name");
  });

  it("read STEPBible's parts of speech", () => {
    expect(of("noun")).toBe("noun");
    expect(of("verb")).toBe("verb");
    expect(of("adjective")).toBe("adjective");
    expect(of("adverb")).toBe("adverb");
    expect(of("conjunction")).toBe("conjunction");
    expect(of("preposition")).toBe("preposition");
    expect(of("personal pronoun")).toBe("pronoun");
    expect(of("relative pronoun")).toBe("pronoun");
    expect(of("particle")).toBe("particle");
    expect(of("article")).toBe("particle");
    expect(of("interjection")).toBe("particle");
  });

  it("read the dictionary's own abbreviations", () => {
    expect(of("n-m")).toBe("noun");
    expect(of("v")).toBe("verb");
    expect(of("a")).toBe("adjective");
    expect(of("conj")).toBe("conjunction");
    expect(of("prep")).toBe("preposition");
    expect(of("d")).toBe("adverb");
    expect(of("dp")).toBe("pronoun");
  });

  it("fall back to other when nothing is known", () => {
    expect(of(null)).toBe("other");
    expect(of("")).toBe("other");
    expect(of("something new")).toBe("other");
  });
});
