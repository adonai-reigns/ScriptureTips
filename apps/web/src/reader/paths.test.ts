import { parseOsisPassage } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { bookSlug, passagePath, pathFor, referenceFor } from "./paths.ts";

describe("domain-model §1.6: passage paths", () => {
  it("name books in fixed lowercase English", () => {
    expect(bookSlug("Gen")).toBe("genesis");
    expect(bookSlug("1Pet")).toBe("1-peter");
    expect(bookSlug("Ps")).toBe("psalms");
  });

  it.each([
    ["John.3.16", false, "/read/kjv/john/3/16"],
    ["John.3.16-John.3.18", false, "/read/kjv/john/3/16-18"],
    ["John.3.16-John.4.2", false, "/read/kjv/john/3:16-4:2"],
    ["John.3.16!a", false, "/read/kjv/john/3/16a"],
    ["Ps.51.0", false, "/read/kjv/psalms/51/0"],
    ["Ps.23.1-Ps.23.6", true, "/read/kjv/psalms/23"],
    ["Ruth.1.1-Ruth.2.23", true, "/read/kjv/ruth/1-2"],
  ])("write %s (whole chapters: %s) as %s", (osis, whole, path) => {
    expect(passagePath("kjv", parseOsisPassage(osis), whole)).toBe(path);
  });

  it("write several passages in the OSIS form", () => {
    expect(
      pathFor("leb", [
        { entered: "Joel.2.28", wholeChapters: false },
        { entered: "Joel.3.1", wholeChapters: false },
      ]),
    ).toBe("/read/leb/passage/joel.2.28,joel.3.1");
  });

  it.each([
    [["john", "3"], "John 3"],
    [["john", "3", "16-18"], "John 3:16-18"],
    [["john", "3:16-4:2"], "John 3:16-4:2"],
    [["psalms", "51", "0"], "Psalm 51:0"],
    [["1-peter", "2", "9"], "1 Peter 2:9"],
    [["passage", "joel.2.28,joel.3.1"], "Joel 2:28; Joel 3:1"],
  ])("read %j as the reference %s", (segments, reference) => {
    expect(referenceFor(segments)).toBe(reference);
  });

  it("refuse what isn't a passage path", () => {
    expect(referenceFor(["nowhere", "1"])).toBeUndefined();
    expect(referenceFor(["john"])).toBeUndefined();
    expect(referenceFor(["john", "3", "16", "17"])).toBeUndefined();
    expect(referenceFor(["john", "<script>"])).toBeUndefined();
  });
});
