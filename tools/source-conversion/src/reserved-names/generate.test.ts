/**
 * The committed table must be what the generator makes from the pinned lists, which live
 * outside git in ../source-texts (mounted at /source-texts). Skipped where they're absent.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate, LISTS } from "./generate.ts";

const SOURCES = "/source-texts";
const TABLE = join(
  import.meta.dirname,
  "../../../../apps/api/src/auth/reserved-names.generated.ts",
);
const present = LISTS.every((l) => existsSync(join(SOURCES, l.file)));

describe("generate", () => {
  it("merges, lowercases and sorts, leaving out names that can't be handles, and keeps each license", () => {
    const { module, report } = generate([
      {
        title: "A",
        repository: "https://example.com/a",
        commit: "1",
        evidence: "a",
        text: "# comment\nAdmin\nwww\n\nx\n",
        license: "MIT A",
      },
      {
        title: "B",
        repository: "https://example.com/b",
        commit: "2",
        evidence: "b",
        text: "about.html\nadmin\nsign_in\n",
        license: "MIT B",
      },
    ]);
    expect(module).toContain('  "admin",\n  "sign-in",\n  "www",\n];');
    expect(module).toContain(" *   MIT A");
    expect(module).toContain(" *   MIT B");
    expect(report).toBe(
      "A: 3 names, 1 left out (not a possible handle): x\nB: 3 names, 1 left out (not a possible handle): about.html\nMerged: 3 names.\n",
    );
  });
});

describe.skipIf(!present)("reserved-names import", () => {
  it("matches the committed table", () => {
    const { module } = generate(
      LISTS.map((l) => ({
        ...l,
        text: readFileSync(join(SOURCES, l.file), "utf8"),
        license: readFileSync(join(SOURCES, l.licenseFile), "utf8"),
      })),
    );
    expect(readFileSync(TABLE, "utf8")).toBe(module);
  });
});
