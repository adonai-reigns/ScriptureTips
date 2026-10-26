import { describe, expect, it } from "vitest";
import { CORRECTIONS } from "./corrections.ts";
import { applyCorrections, decodeSource } from "./source.ts";

const fix = (find: string, replace: string) => ({
  id: "t",
  ref: "TST 1:1",
  scanPage: "1",
  reason: "test",
  find,
  replace,
});

describe("decodeSource", () => {
  it("decodes Windows-1252 and normalizes line endings", () => {
    const bytes = new Uint8Array([0x91, 0x61, 0x92, 0x0d, 0x0a, 0x62, 0x0d]);
    expect(decodeSource(bytes)).toBe("‘a’\nb\n");
  });
});

describe("applyCorrections", () => {
  it("matches any run of whitespace, including line breaks", () => {
    expect(applyCorrections("thy face far\nfrom me", [fix("face far from", "face from")])).toBe(
      "thy face from me",
    );
  });

  it("throws when the text is missing or occurs more than once", () => {
    expect(() => applyCorrections("abc", [fix("x", "y")])).toThrow(/found 0/);
    expect(() => applyCorrections("a a", [fix("a", "b")])).toThrow(/found 2/);
  });
});

describe("CORRECTIONS", () => {
  it("each has a unique id, a reference, a scan page and a reason", () => {
    const ids = CORRECTIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of CORRECTIONS) {
      expect(c.ref).toMatch(/^[1-3A-Z]{3} \d+/);
      expect(c.scanPage).toMatch(/^\d+/);
      expect(c.reason.length).toBeGreaterThan(5);
    }
  });
});
