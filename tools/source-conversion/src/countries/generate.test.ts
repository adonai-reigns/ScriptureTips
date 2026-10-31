/**
 * The committed list must be what the generator makes from the pinned CLDR files, which live
 * outside git in ../source-texts (mounted at /source-texts). Skipped where they're absent.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLDR, generate } from "./generate.ts";

const SOURCES = "/source-texts";
const LIST = join(import.meta.dirname, "../../../../packages/countries/src/countries.generated.ts");
const present = Object.values(CLDR).every((f) => existsSync(join(SOURCES, f)));

const info = (codes: string[]) =>
  JSON.stringify({
    supplemental: { territoryInfo: Object.fromEntries(codes.map((c) => [c, {}])) },
  });
const containment = (groups: string[]) =>
  JSON.stringify({
    supplemental: { territoryContainment: Object.fromEntries(groups.map((c) => [c, {}])) },
  });

describe("generate", () => {
  it("lists the two-letter territories, leaving out the unknown region and the exceptional codes", () => {
    const { module, report } = generate({
      info: info(["NZ", "XK", "ZZ", "AC", "AU"]),
      containment: containment(["EU", "UN"]),
      license: "LICENSE TEXT\n\nSecond paragraph",
    });
    expect(module).toContain('  "AU",\n  "NZ",\n  "XK",\n] as const;');
    expect(module).toContain(" *   LICENSE TEXT\n *\n *   Second paragraph");
    expect(report).toContain("3 country codes");
  });

  it("refuses a list with a grouping in it", () => {
    expect(() =>
      generate({ info: info(["NZ", "EU"]), containment: containment(["EU"]), license: "x" }),
    ).toThrow("EU");
  });
});

describe.skipIf(!present)("countries import", () => {
  it("matches the committed list", () => {
    const { module } = generate({
      info: readFileSync(join(SOURCES, CLDR.info), "utf8"),
      containment: readFileSync(join(SOURCES, CLDR.containment), "utf8"),
      license: readFileSync(join(SOURCES, CLDR.license), "utf8"),
    });
    expect(readFileSync(LIST, "utf8")).toBe(module);
  });
});
