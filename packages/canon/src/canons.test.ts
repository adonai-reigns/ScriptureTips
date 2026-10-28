import { BOOKS } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { CANON_IDS, CANONS, standing } from "./canons.ts";

/** Books a profile counts on their own: canonical, and not printed inside another book. */
const counted = (id: (typeof CANON_IDS)[number]) =>
  CANONS[id].books.filter((b) => b.status === "canonical" && !b.partOf);

describe("vision §3.4: canon profiles", () => {
  it.each(CANON_IDS)("%s places every registry book exactly once, in order", (id) => {
    const books = CANONS[id].books;
    expect(books.map((b) => b.osis).sort()).toEqual(BOOKS.map((b) => b.osis).sort());
    expect(books.map((b) => b.order)).toEqual(books.map((_, i) => i + 1));
  });

  it("count 66, 73 and 76 books", () => {
    expect(counted("protestant")).toHaveLength(66);
    expect(counted("catholic")).toHaveLength(73);
    expect(counted("orthodox")).toHaveLength(76);
    expect(counted("orthodox").filter((b) => b.section === "ot")).toHaveLength(49);
  });

  it.each(CANON_IDS)("%s: a part follows its book, sections run OT, NT, additional", (id) => {
    const books = CANONS[id].books;
    for (const b of books.filter((b) => b.partOf)) {
      const parent = books.find((p) => p.osis === b.partOf);
      expect(parent?.status, b.osis).toBe("canonical");
      expect(b.order, b.osis).toBeGreaterThan(parent?.order ?? Infinity);
    }
    const sections = books.map((b) => b.section);
    const rank = (s: string) => ["ot", "nt", "additional"].indexOf(s);
    expect(sections).toEqual([...sections].sort((a, b) => rank(a) - rank(b)));
    expect(books.every((b) => (b.section === "additional") === (b.status === "additional"))).toBe(
      true,
    );
  });

  it("places the deuterocanon as each tradition prints it", () => {
    const order = (id: (typeof CANON_IDS)[number]) => counted(id).map((b) => b.osis);
    expect(order("catholic").slice(14, 22)).toEqual([
      "Ezra",
      "Neh",
      "Tob",
      "Jdt",
      "Esth",
      "1Macc",
      "2Macc",
      "Job",
    ]);
    expect(order("orthodox").slice(14, 17)).toEqual(["1Esd", "Ezra", "Neh"]);
    expect(order("orthodox").indexOf("Hos")).toBeLessThan(order("orthodox").indexOf("Isa"));
    expect(CANONS.orthodox.books.find((b) => b.osis === "4Macc")?.status).toBe("additional");
    expect(CANONS.protestant.books.find((b) => b.osis === "Tob")?.section).toBe("additional");
  });

  it("standing: a profile's view, or whether traditions differ", () => {
    expect(standing("Tob", "protestant")).toBe("additional");
    expect(standing("Tob", "catholic")).toBe("canonical");
    expect(standing("Tob", null)).toBe("varies");
    expect(standing("John", null)).toBe("canonical");
    expect(standing("PssSol", null)).toBe("additional");
    expect(standing("Nope", null)).toBeUndefined();
  });
});
