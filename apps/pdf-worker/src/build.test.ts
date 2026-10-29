import { BUILD_FILES, buildPrefix, describeCompilation } from "@scripturetips/book";
import { memoryStore } from "@scripturetips/storage";
import { describe, expect, it } from "vitest";
import { build } from "./build.ts";

const fontPath = process.env["FONT_PATH"] ?? "/fonts";

const ruth = describeCompilation({
  title: "Ruth",
  subtitle: "A test build",
  books: [
    {
      osis: "Ruth",
      chapters: [1, 2].map((chapter) => ({
        chapter,
        verses: Array.from({ length: 22 }, (_, i) => ({
          chapter,
          verse: i + 1,
          to: null,
          published: null,
          headings: [],
          content: [
            "In the days when the judges ruled there was a famine in the land, and a man went to sojourn. ",
          ],
          notes: i === 3 ? [{ position: 0, body: ["Or “lived as a foreigner”"] }] : [],
          source: "leb",
        })),
      })),
    },
  ],
  attributions: [
    { source: "leb", abbreviation: "LEB", designation: "LEB", statement: "From the LEB." },
  ],
});

describe("a PDF build (book-designer.md §8, §9)", () => {
  it("renders the stored book.json, and stores the PDFs and Typst sources beside it", async () => {
    const store = memoryStore();
    const prefix = buildPrefix("b1");
    await store.put(`${prefix}book.json`, JSON.stringify(ruth), BUILD_FILES["book.json"]);

    const result = await build({ buildId: "b1" }, store, { fontPath });

    expect(result.pages).toBeGreaterThanOrEqual(3);
    expect(result.spine).toBeCloseTo(result.pages * ruth.format.caliper, 1);
    expect((await store.list(prefix)).map((k) => k.slice(prefix.length))).toEqual(
      Object.keys(BUILD_FILES).sort(),
    );
    for (const name of ["book.pdf", "cover.pdf"]) {
      const pdf = await store.get(`${prefix}${name}`);
      expect(pdf?.contentType).toBe("application/pdf");
      expect(new TextDecoder().decode(pdf?.body.slice(0, 5))).toBe("%PDF-");
    }
    const source = new TextDecoder().decode((await store.get(`${prefix}book.typ`))?.body);
    expect(source).toContain('json("book.json")');
  }, 60_000);

  it("fails a build whose book.json is missing", async () => {
    await expect(build({ buildId: "none" }, memoryStore(), { fontPath })).rejects.toThrow(
      "no book.json",
    );
  });
});
