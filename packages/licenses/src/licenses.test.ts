import { describe, expect, it } from "vitest";
import {
  attributionFor,
  CORRECTION_LIMIT,
  canBeBase,
  canCompile,
  canModify,
  correctionLimit,
  licenseFor,
  notesExcluded,
  restrictedNames,
} from "./licenses.ts";

describe("domain-model §7: license rules", () => {
  it("know every license the loaded translations use", () => {
    for (const key of ["public-domain", "cc0-1.0", "leb", "net-bible"]) {
      expect(licenseFor(key), key).toBeDefined();
    }
  });

  it("let open texts be a base and be modified", () => {
    expect(canBeBase("public-domain")).toBe(true);
    expect(canModify("leb")).toBe(true);
  });

  it("allow nothing under a license whose terms aren't recorded", () => {
    expect(canBeBase("nlt")).toBe(false);
    expect(canCompile("nlt")).toBe(false);
    expect(canModify("nlt")).toBe(false);
  });

  it("domain-model §2.3: a correction changes at most 3 words unless a license says otherwise", () => {
    expect(CORRECTION_LIMIT).toBe(3);
    expect(correctionLimit("leb")).toBe(3);
    expect(correctionLimit("unknown")).toBe(3);
  });

  it("licenses.md §3.1–3.2: carry the LEB's and the NET's attribution, and their other conditions", () => {
    expect(attributionFor("leb")).toMatchObject({
      designation: "LEB",
      statement: expect.stringMatching(/^Scripture quotations marked \(LEB\) are from the Lexham/),
    });
    expect(attributionFor("net-bible")?.links).toContainEqual({
      text: "NET",
      url: "http://netbible.org",
    });
    expect(attributionFor("public-domain")).toBeNull();
    expect(restrictedNames("leb")).toEqual(["Lexham"]);
    expect(notesExcluded("net-bible")).toBe(true);
    expect(notesExcluded("leb")).toBe(false);
  });
});
