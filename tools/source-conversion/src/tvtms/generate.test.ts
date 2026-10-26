/**
 * The committed tables must be what the importer generates from the pinned TVTMS file, which
 * lives outside git in ../source-texts (mounted at /source-texts). Skipped where it's absent.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "./generate.ts";

const DIR = "/source-texts/stepbible-data/Versification";
const TVTMS = existsSync(DIR) ? readdirSync(DIR).find((f) => f.startsWith("TVTMS")) : undefined;
const DATA = join(import.meta.dirname, "../../../../packages/versification/src/data");

describe.skipIf(!TVTMS)("TVTMS import", () => {
  it("matches the committed mapping tables", () => {
    const files = generate(readFileSync(join(DIR, TVTMS as string), "utf8"));
    for (const [name, content] of files) {
      expect(readFileSync(join(DATA, name), "utf8"), name).toBe(content);
    }
  });
});
