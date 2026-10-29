import { describe, expect, it } from "vitest";
import { splitVersion } from "./paths.ts";

describe("domain-model §1.6: publication paths", () => {
  it("read a trailing version ID as the version pinned", () => {
    expect(splitVersion(["john", "3", "16", "7Kd9xQ2mAb"])).toEqual({
      segments: ["john", "3", "16"],
      version: "7Kd9xQ2mAb",
    });
    expect(splitVersion(["7Kd9xQ2mAb"])).toEqual({ segments: [], version: "7Kd9xQ2mAb" });
  });

  it("don't mistake a passage, or a book's name of the same length, for a version", () => {
    expect(splitVersion(["john", "3"])).toEqual({ segments: ["john", "3"] });
    expect(splitVersion(["revelation"])).toEqual({ segments: ["revelation"] });
    expect(splitVersion(["john", "3", "1234567890"])).toEqual({
      segments: ["john", "3", "1234567890"],
    });
    expect(splitVersion([])).toEqual({ segments: [] });
  });
});
