import { describe, expect, it } from "vitest";
import { osisBook, parseStrong, strongOf } from "./strong.ts";

describe("parseStrong", () => {
  it("pads to four digits and keeps STEPBible's letter as the extended number", () => {
    expect(parseStrong("H430")).toMatchObject({ base: "H0430", extended: null, language: "heb" });
    expect(parseStrong("H0430G")).toMatchObject({ base: "H0430", extended: "H0430G" });
    expect(parseStrong("G2424G")).toMatchObject({
      base: "G2424",
      extended: "G2424G",
      language: "grc",
    });
  });

  it("marks STEPBible's own affix numbers (9000 and up) as not Strong's", () => {
    expect(parseStrong("H9003")?.affix).toBe(true);
    expect(parseStrong("H7225")?.affix).toBe(false);
  });

  it("rejects what isn't a number, including the five-digit typos in TAGNT", () => {
    expect(parseStrong("")).toBeNull();
    expect(parseStrong("G20447")).toBeNull();
    expect(parseStrong("{H1}")).toBeNull();
  });

  it("names a dictionary entry's number from its digits", () => {
    expect(strongOf("heb", "1")).toBe("H0001");
    expect(strongOf("grc", "00976")).toBe("G0976");
  });
});

describe("osisBook", () => {
  it("reads STEPBible's USFM-style codes", () => {
    expect(osisBook("Gen")).toBe("Gen");
    expect(osisBook("Mrk")).toBe("Mark");
    expect(osisBook("1Sa")).toBe("1Sam");
    expect(osisBook("Zzz")).toBeUndefined();
  });
});
