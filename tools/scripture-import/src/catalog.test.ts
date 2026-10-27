/**
 * The catalog against the real source files, which live outside git in ../source-texts
 * (mounted at /source-texts). The full import of every translation runs from the CLI; here
 * one book of each translation is imported, which catches a new marker or a parser change.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readZip } from "./archive.ts";
import { CATALOG, NOT_IMPORTED } from "./catalog.ts";
import { importBook } from "./import-book.ts";

const ROOT = "/source-texts";
const SOURCES = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../docs/license-evidence/source-files.json"),
    "utf8",
  ),
) as { files: { path: string }[] };

describe("the catalog", () => {
  it("has unique IDs and abbreviations", () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map((e) => e.abbreviation)).size).toBe(CATALOG.length);
  });

  it("imports only files recorded with license evidence (AGENTS.md, evidence policy)", () => {
    const recorded = new Set(SOURCES.files.map((f) => f.path));
    for (const entry of CATALOG) {
      // A folder is our own conversion of a recorded file (tools/source-conversion).
      if (entry.source.endsWith(".zip")) expect(recorded, entry.id).toContain(entry.source);
      expect(
        existsSync(
          join(
            import.meta.dirname,
            "../../../docs/license-evidence",
            entry.source.split("/")[0] ?? "",
          ),
        ),
        entry.id,
      ).toBe(true);
    }
    for (const file of Object.keys(NOT_IMPORTED)) expect(recorded, file).toContain(file);
  });
});

// A whole book takes a few seconds to parse.
describe.skipIf(!existsSync(ROOT))("one book of each translation", { timeout: 60_000 }, () => {
  it.each(CATALOG.filter((e) => !e.held).map((e) => [e.id, e] as const))("%s", (_, entry) => {
    const path = join(ROOT, entry.source);
    const files = statSync(path).isDirectory()
      ? [] // our own conversion; tested in tools/source-conversion
      : [...readZip(readFileSync(path))].filter(([name]) => /\.u?sfm$/i.test(name));
    const book = files.find(([name]) => /JHN|GEN|MAT/.test(name)) ?? files[0];
    if (!book) return;
    const result = importBook(new TextDecoder().decode(book[1]));
    expect(result.issues).toEqual([]);
    expect(result.book?.chapters.length).toBeGreaterThan(0);
  });
});
